# 🕵️ spector-scan — Consent-Backend Security Scanner

**Spector's marketplace utility.** In *My Agent Ohana*, a verified human hires an agent
to do ONE real thing. Spector's one real thing is **adversarial security review**: point
this scanner at a consent backend and it returns an **F11-style threat report** — the same
class of finding that caught our own gaps on paper, now automated and runnable.

> Language law: this is a security **review/scan**, never a "certified audit."
> Spector 🕵️ — reviews, not audits. Never ship; make shipping safe.

## What it does

Two complementary modes:

- **STATIC (`--source <dir>`)** — inspects the backend's **files + config** (no running server).
  This is how you scan a Cloudflare Worker repo like [`/shared/tokyo/consent-server/`](../../consent-server/).
- **DYNAMIC (`--target <url>`)** — **black-box, unauthenticated** HTTP probes against a live
  backend (the exact position of an attacker on venue Wi-Fi — no credentials).

Both grade against the [consent-backend spec-of-record](../../intel/consent-backend-spec.md) and my
[red-team findings F8–F15](../../submission/dry-run/spector-redteam.md).

### STATIC checks (`--source`) — reads real files

| Check | Detects | Maps to |
|---|---|---|
| `SRC-F6-*` | whether a hosted server-side token **verify** backend exists (jwtVerify/JWKS) vs client-only authz | F6 / CF-B1 |
| `SRC-F11-REVOKE-UNAUTH` | a mutating consent route (`/revoke`) with **no capability check** in its handler | F11 / CF-B5 |
| `SRC-F11-ADMIN-UNAUTH` | a ledger/admin data route with **no admin-key gate** | F11 / CF-S5 |
| `SRC-BIND-0000` | a real `0.0.0.0` bind (skips doc/comment warnings) | F11 |
| `SRC-SECRET-*` | secrets **in committed files** (PEM/JWK-private/ghp_/AWS/generic); git-ignored + test fixtures → INFO | F2 |
| `SRC-FAIL-OPEN-*` | auth that returns allow when the secret is unset, or `catch{}` that returns success | AP-2 |
| `SRC-REPLAY-GUARD` | missing jti/nonce replay guard behind a verify path | AP-9 / CF-B6 |
| `SRC-SCOPE-ESC` | requested scope never validated against a per-agent allowlist | F8 / CF-B7 |
| `SRC-ALG-NONE` / `-UNPINNED` | JWT `alg:none` accepted, or `algorithms:['RS256']` not pinned | F11 / CF-B1 |
| `SRC-ISS-UNPINNED` / `SRC-AUD-UNPINNED` | issuer/audience not pinned in the verify path | F10/F11 |
| `SRC-CORS-WILDCARD` | `Access-Control-Allow-Origin: *` in source | F11 |
| `SRC-ENV-TRACKED` / `SRC-NO-GITIGNORE` | a `.env`/`.dev.vars` committed, or no `.gitignore` | F2 |

The STATIC pass respects `.gitignore` (via `git ls-files` when the dir is a repo): a secret in a
git-ignored `.dev.vars` is **correct hygiene → INFO**, not a leak; a clearly-labeled test-fixture key
is **known/acceptable → INFO**. Only secrets in *committed non-test* files are BLOCKERs.

### DYNAMIC checks (`--target`) — black-box HTTP

| Check | Detects | Maps to |
|---|---|---|
| `F11-REVOKE-AUTH` | `/v1/revoke` accepted without a valid `receipt_token` — **anyone can kill the blessing** | F11 / CF-B5 |
| `F11-LEDGER-AUTH` / `-WRONGKEY` | event ledger/log readable with no / wrong admin key — **leaks sub↔agent linkage** | F11 / CF-S5 |
| `CF-B2-CLIENT-AUTHZ` | `/v1/verify` grants from client-supplied `sub`/`scope`/`blessed` (no real token) | CF-B2 |
| `CF-B1-FORGED` | forged RS256 token accepted — **signature not verified** against JWKS | CF-B1 |
| `FAIL-CLOSED` | malformed / empty request returns `ok:true` — server **fails open** | AP-2 |
| `CORS-WILDCARD` | `Access-Control-Allow-Origin: *` on a mutating route | F11 |
| `LEAK-STACK` / `-EXPECTED` / `-KEY` | error bodies leak stack traces, expected claim values, or key material | AP-10 |
| `DENY-PATH-MISSING` | `/v1/consent/deny` absent — denied-path is doctrine, not optional | CF-B4 |
| `CF-B6-REPLAY` | jti-burn replay guard — **`needs-live-token`**, deferred to Friday round-trip | AP-9 |

**Honesty note:** two properties cannot be proven from an unauthenticated black box —
real-token JWKS verification and jti-burn replay both need one genuine World token. Those
are flagged `needs-live-token` and re-run at the Friday live round-trip bell, not faked.

## Usage

```bash
# STATIC — scan a backend source tree (e.g. the consent-server repo)
node scan.mjs --source /shared/tokyo/consent-server \
  --out reports/consent-server-static.md --json reports/consent-server-static.json

# DYNAMIC — black-box probe a live backend (Tauro's `wrangler dev`, or a *.workers.dev)
node scan.mjs --target http://127.0.0.1:8787 \
  --out reports/report.md --json reports/report.json

# Both at once (dynamic report gets a ".dynamic" filename suffix)
node scan.mjs --source /shared/tokyo/consent-server --target http://127.0.0.1:8787 --out reports/r.md
```

No dependencies — Node ≥ 18 (uses built-in `fetch`). Tested on Node v24.

**Exit codes** (CI-friendly): `0` clean · `2` SHOULD-fix present · `3` BLOCKER present · `1` usage error.
When both modes run, exit code is the **worst** of the two.

## Test (ship test — real server + planted fixture + black-box doubles)

```bash
bash test.sh          # the full ship test (see TEST-RESULTS.md)
node test/run-tests.mjs   # just the dynamic black-box self-test
```

`test.sh` proves the scanner three ways:

1. **STATIC on the real consent-server** → must scan **clean** (exit 0), confirm F6 closed, no false positives.
2. **STATIC on a planted-vuln fixture** ([`fixtures/vuln-backend/`](fixtures/vuln-backend/)) → must **find** the
   planted 0.0.0.0 bind + unauth revoke + unauth ledger + committed secret + client-only authz (exit 3).
3. **DYNAMIC self-test** on two HTTP **test doubles** in [`fixtures/server.mjs`](fixtures/server.mjs):
   `MODE=hardened` → PASS/clean; `MODE=vulnerable` → 6🔴 + 2🟡.

Latest results (all green) in [`TEST-RESULTS.md`](TEST-RESULTS.md); the consent-server verdict in
[`report-consent-server.md`](report-consent-server.md).

Run a fixture standalone to eyeball a report:

```bash
MODE=vulnerable PORT=8801 node fixtures/server.mjs &   # dynamic double
node scan.mjs --target http://127.0.0.1:8801
node scan.mjs --source fixtures/vuln-backend           # static planted-vuln
```

## 🛡️ Intercepta module — screen the destination *before* a blessing signs

**Prize:** Intercepta's *"Safe Agent-to-Agent Payments with x402"* ($2,000) — *screen the
destination/token/authorization **before** an agent signs, then let it decide what happens next:
**pay / refuse / cap the amount / ask a human**, and make that decision impossible to miss.*

This is the same instinct as the rest of spector-scan — **check before you commit** — pointed at a
payment destination instead of a backend repo. It makes **ONE real API call** to Intercepta (Web3
Antivirus / W3A) to screen a destination address, then emits **one of four verdicts**, each wired to
our World consent flow.

### The four verdicts → the consent bridge (the thesis hook)

The fourth verdict, **"ask a human," IS our World consent ceremony ("Bless & Release")**. That's the
honest bridge: Intercepta screens the destination, and when it can't decide alone, it hands control
back to a human — which is exactly what our Trinity is built to do.

| Verdict | Trigger | Action | → My Agent Ohana consent flow |
|---|---|---|---|
| 🟢 **pay** | clean (`toxicScore` < cap threshold, no risky traits) | `SIGN` | blessing already covers it — proceed |
| 🟡 **cap** | mild risk (caution trait, or score ≥ cap) | `SIGN_CAPPED` | **blessing spending cap** — sign only up to a ceiling |
| 🙋 **ask-human** | borderline score, big amount, **or any failed/absent screen** | `HALT_FOR_CEREMONY` | **the World "Bless & Release" ceremony** — `POST /v1/consent/begin` |
| 🔴 **refuse** | disqualifying trait (`sanction_address`, `known_scammer`, `rug_pull`…) or score ≥ refuse | `ABORT` | **revoke** — stand the agent down |

**Fail-closed law:** if the screen returns anything but a clean 200 (no key, 403, 429, timeout,
network, bad address), the verdict is **ask-human** — money **never** moves on a failed check.

### The real API (verified 2026-09-25)

```
GET https://api.web3antivirus.io/api/public/v2/extension/account/{address}/toxic-score
Header: X-API-KEY: <sandbox key>
200 → { "toxicScore": number, "traits": [ { "risk", "name", "txsCount", "description" } ] }
403 → { "status":403, "response":"This authentication key is incorrect or doesn’t exist", ... }
```

### Usage

```bash
# real call (needs a sandbox key in env — see "Live-call status" below)
INTERCEPTA_API_KEY=... node screen.mjs 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --amount 1.5 --json

# no key: still makes the REAL call; the live 403 fails closed → ask-human (auth path proven)
node screen.mjs 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# judge-facing: all four verdicts in one flow (labelled fixtures; real 403 also shown)
node screen.mjs --demo

# exercise one verdict path offline:  clean|mild|borderline|sanctioned|live-403
node screen.mjs --fixture sanctioned
```

Exit codes: `0` pay · `10` cap · `20` ask-human · `30` refuse · `1` usage — so an agent loop can branch.

### Live-call status — key = **booth / human item** (honestly flagged)

- **Call path: PROVEN LIVE.** `screen.mjs` and `test/intercepta.test.mjs` hit the real production
  host every run; without a key it returns a genuine structured `403` (captured at
  [`fixtures/intercepta/live-403.json`](fixtures/intercepta/live-403.json)). The auth mechanism and
  request shape are confirmed against the live API, not mocked.
- **A full 200 verdict needs a sandbox key**, requested at `intercepta.io/ethglobal`. The key is
  **emailed within a few hours** to a signup address — it requires a human inbox + event-time signup,
  so it is a **booth / human item**, not autonomously obtainable. **No key is hardcoded or committed**
  (`.gitignore` blocks `.env`/`*.key`); the code reads `INTERCEPTA_API_KEY` from env and runs the
  moment a key lands. The four verdict paths are proven now via labelled, API-shape-accurate fixtures
  ([`fixtures/intercepta/`](fixtures/intercepta/)).
- **To go fully live:** get the key at the booth → `export INTERCEPTA_API_KEY=...` → re-run
  `node screen.mjs <addr>` (it becomes a real 200). Screen real, public, non-private mainnet
  addresses only (a benign known address for `pay`; the OFAC-listed Tornado Cash address
  `0x8589…FDA16` to exercise `refuse`).

Full write-up + the live-call decision log: [`report-intercepta.md`](report-intercepta.md).

## Files

```
spector-scan/
├── scan.mjs                    # CLI entrypoint (--source STATIC / --target DYNAMIC)
├── screen.mjs                  # 🛡️ Intercepta destination-screening CLI (4 verdicts + demo)
├── lib/source-probes.mjs       # 12 STATIC file/config checks (F6, F11, secrets, alg, scope…)
├── lib/probes.mjs              # 9 DYNAMIC black-box HTTP checks
├── lib/intercepta-screen.mjs   # 🛡️ Intercepta screen + 4-verdict engine + consent bridge
├── lib/report.mjs              # severity model + markdown/JSON rendering
├── fixtures/vuln-backend/      # planted-vuln SOURCE fixture (for --source tests)
├── fixtures/server.mjs         # hardened + vulnerable HTTP doubles (for --target tests)
├── fixtures/intercepta/        # 🛡️ API-shape fixtures (4 verdicts) + real live-403 capture
├── test.sh                     # ship test (real server + fixture + doubles + intercepta)
├── test/run-tests.mjs          # dynamic black-box self-test
├── test/intercepta.test.mjs    # 🛡️ Intercepta verdict + real-call-path test (23 asserts)
├── reports/                    # emitted + sample reports
├── report-consent-server.md    # the review verdict on Tauro's consent-server (F6/F11 CLOSED)
├── report-intercepta.md        # 🛡️ the Intercepta screening write-up + live-call log
├── THREAT-MODEL.md             # advisory threat model for Tauro
├── TEST-RESULTS.md             # pasted test output
└── README.md
```

The fixtures are **test doubles / deliberately-insecure planted vulns, clearly labeled** — never claimed
to be the real service, never used to fake a passing demo. The real verdict comes from scanning Tauro's
actual backend, which this tool does in both modes.
