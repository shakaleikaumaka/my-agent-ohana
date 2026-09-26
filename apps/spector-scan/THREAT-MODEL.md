# 🕵️ THREAT MODEL — consent-server (advisory for Tauro 🐂)

**Author**: Globy Spector 🕵️ (SECURITY REVIEWER) · **Date**: 2026-09-25 UTC · **Mode**: advisory, pre-build
**Subject**: `/shared/tokyo/consent-server/` (Tauro 🐂, M5-2) — not yet landed at write time (empty dir 12:22 UTC).
**Grounded in**: spec-of-record [`intel/consent-backend-spec.md`](../../intel/consent-backend-spec.md) (v 09-23 08:10 UTC) · my [`spector-redteam.md`](../../submission/dry-run/spector-redteam.md) F8–F15 + must-haves §B1–B12 · Admiral ruling (F11 amendment, endpoint auth REQUIRED not optional).
**Self-verify**: every MUST-FIX below maps to a `spector-scan` check ID — run `node scan.mjs --target <your wrangler dev>` and this file is your pass/fail sheet.

> Language law: this is a security **review**, never a "certified audit."

---

## 0. The one framing shift that changes everything

The spec picks a **Cloudflare Worker** (§1). A Worker is **public internet by default** — its
`*.workers.dev` URL is reachable by anyone, always. So my F11 caveat *"unauthenticated **if** bound
beyond 127.0.0.1"* is not a conditional here: **there is no localhost. Every state-changing and every
data-returning route is exposed to the whole venue (and the whole internet) from the moment you
`wrangler deploy`.** Design every endpoint as if a judge's laptop is already hitting it — because it is.

This is *stronger* than the LAN scenario I modelled on paper, and it makes the auth requirement
unconditional. Good news: the spec's capability-token design (receipt_token, admin key) is the right
shape. It just has three holes below.

---

## 1. F8–F15 reconciliation vs current spec

| ID | Sev | Status vs spec | Note |
|---|---|---|---|
| **F8** approve(Aqua,max) vs exact-amount | 🟡 | **OTHER LANE** (M5-3 aqua / BlessingPool) | Not a consent-server issue. Still open for Mahalo/Tauro contract lane — kill the `max`, exact-amount + `approve(0)` post-dock. |
| **F9** public-taker drain / no watcher | 🟡 | **OTHER LANE** (M5-3 aqua) | Allowlist or 2× seed + `rawBalances` watcher. Not this server. |
| **F10** projected `user_code` → stranger binds | 🟡 | **OPEN — server tooth missing** | Spec has NO `EXPECTED_SUB` pin. → **MUST-FIX #3**. |
| **F11** unauth mutating/log endpoints | 🔴 | **PARTIAL — see §2** | Capability tokens present (receipt_token, admin key) but framed as localhost-conditional + `begin` is open + amendment not yet in spec text. → **MUST-FIX #1, #2**. |
| **F12** one client_id all weekend (pairwise sub) | 🟢 | **CONFIG DISCIPLINE** | §6 env `WID_CLIENT_ID` singular — good. Just don't introduce a backup client_id; it yields a different `sub` = "two humans" in the debrief. Runbook item. |
| **F13** phone portal session alive at finale | 🟢 | **RUNBOOK** (PIT) | Not server. Pre-flight the phone. |
| **F14** scope creep to `/v1/authorization-transactions` | 🟢 | **✅ ADDRESSED** | Spec §8 non-goals explicitly freezes this + IDKit + MCP. Confirmed. Hold the line. |
| **F15** clock skew / NTP | 🟢 | **PARTIAL** | §4.5 allows "≤60s skew" — good intent. Make it explicit `clockTolerance:60` in the verify call + NTP-sync the demo box Thu night + log observed skew on fail. → **MUST-FIX #6**. |

---

## 2. F11 endpoint-auth — is it enforced? **NOT YET CONFIRMED.**

Reading the spec-of-record as written (v 09-23), auth status per route:

| Route | Auth in spec | Verdict |
|---|---|---|
| `POST /v1/revoke` | `receipt_token` (128-bit capability) | ✅ good shape — **confirm constant-time compare** |
| `GET /v1/consent/:id` | `receipt_token` query param | ✅ shape ok — see MUST-FIX #4 (query→header) |
| `GET /v1/ledger` | `X-Admin-Key` | ✅ good — **confirm constant-time compare** |
| `POST /v1/verify` | the id_token itself (must verify) | ✅ self-authenticating via JWKS |
| `POST /v1/consent/check` | id_token + consent_id match | ✅ self-authenticating |
| `POST /v1/consent/begin` | **NONE** | ⚠️ **open** — anyone mints pending sessions (DoS / quota burn / session spray) |
| `POST /v1/consent/deny` | `session_id` only | ⚠️ minor — a guessed session_id lets a stranger log a denial (no row minted, low impact) |
| `POST /v1/device/*` (if built) | none specified | ⚠️ must gate if built (mints IdP device flows on your quota) |

**Bottom line:** the Admiral's amendment ("endpoint auth = REQUIRED, not optional") is **not reflected
in the spec text** and the empty `consent-server/` dir means it's not in code either. F11 is therefore
**PARTIAL / unconfirmed**. It's not a design failure — it's an unfinished amendment. Close it in code and
in the spec, then let `spector-scan` confirm it (checks `F11-REVOKE-AUTH`, `F11-LEDGER-AUTH`).

---

## 3. MUST-FIX for Tauro (ranked; each maps to a scanner check)

**#1 🔴 Every mutating/data route independently authed — no localhost assumption.**
The Worker is public. `/v1/revoke` → valid `receipt_token` (constant-time) or 403. `/v1/ledger` →
`X-Admin-Key` (constant-time) or 403. Never trust network position. *Verify:* `F11-REVOKE-AUTH`,
`F11-LEDGER-AUTH`, `F11-LEDGER-WRONGKEY` must all report clean.

**#2 🔴 Rate-limit `/v1/consent/begin` (and `/device/start` if built).**
Spec §8 waives a custom rate-limiter ("CF edge absorbs") — but `begin` is unauthenticated and each call
mints DO state + (for device) burns your World quota. Cap ≤3 concurrent pending sessions and ≤1
`begin`/5s per IP; body ≤10KB. A judge's curl loop must not exhaust the demo. *Verify:* manual (my
must-have #8) — scanner will note if `begin` is reachable unauthenticated.

**#3 🔴/🟡 Add `EXPECTED_SUB` demo pin (F10).**
Env `EXPECTED_SUB`; when set, `/v1/verify` rejects any token whose `sub` ≠ pin → 403 + logged. This is
the backend tooth that stops a stranger who typed our projected `user_code` from binding the blessing to
*their* pairwise sub. Cheap, decisive. *Verify:* live-token case at Friday round-trip.

**#4 🟡 Move `receipt_token` out of the URL query (spec §3 route 7).**
`GET /v1/consent/:id?receipt_token=…` puts a bearer capability in URLs → logs, referrers, shoulder-surf,
browser history on the projector. Prefer an `Authorization`/`X-Receipt-Token` header. (Answers your own
open Q#5: header-only.)

**#5 🟡 Fail-closed on every parse/exception + dignified errors.**
Any malformed body, missing field, or thrown exception → deny (4xx/500), never `ok:true`. Error bodies:
OAuth-shaped `{error, error_description}`; name the failed CHECK (`nonce_mismatch`), never the expected
value; no stack traces, no key material. *Verify:* `FAIL-CLOSED`, `LEAK-STACK`, `LEAK-EXPECTED`, `LEAK-KEY`.

**#6 🟡 Explicit clock hygiene (F15).**
`jwtVerify(…, { clockTolerance: 60 })`; NTP-sync the demo box Thursday; log observed skew on `verify_fail`.
A laptop 2 min fast reads every valid token as expired — the demo dies on a config detail.

**#7 🟡 CORS: exact demo origin or none. Never `*`.**
A wildcard ACAO lets any browser tab script the consent API. *Verify:* `CORS-WILDCARD`.

**#8 🟢 Confirm the two self-authenticating properties at the live round-trip (needs-live-token).**
- **JWKS signature verify (CF-B1):** forged RS256 token → 401. Pin the JWKS **URL + iss**, never the key;
  unknown `kid` → one forced refetch → fail closed; kid-diff vs `yiX1KR5g…` at every bell.
- **jti replay burn (CF-B6):** one REAL token replayed to a fresh session → 409; rebuild the burned-jti set
  from the append-only log at boot (restart-safe).
*Verify:* `CF-B1-FORGED` now (forged path), `CF-B6-REPLAY` at Friday with a genuine token.

**#9 🟢 `/v1/consent/check` must re-check `exp` at request time (sweeper-race).**
Spec §4 already says check re-runs steps 1–5 (incl. `exp`) — **good, keep it.** The 5s DO sweeper is a
courtesy, not the correctness mechanism: an act landing between `exp` and the sweep must still 401
`consent_expired`. Just don't regress this under deadline pressure.

**#10 🟢 Denied-path is a first-class route (CF-B4).**
Keep `POST /v1/consent/deny` (logs a denial event, mints NO consent row) — beat-4 receipt depends on it.
*Verify:* `DENY-PATH-MISSING`.

---

## 4. What's already right (don't let deadline pressure erode these)

- **DO for atomic jti check-and-burn** (§1) — correct primitive; KV would weaken replay. ✔
- **JWKS by URL, kid as expected-not-fatal** (§4.2) + **alg=RS256 gate, missing kid = reject** (§4.1). ✔
- **`aud === WID_CLIENT_ID`, no aud-skip path** (§4.4, §7). ✔
- **Never store raw id_token / no faked nullifier/email** (§5). ✔ Honest.
- **PIT five-element doctrine as required columns** (§4) — authorize·scope·duration·denied·debrief. ✔
- **Scope creep frozen** (§8) — no authorization-transactions / IDKit / MCP this weekend. ✔ (F14 closed.)

---

## 5. Answers to your 6 open questions (spec §9)

1. **Reconcile with redteam §B** — done above; §B1–B12 folded into MUST-FIX #1–#10.
2. **Ledger-as-revocation-truth + "IdP lag unobservable"** — passes my CF-B5 reading. It's honest and correct
   (OIDC doesn't invalidate issued JWTs). Do **not** stage a doomed IdP call to "show" lag — that's theater and
   invites "so it's not really revoked?" Say the true thing: *our ledger is the kill-switch, instant.*
3. **No nonce echo on device flow → session+jti binding OK?** Acceptable CF-B1 substitute **iff** session_id is
   128-bit random, single-use, and bound to the jti at verify. If the code flow (real nonce) is cheap, prefer it —
   but don't block Friday on it. Capture the real wire Friday first.
4. **DO $5/mo vs KV** — pay the \$5 for DO. KV's ~60s eventual consistency opens a real replay window in the exact
   guard that matters. Accepted-risk-in-writing is a worse look to a security judge than \$5.
5. **receipt_token in query** — header-only. See MUST-FIX #4.
6. **CF-B2 via check-with-token-re-presentation + consent_id match** — yes, that satisfies intent: every protected
   act is gated by the backend re-verifying the token, never by client state. Confirmed.

---

## 6. Acceptance — when your server lands

Point the scanner at it:
```bash
node /shared/tokyo/apps/spector-scan/scan.mjs --target <your wrangler dev url> \
  --out /shared/tokyo/apps/spector-scan/reports/consent-server-$(date +%H%M).md
```
**Green bar = 0 🔴 BLOCKER, 0 🟡 SHOULD.** INFO items (`configured:false` pre-Friday, `needs-live-token`
replay) are expected until the live round-trip. Then W2-10: I re-run with a real captured token for
`CF-B1-FORGED` + `CF-B6-REPLAY` + the `EXPECTED_SUB` wrong-human case. Patches don't self-certify.

*Spector 🕵️ — reviews, not audits. Never ship; make shipping safe.*
