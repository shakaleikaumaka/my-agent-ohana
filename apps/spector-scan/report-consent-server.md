# 🕵️ spector-scan — Security Review of `consent-server` (Tauro 🐂, M5-2)

**Reviewer**: Globy Spector 🕵️ · SECURITY REVIEWER, GLOBY SQUAD
**Target**: [`/shared/tokyo/consent-server/`](/shared/tokyo/consent-server/) — Trinity Consent Server (Cloudflare Worker + Durable Object)
**Date**: 2026-09-25 ~13:00 UTC (22:00 JST)
**Method**: `spector-scan` STATIC (source/config) + DYNAMIC (live `wrangler dev` black-box) + targeted curl round-trip
**Language law**: this is a security **review**, not a certified audit.

> **VERDICT: F6 CLOSED ✅ · F11 CLOSED ✅.** Zero BLOCKER, zero SHOULD across static + dynamic scans.
> Every mutating/data route is capability- or admin-key-gated; forged tokens 401; the DENIED path
> genuinely denies; **revocation truly revokes** (consent/check flips to 401 immediately). The two
> earlier open items from my Wave-2 red-team (F11 "unauth if LAN-bound" and F6 "backend unbuilt")
> are both resolved in this build.

---

## 1. How this was scanned

Three complementary passes — a real tool run, not a hand-wave:

| Pass | Command | Result | Report |
|---|---|---|---|
| STATIC (files+config) | `node scan.mjs --source /shared/tokyo/consent-server` | **PASS** · exit 0 · 0🔴 0🟡 · 22 files | [`reports/consent-server-static.md`](/shared/tokyo/apps/spector-scan/reports/consent-server-static.md) |
| DYNAMIC (black-box HTTP) | `node scan.mjs --target http://127.0.0.1:8787` (live `wrangler dev`) | **PASS** · exit 0 · 0🔴 0🟡 | [`reports/consent-server-dynamic.md`](/shared/tokyo/apps/spector-scan/reports/consent-server-dynamic.md) |
| Targeted curl round-trip | begin→mint→verify→revoke→check + F11 negatives | **all expected codes** (below) | this doc §3 |

The consent-server ran locally via its own offline mock issuer (`ISSUER_OVERRIDE` + `MOCK_JWKS` from
git-ignored `.dev.vars`), bound to `127.0.0.1:8787` — exactly as its README prescribes.

---

## 2. Static scan — findings (0 blocking)

Full report: [`reports/consent-server-static.md`](/shared/tokyo/apps/spector-scan/reports/consent-server-static.md).
13 checks; **0 BLOCKER, 0 SHOULD**. One 🟢 NICE hardening recommendation + two benign INFO items:

| Sev | ID | Finding | Note |
|---|---|---|---|
| 🟢 NICE | `SRC-CAP-IN-URL` | `receipt_token` read from a URL query string | `src/index.ts:195` — bearer capability in the URL (logs/history/projector). Non-blocking hardening; see §5.7. |
| ℹ️ INFO | `SRC-F6-OK` | **F6 CLOSED** — hosted server-side token verification present | `src/verify.ts:45` — `jose.jwtVerify(token, cfg.getKey, {...})`, wired into the Worker's `fetch` router. |
| ℹ️ INFO | `SRC-SECRET-TESTFIXTURE` | RSA private-key JWK in a test fixture | `test/fixtures/mock-private.jwk.json` — **known/acceptable**: a self-signed throwaway that signs nothing real (see `test/fixtures/README.md` + `.gitignore` note). Confirmed, not a leak. |

**12 static checks, all clean where they apply** (from the probe log):
- ✅ **F11 revoke** — every mutating consent route (`/v1/revoke`) shows a capability gate (`receipt_token` sha-256 + `safeEqual`).
- ✅ **F11 ledger/admin** — `/v1/ledger` + `/v1/admin/reset` gated by `adminOk()` (X-Admin-Key, constant-time).
- ✅ **0.0.0.0 bind** — no real bind; every mention is a comment *warning against it* (README/`test.sh`/`src/index.ts`). Localhost-only.
- ✅ **secrets** — the only committed key material is the labeled test fixture; the real dev `ADMIN_KEY` lives in git-ignored `.dev.vars`.
- ✅ **fail-open** — no default-allow; the top-level `catch` returns `err("internal_error", 500)` (fail-CLOSED).
- ✅ **replay guard** — atomic `burnJti` DO transaction + `safeEqual(nonce)`.
- ✅ **scope escalation** — requested scope filtered against `cfg.scopeMap[agent]`; extras → `scope_not_allowed`.
- ✅ **alg pinning** — `algorithms:["RS256"]` + `header.alg !== "RS256"` reject; no `alg:none` path.
- ✅ **iss pinning** — `issuer: cfg.issuer` pinned (sandbox.auth.world.org).
- ✅ **CORS** — no `Access-Control-Allow-Origin: *` emitted anywhere.
- ✅ **.gitignore** — covers `.dev.vars`, `.wrangler/`, `node_modules/`; no secrets file is tracked.

One nuance worth stating honestly (INFO, not a finding): **audience (`aud`) is only enforced once
`WID_CLIENT_ID` is configured.** Pre-client_id, the mint routes fail *closed* with `503 not_configured`
(verified in code at `src/index.ts` `/v1/verify` + `/v1/consent/check`), so no consent can be minted
without an `aud` check. This is the correct posture until booth Q#1 lands the real client_id.

---

## 3. Dynamic proof — the live round-trip (curl vs `wrangler dev`)

Real HTTP, real DO state, offline mock issuer. Every code below is what a correct fail-closed
backend must return:

| # | Action | Expected | Got | ✔ |
|---|---|---|---|---|
| F11-a | `POST /v1/revoke` with a bogus `receipt_token` (unknown consent) | 4xx, no revoke | `404 not_found` | ✅ |
| F11-b | `POST /v1/revoke` on a REAL consent with WRONG `receipt_token` | `403 bad_receipt_token` | `403 bad_receipt_token` | ✅ |
| F11-c | `GET /v1/ledger` with **no** `X-Admin-Key` | `403 forbidden` | `403 forbidden` | ✅ |
| F11-d | `GET /v1/ledger` with a **wrong** `X-Admin-Key` | `403 forbidden` | `403 forbidden` | ✅ |
| F11-e | `GET /v1/ledger` with the **right** `X-Admin-Key` | `200` + events | `200` (count=4) | ✅ |
| CF-B1 | `POST /v1/verify` with a **tampered-signature** token | `401 invalid_signature` | `401 invalid_signature` | ✅ |
| CF-B6 | Replay the SAME token to a used session | 4xx (no 2nd mint) | `409 session_not_pending` | ✅ |
| happy | begin → mint → verify | `200` + `consent_id` + one-time `receipt_token` | `200` ✅ | ✅ |
| revoke | `POST /v1/revoke` with the REAL `receipt_token` | `200 revoked` | `200 revoked` | ✅ |
| **DENY** | `POST /v1/consent/check` **after** revoke | `401 consent_revoked` | `401 consent_revoked` | ✅ |

**The two things I most wanted to break, and couldn't:**
1. **"One curl from venue Wi-Fi revokes the blessing" (my AP-2 kill-shot).** No. Revoke needs the
   128-bit one-time `receipt_token` (held only by the human); a wrong token is `403`, an unknown
   consent is `404`. The ledger that maps human↔agent needs `X-Admin-Key`; wrong/absent = `403`.
2. **"Revocation is theater — the agent keeps acting" (split-brain).** No. Immediately after revoke,
   `consent/check` returns `401 consent_revoked`. The app-layer ledger is the revocation source of
   truth and it flips atomically. **Revocation truly revokes.**

> Note on CF-B6: replay was blocked at `409 session_not_pending` because the session is single-use;
> the atomic `jti` burn (`burnJti`) is a second, independent layer behind it. Both must fail for a
> replay to mint — defense in depth. To exhibit `jti_replayed` specifically, replay a token against a
> *fresh* session; the server's own vitest suite covers that case (17/17).

---

## 4. F6 / F11 closure — confirmed or disputed?

- **F6 (secure backend for World-token validation exists + owned)** — **CONFIRMED CLOSED.** ✅
  A hosted verifier exists (`src/verify.ts`), re-verifies RS256 signature against a pinned JWKS,
  pins `iss`, and gates `aud` behind `configured`. A forged/tampered token 401s at runtime. My
  Wave-1 F6 ("backend doesn't exist + UNOWNED") and my Mission-5 caveat ("F6 partial/unconfirmed")
  are both **resolved**. Owner = Tauro 🐂; the rubric-fatal "client-only authz" risk is gone.

- **F11 (endpoint auth on revoke/ledger/admin — unauth if LAN-bound)** — **CONFIRMED CLOSED.** ✅
  Revoke is `receipt_token`-gated; ledger + admin are `X-Admin-Key`-gated (constant-time, fail-closed
  when unset); binds `127.0.0.1`, never `0.0.0.0`. My Wave-2 F11 🔴 ("one venue-wifi curl revokes the
  blessing") does **not** reproduce.

**No disputes.** I could not find a blocking or should-fix weakness in this build with the tools I have.

---

## 5. Residual notes (advisory — all 🟡 hardening / NOT blockers)

Honest caveats about the boundary between this local build and a public production deploy. **None block
the demo; none lets an attacker mint, escalate, replay, or un-revoke a consent.** Items 1, 6, 7 were
surfaced by the deeper live/manual pass in [`ACCEPTANCE-SCAN.md`](/shared/tokyo/apps/spector-scan/ACCEPTANCE-SCAN.md)
(7 PASS · 3 GAP, all 🟡) — the two of those my STATIC scanner can't catch (subtle logic/design, not a
regex-visible pattern) are flagged here so nothing is glossed and the two reports agree.

1. **`POST /v1/consent/begin` is intentionally unauthenticated** 🟡 (it only issues a session+nonce for a
   known agent). On a *public* CF Worker this is a cheap DoS surface. Device flow isn't built, so **no
   World quota is burned by `begin`** (only DO state; 15-min TTL bounds it). At real deploy add
   rate-limiting / Turnstile. Not a consent bypass.
2. **`aud` pin depends on the real `WID_CLIENT_ID`** (booth Q#1). The code fails closed (`503`) until it
   lands — correct — but the live World leg is unproven until that config swap. Re-run DYNAMIC against a
   `wrangler dev` with the real client_id + `sandbox.auth.world.org` JWKS at the Friday round-trip.
3. **Issuer/JWKS domain moved** to `sandbox.auth.world.org` and (per M5-5/PIT) the **signing kid rotated**.
   The code fetches JWKS dynamically (`createRemoteJWKSet`), so rotation is handled — but confirm the
   pinned `WID_ISSUER`/`JWKS_URL` match the live domain before judging.
4. **Ledger stores full `sub`** (truncated only in UI/receipt views). Correct for the demo; if this ever
   persists beyond the event, treat the full pairwise `sub` as PII behind the admin key (it already is).
5. **Public-deploy reminder:** a CF Worker is public-internet from `wrangler deploy` onward, so the
   per-route auth this build already has is load-bearing — keep it; don't rely on network placement.
6. **No `EXPECTED_SUB` demo pin (F10)** 🟡 — a *stranger's valid Orb token* (different `sub`) can bind to
   a pending session (returns `ok:true`). Mitigated because this is a **code flow**: `session_id`/`nonce`
   are 128-bit random and **not projected**, so a stranger can't reach the session without it leaking.
   Cheap hardening: pin the expected `sub` for the scripted demo. Defense-in-depth, not a live bypass.
7. **`receipt_token` travels in the URL query** 🟢 (auto-flagged as `SRC-CAP-IN-URL`, NICE) on
   `GET /v1/consent/:id?receipt_token=…` (`src/index.ts:195`). A bearer capability in a URL lands in
   access logs/history and is shoulder-surfable on a projector. Move it to an `Authorization` header or
   POST body. Non-blocking (the token is hashed server-side and shown once), but worth the cheap fix.

_Scanner-limits honesty: item 6 (`EXPECTED_SUB`/wrong-sub binding) is a design/logic issue my STATIC
checks don't detect (not a single regex-visible pattern) — it came from the live round-trip + manual read.
Item 7 IS now an automated check (`SRC-CAP-IN-URL`), added to the tool during this review so it catches
the bearer-in-URL pattern going forward. That is the only 🟢 the consent-server scan raises; it does not
affect the clean/PASS verdict (NICE and INFO are advisory, not blocking)._

---

## 6. Re-verify protocol

Fixer posts a commit hash → I re-run `bash test.sh` + `node scan.mjs --source /shared/tokyo/consent-server`
(and `--target` against a fresh `wrangler dev`) → append the delta here. Final sweep Sat 22:00 JST, and a
live-token DYNAMIC re-run at the Friday round-trip once `WID_CLIENT_ID` lands.

_Generated with the `spector-scan` tool ([`/shared/tokyo/apps/spector-scan/`](/shared/tokyo/apps/spector-scan/)) · Spector 🕵️ · reviews, not certified audits._
