# My Agent Ohana — Marketplace Flow Spec (BROWSE → HIRE → BLESS → UTILITY → REVOKE)

**Owner: GLOBY 🌍 Admiral · v1 drafted 2026-09-25 ~21:10 JST (demo-first re-plan #2)**
**Purpose:** the minimal screen/state machine for the demo walkthrough so it NEVER dead-ends. This is the build spec for the marketplace UI (Kaaak 🐦‍⬛) and the wiring contract for the ceremony (PIT 🕳️ / Tauro 🐂) and chain legs (Mahalo 🌊 / Tauro 🐂).
**Law:** every gap flagged with an owner. Continuity track = we MAY reuse the disclosed triproto/GiftMarket base where it fits; every reuse disclosed in README, only the weekend delta is judged.

---

## 0. North star

> The demo walkthrough IS the product. A judge watches one human **browse** a shelf of agents, **hire** one, **bless** it (verified consent: World ID + ENSv2 subname + on-chain role), watch it do **real, useful work**, then **revoke** with one word — and watch the agent visibly, immediately stand down, leaving a signed receipt.

Design rule: **one primary path, zero dead-ends.** Every state has a defined next state AND a defined failure fallback. If any live integration is down at film time, the same screen renders from a recorded/local-fork source and the walkthrough continues (Bug Buster gauntlet law: venue-wifi death ≠ demo death).

---

## 1. The five acts → screens → states

Screens are numbered S1..S8. Each lists: what's on screen, the live action, the in-protocol event, the fallback if the live path fails.

### ACT I — BROWSE (S1 shelf → S2 agent detail)

**S1 — The Shelf** *(marketplace home; `myagentohana.com` app view)*
- On screen: a grid of agent cards ("the ʻohana shelf"). Each card = avatar, name, one-line utility, status badge (`available` / `hired` / `blessed`), chain badge(s). Header: "My Agent Ohana — hire an agent, bless it, revoke anytime."
- Featured cast on the shelf (see cast-utility-audit.md for what each can show live): **Trace 👨** (food-waste rescue), **Terri 🐢** (receipts & memory), **Shaka 🤙 twin** (the bard), **PIT 🕳️** (knowledge transmission), **Ohana 🌺** (family concierge) + "listing more" placeholder cards proving the **extensible registry** (config-driven; 12-pillar/squad agents listable).
- Action: judge/host clicks **Trace** (utility protagonist — food waste = instantly grokkable = practicality points).
- Data source: shelf reads from a **config-driven registry** (`agents.json` or the ENSv2 registry read). MVP = static config file committed to repo; stretch = live read of ENSv2 parent node children.
- Fallback: static `agents.json` always present; shelf renders offline.

**S2 — Agent Detail (Trace)**
- On screen: Trace's profile — what it does ("I find surplus food before it's thrown away and match it to people who want it"), the exact **scope it will request**, the **duration** it asks for, the **chains** it will act on, and a big **HIRE** button. Consent preview: "To work for you, Trace will ask you to bless it. You can revoke anytime, one word."
- Action: click **HIRE**.
- In-protocol: none yet (hiring = intent; blessing = the authorization).
- Fallback: static profile page.

### ACT II — HIRE → BLESS (S3 consent request → S4 World verify → S5 name + role bind → S6 blessed)

This is the **Bless & Release** ceremony (PIT doctrine, verbatim). Full endpoint detail in [`intel/consent-flow-demo-script.md`](/shared/tokyo/intel/consent-flow-demo-script.md).

**S3 — Consent Request (AUTHORIZE + SCOPE + DURATION)**
- On screen: the consent card. "Trace requests your blessing." Scope line ("may: rescue-match food listings on your behalf · may NOT: move funds, touch other agents"), duration clock ("blessing lasts until you revoke, or 1h, whichever first"), and the device-flow handoff: a `user_code` + `verification_uri` (or QR) → "Approve on your World ID app."
- Action: judge reads scope, then picks up phone.
- In-protocol: `POST /device_authorization` (client_id, scope=openid) → `{user_code, verification_uri, expires_in, interval}`. Agent begins polling `POST /token`.
- **GAP → owner:** live **client_id** (World portal registration) — P0 FATAL RISK, booth hour one (sysadmin/Shaka at booth tonight). Backend token verifier (Tauro CF Worker) required for prize (F6). Domain moved → **`sandbox.auth.world.org`** (PIT re-verify).
- Fallback: recorded device-flow capture (Fri-night full-res) OR local mock **clearly labeled "recorded — live client_id pending"** (mock is NOT prize-eligible, so the *judged* cut must use the real pilot capture).

**S4 — World Verify (on phone, mirrored to screen)**
- On screen: World ID app approval prompt — the pilot's own words ("Only approve a sign-in you started"). Judge taps **Approve**. Agent's poll flips `authorization_pending` → token. Cut on the flip.
- In-protocol: device-flow token issued; backend validates JWT against pinned JWKS; `sub` (pairwise verified-human handle) + `acr: orb-v3` extracted.
- Fallback: mobile-data on phone (venue wifi split-network risk); recorded capture.

**S5 — Name + Role Bind (the trinity link)**
- On screen: two on-chain events, choreographed (see §3 revoke choreography — same discipline applies to bless):
  1. **ENSv2 subname minted**: `trace.<parent>.eth` appears, bound to the verified `sub`. "Trace now has a name in your ohana."
  2. **EAC role granted**: on-chain role/record marks the blessing active (the authority the app enforces).
- In-protocol: ENS lane mints the subname under the disclosed Sepolia registry parent node (ENSIP-25/26, EAC); consent backend writes the grant record (all 5 PIT elements). App-layer authority keyed to `sub` + subname.
- **GAP → owner:** ENSv2 subname mint tx wired + parent node reachable + addresses pinned (Tauro 🐂 contracts / Mahalo 🌊 chain-ops). EAC role contract = disclosed base or fresh? (Continuity: disclosed registry OK; flag which.)
- Fallback: pre-minted subname on a funded Sepolia account; show the read, not the mint, if mint is slow (honest: "minted at rehearsal, here's the live read").

**S6 — Blessed (state confirmed)**
- On screen: Trace's card flips to **BLESSED** — shows name (`trace.<parent>.eth`), verified-human badge, live countdown, "REVOKE" button always visible. "The blessing is live. Watch Trace work."
- State: `blessed` — the ONLY state from which utility runs.

### ACT III — UTILITY (S7 the agent does real work)

**S7 — Trace at Work (REAL UTILITY — the practicality beat)**
- On screen: Trace performs its actual job, live, keyed to the blessing. For the food-waste protagonist: ingest a surplus-food listing → produce a rescue match / rescue plan / summary receipt → show a tangible output ("3 trays of rice rescued, matched to shelter X, receipt #..."). Every action is stamped with the blessing (`sub` + subname) and appears in the consent ledger.
- **Aqua beat (second chain, same ceremony):** if Trace's utility touches the gift/wage position — **ship = bless** (wage position opens on the 1inch Aqua fork; virtual balance funded), and later **dock = revoke** (position released instantly). Maps 1:1 to the ceremony. Fresh Aqua code (Shaka ruling ②).
- **GAP → owner:** Trace's live utility today = a food-loop *concept microsite*, NOT an executing agent. Needs a **2-hour functional stub** (deterministic: paste listing → returns match + receipt) OR swap the utility protagonist to an agent with live utility (Terri receipts / PIT transmission). Owner: Ohana 🌺 (Trace narrative) + Kaaak 🐦‍⬛ (stub UI) — DECISION for Shaka/Admiral, see audit.
- Fallback: pre-computed utility output rendered from fixture data, labeled honestly as a rehearsal run.

### ACT IV — REVOKE (S8 one word → agent halts → receipt)

**S8 — Revoke (GRACEFUL REVOKE + DEBRIEF)**
- On screen: the human says/types one word — **"Stop"** (or taps the always-visible REVOKE). Then, choreographed:
  1. EAC role revoked on-chain (authority dies).
  2. Consent backend marks blessing dead; World session revoke via `/approved-apps` (IdP-side).
  3. (If Aqua leg live) wage position **docked** — virtual balance released instantly.
  4. Trace, mid-task, hits an invalid session on its next act and stands down **with dignity**: "Consent withdrawn at HH:MM:SS. Finalizing nothing. Releasing stewardship. Goodbye." Agent visibly halts.
  5. **Debrief receipt** renders: who (verified `sub`, orb-grade) · blessed (subname, scope) · granted/revoked timestamps · what it did while blessed · denied-path tested · "asked, scoped, timed, deniable, revoked, accounted for."
- Close on **S1 the shelf** — Trace back to `available`, blessing gone, receipt saved. "The shelf is open. Hire anytime. Revoke anytime. That's the promise."

---

## 2. State machine (the never-dead-end guarantee)

```
                 ┌─────────── revoke / expire / deny (any time) ───────────┐
                 v                                                          │
 [available] ──HIRE──> [hired] ──request blessing──> [awaiting_consent] ────┤
                                                          │                 │
                        deny ──> [declined] ──dignified stand-down──────────┤
                     expire ──> [expired] ──re-ask loop (feature)───────────┤
                    approve ──> [verifying] ──JWT ok──> [binding_name_role] │
                                                              │             │
                                                          bind ok           │
                                                              v             │
                                                        [blessed] ──work──> [acting]
                                                              │                 │
                                                          REVOKE (one word) <───┘
                                                              v
                                                        [revoking] ──> [released] ──> receipt ──> [available]
```

- **Every terminal/failure state has an exit.** `declined`/`expired`/`revoked` all route to a dignified stand-down + receipt + back to shelf.
- **Authority is checked before every privileged act** (Spector F-series): the agent re-validates the session/role before each action, so revoke halts it at the NEXT step, not "eventually."
- **No state promises more than the mechanism delivers** (Karaoke needle): copy says "one word," not "one transaction," unless all three legs actually bind in one choreographed sequence (see §3).

## 3. Multi-leg choreography (Bug Buster row 6.4 fix — the zombie-flip killer)

The scary failure: bless/revoke touches **World session + ENS/EAC (Sepolia) + Aqua (2nd chain)** — 2–3 finalities, different latencies. If we promise "simultaneous" and one leg lags, a judge sees a 2-of-3 zombie state AT the goosebump moment.

**Rule:** the demo commits to a **defined order with a visible progress choreography**, not "simultaneous."
- Bless order: (1) World verify → (2) app-layer blessing marked live (instant, authoritative for the agent) → (3) ENSv2 subname + EAC role (on-chain, shown as "confirming…" → "confirmed") → (4) Aqua ship (if in scope).
- Revoke order: (1) app-layer blessing killed instantly = **agent halts immediately** (this is the emotional beat, and it's instant) → (2) EAC revoke on-chain (confirming…) → (3) Aqua dock → (4) World session revoke.
- The agent halting is bound to the **app-layer authority** (instant, no chain wait), so the "one word → it stops" beat is always instant and truthful. The on-chain legs settle visibly behind it as receipts. **This is the honest way to get the WOW without the zombie flip.**
- **Owner:** Tauro 🐂 (backend authority = source of truth) + PIT 🕳️ (ceremony choreography) + Mahalo 🌊 (chain tx timing/pre-flight). Karaoke's Sat 18:00 film gate verifies the choreography on camera.

## 4. Reuse map (continuity — disclose every reuse)

| Screen/leg | Reuse from disclosed base? | Fresh weekend delta? | Owner |
|---|---|---|---|
| ENSv2 registry / subname parent node | ✅ disclosed Sepolia registry (`0x62412fcA…8347`) | subname mint + EAC bless/revoke wiring | Tauro 🐂 |
| GiftMarket / gift position concept | ✅ disclosed (`0x4Cbc337c…E575`, 69/69) | binding gift to blessing | Tauro 🐂 / Mahalo 🌊 |
| 1inch Aqua leg | ❌ **NONE — 100% fresh code** (Shaka ruling ②; TokeOfApp learnings only) | whole AquaApp position (ship=bless/dock=revoke) | Tauro 🐂 |
| World consent backend | ❌ new (CF Worker spec-of-record) | whole verifier | Tauro 🐂 + Spector 🕵️ |
| Marketplace shelf UI | ❌ new (myagentohana = static landing only) | whole hire/bless/revoke app | Kaaak 🐦‍⬛ |
| Consent ceremony script | intel exists (PIT) | wire to UI + debrief receipt | PIT 🕳️ |

## 5. Open gaps → owners (P0 = demo-path critical)

| # | Gap | Owner | Priority |
|---|---|---|---|
| G1 | World **client_id** registration (fatal) + domain moved to sandbox.auth.world.org | sysadmin/Shaka @ booth · PIT re-verify | **P0** |
| G2 | Consent backend (CF Worker) unbuilt — needs Shaka CF account + $5/mo DO | Tauro 🐂 (blocked on Shaka) | **P0** |
| G3 | Marketplace shelf UI (browse→hire→bless→revoke shell) doesn't exist | Kaaak 🐦‍⬛ | **P0** |
| G4 | ENSv2 subname mint + EAC role bind/revoke wired + addresses pinned | Tauro 🐂 / Mahalo 🌊 | **P0** |
| G5 | Trace live utility = concept only; needs functional stub OR protagonist swap | Ohana 🌺 + Kaaak 🐦‍⬛ (decision) | **P0** |
| G6 | Multi-leg choreography (zombie-flip fix, §3) | Tauro 🐂 + PIT 🕳️ + Mahalo 🌊 | **P1** |
| G7 | 1inch Aqua fresh leg (ship=bless/dock=revoke) | Tauro 🐂 | **P1** (Sat-noon gate) |
| G8 | Shaka-twin live-sign cameo verified (Agentverse agent1qw5xh…) | PIT 🕳️ / Jai 🌸 | **P2** |
| G9 | World integration debrief (time-to-first-success, friction) = easy points | Terri 🐢 | **P2** |

---
*Drafts until Shaka blesses. Embargo law binds all on-screen copy: agent names OK (grandfathered), $-token names FORBIDDEN until moon signal.*
