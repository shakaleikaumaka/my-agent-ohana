# 🕵️ ACCEPTANCE SCAN — Trinity Consent Server (M5-7b, the real round-trip)

**Reviewer**: Globy Spector 🕵️ (SECURITY REVIEWER) · **Date**: 2026-09-25 ~12:56 UTC
**Subject**: Tauro 🐂's shipped `consent-server` @ commit `e1acdee` — copied to my own container, `npm install`, mock RS256 keys generated (`npm run keys`), `npx wrangler dev --ip 127.0.0.1 --port 8787`.
**Method**: (1) `spector-scan` DYNAMIC black-box probe against the running Worker; (2) a full **live-token** round-trip minting REAL mock RS256 tokens with the server's own offline issuer (`scripts/mint.mjs`) — the acceptance path I deferred at build-time ("point the scanner at his wrangler dev, re-run CF-B1/CF-B6 with a real token").
**Language law**: this is a security **review**, not a "certified audit."

> ⚠️ Caveat on scope: this exercises the server against its **offline self-signed mock issuer** (`mock.trinity.local`), the same rig its own tests use. It proves the *code logic* is sound end-to-end. It does **not** substitute for the Friday capture against the **real** World issuer (`sandbox.auth.world.org`) — one item below still needs the genuine wire (live JWKS/kid + a real `id_token`). Everything a mock can prove, is proven here.

---

## ⭐ VERDICT: **CLEAN PASS on core security — 0 🔴 blockers, 0 🟡 in the dynamic scan.**

The shipped server **satisfies every core security property** and beats every attack I threw at it:

- **Dynamic black-box scan: PASS** — `0 🔴 · 0 🟡 · 0 🟢 · 1 ℹ️` (exit 0). The lone INFO is the expected "jti-burn needs a real token" placeholder — which I then **closed manually below** with a genuine minted token.
- **Live-token round-trip: PASS** — real token verifies, is scope/acr/aud/iss/exp-gated, **replay is burned (409)**, revoke halts the next check instantly (401). The money beat works.
- **Attack cases: all rejected** — forged sig, tampered sig, expired, weak-acr, scope-escalation, wrong-aud, wrong-iss, unauthenticated revoke, unauthenticated/wrong-key ledger, client-supplied claims, malformed bodies.

**Of my 10 THREAT-MODEL must-fixes: 7 PASS, 3 GAP.** After honest reconciliation against the *shipped architecture* (a **code flow** with random session_id + server nonce, and **no device flow built**), **all 3 gaps are hardening / defense-in-depth (🟡), none is an exploitable blocker.** None of the three lets an attacker mint, escalate, replay, or un-revoke a consent. This is a **win worth stating plainly: the server is safe to demo as-is**, and gets stronger with the three cheap patches below.

---

## Part A — Dynamic black-box scan (verbatim)

```
Target : http://127.0.0.1:8787   (wrangler dev, Miniflare/workerd, real Worker + DO)
Checks : 9
Verdict: PASS — no blocking or should-fix weaknesses found
Findings: 0 🔴 BLOCKER · 0 🟡 SHOULD · 0 🟢 NICE · 1 ℹ️ INFO
Exit code: 0
```

Probe log (what the attacker's unauthenticated position tried, and got):

| Probe | Attempt | Result |
|---|---|---|
| F11 revoke auth | `{consent_id, receipt_token:"attacker-guess"}` / missing / empty | `404` / `400` / `400` — **never accepted** ✔ |
| F11 ledger auth | `GET /v1/ledger` (no key), `/consent/log`, `/log` | `403` / `403` / `404` ✔ |
| CF-B2 client-authz | `verify` with `sub/blessed/status` supplied, no token | `400` — client claims ignored ✔ |
| CF-B1 forged | `verify` with random-signature RS256 JWT | `401` ✔ |
| Fail-closed | `not-json`, `{`, `{}`, check-without-token | `400 · 400 · 400 · 400` — never `ok:true` ✔ |
| CORS | `OPTIONS /v1/revoke` from `evil.example` | `ACAO=null` — no wildcard ✔ |
| Error leak | validation-error body | `{"ok":false,"error":"malformed_token"}` — no stack/key/expected ✔ |
| Denied-path | `POST /v1/consent/deny` | present (404 for unknown session, route exists) ✔ |

Saved report: [`reports/consent-server-live-1256.md`](reports/consent-server-live-1256.md) · [`.json`](reports/consent-server-live-1256.json)

---

## Part B — Live-token round-trip (real minted RS256 tokens)

Minted with the server's own offline issuer key (`scripts/mint.mjs`, self-signed, TEST-ONLY). This closes the `needs-live-token` items the black-box scan can't reach.

| # | Case | Expected | **Actual** | |
|---|---|---|---|---|
| 1 | `begin(tauro.demo.eth)` | session_id + nonce | `sess_… , nonce …` | ✅ |
| 2 | **CF-B1 real**: valid Orb token → verify | `ok:true` + `receipt_token` | `ok:true`, consent minted, receipt issued | ✅ |
| 3 | `check` valid consent + granted scope | `ok:true` | `ok:true` | ✅ |
| 4 | **CF-B6 replay**: same `jti` → fresh session → verify | `409 jti_replayed` | `409 {"error":"jti_replayed"}` | ✅ |
| 5 | revoke with **wrong** receipt_token | `403`, consent stays | `403 bad_receipt_token`; next check still `200 ok` | ✅ |
| 6 | revoke with **real** receipt_token (the beat) | `ok:true` | `ok:true, revoked_at…` | ✅ |
| 6b | next `check` after revoke | `401 consent_revoked` | `401 consent_revoked` — **instant halt** | ✅ |
| 7 | tampered real token (sig byte flipped) | `401` | `401 invalid_signature` | ✅ |
| 8 | expired token (exp 120s past, > 60s tol) | `401` | `401 token_expired` | ✅ |
| 9 | weak `acr` (not Orb) | `403` | `403 acr_insufficient` | ✅ |
| 10 | scope escalation (`admin:root` not in map) | `403` | `403 scope_not_allowed {denied:[admin:root]}` | ✅ |
| 11 | wrong `aud` | `401` | `401 bad_audience` | ✅ |
| 12 | wrong `iss` | `401` | `401 bad_issuer` | ✅ |
| 13 | `deny` → first-class event, no row | event logged | `deny` in ledger, no consent row | ✅ |
| 14 | ledger w/ correct admin key | debrief evidence | 5 events: grant·grant·revoke·grant·deny | ✅ |
| 15 | `begin(attacker.demo.eth)` (not in map) | `403` | `403 unknown_agent` | ✅ |

**The full trinity beat is proven:** verify a blessed, orb-verified, correctly-scoped human → agent works (`check` ok) → one revoke → the very next `check` **401s instantly**. Replay is dead. Forgery is dead. Scope-escalation is dead. The receipt endpoint + ledger carry all five PIT elements for the debrief.

---

## Part C — 10 must-fix reconciliation: PASS / GAP per item

| # | Must-fix (THREAT-MODEL) | Sev (orig) | **Shipped?** | Evidence |
|---|---|---|---|---|
| 1 | Every mutating/data route independently authed (no localhost assumption) | 🔴 | **✅ PASS** | revoke needs hashed `receipt_token` (safeEqual) → 403; ledger+admin need `X-Admin-Key` (safeEqual, fail-closed if unset) → 403 |
| 2 | Rate-limit `/v1/consent/begin` (DoS) | 🔴 | **⚠️ GAP → 🟡** | 40/40 begins minted sessions, no throttle. **But** device-flow not built → **no World quota is burned by begin** (only DO state); 15-min TTL + CF edge bound it. Downgraded to 🟡 hardening. |
| 3 | `EXPECTED_SUB` demo pin (F10) | 🔴/🟡 | **⚠️ GAP → 🟡** | No `EXPECTED_SUB` in src; a stranger's *valid* Orb token (different `sub`) binds to a pending session (returned `ok:true`). **But** this is a code flow — session_id/nonce are 128-bit random and **not projected**, so a stranger can't reach the session without it leaking. Defense-in-depth, 🟡. |
| 4 | `receipt_token` out of URL query → header | 🟡 | **⚠️ GAP** | `GET /v1/consent/:id?receipt_token=…` still reads `url.searchParams.get("receipt_token")` (index.ts:195). Bearer capability in URL → logs/history/shoulder-surf on the projector. 🟡. |
| 5 | Fail-closed on parse/exception + dignified errors | 🟡 | **✅ PASS** | malformed/empty → 400; unknown → 404; error bodies are OAuth-shaped `{ok:false,error}` with no stack/key/expected-value leak; catch-all → 500 |
| 6 | Explicit clock hygiene (`clockTolerance`) | 🟡 | **✅ PASS** | `jwtVerify(…, {clockTolerance: cfg.clockSkewSec})` default 60; expired-beyond-tol → 401 token_expired |
| 7 | CORS: exact origin or none, never `*` | 🟡 | **✅ PASS** | No CORS headers emitted at all; `OPTIONS /v1/revoke` → `ACAO=null` |
| 8 | JWKS sig verify (CF-B1) + jti replay burn (CF-B6) | 🟢 | **✅ PASS** | forged→401, tampered→401 invalid_signature, wrong kid rejected; **real token replayed → 409 jti_replayed** |
| 9 | `check` re-checks `exp` at request time (sweeper-race) | 🟢 | **✅ PASS** | `check` calls `touchExpiry(consent_id, now)` and re-verifies token every call; correctness ≠ the 5s sweeper |
| 10 | Denied-path is first-class (CF-B4) | 🟢 | **✅ PASS** | `POST /v1/consent/deny` logs a `deny` event, mints no consent row (confirmed in ledger) |

**Score: 7 PASS · 3 GAP (all 🟡 after reconciliation) · 0 open 🔴.**

---

## Part D — Still-open items for Tauro 🐂 (all 🟡 — hardening, not blockers)

None of these block the demo. In descending value:

1. **🟡 F10 — add `EXPECTED_SUB` pin (cheap, decisive).** Env `EXPECTED_SUB`; when set, `/v1/verify` rejects any token whose `sub` ≠ pin → 403 + logged. It's the one backend tooth that guarantees the blessing binds to *Shaka's* pairwise sub and no one else's, even if a session_id leaks. ~6 lines in `index.ts` after the verify step. **Recommend shipping it before judging** — it's the highest-leverage 🟡.
2. **🟡 #4 — move `receipt_token` to a header.** Accept `X-Receipt-Token` (or `Authorization: Bearer`) on `GET /v1/consent/:id` and stop reading it from the query string, so the revoke/debrief capability never lands in URLs, logs, referrers, or the projector's browser history. Keep query as a deprecated fallback if you must, but prefer header.
3. **🟡 #2 — token-bucket on `/v1/consent/begin`** (and `/device/*` **if** ever built). Cap ≤3 pending sessions + ≤1 begin/5s per IP, body ≤10KB. Low urgency for the shipped code (no quota burn, TTL-bounded), but a judge's curl loop shouldn't be able to spray unbounded DO state. Note: README lists this as an explicit non-goal ("CF edge absorbs") — that's a defensible **accepted risk in writing**; I'm flagging it, not overruling it.

### Live-wire item still owed (not a gap — a schedule item)
- **Real World issuer round-trip (Friday capture).** All of Part B ran against the offline mock issuer. When the real `WID_CLIENT_ID` + `sandbox.auth.world.org` JWKS land, re-run CF-B1 (real kid/JWKS), the wrong-`sub` F10 case with a genuine token, and CF-B6 with a real captured `id_token`. The mock proves the *logic*; the live capture proves the *wire*.

---

## Part E — What Tauro got right (do not let deadline pressure erode)

- **Refined verify order**: acr + scope checked **before** the jti burn, so a *rejected* request doesn't consume the one-time token. One valid token ⇒ exactly one consent, ever. (Nice touch beyond the raw spec.)
- **Atomic jti burn in the DO** (not KV) — replay guard is correct-by-construction; confirmed 409 on real replay.
- **Fail-closed everywhere**: unconfigured → 503, JWKS fail → 503, parse fail → 400, unknown → 500. Nothing is an implicit allow.
- **Capability discipline**: `receipt_token` stored only as SHA-256 hash, compared with `safeEqual`; raw `id_token` never stored; `sub` truncated in all output.
- **Admin routes fail-closed** if `ADMIN_KEY` unset (unreachable, not open).
- **Scope frozen** (F14): no authorization-transactions / IDKit / MCP surface. Held the line.

---

## Re-verify protocol
This report reflects commit `e1acdee`. If Tauro patches the 3 gaps, post the new commit hash → I re-run the dynamic scan + the F10 wrong-sub case + the header round-trip and append a delta here. Patches don't self-certify.

*Spector 🕵️ — reviews, not certified audits. Never ship; make shipping safe.*

---

## DELTA — M5-7c re-scan of commit `194665d` (2026-09-25 ~13:35 UTC) — Spector 🕵️

**Trigger:** GLOBY M5-7c. Tauro patched all 3 residual 🟡 gaps (commit `194665d`; reported vitest 22/22 + curl 21/21). Objective black-box re-verify with my own scanner + live round-trip, same rig as M5-7b.

**Rig:** fresh `cp -r /shared/tokyo/consent-server → /workspace/consent-server-rescan`, `npm install` (144 pkgs), `npm run keys`, `npx wrangler dev --ip 127.0.0.1 --port 8787` (offline mock issuer). Bind confirmed **127.0.0.1 only** (`ss`: `127.0.0.1:8787`, never 0.0.0.0). Baseline `npx vitest run` = **22/22 pass**. `scan.mjs --target http://127.0.0.1:8787` (dynamic black-box) = **PASS 0🔴 0🟡 0🟢 1ℹ️** (the 1ℹ️ is the known "jti-burn not provable without a real token" note — proven separately below via mock). Two server modes exercised: **unpinned** (no `EXPECTED_SUB`) and **pinned** (`EXPECTED_SUB` set).

### Item 1 — F10 `EXPECTED_SUB` subject pin → ✅ **CLOSED**
| Case | Request | Observed |
|---|---|---|
| Unpinned: mock still binds | `verify` valid token, arbitrary `sub` `0xANYBODY…999` | **HTTP 200** `{ok:true, consent_id, receipt_token}` ✔ |
| Pinned: stranger's valid token | `verify` valid token, `sub`=`0xSTRANGER…777` ≠ pin | **HTTP 401** `{"error":"sub_mismatch"}` ✔ |
| Pinned: matching token | `verify` valid token, `sub`=pin | **HTTP 200** `{ok:true,…}` ✔ |
| **Before jti-burn proof** | mint wrong-sub token w/ fixed `jti=J`; then reuse **same `jti=J`** with correct sub on a fresh session | wrong-sub → **401 sub_mismatch**; correct-sub reuse of same jti → **200 ok** ⇒ the rejected request **did NOT consume the jti** ✔ |
| Control (burn works) | replay that now-burned `jti=J` with correct sub, fresh session | **HTTP 409** `{"error":"jti_replayed"}` ✔ |

Verdict: pin rejects a different `sub` with **401 `sub_mismatch`** and does so **before** the atomic jti burn (proven by same-jti reuse succeeding, then 409 on true replay). Unset ⇒ mock/dev still binds. Matches source (`index.ts:93` sub check precedes `index.ts:110` `burnJti`).

### Item 2 — `receipt_token` out of URL → header only → ✅ **CLOSED**
| Case | Request | Observed |
|---|---|---|
| URL query (old leak path) | `GET /v1/consent/:id?receipt_token=<valid>` | **HTTP 403** `{"error":"receipt_token_required"}` — query **ignored** ✔ |
| `X-Receipt-Token` header | `GET /v1/consent/:id` + header | **HTTP 200** receipt card ✔ |
| `Authorization: Bearer` | `GET /v1/consent/:id` + Bearer | **HTTP 200** receipt card ✔ |
| No capability | `GET /v1/consent/:id` | **HTTP 403** `{"error":"receipt_token_required"}` ✔ |
| Header present, wrong value | `X-Receipt-Token: totally-wrong` | **HTTP 403** `{"error":"bad_receipt_token"}` ✔ |

Verdict: a valid capability in the **URL query no longer authenticates** (403). Only the header path works. The bearer capability can no longer land in projector logs / history / referrers.

### Item 3 — `/v1/consent/begin` rate-limit → ✅ **CLOSED**
Config `BEGIN_RATE_LIMIT=30 / BEGIN_RATE_WINDOW_SEC=60`. Sprayed **40** unauthenticated begins after reset:
- HTTP 200 ×30, then **HTTP 429 ×10**. First 429 at request **#31** (exactly at limit+1).
- 429 body: `{"ok":false,"error":"rate_limited","retry_after_sec":60}` ✔

Verdict: spray past the window returns **429 `rate_limited`** with `retry_after_sec`. Per-IP fixed window is atomic in the DO.

### DELTA VERDICT — **ALL 3 CLOSED.** No disputes, no still-open items from this set.
- Dynamic scanner: PASS (0🔴 0🟡). vitest 22/22. Bind localhost-only confirmed.
- Residual note (unchanged, NOT a blocker): all above ran against the **offline mock issuer**. The Friday live round-trip (real `WID_CLIENT_ID` + `sandbox.auth.world.org` JWKS, rotated kid) still owed to prove the *wire*; the mock proves the *logic*. F10 pin, receipt header, and rate-limit are config/route-layer and are issuer-independent — they will behave identically live.

*Spector 🕵️ — reviews, not certified audits. Never ship; make shipping safe.*
