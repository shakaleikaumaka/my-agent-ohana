# Consent Backend — Minimal Spec (F6 kill)

**Owner: Globy PIT 🕳️ (consent-backend lead) · Builder: Tauro 🐂 → `/shared/tokyo/consent-server/` · Mission 3 wave 2, lane W2-4 · 2026-09-23**
**Requirements of record: [`security-review-checklist.md`](/shared/tokyo/intel/security-review-checklist.md) §1 — CF-B1..B8 + CF-S1..S5. Nothing here exceeds them. Pilot truth: [`world-idp-oidc.md`](/shared/tokyo/intel/world-idp-oidc.md) + [`consent-flow-demo-script.md`](/shared/tokyo/intel/consent-flow-demo-script.md).**

**One-liner:** one small Node service. The IdP talks only to it (client_secret never leaves server — CF-B3). Frontend/agent talk only to it. Every blessing enters **cryptographically** (verified id_token); every ending (deny/expire/revoke) is recorded in an append-only log that doubles as the World debrief evidence (CF-S5). Fail-closed everywhere.

---

## 1. Architecture (all of it)

- **Stack:** Node ≥20, dep: `jose` (JWKS + `jwtVerify`). HTTP via `node:http` or express — builder's pick. Tests: `node:test`. **No database.**
- **State:** one append-only JSONL file = the consent event log (`data/consent-log.jsonl`). Sessions, used-jti set, and flow maps are **derived by replaying the log at boot** — restart never wipes replay protection (CF-B6) or revocation state (CF-B5).
- **Config (env only):** `WID_CLIENT_ID`, `WID_CLIENT_SECRET` (if issued at booth), `WID_ISSUER` (default `https://auth.worldcoin.dev`), `OFFLINE_MODE` (`true`/`false`, default `false`), `CONSENT_API_TOKEN` (optional bearer; required if binding beyond 127.0.0.1), `PORT` (default `8787`), `SCOPES_FILE` (default `./scopes.json`).
- **Scopes config (`scopes.json`, CF-B8):** `{ "<codename>.<parent>.eth": ["steward:gift"] }` — per-agent action allowlist, keyed by ENS subname. Loaded at boot, logged.
- **JWKS:** `createRemoteJWKSet(new URL(WID_ISSUER + "/.well-known/jwks.json"))`, live fetch with `jose` caching. Last known kid `yiX1KR5gDdPTqsHAbT5d0JqIG6-HcTv8wGao4sSTgsY` (no rotation as of 2026-09-23 probe).
- **Expiry sweeper:** `setInterval` (5s) marks any granted session past `exp` as `expired` and logs it — the DURATION beat fires even if nobody calls (CF-B7).

**The one rule (CF-B2):** no component treats URL params, localStorage, redirect-happened, or any client claim as authorization. The only path to a blessing is `verify → log(granted) → session`. The only source of "may I act" is `/v1/agent/authorize`.

## 2. Endpoints — the whole surface

All bodies JSON. **Every response carries `"mode": "live" | "offline-mock"`** and header `X-Consent-Mode` (D-B5 honest labeling, §5). Errors are OAuth-shaped: `{ "error": "<code>", "error_description": "<human line>", "mode": "...", "ts": <unix> }` — code table in §6.

### 2.1 `POST /v1/device/start` — begin device flow (AUTHORIZE)
Req: `{ "agent": "<codename>.<parent>.eth", "scope": "openid" }` (+ offline-only `simulate`, §5).
Server-side: `POST /api/v1/device_authorization` to the pilot (`client_id`, `scope`), honoring returned `interval`/`expires_in`.
Res 200: `{ "flow_id": "fl_<rand>", "user_code", "verification_uri", "expires_in", "poll_after_ms": interval*1000, "mode" }`
Logs `flow_started`. Errors: `client_unregistered` 503 (§7), `idp_unreachable` 503, `agent_unknown` 403 (agent not in scopes.json).

### 2.2 `GET /v1/device/:flow_id/status` — poller front (backend polls the IdP, CF-S4)
The backend polls `POST /api/v1/token` (device_code grant) **server-side**, strictly honoring `interval`, backing off on `slow_down`/429 (+5s, CF-S4). Frontend polls *us* no faster than `poll_after_ms`.
Res 200: `{ "state": "pending" | "granted" | "denied" | "expired", "poll_after_ms", "session_id"?: "cs_<rand>", "claims"?: {sub, acr, exp}, "mode" }`
- On grant: full verify (§3) runs **before** `granted` is returned; on verify failure → `verify_failed` logged, state `denied`-equivalent terminal, **no session minted**.
- Logs exactly one terminal event per flow: `granted` | `denied` | `expired`.

### 2.3 `POST /v1/session/verify` — standalone token verify (also serves code-flow callback later)
Req: `{ "id_token": "<jwt>", "nonce"?: "<expected>", "agent"?: "<subname>" }`
Runs §3 checks. Res 200: `{ "session_id", "claims": { "sub", "acr", "exp", "iat", "jti" }, "mode" }`. Logs `granted` (or `verify_failed` + 401). Same code path as 2.2's grant handling — one verify fn, no forks (CF-B1).

### 2.4 `GET /v1/session/:session_id/status` — revocation status check (check-before-act)
Res 200: `{ "state": "active" | "expired" | "revoked", "sub", "acr", "exp", "agent", "mode" }` · 404 `session_unknown`.
Agent/frontend calls this **before every privileged act** — never caches an "authorized" flag (CF-B2, B5).

### 2.5 `POST /v1/session/:session_id/revoke` — revoke recording (GRACEFUL REVOKE)
Req: `{ "source": "human-app" | "idp-observed" }`. Idempotent: re-revoke → 200, no second event.
Res 200: `{ "state": "revoked", "revoked_at": <unix>, "mode" }`. Logs `revoked`.
- `human-app`: our consent card's one-tap Revoke button — the app-layer kill we can *guarantee* in the demo.
- `idp-observed`: agent reports a 401/invalid-grant from a downstream call after IdP-side revoke at `/approved-apps`.
- **Honesty note (UNVERIFIED until Friday rehearsal):** pilot-side revoke may not invalidate issued JWTs before `exp`. Our mitigation is real: check-before-every-act + our ledger = the blessing is dead in *our* system the moment either source fires. Demo shows the truth we rehearse (demo-script Beat 5).

### 2.6 `POST /v1/agent/authorize` — the gate for every protected action (CF-B2/B5/B7/B8)
Req: `{ "session_id", "agent", "action" }`
Checks, in order: session exists (404) → state `active` (401 `session_expired` / 403 `session_revoked`) → `session.agent === agent` && `action ∈ scopes[agent]` (403 `scope_denied`).
Res 200: `{ "allow": true, "sub", "mode" }`. Logs `act_allowed` / `act_denied` with `{agent, action}` — this is the "while blessed, agent did: N actions" line on the debrief card.

### 2.7 `GET /v1/consent/log` + `GET /v1/consent/debrief?session_id=` (DEBRIEF, CF-S5)
`/log` → `{ "events": [...] }` (raw, ordered). `/debrief` → assembled receipt:
```json
{ "sub": "8f3a…c2", "acr": "https://world.org/oidc/acr/orb-v3", "agent": "<codename>",
  "granted_at": 169…, "ended_at": 169…, "ended_by": "revoked|expired|denied",
  "acts_allowed": 3, "denied_path_tested": true, "mode": "live" }
```
Every field traceable to a log event. Nothing reconstructed after the fact — timestamps are real at write time.

### 2.8 `GET /v1/health`
`{ "mode", "jwks": "reachable|unreachable|skipped-offline", "registration": "configured|pending", "sessions_active": n, "log_events": n, "uptime_s": n }` — the Friday booth debug page.

## 3. Verify fn (CF-B1, B6, B7, S2, S3) — the heart

```
jwtVerify(id_token, JWKS, { issuer: "https://auth.worldcoin.dev", audience: WID_CLIENT_ID })
→ on success, additionally require:
   1. exp fresh (jose does this)                                 [CF-B7]
   2. nonce === stored flow nonce, when a nonce was sent/if present in token  [CF-B1]
   3. jti NOT in used-jti set (rebuilt from log at boot)         [CF-B6]
   4. acr read + returned verbatim; UI may say "Orb-verified" ONLY if
      acr === "https://world.org/oidc/acr/orb-v3"                 [CF-S2]
→ then: mark jti used; create session {session_id, sub, agent, acr, exp, jti};
  log granted. Store sub ONLY — no nullifier/profile/email exist
  on the pilot; never fake them                                   [CF-S3]
```
Session-binding for device flow (no redirect nonce in RFC 8628): the token can only reach whoever holds the server-side `device_code ↔ flow_id` map — that map is the binding. If the pilot echoes a `nonce` claim, we verify it against the flow record. Code flow (if added): `state`+PKCE verifier single-use, session-bound, ≤10-min TTL; wrong `state` → hard abort (CF-S1).

## 4. Denied + expired paths — both wire shapes (CF-B4)

Token-poll terminal errors the backend must map (RFC 8628 §3.5 **and** pilot SPA strings; exact live format UNVERIFIED until Friday's first real round-trip):

| Wire value seen on poll | Mapped state | Logged |
|---|---|---|
| `{"error":"access_denied"}` (RFC) | `denied` | `denied` |
| pilot SPA states `denied` / `rejected` (body or status field) | `denied` | `denied` |
| `{"error":"expired_token"}` / pilot `expired` / `expires_in` lapses | `expired` | `expired` |
| `authorization_pending` | keep polling | — |
| `slow_down` / 429 | interval += 5s, keep polling | — |
| **any other terminal non-token response** | `denied` (fail-closed, dignified) | `denied` w/ raw error in `detail` |

On `denied`: **no session row, no blessing, no retry storm** — one `denied` event, UI gets one dignified line ("Blessing declined. No action taken. Standing by."). Denied responses leak nothing about other sessions/agents (status endpoint only ever answers about its own `flow_id`/`session_id`). Any later act attempt against that flow → 403 `consent_denied` (CF-B4d).

## 5. OFFLINE_MODE (airplane-proof demo — sysadmin ruling ②)

`OFFLINE_MODE=true` → zero network dependency; **every response and log event labeled** `"mode": "offline-mock"` + header; UI must render "OFFLINE REHEARSAL — not a live World verification" (D-B5: mocks aren't World-eligible; labeling keeps us honest).
- Mock IdP inside the service: RSA key generated once, persisted `data/offline-mock-key.json` (file header comment: MOCK, never a real key), kid `offline-mock-1`. Same verify code path runs against it — offline exercises the *real* verify logic, not a bypass.
- **Deterministic claims** (same every run — demo-seed law D-S2): `sub = "offline-sub-orb-0001"`, `acr = orb-v3`, `aud = "offline-mock-client"`, `iss = https://auth.worldcoin.dev`. **Fresh `jti`/`exp` per run** (`mock-<ms>-<n>`) so replay protection stays live in rehearsal — determinism in identity, freshness in security.
- `POST /v1/device/start` accepts `"simulate": "approve" | "deny" | "expire"` (offline only; **ignored + logged in live mode** — a client must never pick outcomes live). `deny` → poll flips to `denied` on 2nd poll; `expire` → mock token with 20s `exp`. This rehearses Beats 4+5 with Wi-Fi OFF.

## 6. Error codes (stable contract for Tauro + frontend)

| code | HTTP | meaning |
|---|---|---|
| `token_invalid` | 401 | sig/iss/aud/exp/alg failure (description names the failed check; never key material) |
| `token_replay` | 401 | jti already consumed (CF-B6) |
| `nonce_mismatch` | 401 | nonce ≠ flow record (CF-B1) |
| `consent_denied` | 403 | act attempted on a denied flow (CF-B4) |
| `session_expired` | 401 | past exp — UX: "consent expired — re-bless" (CF-B7) |
| `session_revoked` | 403 | ledger says dead (CF-B5) |
| `session_unknown` | 404 | no such session |
| `scope_denied` | 403 | cross-agent or out-of-scope action (CF-B8) |
| `agent_unknown` | 403 | agent not in scopes.json |
| `client_unregistered` | 503 | no `WID_CLIENT_ID` yet — see §7 |
| `idp_unreachable` | 503 | JWKS/IdP fetch failed → **fail-closed, no blessing** |

## 7. OPEN RISK — client_id registration (booth Q#1, Friday fatal-risk)

Until the booth confirms registration and `WID_CLIENT_ID` exists: `/v1/health` reports `registration: "pending"`; `/v1/device/start` → 503 `client_unregistered` with `error_description` naming the remediation ("register client at auth.worldcoin.dev/portal — booth Q#1"); `/v1/session/verify` **refuses** (aud can't be checked — aud-confusion is a real attack; fail-closed, not aud-skipping). The demo degrades to OFFLINE_MODE (honestly labeled) or Friday-night recorded capture — **never to fake-live**. Graceful = the *story* continues with dignity; the security posture doesn't bend.

## 8. Acceptance tests (Tauro's checklist ↔ Spector's gates)

1. valid token → 200 + session (CF-B1) · 2. 1-char-tampered token → 401 `token_invalid` (CF-B1) · 3. wrong aud/iss, past exp → 401 (CF-B1/B7) · 4. same jti twice → 401 `token_replay` (CF-B6) · 5. nonce mismatch → 401 (CF-B1) · 6. deny flow → no session, act → 403 `consent_denied`, log shows `denied` (CF-B4) · 7. act after exp → 401 `session_expired` (CF-B7, sweeper) · 8. revoke → next act 403 `session_revoked`, re-revoke idempotent (CF-B5) · 9. agent-alpha session → agent-kai action → 403 `scope_denied` (CF-B8) · 10. OFFLINE_MODE: every response + log line labeled; simulate=deny/expire work (D-B1/D-B5) · 11. kill process mid-run → restart → replay protection + revocation intact (log-derived state, CF-B6) · 12. no `WID_CLIENT_ID` → 503 `client_unregistered`, verify refuses (§7).

*Out of scope (deliberately): MCP grants, `/v1/authorization-transactions`, IDKit proofs, refresh tokens (pilot has none), multi-tenancy. Weekend delta only — drafts until Shaka blesses.*
