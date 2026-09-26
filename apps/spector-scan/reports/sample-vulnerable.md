# 🕵️ spector-scan — Consent-Backend Security Scan Report

**Target**: `http://127.0.0.1:8811`
**Scanned**: 2026-09-25T12:27:12.531Z (57 ms)
**Checks run**: 9
**Verdict**: FAIL — blocking weaknesses present
**Findings**: 6 🔴 BLOCKER · 2 🟡 SHOULD · 0 🟢 NICE · 1 ℹ️ INFO

> Scope: black-box, **unauthenticated** HTTP probe from the attacker's position (venue Wi-Fi, no credentials). Some server-side properties (real-token JWKS verify, jti-burn replay) can only be fully proven with a live World token — those are marked `needs-live-token` and re-run at the Friday round-trip bell.

## Findings

| Sev | ID | Finding | Endpoint | Maps to |
|---|---|---|---|---|
| 🔴 BLOCKER | CF-B1-FORGED | Forged RS256 token ACCEPTED — signature is not being verified against JWKS | `POST /v1/verify` | CF-B1 |
| 🔴 BLOCKER | CF-B2-CLIENT-AUTHZ | Verify granted consent from client-supplied claims (no real token) | `POST /v1/verify` | CF-B2 |
| 🔴 BLOCKER | F11-LEDGER-AUTH | Event ledger readable with NO admin key — leaks sub↔agent linkage | `GET /v1/ledger` | CF-S5 / F11 |
| 🔴 BLOCKER | F11-LEDGER-WRONGKEY | Event ledger readable with a WRONG admin key — auth check absent or broken | `GET /v1/ledger` | CF-S5 / F11 |
| 🔴 BLOCKER | F11-REVOKE-AUTH | Revoke accepted WITHOUT a valid receipt_token — anyone can revoke the blessing | `POST /v1/revoke` | CF-B5 / F11 |
| 🔴 BLOCKER | FAIL-CLOSED | Malformed / empty request returned ok:true — server fails OPEN (4 cases) | `POST /v1/verify, POST /v1/consent/check` | CF-S / AP-2 |
| 🟡 SHOULD | CORS-WILDCARD | Access-Control-Allow-Origin: * on a mutating route | `OPTIONS /v1/revoke` | CF-B / F11 |
| 🟡 SHOULD | DENY-PATH-MISSING | Denied-path endpoint appears absent — denied is doctrine, not optional | `POST /v1/consent/deny` | CF-B4 |
| ℹ️ INFO | RECON-UNCONFIGURED | Server reports configured:false (client_id not wired) | `GET /healthz` | — |

## Detail

### 🔴 CF-B1-FORGED — Forged RS256 token ACCEPTED — signature is not being verified against JWKS

- **Endpoint**: `POST /v1/verify`
- **CF gate**: CF-B1
- **Evidence**: forged token (random signature) returned 200 {"ok":true,"consent_id":"c_6d19991c-f5c4-4f19-960f-5d2257132684","sub":"0xFORGED-ACCEPTED","scope_granted":["steward:gif
- **Fix**: createRemoteJWKSet against auth issuer host, HTTPS only; verify RS256 signature; pin iss+aud; reject with 401 invalid_signature.

### 🔴 CF-B2-CLIENT-AUTHZ — Verify granted consent from client-supplied claims (no real token)

- **Endpoint**: `POST /v1/verify`
- **CF gate**: CF-B2
- **Evidence**: body {"id_token":"","session_id":"any","agent_subname":"spector.demo.eth","scope_requested":["steward:gift"],"sub":"0xVICTIM" returned 200 {"ok":true,"consent_id":"c_2931ccdc-c275-4c9f-a629-a581b2d8de5f","sub":"0xVICTIM","scope_granted":["steward:gift"]}
- **Fix**: The raw id_token is the ONLY trusted input. Ignore any client-supplied sub/scope/blessed/status; derive everything from the verified JWT.

### 🔴 F11-LEDGER-AUTH — Event ledger readable with NO admin key — leaks sub↔agent linkage

- **Endpoint**: `GET /v1/ledger`
- **CF gate**: CF-S5
- **Finding ref**: F11
- **Evidence**: no X-Admin-Key returned 200; body contains {"events":[{"ts":1790339231746,"kind":"grant","consent_id":"c_demo1","sub_trunc":"8f3a…","agent":"spector.demo.eth"},{"t
- **Fix**: Gate on X-Admin-Key (constant-time compare); 403 without it. The ledger maps humans to agents — it is PII on venue Wi-Fi.

### 🔴 F11-LEDGER-WRONGKEY — Event ledger readable with a WRONG admin key — auth check absent or broken

- **Endpoint**: `GET /v1/ledger`
- **CF gate**: CF-S5
- **Finding ref**: F11
- **Evidence**: X-Admin-Key: definitely-wrong-key returned 200 {"events":[{"ts":1790339231746,"kind":"grant","consent_id":"c_demo1","sub_trunc":"8f3a…","agent":"spector.demo.eth"},{"t
- **Fix**: Actually compare the admin key; reject mismatches with 403.

### 🔴 F11-REVOKE-AUTH — Revoke accepted WITHOUT a valid receipt_token — anyone can revoke the blessing

- **Endpoint**: `POST /v1/revoke`
- **CF gate**: CF-B5
- **Finding ref**: F11
- **Evidence**: payload {"consent_id":"any","receipt_token":"attacker-guess"} returned 200 {"ok":true,"revoked_at":1790339232567}
- **Fix**: Require the 128-bit receipt_token (compare in constant time); reject with 403 bad_receipt_token. If bound off-localhost, also require CONSENT_API_TOKEN. One curl from venue Wi-Fi must NOT kill a live blessing.

### 🔴 FAIL-CLOSED — Malformed / empty request returned ok:true — server fails OPEN (4 cases)

- **Endpoint**: `POST /v1/verify, POST /v1/consent/check`
- **CF gate**: CF-S
- **Finding ref**: AP-2
- **Evidence**: <not-json-at-all>→200 · <{>→200 · <{}>→200 · <{"action":"steward:g>→200
- **Fix**: Any parse failure / missing required field / exception in the verify path must DENY (4xx). Default deny; exceptions become 500, never a grant.

### 🟡 CORS-WILDCARD — Access-Control-Allow-Origin: * on a mutating route

- **Endpoint**: `OPTIONS /v1/revoke`
- **CF gate**: CF-B
- **Finding ref**: F11
- **Evidence**: ACAO wildcard lets any origin script the consent API from a judge's browser tab.
- **Fix**: Echo only the exact demo origin (or send no CORS headers). Never '*' on revoke/verify/check.

### 🟡 DENY-PATH-MISSING — Denied-path endpoint appears absent — denied is doctrine, not optional

- **Endpoint**: `POST /v1/consent/deny`
- **CF gate**: CF-B4
- **Evidence**: status 405
- **Fix**: Implement /v1/consent/deny: log a first-class denial event, mint NO consent row. Beat-4 receipt depends on it.

### ℹ️ RECON-UNCONFIGURED — Server reports configured:false (client_id not wired)

- **Endpoint**: `GET /healthz`
- **Evidence**: healthz.configured=false; issuer=https://auth.worldcoin.dev
- **Fix**: Expected pre-Friday. Confirm WID_CLIENT_ID landed before judging; /verify must 503 not_configured until then (fail-closed).

## Probe log (what was tried)

- healthz: 200 {"ok":true,"issuer":"https://auth.worldcoin.dev","jwks_kids":["yiX1KR5gDdPTqsHAbT5d0JqIG6-HcTv8wGao4sSTgsY"],"configured":false}
- revoke {"consent_id":"any","receipt_token":"attacker-guess"} -> 200
- ledger /v1/ledger (no key) -> 200
- ledger /v1/consent/log (no key) -> 403
- ledger /v1/log (no key) -> 404
- verify(client-claims) -> 200
- verify(forged token) -> 200
- failclosed /v1/verify <not-json-at-all> -> 200
- failclosed /v1/verify <{> -> 200
- failclosed /v1/verify <{}> -> 200
- failclosed /v1/consent/check <{"action":"steward:g> -> 200
- cors /v1/revoke ACAO=*
- errorleak sample: {"ok":true,"consent_id":"c_e2a41809-e61b-4bbb-b462-8d769c5122bc","sub":"0xFORGED-ACCEPTED","scope_granted":["steward:gif
- deny endpoint -> 405

---
_Generated by spector-scan · Spector 🕵️ · reviews, not certified audits._