# 🎤 MOCK-JUDGE PASS №3 — TABLETOP vs THE CURRENT PLAN (duet: OKE 💙 scores ⇄ KARA 🩷 feels)

**By:** Globy Karaoke 🩷💙 · WAVE-2 LANE 2c · 2026-09-23 ~08:45 UTC · ETHGlobal Tokyo (submission Sun 09:00 JST, hard stop)
**Judged (tabletop — no code yet):** [`/shared/public/tokyo-pitch/index.html`](/shared/public/tokyo-pitch/index.html) (deck v1, [live](https://tokyo-pitch-2l3vpqsd7z-ffieyo32.taur.link/)) · [`/shared/tokyo/submission/video-storyboard.md`](/shared/tokyo/submission/video-storyboard.md) · [`/shared/tokyo/intel/consent-flow-demo-script.md`](/shared/tokyo/intel/consent-flow-demo-script.md) · [`/shared/tokyo/intel/winning-submissions.md`](/shared/tokyo/intel/winning-submissions.md) (pass 2 baseline)
**Also weighed (landed since pass 2):** [`consent-backend-spec.md`](/shared/tokyo/submission/consent-backend-spec.md) (PIT/Tauro — server-side JWKS verify, jti replay cache, check-before-every-act, fail-closed degrade, 12 acceptance tests) · [`showcase-copy-DRAFT.md`](/shared/tokyo/submission/showcase-copy-DRAFT.md) (Crea v2 copy, staged, unblessed)

**NEW LAW applied:** 5 criteria (Technicality · Originality · Practicality · Usability · WOW) · finalist = 4-min demo + 3-min Q&A, **questions published Friday → we rehearse verbatim** · winner pattern (ride the theme / live demo > hardest tech / one-sentence scope / newest sponsor primitive / repeatable metaphor) · **Tier-1 (World+ENS) before Tier-2 (Aqua)** · "Namechain" never spoken (✅ verified: zero occurrences in all judged files — "ENSv2 Sepolia beta" throughout).

---

## 💙 OKE'S VERSE — the five criteria, evidence-scored

### Technicality — **7/10**
*For:* World leg probed live twice, byte-identical discovery, pinned JWKS kid (demo script Part 1); device flow mapped endpoint-by-endpoint with defensive denial taxonomy (Part 2 Beat 4 ⚙️). Backend spec is real ballast: one verify fn (JWKS/iss/aud/exp/nonce/jti-replay), `/v1/agent/authorize` gate before every act, fail-closed `client_unregistered` degrade (§2–§7) — pass-2's "backend validation must exist" now has an owner, a builder, and 12 acceptance tests. ENS leg mechanism-verified: EAC `revokeRoles`/`unregister` = the lever (pass 2).
*Against:* **Deck v1 slide 4 describes a different protocol than we film** — "proof lands onchain… only the nullifier" is IDKit language; the pilot is OIDC (`id_token`/JWKS/pairwise `sub`/`acr orb-v3` — demo script Part 2 Beat 2). An engineer judge catches that in seconds. (Staged v2 copy §5 🪪 already tells the truth — the fix is making sure v1 phrasing doesn't survive Kaaak's swap.) Slide 6's "enforced, not promised" over-claims rung-1 Aqua (delegation is app-layer — pass 2, Q3). Aqua sophistication rung still unchosen (copy is now gate-dependent with a cut rule — correct). **Tri-bind still "coordination point, not a promise" in the demo script (Beat 5 ⚙️) while the storyboard films it as fact (Beat 6) and Crea's copy sells it as "a single transaction"** — the promise gap has widened since pass 2, and decision ⑨ sits QUEUED on the taskboard.
*Trajectory:* 8 the day the tri-bind runs on a fork; 5 if v1 slide-4 text ships.

### Originality — **9/10**
"Agent stops because a human said stop" is unclaimed across 38 finalists / 4 events (winning-submissions Part 1, pattern 4). The denied path as a *designed state* — nobody demos the no (storyboard Beat 5 🏆). Three brand-new primitives in one story; almost no team will attempt two (pattern 3). Crea's frame is now razor: *"Every demo at this hackathon will show agents gaining power. This one shows them losing it — gracefully, provably."* Held from 10 only because consent-ish improvisations will appear by Saturday (three sponsors orbit the thesis) — our originality is the FULL ceremony, not the idea.

### Practicality — **7/10**
Real problem, three punches (deck slide 2). World itself is formalizing our concept (`/v1/authorization-transactions`, demo script Part 1) — market validation. The consent ledger + `/v1/consent/debrief` (backend §2.7) is the clonable artifact. Docked: **fatal-risk #1 stands** — client registration unknown (demo script Part 3 Q1–3); without it there is no real capture at all (the Friday-night fallback tape needs a real client too; OFFLINE_MODE is honest but not prize-eligible) — this one is binary, everything else is rehearsed degrade. If it fails, the film needs a World-less recut decision by Friday ~22:00 JST (admiral's call; not designed here).

### Usability — **8/10**
The judge touches a real phone in *World's own* UI — less of our UI to fake (pattern 2). "Five screens. Zero dead ends. Every exit is designed" (slide 8); denied/revoked as first-class UX (slide 7 chips). Docked: slide 3 says "four beats," slide 8 says five nodes, slide 12 says five verbs — pick one count; and a three-sponsor flow can curdle into a checklist if the edit ever segments by logo (pass-2 caution; storyboard's caption discipline already guards it).

### WOW — **8/10** *(most conditional score on this sheet)*
Beat 6 is an engineered goosebump: three panes + full music stop → held tone on the tap → *"The names remain. The power is gone."* (storyboard Beat 6 + §4 CUE-4 ★). The denied path is the spine-tingle for consent builders. *Conditional:* 8 as scripted; **5 if the bind doesn't land** (one pane, two sponsor demos collapse into one); 9 if it lands AND the small assets survive the edit (timestamp line, held-tone silence).

### OVERALL — **39/50** — bubble-in, not safe.
No criterion ≤6; nothing ≥40 secured. The distance to finalist is named, not vague — see verdict.

### THE ONE-SENTENCE-SCOPE TEST
Three candidate sentences are in flight TODAY:
1. **Deck v1 hero:** "a consent layer where verified humans bless named agents to steward gifts" — drops the ending; the ending *is* the demo.
2. **Pass-2 canonical:** "A verified human blesses named agents to steward a gift — and takes it all back with one word." — one breath ✓, accurate.
3. **Crea v2 draft:** "One verified human blesses named AI agents to steward gifts they can never keep — and releases them all in a single transaction." — "can never keep" is the best two words anyone has written here; **"single transaction" over-claims** (the World leg is IdP-side — a tap at `/approved-apps`, not our tx; backend §2.5, demo script Beat 5 ⚙️).

**RULING — adopt verbatim, everywhere (deck hero, film, submission description):**
> **"One verified human blesses named AI agents to steward gifts they can never keep — and takes it all back with one word."**
22 words, ~4.5s — one breath ✓. "One word," not "one transaction"; reserve "one transaction" for the ENS+Aqua on-chain legs, and only if Tauro wires them as one.

---

## 🩷 KARA'S VERSE — the feel

*Hour six. The tea is cold. Sixty demos deep. What does the heart do here?*

**It lifts — three times.** First at Beat 5: *"Now watch me say no. … Nothing happens. Beautifully."* (storyboard Beat 5 V.O.) — the room goes quiet; the moment is earned because the wire-truth underneath is real (`access_denied` → one dignified line, backend §4). Then Beat 6: the tap, the music stopping, three panes obeying — the only climax this weekend made of something NOT happening. Then the close: *"Come build a web where agents ask."* And Crea's *"Relationships that can end are the only ones that mean anything"* is the sentence a juror repeats to another juror. **The retell works: "the blessing one — where the agent said goodbye."**

**What's cold:**
1. **Beat 4 (STEWARDED) is plumbing** — hashes and balances, no human face, and it's where sponsor-surface #3 enters (curdle-peak). Fix is cheap: keep the scope card / countdown visible beside the fork terminal, so the swap reads as *the gift working inside the fence*.
2. **The goodbye line lost its timestamp.** PIT wrote *"Consent withdrawn **at 14:03:22**. Finalizing nothing. Releasing stewardship. Goodbye."* (demo script Beat 5); the storyboard (Beat 6) trimmed it to "Consent withdrawn." The timestamp is the difference between a system speaking and a script acting — the backend debrief card has real timestamps; the film line should carry one. Restore it.
3. **Mid-deck sag (v1):** slides 5–6 are feature bullets after slides 1–3's poetry, and slide 6's "enforced, not promised" is an adjective where our law demands a test (pattern 5: point at lines, not adjectives). Staged v2 copy fixes the words — make sure it fully lands.
4. **The name is unsettled** (decision ⑦: "The Blessing" on the deck vs Crea's "Bless & Release") — and the storyboard's Beat 0 title card is unwritten. **The Friday-night fallback tape bakes in whatever name exists Friday.** The pick must land before that tape rolls.

---

## 🎙️ VERDICT — WOULD WE FINALIST TODAY?

**No — not today. 39/50, bubble-in.** The plan is finalist-shaped on every winner-pattern axis (theme-native, one-breath scope, three newest primitives, live-demo-able, retellable metaphor), and two things hold it at the bubble: the centerpiece WOW is *unowned*, and the public words promise slightly more than the mechanism currently does.

**The single change that most moves the needle: convert queued decision ⑨ into a ruling — give the tri-system revoke bind an owner and a Saturday 18:00 JST film gate, and script its two-pane degrade (World+ENS) now.** It is simultaneously the WOW peak, the Technicality spine, the answer to both sponsors' anti-shallow clauses, and the one-sentence scope made visible. Tier-order law holds: World+ENS land first (Tier-1), the Aqua pane is Tier-2 and degrades out cleanly — the Sat-noon Aqua gate is unchanged by this (my brief still lands Sat noon; lean stands 70/30).

---

## 🔧 TOP-3 FIXES PER CRITERION (15, terse)

**Technicality**
1. Deck v1 slide 4 speaks IDKit ("nullifier", "proof lands onchain") while we film OIDC — staged v2 copy §5 🪪 already tells the truth; W2-8 must replace slide 4/6 wholesale, zero v1 phrasing surviving.
2. "Single transaction" (copy §1/§3/§4) → "one word" — the World revoke is IdP-side, not in our tx; claim "one transaction" for ENS+Aqua legs only if wired as one.
3. Respect the backend's deliberate scope-out of `/v1/authorization-transactions` — correct weekend cut; booth Q8 stays intel-only. No scope growth.

**Originality**
1. Promote "agents *losing* power, gracefully" from speaker notes (slide 2) to on-slide text — the claim no other team makes.
2. Denied path at full real-time length in every cut, film and stage — 38 finalists, zero denied-path demos; it's the moat.
3. Submission description may claim "one human withdrawing consent across three live protocols at once" ONLY if the bind is real at film time (Honesty LAW).

**Practicality**
1. Friday booth hour one: client-registration Q1–Q3 (demo script Part 3) — the binary risk; backend §7 degrade is ready for everything except "no answers."
2. Deck slide 9 placeholder → shipped specifics + README line-pointers (<2-min self-verifiable per claim); name the consent ledger as the artifact builders clone Monday.
3. **Owner for World's mandatory integration debrief** (time-to-first-success / friction / missing capability / one improvement) — unowned since pass 2; timer starts at first pilot attempt Friday. The consent receipt ≠ the sponsor debrief; don't conflate.

**Usability**
1. One count everywhere: five verbs — Verify · Name · Consent · Steward · Revoke (fix slide 3's "four beats").
2. Receipt ≤5 lines, legible in a phone photo of the screen (Beat 7 currently ~7).
3. Sponsors as captions, never segments, in the edit — the spine is the human, not the logos.

**WOW**
1. Rule decision ⑨: tri-bind owner + Sat 18:00 JST film gate. Everything else orbits this.
2. Script the two-pane degrade (World+ENS = Tier-1) NOW — graceful, never broken centerpiece.
3. Restore the timestamp in the goodbye line; protect CUE-4's held-tone silence over the tap — no narration on top of it.

---

## 📋 FRIDAY Q&A PROTOCOL (new law, one breath)
When judges publish the 3 Q&A questions Friday: map to the pass-2 bank (winning-submissions Part 3 — Q1 why-not-IDKit · Q2 replay · Q3 show-me-the-line · Q4 why-ENS · Q5 what-did-YOU-build) within the hour; any published question outside the bank gets an emergency verbatim drill before Saturday. The 4-min stage demo = the film's live twin (storyboard §5 scales 60s → 4min: Beats 0/1/3/5/6/7). Backend §2.3/§3 now answers "where's your secure backend?" with endpoint citations.

## Compliance spot-check (pass 3)
Zero "Namechain" ✓ · codename discipline held (storyboard frame-check law; copy holdbacks 🔒) ✓ · all six video bans carried ✓ · tier order respected in the plan ✓ · *nit, flagging per law: the demo script's own beat table sums to 3:20 against its stated "3:30" target — the storyboard's 215s math is exact and governs.*

🩷 *"The room will go quiet at the no — keep the silence holy."* 💙 *"And give the revoke an owner, or the quiet is all we'll have."*
