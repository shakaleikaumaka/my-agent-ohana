# 🕵️ spector-scan — Consent-Backend Security Scan Report (STATIC source)

**Source**: `/shared/tokyo/consent-server`
**Scanned**: 2026-09-25T13:29:14.317Z (11 ms)
**Checks run**: 13 · files scanned: 22
**Verdict**: PASS — no blocking or should-fix weaknesses found
**Findings**: 0 🔴 BLOCKER · 0 🟡 SHOULD · 0 🟢 NICE · 2 ℹ️ INFO

> Scope: **static source + config analysis** of a backend source tree (no running server). Flags F-class threats by reading files: F6 hosted-verify presence, F11 endpoint auth (revoke capability / admin-key), 0.0.0.0 binds, secrets in committed files, fail-open paths, jti/nonce replay guard, scope-escalation guard, JWT alg + iss/aud pinning, CORS wildcard, .gitignore hygiene. Runtime-only properties (real JWKS fetch, live jti burn) are re-checked dynamically with `--target`.

## Findings

| Sev | ID | Finding | Endpoint | Maps to |
|---|---|---|---|---|
| ℹ️ INFO | SRC-F6-OK | F6 CLOSED — hosted server-side token verification present | `(source)` | CF-B1 / F6 |
| ℹ️ INFO | SRC-SECRET-TESTFIXTURE | RSA private-key JWK (has private 'd' param) in a test fixture — verify it is a throwaway test-only key | `test/fixtures/mock-private.jwk.json:5` | CF-S / F2 |

## Detail

### ℹ️ SRC-F6-OK — F6 CLOSED — hosted server-side token verification present

- **Endpoint**: `(source)`
- **CF gate**: CF-B1
- **Finding ref**: F6
- **Evidence**: src/verify.ts:45 — const { payload } = await jose.jwtVerify(token, cfg.getKey, { (wired into a request handler)
- **Fix**: Confirmed: signature verification exists. At the live round-trip, prove a forged token 401s and a real token verifies.

### ℹ️ SRC-SECRET-TESTFIXTURE — RSA private-key JWK (has private 'd' param) in a test fixture — verify it is a throwaway test-only key

- **Endpoint**: `test/fixtures/mock-private.jwk.json:5`
- **CF gate**: CF-S
- **Finding ref**: F2
- **Evidence**: test/fixtures/mock-private.jwk.json:5 — committed under a test/fixtures path. Acceptable IF clearly labeled test-only and it signs nothing real.
- **Fix**: Confirm the fixture README labels it a self-signed throwaway that signs no real token. Ensure the same value is never reused as a production secret.

## Probe log (what was tried)

- scanned 22 source/config files under /shared/tokyo/consent-server (tracked-set via git)
- F6: server-side verification present at src/verify.ts:45 (const { payload } = await jose.jwtVerify(token, cfg.getKey, )
- revoke-route src/index.ts:178 (, 403);

        return json({ ok: true, sub: truncSub(rec.sub), exp: rec.exp, action: body.action });
      }

      // 5 — POST /v1/revoke { consent_id, receipt_token }  (F11: receipt_token capability)
      if (pathname === ) auth=yes
- revoke-route test/consent.test.ts:117 (/v1/revoke) auth=yes
- revoke-route test/consent.test.ts:254 (/v1/revoke) auth=yes
- revoke-auth: all mutating consent routes show a capability/auth gate ✔
- admin/ledger-route src/index.ts:220 (, 403);
        // Lazily reflect expiry in the receipt view.
        const fresh = (await db.touchExpiry(id, Math.floor(Date.now() / 1000))) ?? rec;
        const receipt: Receipt = {
          consent_id: fresh.consent_id,
          sub_trunc: truncSub(fresh.sub),
          agent_subname: fresh.agent_subname,
          scope_granted: fresh.scope_granted,
          granted_at: fresh.granted_at,
          exp: fresh.exp,
          status: fresh.status,
          revoked_at: fresh.revoked_at,
          events: fresh.events,
        };
        return json(receipt);
      }

      // 8 — GET /v1/ledger  (F11: X-Admin-Key)
      if (pathname === ) auth=yes
- admin/ledger-route src/index.ts:245 (/v1/admin/reset) auth=yes
- admin/ledger-route src/types.ts:39 (, ...] }.
  AGENT_SCOPE_MAP?: string;

  // ADMIN_KEY — capability guarding GET /v1/ledger (F11). Throwaway secret.
  ADMIN_KEY?: string;

  // CLOCK_SKEW_SEC — allowed exp/iat skew (default 60).
  CLOCK_SKEW_SEC?: string;
}

export type EventKind = ) auth=yes
- admin/ledger-route test/consent.test.ts:59 (/v1/admin/reset) auth=yes
- admin/ledger-route test/consent.test.ts:265 (/v1/ledger) auth=yes
- admin/ledger-route test/consent.test.ts:267 (/v1/ledger) auth=yes
- admin/ledger-route test/consent.test.ts:354 (/v1/ledger) auth=yes
- admin/ledger-route vitest.config.ts:2 (;

// Runs the REAL Worker + Durable Object inside workerd (via miniflare) — no network,
// no port. We inject the self-signed RS256 mock JWKS (+ issuer/client_id/admin key) as
// Worker bindings so the full verify->check->revoke->receipt pipeline runs OFFLINE.
// Swapping to real World later = drop MOCK_JWKS, set WID_CLIENT_ID + JWKS_URL. Config only.
const mockJwks = readFileSync() auth=yes
- admin-auth: all ledger/admin routes show an admin-key gate ✔
- 0.0.0.0 at src/index.ts:9 is a comment WARNING against it ✔ (// bind 0.0.0.0 in any deploy/example (see README))
- 0.0.0.0 at test.sh:9 is a comment WARNING against it ✔ (# SECURITY: wrangler dev binds 127.0.0.1 only. NEV)
- 0.0.0.0 at wrangler.toml:7 is a comment WARNING against it ✔ (#   2) npm run dev            # wrangler dev  (bin)
- 0.0.0.0: no real bind found (localhost-only or warned-against) ✔
- secret(privkey-jwk) at test/fixtures/mock-private.jwk.json:5 — test fixture, INFO
- fail-open: no default-allow / catch-into-grant patterns found ✔
- replay-guard: jti/nonce guard present ✔
- scope-guard: requested⊆allowed check present ✔
- alg-pin: RS256 pinned ✔
- iss-pin: issuer pinned ✔
- aud-pin: audience referenced ✔
- cors: no wildcard ACAO in source ✔
- capability-in-url: no bearer token read from query string ✔
- .gitignore: secret files present and correctly ignored ✔

---
_Generated by spector-scan · Spector 🕵️ · reviews, not certified audits._