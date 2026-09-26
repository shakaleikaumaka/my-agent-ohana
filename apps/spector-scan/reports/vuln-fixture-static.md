# 🕵️ spector-scan — Consent-Backend Security Scan Report (STATIC source)

**Source**: `fixtures/vuln-backend`
**Scanned**: 2026-09-25T13:29:14.458Z (7 ms)
**Checks run**: 13 · files scanned: 1
**Verdict**: FAIL — blocking weaknesses present
**Findings**: 6 🔴 BLOCKER · 1 🟡 SHOULD · 0 🟢 NICE · 0 ℹ️ INFO

> Scope: **static source + config analysis** of a backend source tree (no running server). Flags F-class threats by reading files: F6 hosted-verify presence, F11 endpoint auth (revoke capability / admin-key), 0.0.0.0 binds, secrets in committed files, fail-open paths, jti/nonce replay guard, scope-escalation guard, JWT alg + iss/aud pinning, CORS wildcard, .gitignore hygiene. Runtime-only properties (real JWKS fetch, live jti burn) are re-checked dynamically with `--target`.

## Findings

| Sev | ID | Finding | Endpoint | Maps to |
|---|---|---|---|---|
| 🔴 BLOCKER | SRC-BIND-0000 | Service binds 0.0.0.0 — reachable from the whole LAN (F11) | `server.js:49` | CF-B / F11 |
| 🔴 BLOCKER | SRC-F11-ADMIN-UNAUTH | Ledger/admin data route has no admin-key gate in its handler (F11) | `/v1/ledger` | CF-S5 / F11 |
| 🔴 BLOCKER | SRC-F11-REVOKE-UNAUTH | Mutating consent route has no capability/auth check in its handler (F11) | `/v1/revoke` | CF-B5 / F11 |
| 🔴 BLOCKER | SRC-F6-NO-BACKEND | No server-side token verification found — authz appears client-only (F6) | `(source)` | CF-B1 / F6 |
| 🔴 BLOCKER | SRC-SCOPE-ESC | Requested scope is never validated against a per-agent allowlist — scope escalation | `(source)` | CF-B7 / F8 |
| 🔴 BLOCKER | SRC-SECRET-COMMITTED | hardcoded credential assignment hardcoded in a committed file | `server.js:17` | CF-S / F2 |
| 🟡 SHOULD | SRC-NO-GITIGNORE | No .gitignore — node_modules/secrets risk being committed | `(repo root)` | CF-S / F2 |

## Detail

### 🔴 SRC-BIND-0000 — Service binds 0.0.0.0 — reachable from the whole LAN (F11)

- **Endpoint**: `server.js:49`
- **CF gate**: CF-B
- **Finding ref**: F11
- **Evidence**: server.js:49 — server.listen(8080, "0.0.0.0", () => console.log("vuln backend on 0.0.0.0:8080"));
- **Fix**: Bind 127.0.0.1 for local dev; never 0.0.0.0 on venue Wi-Fi. A public host (CF Worker) must instead put per-route auth on every mutating/data route.

### 🔴 SRC-F11-ADMIN-UNAUTH — Ledger/admin data route has no admin-key gate in its handler (F11)

- **Endpoint**: `/v1/ledger`
- **CF gate**: CF-S5
- **Finding ref**: F11
- **Evidence**: server.js:33 — route "/v1/ledger" handler shows no X-Admin-Key / auth gate within 30 lines. The ledger maps humans↔agents (PII).
- **Fix**: Gate on X-Admin-Key (constant-time compare); 403 without it. Fail-closed when no key is configured.

### 🔴 SRC-F11-REVOKE-UNAUTH — Mutating consent route has no capability/auth check in its handler (F11)

- **Endpoint**: `/v1/revoke`
- **CF gate**: CF-B5
- **Finding ref**: F11
- **Evidence**: server.js:38 — route "/v1/revoke" handler shows no receipt_token / admin-key / signature gate within 45 lines.
- **Fix**: Gate revoke on the one-time receipt_token capability (constant-time hash compare) or an admin key. One curl from venue Wi-Fi must not kill a live blessing.

### 🔴 SRC-F6-NO-BACKEND — No server-side token verification found — authz appears client-only (F6)

- **Endpoint**: `(source)`
- **CF gate**: CF-B1
- **Finding ref**: F6
- **Evidence**: No jwtVerify / createRemoteJWKSet / JWKS signature check anywhere in the source tree. The rubric disqualifies client-only authorization.
- **Fix**: Add a hosted backend that RE-VERIFIES the World id_token (RS256 vs pinned JWKS, iss+aud) server-side. Every protected act must gate on the backend, never client state.

### 🔴 SRC-SCOPE-ESC — Requested scope is never validated against a per-agent allowlist — scope escalation

- **Endpoint**: `(source)`
- **CF gate**: CF-B7
- **Finding ref**: F8
- **Evidence**: Scopes are referenced but no subset/allowlist check was found. An agent could request a scope it was never granted (e.g. approve(max) vs exact-amount).
- **Fix**: Reject any requested scope not in the agent's allowlist (scopeMap[agent].includes). Grant only the intersection; deny on any extra scope.

### 🔴 SRC-SECRET-COMMITTED — hardcoded credential assignment hardcoded in a committed file

- **Endpoint**: `server.js:17`
- **CF gate**: CF-S
- **Finding ref**: F2
- **Evidence**: server.js:17 — hardcoded credential assignment (value len 55). Tracked by gitignore-fallback.
- **Fix**: Remove from source; load from an environment secret (wrangler secret / .env git-ignored). Rotate the exposed value immediately.

### 🟡 SRC-NO-GITIGNORE — No .gitignore — node_modules/secrets risk being committed

- **Endpoint**: `(repo root)`
- **CF gate**: CF-S
- **Finding ref**: F2
- **Evidence**: No .gitignore found in the source tree.
- **Fix**: Add a .gitignore covering node_modules/, .env, .dev.vars, .wrangler/, dist/, *.log.

## Probe log (what was tried)

- scanned 1 source/config files under /shared/tokyo/apps/spector-scan/fixtures/vuln-backend (tracked-set via gitignore-fallback)
- F6: no server-side verification primitive found
- revoke-route server.js:3 ( here is planted so the scanner can prove it
// catches the real F-class threats. See ../../test.sh.
//
// Planted weaknesses:
//   1. binds 0.0.0.0                       -> SRC-BIND-0000        (F11)
//   2. /v1/revoke has no capability check  -> SRC-F11-REVOKE-UNAUTH(F11)
//   3. /v1/ledger has no admin-key check   -> SRC-F11-ADMIN-UNAUTH (F11)
//   4. hardcoded credential in source      -> SRC-SECRET-COMMITTED (F2)
//   5. catch{} returns ok:true (fail-open) -> SRC-FAIL-OPEN-CATCH  (AP-2)
//   6. no server-side token verification   -> SRC-F6-NO-BACKEND    (F6)

import http from ) auth=yes
- revoke-route server.js:38 (/v1/revoke) auth=NO
- admin/ledger-route server.js:3 ( here is planted so the scanner can prove it
// catches the real F-class threats. See ../../test.sh.
//
// Planted weaknesses:
//   1. binds 0.0.0.0                       -> SRC-BIND-0000        (F11)
//   2. /v1/revoke has no capability check  -> SRC-F11-REVOKE-UNAUTH(F11)
//   3. /v1/ledger has no admin-key check   -> SRC-F11-ADMIN-UNAUTH (F11)
//   4. hardcoded credential in source      -> SRC-SECRET-COMMITTED (F2)
//   5. catch{} returns ok:true (fail-open) -> SRC-FAIL-OPEN-CATCH  (AP-2)
//   6. no server-side token verification   -> SRC-F6-NO-BACKEND    (F6)

import http from ) auth=yes
- admin/ledger-route server.js:33 (/v1/ledger) auth=NO
- 0.0.0.0 at server.js:7 is a comment WARNING against it ✔ (//   1. binds 0.0.0.0                       -> SRC)
- 0.0.0.0 at server.js:48 is a comment WARNING against it ✔ (// (1) PLANTED: binds 0.0.0.0 — reachable from the)
- 0.0.0.0 BIND at server.js:49: server.listen(8080, "0.0.0.0", () => console.log("vuln backe
- secret(generic) at server.js:17 — COMMITTED, BLOCKER
- fail-open: no default-allow / catch-into-grant patterns found ✔
- replay-guard: no verify path — skipped
- scope-guard: MISSING
- alg-pin: no jwtVerify — skipped
- cors: no wildcard ACAO in source ✔
- capability-in-url: no bearer token read from query string ✔
- .gitignore: MISSING — SHOULD

---
_Generated by spector-scan · Spector 🕵️ · reviews, not certified audits._