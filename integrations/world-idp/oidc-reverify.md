# 🔁 OIDC RE-VERIFY — domain moved to `sandbox.auth.world.org`

**PIT 🕳️ · lane M5-5 · live-probed 2026-09-25 ~21:20 JST (12:20 UTC)**
Raw responses saved: [`raw/oidc-discovery.new.json`](/shared/tokyo/world-kit/raw/oidc-discovery.new.json) · [`raw/jwks.new.json`](/shared/tokyo/world-kit/raw/jwks.new.json) · old-domain copies `*.old.json`.

## 🚨 HEADLINE (for Tauro's consent-server JWKS config)

1. **Discovery is LIVE** on the new domain — `GET https://sandbox.auth.world.org/.well-known/openid-configuration` → **HTTP 200**, full OIDC doc.
2. **JWKS is present** — `GET https://sandbox.auth.world.org/.well-known/jwks.json` → **HTTP 200**, 1 RSA key, `alg RS256`, `use sig`.
3. **⚠️ THE SIGNING KID ROTATED.** This is the one thing that breaks a pinned verifier:
   - OLD (`auth.worldcoin.dev`): `yiX1KR5gDdPTqsHAbT5d0JqIG6-HcTv8wGao4sSTgsY`
   - **NEW (`sandbox.auth.world.org`): `SjxoYTY6TKyO9wDOz9VmG4ze3tJsvwsPE5zgkOqqwAo`**
4. **Everything else is byte-identical schema** — only the domain (issuer + every endpoint URL) changed. Same grants, claims, ACR, scopes, PKCE, response types, client-auth methods. So Tauro's spec is correct as written; **only the domain + kid need re-pinning.**
5. **Device-flow endpoints all present** (`device_authorization_endpoint` + `urn:ietf:params:oauth:grant-type:device_code` grant) — the agentic path survives the move intact.

## ✅ ACTION FOR TAURO (consent-server)
```diff
- issuer:   https://auth.worldcoin.dev
+ issuer:   https://sandbox.auth.world.org
- jwks_uri: https://auth.worldcoin.dev/.well-known/jwks.json
+ jwks_uri: https://sandbox.auth.world.org/.well-known/jwks.json
```
Use `createRemoteJWKSet(new URL("https://sandbox.auth.world.org/.well-known/jwks.json"))` — do **not** hard-code the kid; let `jose` fetch-and-cache so a future rotation self-heals. Verify with `issuer: "https://sandbox.auth.world.org"` + `audience: <client_id>`. The old pin in `intel/consent-backend-spec.md` (auth.worldcoin.dev) is now STALE — update it.

## Full old→new discovery diff (only 5 fields changed, all just the domain)

| Field | OLD `auth.worldcoin.dev` | NEW `sandbox.auth.world.org` |
|---|---|---|
| `issuer` | https://auth.worldcoin.dev | **https://sandbox.auth.world.org** |
| `authorization_endpoint` | …/api/v1/authorize | **https://sandbox.auth.world.org/api/v1/authorize** |
| `token_endpoint` | …/api/v1/token | **https://sandbox.auth.world.org/api/v1/token** |
| `device_authorization_endpoint` | …/api/v1/device_authorization | **https://sandbox.auth.world.org/api/v1/device_authorization** |
| `jwks_uri` | …/.well-known/jwks.json | **https://sandbox.auth.world.org/.well-known/jwks.json** |
| **JWKS kid** | yiX1KR5gDdPTqsHAbT5d0JqIG6-HcTv8wGao4sSTgsY | **SjxoYTY6TKyO9wDOz9VmG4ze3tJsvwsPE5zgkOqqwAo** |

**IDENTICAL (unchanged):** `grant_types_supported` = `["authorization_code","urn:ietf:params:oauth:grant-type:device_code"]` · `response_types_supported` = `["code"]` · `response_modes_supported` = `["query"]` · `scopes_supported` = `["openid"]` · `claims_supported` = `["iss","sub","aud","exp","iat","jti","nonce","auth_time","acr","amr"]` · `acr_values_supported` = `["https://world.org/oidc/acr/orb-v3"]` · `code_challenge_methods_supported` = `["S256"]` · `subject_types_supported` = `["pairwise"]` · `id_token_signing_alg_values_supported` = `["RS256"]` · `token_endpoint_auth_methods_supported` = `["client_secret_basic","client_secret_post","private_key_jwt"]` · `prompt_values_supported` = `["none","login"]` · `request_uri_parameter_supported` = `false`.

## Live endpoint probes (no client_id yet — Shaka's booth blocker)

| Probe | Result | Reading |
|---|---|---|
| `POST /api/v1/device_authorization` (no client_id) | **401** `{"error":"invalid_client"}` | endpoint live; needs a registered client |
| `POST /api/v1/device_authorization` (bogus client_id) | **401** `{"error":"invalid_client"}` | client validated server-side ✓ |
| `POST /api/v1/token` (device_code grant, bogus) | **401** `{"error":"invalid_client"}` | same |
| `GET /api/v1/authorize` (bogus client) | **400** `{"error":"invalid_request"}` | RFC-standard error shape |
| `GET /portal` | **200** | self-serve client registration surface (sign in w/ your World ID) |
| `GET /docs` | **200** | "Human continuity for apps and agents" — the Agents/Continuity docs |

The old `auth.worldcoin.dev` domain **still answers** (200 on discovery/JWKS with the OLD kid) — it's a trap; do not build the judged entry on it. `sandbox.auth.world.org` is canon per the prize page.

## Old-intel corrections
- `intel/world-idp-oidc.md` (Jai, 2026-09-20) was pinned to `auth.worldcoin.dev` + old kid — **superseded by this doc** for domain + kid. Its flow analysis (device flow = agentic path, no refresh token, pairwise sub, no userinfo, no nullifier in ID token) still holds.
- No `userinfo`, no `refresh_token`, no `profile`/`email` scope on the new domain either — design around `sub` (pairwise, stable per client) + `acr` (`orb-v3`). Re-consent on expiry = a feature for our "consent is temporary" thesis.

## What this feeds
- **Tauro** (M5-2 consent-server): re-pin issuer + jwks_uri + audience; keep dynamic JWKS fetch. This is the ID-token (OIDC / "World ID for Agents") leg.
- **This lane's IDKit gate** is the *proof* leg (`@worldcoin/idkit` → `POST developer.world.org/api/v4/verify/{rp_id}`), a distinct surface (see `README.md`). Both World tracks are covered.
