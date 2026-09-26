# 🚫 DENIED-PATH — the MANDATORY, SCORED World criterion

**PIT 🕳️ · lane M5-5 · 2026-09-25**
Both World tracks require it **verbatim**:
- **World ID for Agents:** *"Demonstrate a denied, expired, cancelled, or otherwise unsuccessful path where the protected action does not occur."*
- **Best Use of IDKit:** *"Demonstrate a successful verification and one meaningful alternative path, such as cancellation, unavailable credential, rejection, or an ineligible user."*

Judges *explicitly want to see denial handled with dignity.* This is not an error screen — it's a first-class outcome. Our gate returns a **consent-receipt-shaped object for deny/cancel/expire too**, so the DEBRIEF beat renders the same in success and refusal.

## ✅ Booth deltas confirmed
- **Orb is NOT needed to demo.** Prize-page banner (verbatim): *"We are mocking proofs now, so you don't need sandbox app anymore"* + *"NOTE: Proofs are using fake identities, DO NOT rely in them for production."* → We can build + rehearse the whole flow offline; the **mock IDP is NOT prize-eligible**, so the Sunday judged run flips `mockProof:false` + a real `rp_id`/`client_id` (one config change).
- **Two distinct World surfaces** (we cover both):
  1. **IDKit proof** (`@worldcoin/idkit`) → client widget returns a proof → **verify server-side** at `POST https://developer.world.org/api/v4/verify/{rp_id}`.
  2. **World ID for Agents / OIDC** (device flow + auth-code) on `sandbox.auth.world.org` → Tauro's consent-server validates the `id_token`.

## Wire formats — the unsuccessful paths

### A) OIDC / device flow (`sandbox.auth.world.org`) — RFC 6749 §4.1.2.1 + RFC 8628 §3.5
Live-probed today (no client_id yet, so these are the *shapes* we get + RFC-standard for the human-driven states):

| State | Where | Wire format | HTTP |
|---|---|---|---|
| Bad/unknown client | device_authorization / token | `{"error":"invalid_client"}` | 401 *(probed live)* |
| Bad params | authorize | `{"error":"invalid_request"}` | 400 *(probed live)* |
| **Human hits "Deny sign-in"** | authorize redirect | `?error=access_denied&state=…` | 302 redirect *(RFC-standard; confirm at booth once client_id exists)* |
| **Human denies device request** | token poll | `{"error":"access_denied"}` | 400 *(RFC 8628 §3.5)* |
| Approval pending | token poll | `{"error":"authorization_pending"}` | 400 |
| Polling too fast | token poll | `{"error":"slow_down"}` | 400 |
| **`user_code` expired** | token poll | `{"error":"expired_token"}` | 400 |
| Wrong device_code | token poll | `{"error":"invalid_grant"}` | 400 |

> ⚠️ **UNVERIFIED until we have a client_id:** the *exact* deny/expired body World returns (they may wrap RFC codes). **Booth Q#4/#6** = capture the real `error` string on a live deny + a live expiry; drop it into this table. Our gate already handles all the RFC codes (`classifyError` in `verify.mjs`), so a surprise string only needs a one-line map add.

### B) IDKit proof verify (`developer.world.org/api/v4/verify`) — probed live today
| State | Wire format | HTTP |
|---|---|---|
| Missing action | `{"code":"validation_error","detail":"action is required for uniqueness proofs","attribute":"action"}` | 400 *(probed live)* |
| Missing proofs | `{"code":"validation_error","detail":"responses array is required","attribute":"responses"}` | 400 *(probed live)* |
| Invalid proof | `{"code":"...","detail":"...","success":false}` | 400 |
| Success | `{"success":true,"results":[…],"nullifier":"0x…","environment":"production","session_id":"session_…"}` | 200 |

IDKit **widget-side** error codes the client can raise (mapped in our gate): `failed_by_host_app` / `user_rejected` / `already_signed` / `connection_failed` / `unexpected_response` / `generic_error`. Widget cancel = user closed the modal.

## Our gate's outcome vocabulary (dignified, in code)
`verify.mjs` collapses every failure into a small, honest set — each with its own dignity-preserving copy and a receipt:

| `outcome` | Trigger | UI message (from `dignifiedMessage()`) |
|---|---|---|
| `denied` | access_denied / rejected | "You chose not to bless {agent}. Nothing was authorized, and nothing will run. The shelf stays open." |
| `cancelled` | user closed / dismissed | "Blessing cancelled. {agent} was not authorized — you can start again whenever you like." |
| `expired` | expired_token / timeout | "That request expired before it was approved. {agent} stays unblessed; request a fresh one." |
| `ineligible` | credential below the minimum sufficient one | "This action needs {credential}. That credential wasn't available, so {agent} was not authorized." |
| `error` | malformed / signal mismatch / verify unreachable / replay | "We couldn't verify that safely, so we did nothing. {agent} stays unblessed (fail-closed)." |

**Every unsuccessful outcome guarantees: the protected action does NOT run, AND a consent receipt is still issued** (so the demo's debrief/receipt screen renders identically for a blessing and a refusal — refusal with dignity). Unit-tested: `denied`, `cancelled`, `expired`, `ineligible`, `signal_mismatch`, `malformed`, `nullifier_reused`, live-verify `success:false`, and network-down → all fail closed.

## Fail-closed guarantees (Spector F11 alignment)
- Client response is **never** treated as authorization — server-side `verifyGate` is the only authority.
- Malformed / missing / mismatched-signal payloads → `error`, action blocked.
- Verify service unreachable → `error` (`verify_unreachable`), action blocked (no fail-open).
- Nullifier replay → blocked. Wrong action on the proof → blocked. Wrong environment (staging proof in prod) → blocked.
