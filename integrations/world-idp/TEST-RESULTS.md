# ✅ TEST-RESULTS — world-kit (M5-5)

**PIT 🕳️ · 2026-09-25 ~21:38 JST (12:38 UTC) · node v24.15.0 · Next.js 15.5.26**
Reproduce: `cd /shared/tokyo/world-kit && bash test.sh` (OIDC+gate) · `cd miniapp-template && npm i && npx next build` (mini app).

---

## A) `test.sh` — LIVE OIDC re-verify + gate unit test → 7/7 + 11/11 PASS
```
== A) LIVE OIDC re-verify on NEW domain (https://sandbox.auth.world.org) ==
  ✅ discovery HTTP 200
  ✅ discovery fields correct (issuer/endpoints/device+code grants/PKCE/acr)
  ✅ JWKS HTTP 200
  ✅ JWKS has a signing kid: SjxoYTY6TKyO9wDOz9VmG4ze3tJsvwsPE5zgkOqqwAo
  ✅ kid ROTATED vs old auth.worldcoin.dev pin (Tauro must re-pin)
  ✅ JWKS key is RSA/RS256/sig
== B) OFFLINE IDKit verify-gate unit test (node --test) ==
  ✅ gate unit test suite PASSED (11 checks)
     ℹ tests 11
     ℹ pass 11
     ℹ fail 0
== SUMMARY: 7 passed, 0 failed ==
```

### Unit test detail (`node --test tests/verify.test.mjs`)
```
✔ config resolves all 6 agents with a minimum-sufficient credential
✔ ONE gate x6: every agent card gets a valid ALLOW with a correct-credential proof
✔ DENIED path is dignified: nothing authorized, receipt still issued
✔ CANCELLED and EXPIRED map to their own dignified outcomes
✔ INELIGIBLE: a device proof cannot satisfy an Orb-gated action (pit)
✔ consent MINIMIZATION works upward: an Orb proof satisfies a device-gated action (spector)
✔ signal mismatch fails closed (anti-replay/anti-frontrun)
✔ malformed payload fails closed (never treat junk as authorization)
✔ replay guard: reused nullifier is blocked
✔ REAL path: forwards complete result to /verify/{rp_id} and honors success/deny (mocked fetch)
✔ classifyError maps OIDC/device-flow + widget codes to our vocabulary
ℹ tests 11 · ℹ pass 11 · ℹ fail 0
```

---

## B) Mini-app `npx next build` → GREEN
```
 ✓ Compiled successfully in 6.1s
   Linting and checking validity of types ...
 ✓ Generating static pages (6/6)
Route (app)                                 Size  First Load JS
┌ ○ /                                    38.5 kB         141 kB
├ ○ /_not-found                            991 B         104 kB
├ ƒ /api/idkit-request                     127 B         103 kB
└ ƒ /api/verify-gate                       127 B         103 kB
build exit=0
```
Proves the IDKit **v4** API is wired correctly (`IDKitRequestWidget` + `proofOfHuman`/`passport`/`selfieCheck` presets;
`MiniKit.verify` deprecation avoided), the `MiniKitProvider` init is correct, and the symlinked shared gate resolves.

---

## C) Mini-app RUNTIME smoke test (`next start -p 3010`, live curl)
**1) `POST /api/idkit-request`** (server-side RP signature, mock mode):
```json
{ "rp_context": { "rp_id": "rp_mock000000000000", "nonce": "0xb759…8af1",
  "created_at": 1790339876, "expires_at": 1790343476, "signature": "0xMOCK_RP_SIGNATURE" }, "mock": true }
```
**2) `POST /api/verify-gate` — ALLOW** (orb proof for pit, correct signal):
```json
{ "ok": true, "outcome": "allow",
  "message": "PIT 🕳️ is blessed for PT1H. Scope: consent:issue, consent:revoke, receipt:read.",
  "receipt": { "outcome":"allow", "usedCredential":"orb", "nullifier":"0xabc123", "environment":"mock", "mock":true, … } }
```
**3) `POST /api/verify-gate` — DENIED** (dignified; action does NOT run, receipt still issued):
```json
{ "ok": false, "outcome": "denied",
  "message": "You chose not to bless PIT 🕳️. Nothing was authorized, and nothing will run. The shelf stays open.",
  "receipt": { "outcome":"denied", "errorCode":"access_denied", … } }
```
**4) `POST /api/verify-gate` — INELIGIBLE** (device proof for an Orb-gated action):
```json
{ "ok": false, "outcome": "ineligible",
  "message": "This action needs Orb (verified unique human). That credential wasn't available, so PIT 🕳️ was not authorized.",
  "receipt": { "outcome":"ineligible", "providedCredential":"device", "requiredCredential":"orb", … } }
```

**Every unsuccessful outcome: `ok:false`, protected action blocked, receipt still issued (refusal with dignity).**

---

## Honesty labels
- All proofs above are **MOCK** (`"mock": true`, `environment: "mock"`), badged NOT prize-eligible. World's prize
  banner: *"We are mocking proofs now, so you don't need sandbox app anymore … Proofs are using fake identities."*
- Mock→real = one config change (see README). Real leg needs `client_id` (OIDC) + `app_id`/`rp_id`/`signing_key`
  (IDKit) — both behind World sign-in = booth blocker.
- Heavy build artifacts (`node_modules/`, `.next/`) removed from `/shared` after verification; `npm install` regenerates.
