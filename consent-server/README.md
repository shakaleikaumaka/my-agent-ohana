# Trinity Consent Server (M5-2)

A **minimal hosted World-ID-token verifier + consent ledger** — Cloudflare Worker + one Durable Object. It kills **F6** (the missing secure backend for World-token validation): every protected agent action is gated by the backend **re-verifying the token** and checking an **app-layer consent ledger**, never by client-side state.

> **The demo beat it powers:** a human blesses a named agent (World verify → consent minted), the agent works (each action `check`ed), then one word revokes it — and the very next `check` returns **401 `consent_revoked`**. Instant, provable halt.

Part of **My Agent Ohana / Bless & Release**, ETHGlobal Tokyo 2026. Spec-of-record: [`../intel/consent-backend-spec.md`](../intel/consent-backend-spec.md).

## Why this shape
- **Cloudflare Worker** = smallest *hostable* thing; one `wrangler deploy` → global HTTPS, no host to babysit at the venue.
- **`jose`** = the JWKS/RS256 verify API, runs natively on Workers.
- **ONE Durable Object** = the only CF primitive with **atomic check-and-set**, which the `jti` replay guard needs (KV is eventually-consistent ~60s and would weaken it). The DO owns sessions+nonces, the burned-jti set, consent records, and the append-only event ledger.
- **App-layer ledger = revocation source of truth.** The World pilot exposes no token-introspection endpoint, so IdP-side revoke lag is unobservable by us; our ledger is authoritative for the demo and a `check` 401s the instant a `revoke` lands. This is the honest framing (no faked IdP call).

## Run it locally — TONIGHT, offline (no client_id, no Cloudflare account)
```bash
npm install
npm run keys      # generates a self-signed RS256 mock issuer (JWKS + .dev.vars). TEST ONLY.
npm run dev       # wrangler dev on 127.0.0.1:8787  (NEVER 0.0.0.0 — see Security)
```
Then, in another shell:
```bash
bash test.sh      # full begin->verify->check->revoke->check(401)->receipt + fail-closed cases
```

### Tests
```bash
npm test          # vitest in workerd/miniflare — real Worker + DO, no network. 22 tests.
bash test.sh      # curl vs a live `wrangler dev`. 21 assertions.
```
Both are green — see [`TEST-RESULTS.md`](./TEST-RESULTS.md). The mock issuer (self-signed RS256 via `ISSUER_OVERRIDE` + `MOCK_JWKS`) exercises the **entire** pipeline offline.

## The 8 core routes
| # | Route | Auth | Purpose |
|---|---|---|---|
| 1 | `GET /healthz` | — | liveness + `{issuer, jwks_source, jwks_kids, configured}` |
| 2 | `POST /v1/consent/begin` | — | `{agent_subname}` → `{session_id, nonce, expires_at}` (pending, 15-min TTL); `403 unknown_agent`; per-IP rate-limited → `429 rate_limited` |
| 3 | `POST /v1/verify` | token | JWKS verify → iss/aud/exp → session+nonce → **optional `sub` pin (F10)** → acr → scope → **atomic jti burn** → mint consent + `receipt_token` |
| 4 | `POST /v1/consent/check` | token | re-verify token + ledger `active` + scope → gates every protected act; `401 consent_revoked`/`consent_expired` |
| 5 | `POST /v1/revoke` | **`receipt_token`** | flip status → revoked; next check 401s |
| 6 | `POST /v1/consent/deny` | — | denial logged as first-class event, **no consent row minted** |
| 7 | `GET /v1/consent/:id` | **`receipt_token`** (header) | debrief-card receipt: the five PIT elements as data + event trail. Capability read from `X-Receipt-Token` **or** `Authorization: Bearer` — never the URL query string |
| 8 | `GET /v1/ledger` | **`X-Admin-Key`** | full demo-window event log (World debrief evidence) |

Plus `POST /v1/admin/reset` (`X-Admin-Key`) for test/demo idempotency.

**Consent record carries all five PIT elements by construction:** `grant` event (authorize) · `scope_granted` (scope) · `exp` + expiry enforcement (duration) · `deny` event with no row minted (denied-path) · receipt endpoint (debrief). A record missing any element is invalid.

## Security (F11 — endpoint auth REQUIRED)
- **`/v1/revoke` is NOT callable unauthenticated** — it requires the `receipt_token` capability (128-bit, shown once at verify, stored only as a SHA-256 hash). A wrong token → `403 bad_receipt_token`, consent stays active. Verified by test.
- **`/v1/ledger` and `/v1/admin/*` require `X-Admin-Key`.** If no `ADMIN_KEY` is configured, those routes are unreachable (fail-closed).
- **The `receipt_token` capability never rides in a URL.** `GET /v1/consent/:id` reads it from a header (`X-Receipt-Token` or `Authorization: Bearer`), so it can't leak into projector logs, browser history, or referrers. The old `?receipt_token=` query no longer authenticates → `403 receipt_token_required`. (Spector M5-2b #4.)
- **F10 subject pin (optional, defense-in-depth).** Set `EXPECTED_SUB` to bind the blessing to exactly one human's pairwise `sub`; `/v1/verify` then rejects any otherwise-valid Orb token with a different subject → `401 sub_mismatch`, and **no jti is burned**. Unset ⇒ any valid token may bind (mock/dev). For the live demo, pin Shaka's captured `sub`. (Spector M5-2b #1 / F10.)
- **`/v1/consent/begin` is rate-limited per IP** (DO-backed fixed window, default 30 begins / 60s, `429 rate_limited` with a `retry_after_sec` hint; `BEGIN_RATE_LIMIT="0"` disables). Bounds unauthenticated DO-state spray. No device flow exists, so begin burns no World quota — the CF edge remains the primary throttle; this is defense-in-depth. (Spector M5-2b #2, previously accepted-risk, now closed.)
- **Never bind `0.0.0.0`.** `wrangler dev` binds `127.0.0.1`; `test.sh` passes `--ip 127.0.0.1` explicitly. In production the Worker is behind Cloudflare's edge (no raw socket to bind).
- **Fail-closed everywhere:** unknown error → 500; JWKS fetch failure → 503; nothing is an implicit allow.
- Capability tokens compared with a constant-time-ish `safeEqual`. Raw `id_token` is never stored (jti + claims suffice); `sub` is truncated in all UI/receipts.

## Going live (config swap only)
When Shaka's Cloudflare account + the real World `client_id` land:
```bash
# 1) drop the mock: delete .dev.vars' MOCK_JWKS + ISSUER_OVERRIDE
# 2) set the real client (booth Q#1) and admin key
wrangler secret put WID_CLIENT_ID     # expected `aud`
wrangler secret put ADMIN_KEY
wrangler secret put EXPECTED_SUB       # OPTIONAL (F10): pin Shaka's captured pairwise `sub`
# 3) wrangler.toml already pins issuer/JWKS to sandbox.auth.world.org
wrangler deploy                       # requires Workers Paid ($5/mo) for Durable Objects
```
**Issuer note:** the World pilot domain MOVED `auth.worldcoin.dev` → **`sandbox.auth.world.org`** (live-verified). We bake the new one; `auth.worldcoin.dev` is a legacy trap.

## Files
- `src/index.ts` — router + all routes + F11 auth.
- `src/verify.ts` — the ordered, fail-closed verify pipeline (jose).
- `src/do.ts` — `ConsentStore` Durable Object (sessions, atomic jti burn, consent records, ledger).
- `src/config.ts` — issuer/JWKS/scope resolution; local-mock vs remote key set.
- `src/{types,util}.ts` — types + helpers (sha-256, capability tokens, safeEqual).
- `test/consent.test.ts` + `test/fixtures/` — vitest suite + generated mock keys.
- `scripts/mkkeys.mjs`, `scripts/mint.mjs` — mock issuer keygen + token minting (TEST ONLY).
- `wrangler.toml`, `vitest.config.ts`, `test.sh`.

## Non-goals (anti-balloon)
No user accounts · no on-chain calls (ENS/Aqua lanes read the receipt one-way) · no IDKit/MCP surface · no DB migrations. (A modest per-IP begin rate-limiter *was* added in M5-2b as defense-in-depth; the CF edge is still the primary throttle.) `private_key_jwt` client auth + the World `/mcp` OAuth surface (new intel) are **post-deadline bonus**, not built here.
