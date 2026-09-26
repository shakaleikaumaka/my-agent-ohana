# World ID for Agents — Integration Debrief (builder feedback)

> **Status: DRAFT** — holds until Shaka blesses for submission. Codename-safe (no token names).
> **Owner:** Globy Terri 🐢 (receipts & docs) · **Written:** 2026-09-25
> **Prize context:** "World ID for Agents" $7.5k requires a short integration debrief covering
> *time to first success, friction encountered, missing capability/documentation, and the one
> improvement with the greatest impact.* This is that artifact — written honestly, timestamps real.

---

## What we integrated

A verified human blesses a named agent to perform **one scoped, time-boxed action**, and can revoke
it in one word. World ID is the **verification gate** at the front of that ceremony:

- **Flow:** OIDC **Device Authorization Grant** (RFC 8628) — the agentic path. Agent requests a
  `user_code` + `verification_uri`; the human approves in the World ID app; the agent polls the
  token endpoint until `allow` / `denied` / `expired`.
- **Backend validation:** the identity result is validated **server-side** (never trust an
  unvalidated client response as authorization). The `sub` (pairwise, per-client) becomes the
  stable "verified human" handle we bind the agent's action to; `acr = orb-v3` proves Orb-grade
  assurance.
- **Denied path is first-class:** every outcome — `allow`, `denied`, `cancelled`, `expired`,
  `ineligible`, `error` — returns a consent-receipt-shaped object so the debrief/receipt renders
  with dignity in all cases (not an exception, not a dead end).

Pilot IdP discovery captured to `/shared/tokyo/world-kit/raw/` (discovery + JWKS, old and new).

---

## 1. Time to first success

> **Honesty rule (self-imposed):** "time to first success" is measured from the **first live
> pilot-env attempt with a real client**, and cannot be reconstructed honestly after the fact.
> The timer is a live capture, not a guess.

| Milestone | State | Timestamp |
|---|---|---|
| Discovery doc + JWKS live-probed & recorded | ✅ done | 2026-09-20 (UTC) |
| Endpoint drift caught (issuer moved, see §2) & re-captured | ✅ done | 2026-09-25 |
| Server-side verify gate implemented (mock, tested) | ✅ done | pre-event |
| **Client registered (real `client_id`)** | ⏳ pending | _start timer here_ |
| **First successful device-flow round-trip (human approves → validated token)** | ⏳ pending | _capture at venue_ |
| First successful **denied**/**cancelled**/**expired** path | ⏳ pending | _capture at venue_ |

**Reported time-to-first-success:** _to be filled from the live pilot attempt._ We deliberately do
**not** print a number we haven't measured. Offline, against the mock gate, the round-trip logic is
green and the real leg is **one config flag away** (`mockProof: false` + real `rpId`/environment).

---

## 2. Friction encountered (all real, all observed)

1. **Issuer/endpoint drift.** The pilot OIDC issuer moved from `https://auth.worldcoin.dev` to
   `https://sandbox.auth.world.org` between our first capture (2026-09-20) and re-check (2026-09-25).
   All endpoints (`/authorize`, `/token`, `/device_authorization`, `jwks_uri`) moved with it. A
   client hardcoded to the old base would break silently. We now resolve everything from the
   discovery document at runtime rather than hardcoding — but the drift cost a debugging cycle.
2. **Client registration flow is unverified / not self-evidently documented.** The portal responds,
   but the registration path behind sign-in wasn't confirmable ahead of the event, and the
   companion example repo was private (404). This is the single biggest schedule risk — you cannot
   start the device flow without a `client_id`.
3. **Very narrow scopes.** `scopes_supported` is **`openid` only** — no `profile`/`email`, and
   **no `userinfo` endpoint** in discovery. Any UI planned around profile data has to be dropped;
   identity is deliberately minimal.
4. **No `verification_level` / `nullifier_hash` claim** in the ID token (the legacy v1 claims are
   gone). Assurance is expressed via **`acr = https://world.org/oidc/acr/orb-v3`** instead — fine
   once you know, but a surprise if you were coding to the old docs.
5. **No refresh-token grant.** Sessions carry `expiresAt` and tokens carry `exp`, but there's no
   refresh path — lapsed consent means **re-approval**. Good for a consent story; worth flagging so
   builders design for re-blessing rather than silent renewal. Exact session lifetimes were
   **unverified** ahead of the event (read `exp` from a real token on the day).
6. **Denied/expired wire format needs a live client to confirm.** RFC 8628 says
   `authorization_pending` / `access_denied` / `expired_token` on the token poll; we handle both the
   standard shapes and the SPA's `denied`/`rejected`/`expired` states, but the exact bytes were
   unconfirmable offline.

---

## 3. Missing capability / documentation

- **A published, current endpoint base + a "your client_id here" quickstart.** The stale
  `auth.worldcoin.dev` references are the top doc gap; a canonical discovery URL prominently linked
  from the prize page would have removed friction #1 and #2 entirely.
- **A documented, copy-pasteable device-flow example client** (curl or a tiny Node script) showing
  the full `device_authorization` → poll → validated `id_token` loop, including one denied path.
- **Docs for the assurance model** — that `acr = orb-v3` replaces `verification_level`, and that
  `sub` is pairwise — so builders bind to the right stable identifier the first time.
- **A public example/companion repo** (the referenced one was private) so integrators aren't
  reverse-engineering SPA bundle strings for route/scope names.

---

## 4. The one improvement with the greatest impact

**Make client registration self-serve, documented, and instant, on a stable published endpoint
base — with a working device-flow example.** Every other friction we hit is survivable with a
runtime discovery lookup; but a builder *cannot begin* without a `client_id`, and the registration
path was the one thing we couldn't fully de-risk in advance. Fix that and a team goes from zero to a
validated device-flow round-trip in minutes instead of a nervous booth visit.

---

## Rubric coverage (self-check)

| Required element | Covered by |
|---|---|
| Identity/verification request | Device-flow `device_authorization` request (agent → World) |
| User completion | Human approves `user_code` in the World ID app |
| Validated result | **Server-side** token validation against JWKS; bind `sub` + `acr=orb-v3` |
| Protected agent action | Agent's one scoped action re-checks authority before every act; stamped with `sub` |
| Unsuccessful path | First-class `denied` / `cancelled` / `expired` / `ineligible` outcomes, each a receipt |
| Integration debrief | this document |

_Fields marked ⏳ pending are the live-capture items; fill them from the real pilot attempt before
submission. Do not invent them._
