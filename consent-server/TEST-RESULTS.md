# TEST-RESULTS — Trinity Consent Server (M5-2)

> ✏️ RENAMED 2026-09-27: the agent is now **GLOBY 🌍** (globyagent.com). `globie.myagentohana.eth` below is the legacy immutable on-chain label; `globy.myagentohana.eth` is the canonical subname. (Historical test record — results left as-run.)

**Run by:** Globy Tauro 🐂 · **When:** 2026-09-25 (M5-2b hardening pass, ~13:2x UTC) · **Machine:** agent container (offline mock-issuer mode — no World client_id, no Cloudflare account needed).

Two independent test paths, **both green**:
1. **Vitest + workerd/miniflare** — runs the REAL Worker + Durable Object in the Cloudflare runtime, no network, no port. Tokens signed with a self-signed RS256 test key.
2. **curl vs `wrangler dev`** — the actual dev server on `127.0.0.1:8787`, full HTTP round-trips.

Both exercise the same ceremony and the same fail-closed cases. Real output pasted verbatim below (ANSI stripped).

> **M5-2b delta (this run):** patched the 3 residual 🟡 gaps from Spector's acceptance scan — F10 `EXPECTED_SUB` subject pin, `receipt_token` moved out of the URL query into a header, and a per-IP rate limit on `/v1/consent/begin`. Suites grew 17→**22** (vitest) and 19→**21** (curl). See the new cases marked below.

---

## Path 1 — `npm test` (vitest, workerd) → **22 passed / 0 failed**

```
✓ test/consent.test.ts > healthz + config > reports configured + mock JWKS kid
✓ test/consent.test.ts > begin > issues session+nonce for a known agent
✓ test/consent.test.ts > begin > rejects an unknown agent (403 unknown_agent)
✓ test/consent.test.ts > HAPPY PATH: begin -> verify -> check -> revoke -> check(401) -> receipt > walks the whole ceremony and halts instantly on revoke
✓ test/consent.test.ts > fail-closed cases > forged signature -> 401 invalid_signature
✓ test/consent.test.ts > fail-closed cases > jti replay -> 409 jti_replayed
✓ test/consent.test.ts > fail-closed cases > expired token -> 401 token_expired
✓ test/consent.test.ts > fail-closed cases > bad issuer -> 401 bad_issuer
✓ test/consent.test.ts > fail-closed cases > bad audience -> 401 bad_audience
✓ test/consent.test.ts > fail-closed cases > insufficient acr (non-Orb) -> 403 acr_insufficient
✓ test/consent.test.ts > fail-closed cases > scope not allowed at verify -> 403 scope_not_allowed
✓ test/consent.test.ts > fail-closed cases > action outside granted scope at check -> 403 scope_not_allowed
✓ test/consent.test.ts > fail-closed cases > nonce mismatch -> 401 nonce_mismatch
✓ test/consent.test.ts > F11 endpoint auth > revoke with wrong receipt_token -> 403 bad_receipt_token (cannot revoke unauthenticated)
✓ test/consent.test.ts > F11 endpoint auth > ledger without X-Admin-Key -> 403; with key -> 200
✓ test/consent.test.ts > F11 endpoint auth > receipt view without receipt_token -> 403
✓ test/consent.test.ts > F11 endpoint auth > receipt token in the URL query is NO LONGER accepted (leak closed) -> 403   [M5-2b #4]
✓ test/consent.test.ts > F11 endpoint auth > receipt view accepts Authorization: Bearer <receipt_token>                 [M5-2b #4]
✓ test/consent.test.ts > F10 subject pin ... > token with a different sub -> 401 sub_mismatch (stranger cannot bind), no jti burned   [M5-2b #1 / F10]
✓ test/consent.test.ts > F10 subject pin ... > token with the pinned sub still binds normally (happy path unaffected)   [M5-2b #1 / F10]
✓ test/consent.test.ts > begin rate limit (per-IP fixed window, default 30/60s) > caps unauthenticated begin spray -> 429 rate_limited past the limit   [M5-2b #2]
✓ test/consent.test.ts > deny path (first-class outcome, no consent minted) > logs a denial and mints no consent row

 Test Files  1 passed (1)
      Tests  22 passed (22)
   Duration  1.69s
```

Command: `npm test` (or `npx vitest run`). Vitest v2.1.9, `@cloudflare/vitest-pool-workers`. The test rig sets `EXPECTED_SUB` (= the default minted sub) so the F10 pin path is exercised; `test.sh` runs UNPINNED to prove the pin stays optional.

---

## Path 2 — `bash test.sh` (curl vs `wrangler dev`) → **21 passed / 0 failed**

```
starting wrangler dev on 127.0.0.1:8787 ...
  PASS: healthz reachable (200)
  configured=true issuer=https://mock.trinity.local
  PASS: admin reset (200)
== HAPPY PATH ==
  PASS: begin (200)
  PASS: verify (200)
  PASS: check before revoke (200)
  PASS: revoke (receipt cap) (200)
  PASS: check AFTER revoke -> 401 (401)
  PASS:   reason consent_revoked (consent_revoked)
  PASS: receipt view (header cap) (200)
  PASS:   receipt status revoked (revoked)
  PASS: receipt via query -> 403 (leak closed) (403)          [M5-2b #4]
  PASS:   reason receipt_token_required (receipt_token_required)
== FAIL-CLOSED ==
  PASS: forged sig -> 401 (401)
  PASS: replay first verify -> 200 (200)
  PASS: replay second verify -> 409 (409)
  PASS: expired -> 401 (401)
  PASS:   reason token_expired (token_expired)
  PASS: unauth revoke -> 403 (403)
  PASS:   reason bad_receipt_token (bad_receipt_token)
  PASS: ledger no key -> 403 (403)
  PASS: ledger with key -> 200 (200)

RESULT: 21 passed / 0 failed
```

Command: `npm run keys && bash test.sh`. `wrangler dev` binds `127.0.0.1` only (F11 — never `0.0.0.0`).

---

## What is proven

| Requirement (dispatch + spec + F11) | Proven by |
|---|---|
| begin → verify(mock token) → check(ok) → revoke → check(401 consent_revoked) → receipt | HAPPY PATH block (both paths) |
| Bad signature rejected | forged sig → 401 invalid_signature |
| jti replay blocked | jti replay → **409** jti_replayed |
| Expired token rejected (beyond clock skew) | expired → 401 token_expired |
| Wrong issuer / audience rejected | bad_issuer / bad_audience → 401 |
| Proof-of-personhood gate | acr_insufficient → 403 (non-Orb acr) |
| Scope enforced server-side (verify + per-action check) | scope_not_allowed → 403 (both) |
| Nonce binding | nonce_mismatch → 401 |
| **F10: subject pin (a stranger's valid token can't bind)** | different `sub` → **401 sub_mismatch**, no jti burned; pinned sub still binds |
| **#4: receipt capability never rides in a URL** | header (`X-Receipt-Token` / `Bearer`) → 200; old `?receipt_token=` → **403 receipt_token_required** |
| **#2: begin DoS bound** | 30 begins/60s per IP, then **429 rate_limited** with `retry_after_sec` |
| **F11: revoke NOT callable unauthenticated** | wrong receipt_token → **403** bad_receipt_token; consent stays active |
| **F11: /v1/ledger admin-gated** | no key → 403; X-Admin-Key → 200 |
| **F11: receipt view capability-gated** | no receipt_token → 403 |
| Instant halt (app-layer ledger = revocation source of truth) | check flips 200→401 the instant revoke lands |
| Denied path is first-class (no consent row) | deny logs a `deny` event, 0 grants minted |
| Fail-closed | unexpected error → 500; JWKS fetch failure → 503 (never implicit allow) |

## Honesty notes
- **Mock issuer only *(SUPERSEDED — see MISSION 6 below)*.** The offline test suite signs tokens with a self-signed RS256 key (`scripts/mkkeys.mjs`), clearly a TEST key — never presented as a real World token. As of Mission 6 the **prod Worker is live-wired to the real sandbox issuer** (the config swap described here is done: `MOCK_JWKS`/`ISSUER_OVERRIDE` dropped, real `WID_CLIENT_ID` set). See the MISSION 6 section for prod evidence. The only remaining input is a real Orb `id_token`.
- **F10 pin is optional.** With `EXPECTED_SUB` unset the server behaves exactly as before (any valid Orb token binds) — vitest sets it to exercise the reject path, `test.sh` leaves it unset to prove the default. For the live demo, pin Shaka's captured pairwise `sub`.
- **Rate limit is defense-in-depth, not a World-quota guard.** No device flow exists here, so `begin` burns no World quota; the CF edge remains the primary throttle. The DO counter just bounds unauthenticated local state spray.
- **Deploy status *(UPDATED)*.** Prod is LIVE at `https://trinity-consent.shakaverse.workers.dev` on a DO-capable family CF account (no new $5 ask). Runs the real sandbox issuer as of Mission 6.
- Numbers above are real runs on the agent container, not projections.

---

## 🌅 MISSION 6 — LIVE-WIRE TO REAL WORLD ISSUER (2026-09-25, prod)

The mock issuer is retired in prod. `trinity-consent` now verifies against the **real World ID sandbox** issuer + its live remote JWKS. This was a **pure config swap** (no code change): deleted `ISSUER_OVERRIDE` + `MOCK_JWKS` secrets, set the real `WID_CLIENT_ID` (+ `WID_CLIENT_SECRET`), redeployed.

### STEP 1 — Issuer verdict (empirical, judge-facing evidence)

Both candidate domains were probed at `/.well-known/openid-configuration`:

| Domain | discovery | `issuer` claim | `jwks_uri` resolves | verdict |
|---|---|---|---|---|
| `https://sandbox.auth.world.org` | **HTTP 200** | `https://sandbox.auth.world.org` | **HTTP 200** (kid `SjxoYTY6TKyO9wDOz9VmG4ze3tJsvwsPE5zgkOqqwAo`) | ✅ **PINNED** |
| `https://auth.worldcoin.dev` | HTTP 200 | `https://auth.worldcoin.dev` | HTTP 200 (kid `yiX1KR5gDdPTqsHAbT5d0JqIG6-HcTv8wGao4sSTgsY`) | ❌ legacy trap |

Both resolve and are schema-identical, so reachability alone is **not** decisive. The deciding fact: **our client (`a8cb41bd-…-b3`) was registered on the SANDBOX portal (`sandbox.auth.world.org/portal`)**, so a real token minted for it will carry `iss=https://sandbox.auth.world.org`. The verifier's `iss` MUST equal the token's `iss`, therefore we pin **sandbox**. Independently confirmed by sysadmin's own probe (authorize+token endpoints live on sandbox; `auth.worldcoin.dev` = legacy). `createRemoteJWKSet` stays dynamic so the rotating `kid` self-heals.

Pinned (in `wrangler.toml [vars]`, non-secret):
- `WID_ISSUER = https://sandbox.auth.world.org`
- `JWKS_URL   = https://sandbox.auth.world.org/.well-known/jwks.json`

### STEP 2–3 — Secret swap + redeploy

- `wrangler secret delete ISSUER_OVERRIDE` → issuer now falls through to `WID_ISSUER` (sandbox).
- `wrangler secret delete MOCK_JWKS` → key source now the **remote** sandbox JWKS.
- `wrangler secret put WID_CLIENT_ID` = the real sandbox client_id (the expected `aud`).
- `wrangler secret put WID_CLIENT_SECRET` = client secret (Worker env only; `client_secret_basic`). *Note: this consent server verifies a presented `id_token`; it does not itself perform the code→token exchange, so the secret is stored for completeness/future use — the OAuth callback exchange lives in the frontend/world-kit callback at `myagentohana.com/auth/world/callback`.*
- Secrets remaining on the Worker: `ADMIN_KEY`, `WID_CLIENT_ID`, `WID_CLIENT_SECRET` (mock secrets gone).
- `wrangler deploy` → Version `42453598-ae7d-47a0-93bb-6b3dd9d9a7ba`.

### STEP 3 — healthz on the REAL issuer (live output)

```
GET https://trinity-consent.shakaverse.workers.dev/healthz
{
  "ok": true,
  "service": "trinity-consent",
  "issuer": "https://sandbox.auth.world.org",   ← real, not mock
  "jwks_source": "remote",                       ← real remote JWKS, not local-mock
  "jwks_kids": [],                                ← empty by design in remote mode
  "configured": true,                            ← real client_id (aud) present
  "require_orb_acr": true
}
```

### Live probe on prod (real-issuer, mock secrets removed)

| Check | Result |
|---|---|
| `POST /v1/consent/begin` (tauro.demo.eth) | 200 → `session_id`+`nonce` |
| `POST /v1/consent/begin` unknown agent | **403** unknown_agent |
| `POST /v1/verify` forged token (fake kid) | **401 `unknown_kid`** — server queried the **real sandbox JWKS**, no such key → fail-closed. This is the proof the mock is gone and the real key set is authoritative. |
| `POST /v1/verify` malformed token | **401** (not 503 — route is now `configured`) |
| `GET /v1/ledger` no admin key | **403** (F11) |
| `GET /v1/ledger` w/ `X-Admin-Key` | **200** (F11) |
| `POST /v1/revoke` missing fields | **400** bad_request |
| `POST /v1/revoke` unknown consent + receipt | **404** not_found (F11 cap enforced) |
| `GET /v1/consent/:id` no receipt header | **403** receipt_token_required |
| `GET /v1/consent/:id?receipt_token=…` (query) | **403** receipt_token_required — **query does NOT authenticate** (F10/#4 hardening intact) |
| `GET /v1/consent/:id` w/ `X-Receipt-Token` header | **404** not_found — header IS read (unknown id) |

vitest offline suite: **22/22** still green (unchanged code).

### What still needs a real token

Everything is wired and fail-closed EXCEPT the one input only a human can supply: a **real Orb-verified World `id_token`** whose `iss=https://sandbox.auth.world.org`, `aud=<our client_id>`, `acr=https://world.org/oidc/acr/orb-v3`, and `nonce` echoing a live `begin` session. That requires a person completing the World auth flow at the booth. The full happy path (begin→verify→check→revoke→check-401→receipt) has been proven end-to-end **offline** with a self-signed test token (22/22 vitest + curl); the prod pipeline is byte-identical minus that one real credential. A real-token round-trip capture is the only remaining Friday/booth item.

---

## 🌊 MISSION 6 wave 2a — CORS + real subnames (unblock Kaaak's live demo)

Two fixes so the browser shell can talk to the Worker cross-origin and the 6 REAL ENS
subnames are recognized. **F10/F11 auth semantics untouched** — CORS is orthogonal to auth.

### FIX 1 — CORS
- `OPTIONS` preflight → **204** with the CORS headers (answered before routing/auth).
- `Access-Control-Allow-Origin` **reflects any `https://*.taur.link` origin** (and the pinned
  demo origin); falls back to the demo origin for anything else — **never bare `*`**. We use
  header auth (`X-Admin-Key` / `X-Receipt-Token` / `Authorization: Bearer`), not cookies, so
  no `Allow-Credentials`.
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: content-type, x-receipt-token, authorization, x-admin-key`
- CORS headers are stamped on **every real response** (success and error), plus `Vary: Origin`.

### FIX 2 — scopeMap (6 real subnames, parent `myagentohana.eth`)
| subname | allowed scopes |
|---|---|
| trace.myagentohana.eth | steward:gift, food:surplus-alert |
| terri.myagentohana.eth | receipt:issue, ledger:write |
| shaka.myagentohana.eth | verse:perform |
| pit.myagentohana.eth | knowledge:capture, receipt:issue |
| spector.myagentohana.eth | security:scan, report:write |
| crops.myagentohana.eth | repo:scan, report:write |
Demo placeholders (`tauro.demo.eth`, `trace.demo.eth`) kept for offline fixtures/old curl tests.

### Evidence — `wrangler dev` (local, mock issuer), cross-origin from the demo origin

```
OPTIONS /v1/consent/begin  (Origin: https://agentohana-demo-573fkrr6yf-ffieyo32.taur.link)
→ HTTP/1.1 204 No Content
  Access-Control-Allow-Origin: https://agentohana-demo-573fkrr6yf-ffieyo32.taur.link
  Access-Control-Allow-Methods: GET, POST, OPTIONS
  Access-Control-Allow-Headers: content-type, x-receipt-token, authorization, x-admin-key
  Access-Control-Max-Age: 86400
  Vary: Origin

POST /v1/consent/begin {"agent_subname":"trace.myagentohana.eth"}  (cross-origin)
→ HTTP/1.1 200 OK  +  Access-Control-Allow-Origin: <demo origin>
  {"session_id":"sess_…","nonce":"…","expires_at":…}

begin for all 6 real subnames → 200 (trace·terri·shaka·pit·spector·crops.myagentohana.eth)
GET /v1/ledger no admin key → 403 (F11 intact)
GET /healthz  Origin: https://evil.example.com → ACAO = <demo origin> (never *)
```

vitest: **31/31** (was 22 + 3 CORS + 6 real-subname begins). Commit `1d4c349`.

### Prod redeploy — ✅ LIVE (Version `c7ae657b-6eb0-407c-8074-ed3ff8d086d5`)

Deployed to `https://trinity-consent.shakaverse.workers.dev`. Prod curl evidence:

```
OPTIONS /v1/consent/begin  (Origin: https://agentohana-demo-573fkrr6yf-ffieyo32.taur.link)
→ HTTP/2 204
  access-control-allow-origin: https://agentohana-demo-573fkrr6yf-ffieyo32.taur.link
  access-control-allow-methods: GET, POST, OPTIONS
  access-control-allow-headers: content-type, x-receipt-token, authorization, x-admin-key
  access-control-max-age: 86400
  vary: Origin

POST /v1/consent/begin {"agent_subname":"trace.myagentohana.eth"}  (cross-origin)
→ HTTP/2 200  +  access-control-allow-origin: <demo origin>
  {"session_id":"sess_dV8t_hpebLyCzx_z","nonce":"…","expires_at":…}

GET /healthz → {issuer:"https://sandbox.auth.world.org", jwks_source:"remote", configured:true, require_orb_acr:true}
GET /v1/ledger  (no X-Admin-Key) → 403   (F11 intact)
begin for all 6 real subnames → 200 (trace·terri·shaka·pit·spector·crops.myagentohana.eth)
```

**Live for Kaaak: flip `WIRE.enabled = true`.** Base = `https://trinity-consent.shakaverse.workers.dev`,
`subnameFor` maps each card id → `<id>.myagentohana.eth` (shaka-twin → `shaka.myagentohana.eth`).
Note: the CF deploy token stays in the team's private credential store (never in this repo) per
SWEEP LAW — the Admiral runs the final sweep after the fully-live demo is verified end-to-end.

---

## 🎬 FILM-GATE — Orbie (Beat 3 blessing target) added to scopeMap ✅ LIVE

Beat 3: the human (Ian/World DevRel) blesses **Orbie 🤖**, so `orbie.myagentohana.eth`'s live
`begin` must go ● LIVE (not just rehearsal fixture) — otherwise a 403 unknown_agent prints an
uncatchable console error on the very card being blessed.

- Added `orbie.myagentohana.eth` → **STORY_BUDDY** scopes `["story:tell","greet:human"]`
  (Orbie tells stories + greets on the human's behalf; MAY NOT move funds / touch other agents /
  act after revoke — enforced by scope + the app-layer revoke halt, matching the card's may/mayNot).
- 6 existing subnames + demo placeholders unchanged.
- Redeployed → **Version `75387cdb-7dc0-4774-b6a1-d30ddc32aa6b`**.

Prod evidence:
```
POST /v1/consent/begin {"agent_subname":"orbie.myagentohana.eth"}  (cross-origin, demo origin)
→ HTTP/2 200  +  access-control-allow-origin: <demo origin>
  {"session_id":"sess_6Fkb66dkffn273eh","nonce":"…","expires_at":…}

GET /healthz → configured:true, issuer:sandbox.auth.world.org, jwks_source:remote
begin all 7 subnames → 200 (orbie·trace·terri·shaka·pit·spector·crops.myagentohana.eth)
GET /v1/ledger no X-Admin-Key → 403   (F11 intact)
begin nope.myagentohana.eth (unknown) → 403 unknown_agent   (F10/scope gate intact)
```

vitest: **32/32** (added orbie begin). Commit tracked below. Kaaak: add `orbie.myagentohana.eth`
to `WIRE.liveSubnames` (one line) — backend is ready.
