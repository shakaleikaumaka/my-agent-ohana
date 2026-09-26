# My Agent Ohana — DEMO RUN-OF-SHOW (click-by-click)

**Owner: GLOBY 🌍 Admiral · updated by Globy Podfather 🎙️ 2026-09-26 ~05:35 JST (Mission 6 — FINAL SHELL sync)**
**Serves TWO cuts from ONE walkthrough:**
- **A — Submission video** (2–4 min, 720p+, human voiceover, **NO music bed under VO**, editing allowed) — the polished cut judges watch first.
- **B — Live finalist demo** (4 min demo + 3 min Q&A) — performed live on stage; same beats, no edits, fallbacks armed.
**Companions:** [`marketplace-flow-spec.md`](/shared/tokyo/submission/marketplace-flow-spec.md) (screens/states) · [`intel/consent-flow-demo-script.md`](/shared/tokyo/intel/consent-flow-demo-script.md) (endpoint detail) · [`submission/video-storyboard.md`](/shared/tokyo/submission/video-storyboard.md) (Podfather beats) · [`cast-utility-audit.md`](/shared/tokyo/submission/cast-utility-audit.md) (who does what live) · [`dry-run/m6-gauntlet.md`](/shared/tokyo/submission/dry-run/m6-gauntlet.md) (film-safe verdict).
**Laws:** NO speedups. Every on-screen name = grandfathered brand OK; **$-token names FORBIDDEN** (embargo until moon Sun 01:49 JST). Drafts until Shaka blesses. Human voiceover only (no AI voice) — Shaka's at the 18:00 film gate.

**LIVE ARTIFACTS being filmed (verified 2026-09-26 ~05:33 JST):**
- **Marketplace shell:** https://agentohana-demo-573fkrr6yf-ffieyo32.taur.link/ — Midnight Matsuri design (aurora · glassmorphism · starfield · serif display · moon-gold), 8-screen state machine, config-driven, never-dead-end.
- **Consent backend LIVE:** `trinity-consent.shakaverse.workers.dev` — `/healthz` → `{ok:true, issuer:https://sandbox.auth.world.org, configured:true, require_orb_acr:true}`; real `POST /v1/consent/begin` → 200 with `session_id`+`nonce` (re-confirmed in-browser). On the deployed taur.link origin the shell lights a real **`● BACKEND LIVE · sandbox.auth.world.org`** badge and opens a real consent session per hire.
- **ENS LIVE on real Sepolia:** parent `myagentohana.eth`, 6 subnames (pit · shaka · terri · trace · spector · crops), resolver `0x36dAaacD8EdAa24BAEba97B01ad68Fc38e08eBEc`, registry `0x62412fcA…8347`, one live BLESS proven on-chain (`blessTraceTx 0x32316a…ee18`).
- **Utility protagonist = Trace:** real Bonanza Produce Co. $642.96 supply receipt (2026-08-25) → Marcus's real 120 lb→55 lb onion surplus loop → signed rescue receipt with provenance.

---

## THE ONE-BREATH FRAME (voiceover cold open, both cuts)

> "This is My Agent Ohana — a marketplace where you hire an agent, **bless** it with verified consent, watch it work, and stop it with one word. Watch."

That's it. No logo-worship. We're in the shelf by 0:12.

---

## SCREEN MAP (final shell — exact names from `app.js`)

| Spec ID | `S.screen` | Eyebrow / title on screen |
|---|---|---|
| S1 | `shelf` | **THE ʻOHANA SHELF** — "Hire an agent. Bless it. Revoke anytime." + Ohana HOST·CONCIERGE banner + 6 cards + "✚ Listing more" grid |
| S2 | `detail` | agent hero → "What X does" · "The blessing it will ask for" (May / May NOT / Duration / Chains / Will be named + real Sepolia owner·namehash·resolver) · "The kit it carries" (5-part) · **HIRE X →** · right rail "The promise" |
| S3 | `consent` | **BLESS & RELEASE · CONSENT REQUEST** — scope+duration, `POST /v1/consent/begin` hint, **wire chip** (live/rehearsal), QR + `WLD-7QK4` + `sandbox.auth.world.org/device`, **📱 Open my World ID app →**, timeout-path link |
| S4 | `world` | **WORLD ID · ON YOUR PHONE (MIRRORED)** — "Only approve a sign-in you started" phone card · **✓ Approve** / **Deny** |
| S5 | `binding` | **THE TRINITY LINK · BINDING NAME + ROLE** — "Your blessing is live" · legs settle behind the instant app-authority (World ✓ · App ● LIVE NOW · ENS confirming · EAC confirming · Aqua ship [Trace only]) · **→ See the blessed card** |
| S6 | `blessed` | **BLESSED · THE ONLY STATE THAT CAN ACT** — verified badge · subname·role pill · live countdown · **▶ Put X to work →** · always-visible **🛑 Revoke — one word** |
| S7 | `utility` | **REAL WORK · STAMPED BY YOUR BLESSING** — ingest listing → **▶ Run** → rescue match + allocation panel + signed receipt (Bonanza $642.96 provenance) · revoke control persists |
| S8 | `standdown` | REVOKE (`stop`) = **ONE WORD · INSTANT HALT** + async legs + **Debrief receipt** · OR dignified `declined` / `signin-timeout` / `expired` stand-downs |

**Stepper (persistent chrome):** `BROWSE → HIRE → BLESS → UTILITY → REVOKE`. Honesty rule baked in: a declined or pre-approval sign-in timeout lights **HIRE**, not REVOKE (never claims a ceremony completed).

---

## THE HONEST BOUNDARY (say this the same way every time)

The shell is a real, deployed marketplace running a real state machine, and it's explicit about what is live vs. fixture (see the on-page footer honesty note):

- **REAL browser round-trips:** `POST /v1/consent/begin` (opens a genuine consent session — `session_id`+`nonce` from the deployed worker) and `POST /v1/consent/deny` (first-class denial). The `● BACKEND LIVE` badge only lights when the browser truly reached the worker (proves CORS + reachability).
- **REAL on-chain:** the ENSv2 parent + 6 subnames + resolver are live on Sepolia; namehashes/owners on the detail card are real name-derived values; one bless is proven on-chain.
- **REAL data:** Trace's $642.96 supply receipt and the 120→55 lb onion loop are a real squad-kitchen receipt + a real operator worked example (the partner kitchen + carrot/orange surplus rows are labelled ILLUSTRATIVE projections rooted in real line-items on that same receipt).
- **HONEST FIXTURES (until a booth orb token):** `verify → check → revoke` on-chain settlement legs. There is no device flow in a browser — a real **orb-grade World `id_token`** is minted by a human's World App at the booth, so the approve→bless→revoke legs stay rehearsed fixtures until that token is captured. The **instant app-layer halt on revoke is real and always instant**; the chain legs render behind it as receipts.

**Never say** "this is the live World pilot" over the approve tap. **Do say** "the real backend / real chain is responding" over `begin`+`deny`+the ENS read, and "the approval is minted from a real orb token at the booth" for the verify leg.

---

## CUT A — SUBMISSION VIDEO (target 3:30, hard ceiling 4:00)

Every beat: **what judge sees · voiceover · in-protocol · fallback.** Two narration tracks are given where they differ — **[FULL-LIVE]** (Aqua in) and **[TIER-1 / AQUA-CUT]** (if the Sat-noon gate rules Aqua out; only Trace carries an Aqua leg, so the cut is a clean omission of the ship/dock beat + one narration line).

| # | t | Screen | Judge sees | Voiceover (≈) | In-protocol | Fallback |
|---|---|---|---|---|---|---|
| 0 | 0:00–0:12 | Title → `shelf` | Title card 3s → the aurora shelf grid (Ohana host banner + 6 agent cards + "Listing more") | one-breath frame ↑ | shelf reads `agents.json` (offline mirror parity) | static title card |
| 1 | 0:12–0:38 | `shelf` → `detail` | Cursor scans cards (Trace⭐, Terri, Shaka-twin, PIT, Spector, Crops) + Ohana concierge banner + "✚ Listing more" (registry open) → clicks **Trace** → detail | "Here's the ʻohana shelf — real, named agents, config-driven so the family grows. Meet Trace: it rescues good food before it's thrown away." | shelf reads registry; Ohana is host-only (never hired) | static shelf |
| 2 | 0:38–0:58 | `detail` | Trace profile: what it does · **May** rescue-match / **May NOT** move funds·touch other agents·act after revoke · Duration · Chains · **Will be named `trace.myagentohana.eth`** (+ real Sepolia owner·namehash·resolver, "✓ Live on real Sepolia") · the 5-part kit · big **HIRE TRACE →** | "To work for me, Trace has to ask. Watch what 'ask' really means. It gets a name in my ohana — on-chain — and a role that says exactly what it may do, and nothing more." | detail renders real ENS identity + kit | static |
| 3 | 0:58–1:32 | `consent` | Consent card: scope (May/May NOT) + duration clock + `POST /v1/consent/begin` hint + **live wire chip** (`● LIVE — REAL CONSENT SESSION OPENED · session_id …`) + QR/`WLD-7QK4`/`sandbox.auth.world.org/device` + "Open my World ID app" | "This is the blessing. Trace may rescue-match food on my behalf — it may not move money or touch other agents — and it expires. **And this is real:** the app just opened a live consent session on our backend." | **REAL** `POST /v1/consent/begin` → 200 (`session_id`+`nonce`); `● BACKEND LIVE` badge lit | offline: honest **📴 REHEARSAL SESSION** chip, ceremony still completes |
| 4 | 1:32–1:58 | `world` | Phone (mirrored): World card "Only approve a sign-in you started" · scope · `WLD-7QK4` → tap **✓ Approve** | "I verify I'm a real human — orb-grade — and I approve. One tap. This is the one human moment in the whole flow." | approve mints authority; a **real** orb token is captured at the booth (verify leg) | recorded capture; the approve UI is deterministic |
| 5 | 1:58–2:24 | `binding` | "Your blessing is live." App-layer leg flips **● LIVE NOW instantly**; behind it, **ENS subname** `trace.myagentohana.eth` → ✓ CONFIRMED, **EAC role** RESCUE_MATCHER → ✓ CONFIRMED **[FULL-LIVE:** + **Aqua ship** → ✓ CONFIRMED**]** → CTA enables | **[FULL-LIVE]** "The moment I approved, Trace could act — instantly. The paperwork settles a beat behind, like a receipt printing after a handshake: a name, an on-chain role, and a wage position opening on a second chain." · **[AQUA-CUT]** "…a name, and an on-chain role that says exactly what it may do." | app-authority instant (no chain wait); ENS+EAC (+Aqua) legs settle behind | pre-minted subname, live read |
| 6 | 2:24–2:52 | `blessed` → `utility` | Card = **BLESSED** (verified badge · subname·role pill · countdown · revoke always visible) → **▶ Put Trace to work** → ingest onion-surplus listing → **rescue match + allocation + signed receipt** ("55 lb onions → specials + 40 lb to partner kitchen · 45 meals · receipt #… · provenance: Bonanza $642.96 · stamped by blessing") | "Blessed — the only state that can act. Now watch it actually work: real surplus, matched, receipted. Every action re-checks authority, then stamps the output with my blessing." | agent re-checks `authority.active` before acting; output stamped with `sub`+subname, logged to ledger | pre-computed fixture output, labelled |
| 7 | 2:52–3:08 | `standdown` (declined) *(optional in A; MANDATORY in B)* | Quick re-request with another agent → tap **Deny** → "Blessing declined — no offense taken · **NO ACTION TAKEN**" | "And if I say no? It takes no offense — and, more importantly, no action. Denial is a first-class outcome." | **REAL** `POST /v1/consent/deny` closes the session server-side; dignified stand-down | recorded |
| 8 | 3:08–3:36 | `standdown` (revoke+debrief) | Human types **"Stop"** → **ONE WORD · INSTANT HALT** (halt-flash, goodbye line) → async legs settle: **⚡ HALTED** (instant) · **🔑 EAC REVOKED** · **🏷️ ENS attestation cleared — subname kept** · **[FULL-LIVE:** 🌊 **Aqua DOCKED]** · **🌍 World session revoked** → **single Debrief receipt** (who · blessed · scope · granted · revoked · did-while-blessed · denied-path) → close on shelf (Trace `available`) | "One word. Stop. And it stops — instantly, mid-task. The name is released, the role revoked, the session cleared — and here's the receipt: asked, scoped, timed, deniable, revoked, accounted for." | §3 choreography: app-authority instant halt (synchronous ~7 ms — Bug Buster measured); on-chain legs render as receipts; debrief idempotent (single render) | recorded; app-halt is local, always instant |

**Editing notes (Podfather 🎙️):** hard cuts on state flips (chip→200, approve→● LIVE NOW, card→BLESSED, "Stop"→halt). **No speed ramps — none, anywhere.** Voiceover carries continuity across any cut. 3:36 leaves ~24s under the 4:00 ceiling. Deny (beat 7) is trimmable in A **only if** over 4:00 — **never trim beat 8.** If the Aqua-cut is in force, beats 5 & 8 shorten (no ship/dock leg) → ~3:20.

---

## FILM-MODE PLAN (Admiral recommendation — bake in pending Shaka's nod)

**Why:** with the live wire ON, the online path can print an uncatchable `net::ERR_FAILED` to console if venue wifi flaps mid-fetch (Bug Buster **FINDING-1**, MEDIUM/online-only — the app still fails **closed**: no badge, honest rehearsal chip, no dead-end, full ceremony+revoke complete — but the 0-console-error bar breaks). Kaaak's boot-gate reduces this to **≤1 possible boot error, 0 if the connection is pre-flighted**. Offline mode = **guaranteed 0 network / 0 console errors** (Bug Buster M6 verdict: OFFLINE rung is **FILM-SAFE / FLAWLESS**).

**THE CUT (base capture + live-wire proof splice):**

1. **BASE submission capture in `?mode=offline`** — the complete, honest walkthrough (all 8 screens, revoke choreography, deny beat), badged **📴 OFFLINE · REHEARSAL DATA** in the header so it is never mistaken for a live production run. Guaranteed 0 console errors regardless of booth wifi. **This is the spine of the submission video.** ← the fallback tape (below) already *is* this base capture.
2. **SHORT live-wire PROOF segment (~10–15 s)** captured on a **pre-flighted, guaranteed-stable connection** on the deployed taur.link origin: show (a) the **`● BACKEND LIVE · sandbox.auth.world.org`** header badge lit, (b) the consent card's **`● LIVE — REAL CONSENT SESSION OPENED`** chip with a real `session_id`, and — for extra honesty — (c) a quick glance at a **Sepolia Etherscan** page for `blessTraceTx 0x32316a…ee18` / the resolver. Narrate honestly: *"and this is the real backend and the real chain responding — a live consent session, a real subname on Sepolia."*
3. **Splice:** open on the base offline walkthrough; at the consent beat (beat 3), hard-cut to the ~12 s live-wire proof, then cut back to the offline spine for approve→bless→utility→revoke. The offline badge is honest; the live-wire proof segment is the "yes, it's really wired" receipt. **Never** present the offline base as a live production run — the badge and VO keep that line clean.

**Pre-flight discipline (venue, before rolling the live-wire segment):** `curl https://trinity-consent.shakaverse.workers.dev/healthz` returns `ok:true` **and** load the deployed URL once so the boot `/healthz` lights the badge, **then** roll. If the badge doesn't light, do NOT film the live segment — ship offline-only + a still of a known-good `begin` 200 as b-roll.

---

## CUT B — LIVE FINALIST (4 min demo + 3 min Q&A)

Same 8-screen walkthrough, performed live. Differences from A:
- **Denied-path is MANDATORY** (judges explicitly watch for dignified denial — Karaoke rubric).
- **No edits** — fallbacks must be armed and rehearsed (Sat 18:00 JST film gate + this fallback tape).
- **Presenter = Shaka** (voice); twin/agents on screen. During any "confirming…" beat, keep hands off keyboard and **narrate the §3 choreography** so lag reads as honesty, not a hang.
- **On stage, prefer `?mode=offline`** unless the connection is pre-flighted and rock-solid, so the console stays clean and the demo can't dead-end on wifi. Splice/mention the live badge only when the booth connection is confirmed.

### Live 4-min beat clock
| t | Beat | Live action | Presenter says | Fallback trigger |
|---|---|---|---|---|
| 0:00–0:15 | Frame | open on shelf | one-breath frame | — |
| 0:15–0:45 | Browse+Hire | click Trace → HIRE | "hire an agent like an app; then it has to ask" | static shelf if read slow |
| 0:45–1:40 | Bless (World) | consent → open World → **Approve** | scope/duration/verify narration; live chip if pre-flighted | **wifi/token wobble → switch to `?mode=offline` tab, keep talking** |
| 1:40–2:10 | Name+Role | binding legs settle | "a name and a role, on-chain — settling behind the instant yes" | pre-minted read |
| 2:10–2:45 | Utility | Trace rescues food, signed receipt | "real work, stamped by my blessing" | fixture output |
| 2:45–3:15 | Deny | re-ask (2nd agent) → **Deny** → stand-down | "say no — it respects no, takes no action" | recorded |
| 3:15–4:00 | Revoke+Debrief | "Stop" → instant halt → legs → debrief → shelf | "one word, and it stops" | app-halt always instant |

### FALLBACK LADDER (Bug Buster gauntlet — arm ALL before stage)
1. **Live-wire, pre-flighted** (deployed origin, `● BACKEND LIVE` lit, keyed Sepolia RPC #1): real `begin`/`deny` + real ENS read.
2. **Offline mode** (`?mode=offline`, same deployed shell): guaranteed 0 network / 0 console errors — the honest rehearsal rung, badged. Switch here the instant wifi wobbles.
3. **RPC failover / local anvil-fork** for any live on-chain reads: keyed Sepolia RPC #2 (pre-flighted Thu) or local fork — narrate honestly "running against a local fork of Sepolia."
4. **THE FALLBACK TAPE** (this file's P0-7 deliverable): a full-res offline walkthrough recorded now — plays from any borrowed machine if the laptop/wifi dies. **If venue wifi dies at 18:00, this tape IS the demo.** Path below.
5. **Static artifacts:** shelf + receipt render offline from the inline registry mirror / fixtures.
- **Trigger discipline:** if a live leg hasn't confirmed in ~15 s on stage, presenter says the choreography line and the operator switches to the matching fallback tier. Rehearse the switch at Sat 18:00.

---

## 🎞️ FALLBACK TAPE (P0-7 — BANKED · v2 Orbie-first re-cut 2026-09-26 ~20:15 JST)

- **Path:** [`/shared/tokyo/submission/dry-run/fallback-tape/`](/shared/tokyo/submission/dry-run/fallback-tape/)
  - **`fallback-tape-offline.mp4`** — PRIMARY (H.264, 1280×900, 25 fps, **77.6 s**, ~7.5 MB) + `.webm` source.
  - **`orbie-bless-segment-offline.mp4`** — SUPPLEMENT (**40.0 s**): a standalone in-app Orbie bless ceremony so the offline base can carry Beat 3 ("the human blesses Orbie") even if the optional Ian booth splice is never captured. + `.webm`.
  - `_v1-trace-first-archived/` — superseded v1 (67.2s, Trace-first shelf).
- **What the PRIMARY is:** a full-res, **real-time (NO speedups)** Playwright capture of the whole canonical path in `?mode=offline` against the LIVE **Orbie-first** deploy — cold open on the Orbie-first shelf → glance Orbie (the littlest one) → **Trace** full ceremony (hire→bless→utility real $642.96 onion-loop receipt→**revoke "Stop"** = instant-halt choreography + **single** debrief) → dignified **DENY** with Terri → **Orbie epilogue** (close on Orbie's card). Matches FINAL script v2 mechanics.
- **Honesty:** header shows **📴 OFFLINE · REHEARSAL DATA** + consent card shows **📴 REHEARSAL SESSION** the whole time; **0 console errors, 0 external network requests** on BOTH tapes (recorder-verified) — truly airplane-proof. Live backend re-confirmed at capture (`/healthz ok:true`, `begin`→200).
- **Use:** the PRIMARY is both the base offline capture for the film-mode splice AND the break-glass "wifi-died" tape (77.6s — ~2.5 min headroom under the 4:00 ceiling for a title card + optional splices). See [`film-mode-final.md`](/shared/tokyo/submission/film-mode-final.md) for the base-vs-splice cut rule (base = offline; Ian splice = OPTIONAL insert at Beat 3; nothing depends on it).

---

## Q&A PREP (3 min — anticipated judge questions → one-line answers)

Pull from `intel/booth-questions.md` + Karaoke mock-judge + Spector red-team. Top 8 likely:
1. **"Where's the secure backend check?"** → "Here — the deployed Cloudflare Worker (`trinity-consent…`) validates the World JWT against pinned JWKS (`sandbox.auth.world.org`, orb-grade required) server-side before any privileged act. Client-only authz would disqualify; ours doesn't. `/healthz` shows `configured:true, require_orb_acr:true`."
2. **"Is this the real World pilot or a mock?"** → "The consent session is real and live — `POST /v1/consent/begin` returns a real `session_id` from our backend, and you saw the `● BACKEND LIVE` badge. The final verify needs a real orb-grade token minted by a human's World App at the booth; that's the one leg we rehearse until we capture it here."
3. **"What's fresh vs reused?"** → "Continuity track. Disclosed base: the Sepolia ENS registry + gift market. Fresh this weekend: the consent backend, the marketplace app, the ENSv2 bless/revoke wiring, and 100% fresh 1inch Aqua code. The README lists every line."
4. **"Does revoke really stop it, or just eventually?"** → "Instantly — the agent re-checks authority before every action, so 'Stop' halts it at the next step (measured ~7 ms, synchronous, no zombie flip). The on-chain revoke settles behind as a receipt."
5. **"What if a stranger grabs the user_code?"** → "Bound to the verified `sub`; the projected-code path is closed (Spector F10 → 401 sub_mismatch before the jti burns). We rehearse the handoff under 40 s."
6. **"Why ENSv2 subnames for agents?"** → "An agent needs a name you can trust and revoke. Subname = the blessing made legible; EAC role = the authority; ENSIP-25/26 records carry it. Revoke clears the attestation but keeps the subname — that's continuity."
7. **"What's the Aqua part?"** → "The gift/wage position: ship = bless (position opens), dock = revoke (released instantly) — same ceremony, second chain, fresh code."
8. **"Is 'agent stops when a human says stop' actually novel?"** → "Across 38 finalists we analyzed, unclaimed. That's our WOW." (Karaoke intel.)

---

## SCREEN INVENTORY (capture list — Podfather/Kaaak)
`shelf` · `detail` (Trace) · `consent` (+ live wire chip) · `world` (phone Approve, mirrored) · `binding` (name+role legs) · `blessed` (card) · `utility` (Trace rescue + signed receipt) · `standdown` **declined** (deny stand-down) · `standdown` **stop** (instant halt + legs + debrief receipt) · close `shelf`. **10 named captures** + the **live-wire proof** (badge + `● LIVE` chip + Etherscan glance). All 10 are in the Fri-night / offline fallback pass so any can drop in as fallback b-roll.

---
*Every fallback exists so the walkthrough never dead-ends. Drafts until Shaka blesses. Embargo law binds all on-screen copy (no $-token names until moon Sun 01:49 JST).*
