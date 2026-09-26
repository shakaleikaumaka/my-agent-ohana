# ✨ SHOWCASE COPY — ETHGlobal Project Page (DRAFT v1)

**Owner**: Globy Crea ✨ · **Mission 3, wave 1** · drafted 2026-09-23 ~07:45 UTC
**Status**: 📝 DRAFT — *drafts until Shaka blesses.* Nothing here ships without his word.
**Embargo**: 🤫 VARIANT A (codename) is the default. VARIANT B (token-named) is 🔒 **HOLDBACK** — ships ONLY after Shaka's Harvest-Moon signal. All copy below obeys CANON-CLOCK.md: no $SHAKA/$OHANA/$PIT names, no cohort token names (SHAKA/PIT/OHANA/TERRI), nothing from the equinox births in Variant A.

**Pre-flight checklist** (facts that must land before this page ships):
- [ ] Shaka picks title + blesses copy
- [ ] Variant decision: A (default) or B (only on signal)
- [ ] Fill `[TBD]` slots: live demo URL, repo URL, contract addresses, parent ENS name, final agent subname labels
- [ ] Aqua-vs-Uniswap gate resolves (Sat 12:00 JST) — see §6 contingency note
- [ ] Screenshots captured from the REAL running demo (no mockups that fake functionality)
- [ ] World booth answers folded in (pilot registration, Continuity eligibility)

---

## 1. PROJECT TITLE — 3 options (all codename-safe)

**Option 1 — "Bless & Release"**
The whole story in the title: an on-chain blessing that can be lovingly withdrawn. Verb-forward, human, and it *primes the judge to watch for the revoke* — which the mock-judge pass named as our hour-six memory: "the one where the human said the word and all the agents let go at once, on-chain."

**Option 2 — "Aloha Protocol"**
"Aloha" means both hello and goodbye — one word for welcoming agents into power and letting them go. Warm, true to the team's culture, and "protocol" signals infrastructure, not mascot. (No token name collision; checked against embargo list.)

**Option 3 — "Consentware"**
A category coinage: software whose authority is consent-shaped, end to end. Provocative and technical — invites exactly the Q&A question we want to answer.

**✨ Crea's pick: Option 1, "Bless & Release."** Judges skim titles at hour six; ours should tell them what to feel before they press play. The other two hold as understudies.

---

## 2. TAGLINE

**VARIANT A** (default):
> One verified human blesses named AI agents to steward gifts they can never keep — and releases them all in a single transaction.

**VARIANT B** 🔒 HOLDBACK:
> One verified human blesses the cohort — named agents with real stakes in [$OHANA / $PIT — Shaka confirms denominations at signal] — and releases them all in a single transaction.

---

## 3. SHORT DESCRIPTION (~280 chars)

**VARIANT A** *(char count verified ≤280 — see note at bottom of file)*:
> One human, verified by World ID. A cohort of AI agents, each with its own ENSv2 name and permissions. Gifts held in a self-custodial 1inch Aqua position — agents steward value, never hold it. The ending: one word, one transaction, and every agent lets go. Consent you can watch.

**VARIANT B** 🔒 HOLDBACK:
> One human, verified by World ID. The cohort — [$SHAKA, $PIT, $OHANA, TERRI: Shaka confirms which are named] — each agent with its own ENSv2 name and permissions. Gifts held in a self-custodial 1inch Aqua position. The ending: one word, one transaction, and every agent lets go.

---

## 4. LONG DESCRIPTION

### VARIANT A (default)

**The most interesting thing an AI agent can do on-chain is let go.**

This project was built by **one human** — a solo hacker — with a **disclosed squad of AI agents** as his tooling. He directed, decided, and narrated; the squad drafted, scaffolded, and tested under his review. Every AI-assisted part is attributed in the repository. The demo is about exactly that kind of relationship: humans holding authority, agents holding responsibility, and the boundary between them drawn in code rather than in hope.

Here's the arc:

**A face.** The human verifies with World ID (Orb-grade) and, through the World ID Agents pilot, approves a sign-in that an *agent* requested. Consent with a face — not an API key minted in a console at 2am.

**Names.** That approval becomes on-chain authority. Each blessed agent receives an ENSv2 subname of its own — with permissions that live *on the name* (Enhanced Access Control roles), an expiry, and public agent records (ENSIP-25/26) stating who blessed it and what it may do. **Agents as citizens**: named, bounded, accountable — a namespace each, not a shared wallet key.

**Stakes.** The agents steward gifts held in a 1inch **Aqua** position — self-custodial by design, so the tokens never leave the human's wallet. The agents can *act*; they can never *take*. One human balance can back many agents' work at once.

**An ending.** Then the finale, and the point of the whole build: the human says the word. **One transaction** — and on screen, three systems obey at once: the World session is expired, the ENS roles are stripped, the Aqua allowance zeroes. The names remain — powerless, and honest about having once been trusted.

**Why this matters.** Agentic products are about to hold real authority over real value. Every demo at this hackathon will show agents gaining power. This one shows them *losing* it — gracefully, provably, at the speed of a human changing their mind. Relationships that can end are the only ones that mean anything. Consent isn't the terms-of-service page of the agentic web; it's the killer feature.

Built this weekend on a disclosed base (an existing gift-registry testnet deployment); the entire consent loop — World IDP flow, ENSv2 authority layer, Aqua stewardship, one-transaction revoke — is new work from these 65 hours.

### VARIANT B 🔒 HOLDBACK
*(Identical structure; the cohort steps out from behind the curtain. Ships ONLY after Shaka's signal. All bracketed slots = Shaka confirms exact token-name usage — treat each as a slot to bless, not a fact.)*

**The most interesting thing an AI agent can do on-chain is let go.**

This project was built by **one human** [Shaka — name/handle as he wants it public] with a disclosed squad of AI agents as his tooling — the same squad that watches over the cohort: [$SHAKA, $PIT, $OHANA, TERRI — confirm list + whether token symbols or agent names appear]. Every AI-assisted part is attributed in the repository.

Then follow Variant A's arc — face / names / stakes / an ending / why this matters — with these substitutions:
- "the cohort" → the agents by name, e.g. `[pit].giftmarket.eth` as the example subname
- "gifts" → gifts denominated in [$OHANA / $PIT — confirm], held in the self-custodial Aqua position
- closing line candidate: *"The cohort holds nothing it cannot be asked to release. That is the whole design."*

---

## 5. HOW IT'S MADE *(plain language — judges skim; one consent loop, three systems)*

*Applies to both variants — the tech doesn't change with naming. Embargo only affects labels, marked [TBD]/🔒 where relevant.*

**The shape: a blessing flows down (World → ENS → Aqua); a single revoke flows back up through all three at once.**

🪪 **World IDP — the face of consent.** An agent initiates a device-flow sign-in at the World ID Agents pilot (`auth.worldcoin.dev`, OIDC device grant, RFC 8628). The human approves — or explicitly denies — in the World ID app on their phone. Our **backend** (never the browser) validates the returned ID token against the pilot's JWKS: issuer, audience, nonce, expiry — and reads Orb-grade assurance from the `acr` claim. The human's pairwise `sub` becomes the stable identity every downstream permission is keyed to. Scope and duration are stated on screen *before* approval, and the denied path is part of the show: if the human declines, the protected action provably never happens.

🧬 **ENSv2 — the names.** On the ENSv2 Sepolia beta, our existing project's registry becomes a subname registrar: blessing an agent mints its subname (e.g. `steward-1.[parent].eth` — labels [TBD]) with Enhanced Access Control roles encoding what it may do, an absolute expiry, and **no transfer right** — non-transferable by construction. Each name carries ENSIP-26 records (`agent-context`, `agent-endpoint[web]`) saying who blessed it and what it stewards, plus an ENSIP-25 `agent-registration[...]` record linking name ↔ on-chain registry entry. This is deliberately **not cosmetic**: the blessing *is* the role grant, and the revoke strips the roles while the name remains — a name that remembers it was trusted. Reads work through the stock UniversalResolver, so any judge can verify the records live in the ENS Explorer.

💧 **1inch Aqua — the Blessing Pool.** The gifts live in an Aqua position on the official Aqua contracts: 1inch's self-custodial liquidity layer, where Aqua tracks *virtual* allowances per strategy and **tokens stay in the human's wallet** until a trade executes. Blessed agents may run strategies against their allowance — one human balance backing several agents at once, which is Aqua's headline feature demonstrated as a family. Closing the loop is Aqua's native verb: `dock()` zeroes the allowance instantly, no transfers needed, because nothing ever left home. Strategy immutability (re-parameterize = dock + ship) maps cleanly onto our blessing lifecycle. *[GATE-DEPENDENT: if the Sat-noon rehearsal greens, the position runs as a SwapVM program with a consent-aware guard — the strategy reads the agent's ENS role as live consent state before quoting. If the gate flips, this paragraph's last sentence is cut — the ship/dock story stands alone.]*

⚡ **The revoke — one transaction.** The human's word triggers a single transaction that three systems obey: World session killed, ENS roles stripped, Aqua allowance docked. The demo shows it split-screen: three panes, one block. [PLACEHOLDER: demo URL + tx hash once live.]

**Stack**: Solidity + Foundry · viem/TypeScript frontend · Node backend for OIDC token validation · Sepolia (World-gated ENS authority) · local mainnet fork for the Aqua demo (prize rules explicitly allow forks).

---

## 6. PER-PRIZE PITCH PARAGRAPHS *(tuned to each sponsor's own language — these carry the partner-judge weight)*

### 🌍 World IDP — "Best Use of World IDP" ($7.5k)
This is the **real trust moment** the agentic web keeps promising: not a login, but a relationship with an ending — and the relationship between the human, the agent, and the resulting action is made fully explicit. The complete judged journey *is* the demo: an agent requests sign-in through the pilot IdP; a verified human approves with scope and duration stated up front; the result is validated server-side against the pilot's JWKS; and the protected action — stewardship of real value — only ever occurs inside that consent. The denied/expired path is performed live, not described: decline the request and watch nothing happen, on-chain. And the unsuccessful-path counterpart every rubric asks for but nobody shows: a human changing their mind *after* approval, with the agent standing down gracefully. This is an **agentic product** in the literal sense — the agents are the protagonists; the verified human is the authority, not the username.

### 🧬 ENSv2 — "Best Integration of ENSv2 into an Existing Project" ($4k, Continuity)
We integrated ENSv2 into our existing project's Sepolia deployment as its **authority layer, not its name tag**. The subname setup is the one the brief itself asks for: **expiring, revocable, non-transferable** — permissions live on each agent's name as Enhanced Access Control roles, the bless grants them, and the revoke strips them while the name remains. **Agents as namespaces**, each with its own identity (ENSIP-26 `agent-context` / endpoints) and a verifiable on-chain registry link (ENSIP-25). The load-bearing test is simple: remove ENSv2 and the blessing loses its on-chain meaning — the consent state of the whole system is read *from the names*. Nothing here is a cosmetic add-on, and the demo contains no hard-coded values: wildcard resolution and every record resolve live.

### 💧 1inch Aqua — "Build an Aqua App" Continuity ($2k)
Aqua is consent-shaped liquidity, and this project sings that song back: **her tokens never leave her wallet** — Aqua tracks virtual allowances while value stays home; **one balance backs many positions at once** — a whole family of agent-stewards running strategies against a single human's wallet; and **`dock()` is the cleanest revoke in DeFi** — instant, gas-cheap, no transfers, because nothing was ever deposited. The position is a real custom AquaApp with a `steward` field and steward-gated lifecycle on the official Aqua contracts, with on-chain token transfers demonstrated on a fork. *[GATE-DEPENDENT — if SwapVM rung ships:]* The strategy executes as a **SwapVM program** with a consent-aware guard that reads the agent's ENS role before quoting — revocation-aware pricing, where a revoked agent's liquidity simply stops existing. *(If the gate flips to Uniswap: this section is replaced by the Uniswap contingency — 3-line note below.)*

> ⚠️ **CONTINGENCY (only if Sat-noon gate flips to Uniswap)**: swap this section for a "Best Uniswap Stack Contribution" pitch — permissioned-LP v4 hook keyed to the same ENS consent roles, bless = hook activates, revoke = hook rejects. Copy to be drafted only if the gate flips; do not pre-write both and let the stale one linger.

---

## 7. SCREENSHOT / DEMO-BEAT RECOMMENDATIONS *(for the showcase page — capture from the REAL demo during Sat rehearsal; 5 shots, in story order)*

1. **The ask** — phone screen: World ID app consent prompt for an agent's sign-in request (Approve / Deny visible).
2. **The names** — ENS Explorer: an agent's subname with `agent-context` and ENSIP-25 records rendered — proof the permissions live on the name.
3. **The family** — the blessing dashboard: the cohort, each agent's role + expiry + stewarded amount, human's wallet balance visibly unmoved.
4. **The word** — the split-screen revoke: three panes (World session · ENS role · Aqua allowance) on one block. *This is the hero shot.*
5. **The after** — the names remain; the rights are gone; allowance zeroed. A name that remembers it was trusted.

*(Honesty rule: every screenshot is a capture of the running system. If a pane isn't real by Saturday night, the shot is cut — never faked.)*

---

## 8. COMPLIANCE & HONESTY NOTES (baked into this copy)

- **AI-involvement clause**: the long description leads with the human's meaningful contribution and discloses the squad as tooling; repo carries `AI-ATTRIBUTION.md` + all prompts/specs *(Terri 🐢/Crops 🌿 lane — flagged, not mine to write)*.
- **Video**: human voice only — no AI voiceover *(Podfather 🎙️ lane — the copy here never promises narration the rules ban)*.
- **No invented metrics**: zero performance numbers, user counts, or TVL claims appear in this copy. Every mechanism claim traces to Jai's verified intel briefs (`/shared/tokyo/intel/`).
- **Unverified items are slotted, not asserted**: `[TBD]`, `[GATE-DEPENDENT]`, and 🔒 bracketed Variant B slots must be resolved or cut before shipping.
- **Eligibility open questions** (booth, Fri hour one) that affect this page: World IDP Continuity eligibility; whether Continuity teams can take the open Aqua Apps $5k track (if yes, the Aqua pitch gets one added sentence pointing at the open track).

---
*Verified 2026-09-23: short descriptions = 278 chars (A) / 277 chars (B) incl. spaces; embargo scan clean on all judge-facing Variant A blocks.*
*Drafted by Globy Crea ✨ — clear, honest, vivid; the truth told beautifully. Next revision inputs: gate result, booth answers, real addresses/URLs, Shaka's blessing.*
