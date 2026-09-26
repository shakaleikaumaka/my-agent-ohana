# 🕳️ world-kit — World IDKit gate ×6 + mini-app template + OIDC re-verify

**Lane M5-5 · PIT 🕳️ · consent architect.** Everything here is test-driven and runs. This kit covers **both**
World prize tracks with ONE reusable integration:
- **Best Use of IDKit** ($5k) — the verify gate (proof-of-human) with an explicit *minimum-sufficient-credential* decision.
- **Best Use of World ID for Agents** ($5k) — the OIDC / device-flow leg on `sandbox.auth.world.org` (re-verified here; consumed by Tauro's consent-server).

> **Two distinct World systems — do not conflate them.**
> 1. **IDKit** = the *proof/verify gate* (`@worldcoin/idkit` v4 → `POST https://developer.world.org/api/v4/verify/{rp_id}`).
> 2. **World ID for Agents / OIDC** = *who-is-this-human-over-time* re-auth (`sandbox.auth.world.org`, device_code + auth_code+PKCE). This is Tauro's consent-server leg; we only **re-verified** it here.

## 📁 What's here
| File | What |
|---|---|
| [`agents.config.json`](/shared/tokyo/world-kit/agents.config.json) | The ONE gate config, parameterized ×6. Each agent declares its **minimum-sufficient credential** + scope + duration + *why*. Mock→real = flip `mockProof` + fill `rpId`. |
| [`src/idkit-gate/verify.mjs`](/shared/tokyo/world-kit/src/idkit-gate/verify.mjs) | **Server-side** verify gate (the authority on pass/fail). Mock + real paths, dignified denied-path, fail-closed. Dependency-free. |
| [`src/idkit-gate/IDKitGate.jsx`](/shared/tokyo/world-kit/src/idkit-gate/IDKitGate.jsx) | Reusable React gate (IDKit v4 widget wrapper) + `MockGate` for offline UI. |
| [`src/idkit-gate/mock.mjs`](/shared/tokyo/world-kit/src/idkit-gate/mock.mjs) | Mock proof/error generators (labelled NOT prize-eligible). |
| [`tests/verify.test.mjs`](/shared/tokyo/world-kit/tests/verify.test.mjs) | 11-check unit suite (`node --test`). |
| [`miniapp-template/`](/shared/tokyo/world-kit/miniapp-template/) | ONE World mini app (MiniKit + Next.js 15 + IDKit v4). Replicable ×6 via `NEXT_PUBLIC_WORLD_AGENT_ID`. **Builds green.** |
| [`oidc-reverify.md`](/shared/tokyo/world-kit/oidc-reverify.md) | 🔁 OIDC re-verify findings (domain moved; **kid rotated** — feeds Tauro). |
| [`denied-path.md`](/shared/tokyo/world-kit/denied-path.md) | 🚫 The MANDATORY, SCORED denied/expired/cancelled wire formats + dignity copy. |
| [`test.sh`](/shared/tokyo/world-kit/test.sh) · [`TEST-RESULTS.md`](/shared/tokyo/world-kit/TEST-RESULTS.md) | Curl OIDC+JWKS asserts + gate unit test; passing output pasted. |
| `raw/` | Raw OIDC discovery + JWKS (new & old domain). |

## 🧠 The thesis (why we win the IDKit track)
World says verbatim: *"We are not rewarding the most credentials used. We are rewarding the best decision about
which credential is needed, why it is needed, and how it improves a real product experience."* So the gate makes the
credential a **function of the action's trust weight** (consent minimization):

| Agent | Action | Min-sufficient credential | Why |
|---|---|---|---|
| **pit** | bless.pit | **Orb** | custodies the consent-issuance key — account-protecting action; must be a unique human |
| **shaka** | bless.shaka | **Orb** | the human's own delegate; must map 1:1 to a verified unique human |
| **trace** | bless.trace | **Passport/NFC** | stewards real food gifts — fair access to a scarce physical benefit |
| **terri** | bless.terri | **Device** | low-stakes bookkeeping, no value movement |
| **spector** | bless.spector | **Device** | read-only security scan |
| **crops** | bless.crops | **Device** | read-only repo-hygiene scan |

Higher assurance always satisfies a lower requirement; a lower one is rejected as `ineligible` (tested).

## ▶️ Run the tests
```bash
cd /shared/tokyo/world-kit
bash test.sh          # curl OIDC+JWKS (new domain) + node --test the gate  -> 7/7, 11/11
```

## ▶️ Run the mini app
```bash
cd /shared/tokyo/world-kit/miniapp-template
cp .env.example .env.local          # set NEXT_PUBLIC_WORLD_AGENT_ID + app_id
npm install
npm run dev                          # http://localhost:3000
# ONE app, 6 instances: NEXT_PUBLIC_WORLD_AGENT_ID=trace npm run dev  (etc.)
```
`lib/` and `agents.config.json` in the template are **symlinks** to the shared gate — one source of truth, no divergence. Build verified: `npx next build` → green, both API routes present (see TEST-RESULTS).

## 🔁 MOCK → REAL is ONE config change (honesty law)
The mock IDP is **NOT prize-eligible**. For the Sunday judged run:
1. In `agents.config.json`: `"mockProof": false`, set `"rpId": "rp_..."`, `"environment": "production"`.
2. In the mini app env: `NEXT_PUBLIC_WORLD_APP_ID=app_...`, `WORLD_RP_ID=rp_...`, `WORLD_SIGNING_KEY=<secret>` (server only).
Nothing else changes — the client widget, the server verify call, the receipts are identical. Everything mock is
badged (`"mock": true` in receipts, `[MOCK]` in UI).

## 🏗️ Add the mini app to the World Dev Portal (booth steps)
**IDKit / proof leg** — `https://developer.world.org`:
1. Create app → get `app_id`, `rp_id`, `signing_key` (click **"Enable World ID 4.0"** if migrating a v3 app).
2. Store `signing_key` as a server secret (`WORLD_SIGNING_KEY`) — it signs the RP request in `/api/idkit-request`. Never ship it to the client.
3. Register the **action** id per agent (`bless.pit`, `bless.trace`, …) or create on-the-fly with `action_description`.
4. Dev/test without a phone: `environment: "staging"` + the simulator (`https://simulator.worldcoin.org/`).

**Mini-app listing** — `https://sandbox.auth.world.org/portal` (Agents) / dev portal Mini Apps:
1. Deploy the app to a public HTTPS URL (mini app = **SDK + URL in the dev portal**).
2. Add the URL to the portal's Mini App config; set the app icon/name per agent.
3. Wrap in `MiniKitProvider` (done in `app/providers.tsx`) so it runs inside World App with native transport.

**OIDC / Agents leg** — `https://sandbox.auth.world.org/portal`:
- Register the OIDC client → `client_id` (+ redirect URIs). Feeds **Tauro's consent-server** (issuer `https://sandbox.auth.world.org`, JWKS pinned there — see `oidc-reverify.md`). This is the still-open **booth blocker Q#1**.

## ⚠️ Blockers (Shaka-only, unchanged)
- **IDKit leg:** a Portal app + `signing_key` on `developer.world.org`.
- **OIDC/Agents leg:** a `client_id` on `sandbox.auth.world.org/portal`.
Both are behind World sign-in and cannot be created from here. Build proceeds on mock/staging now; wire real at the booth hour one. **This is the flagship fatal-risk.**
