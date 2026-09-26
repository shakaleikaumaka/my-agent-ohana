# 🐛🔨 BUGBUSTER GAUNTLET — Wave-2 tabletop dry-run (hostile pass vs the WRITTEN plan)

**Lane 2a · Owner: Globy Bug Buster 🐛🔨 · 2026-09-23 UTC · HOSTILE USER seat (sysadmin ruling)**
**Method**: tabletop. No build exists, so I attacked the plan on paper. Verdicts: **PASS** = the written plan already contains a specific credible mitigation (design decision made, protocol-inherent property, scripted honest answer, or scheduled ops procedure) · **FAIL** = the plan as written dies (contradiction / overpromise / no coverage) — file+section cited · **BLOCKED-ON-BUILD** = runtime behavior no document can settle until code exists.
**Inputs read**: `submission/qa-test-plan.md` · `intel/consent-flow-demo-script.md` · `intel/aqua-weekend-plan.md` · `submission/video-storyboard.md` · `/shared/public/tokyo-pitch/index.html` · cross-refs: `intel/ensv2-sepolia.md`, `intel/winning-submissions.md`, `intel/mock-judge-pass-1.md`, `intel/tokyo2026-final-prizes.md`.
**Count note**: the brief said "34 rows" — the filed gauntlet actually carries **48 matrix rows** (41 beat + 7 cross-cutting). All 48 scored. No padding, no freebies.

---

## 0. TALLY

**23 PASS · 2 FAIL · 23 BLOCKED-ON-BUILD** (48 matrix rows)
+3 new adversarial rows (§3): **2 FAIL, 1 PASS (guarded)** → grand total **24 / 4 / 23 of 51**.

The two matrix FAILs are not edge cases — they are the **★ emotional peak (three-pane revoke)** and the **deck's core Aqua claim ("enforced, not promised")**. Both are promises the plan makes in public with no spec behind them.

---

## 1. SCORECARD — all 48 rows

### Beat 1 — World ID authorize
| # | Verdict | Why (one line) |
|---|---|---|
| 1.1 | ⛔ BLOCKED | Second-scan session semantics are pilot-server behavior, unverified — capture truth Friday (booth Q#5). |
| 1.2 | ✅ PASS | Denied beat fully scripted (consent-script Beat 4): all terminal wire shapes → one dignified stand-down + mandatory Friday denial recording. |
| 1.3 | ⛔ BLOCKED | Stale-`user_code` double-approve = server semantics; no doc can settle it. |
| 1.4 | ⛔ BLOCKED | `slow_down` backoff is client code that doesn't exist (🩹, cheapest fix in the whole matrix). |
| 1.5 | ✅ PASS | Beat budgeted 40s vs typical `expires_in` ≥300s + restart path scripted — *conditional on capturing real `expires_in` Friday (booth Q#7)*. |
| 1.6 | ✅ PASS | Approval rides the phone's own radio (consent-script Beat 1 risk (a) + E5 hotspot canon); laptop network is irrelevant to this beat. |
| 1.7 | ⛔ BLOCKED | Pending-session survival across reload is persistence code; Gate A1 states the requirement, not the capability (☠️). |
| 1.8 | ⛔ BLOCKED | `prompt=none` fallback is build; device-flow-only golden path may retire this row entirely (🩹). |
| 1.9 | ✅ PASS | Fresh-4.0-credential persona is law; legacy-3.0 trap documented; booth Q#4 confirms Orb status. |
| 1.10 | ✅ PASS | Legacy `id.worldcoin.org` explicitly quarantined ("still a trap"), pilot-only law, live re-probe 09-23 all green. |

### Beat 2 — Consent
| # | Verdict | Why |
|---|---|---|
| 2.1 | ⛔ BLOCKED | Button idempotency/disable is code (☠️). |
| 2.2 | ⛔ BLOCKED | Reload-from-chain-truth is code; Gate A1 is a test criterion, not a mechanism (☠️). |
| 2.3 | ⛔ BLOCKED | No min/max duration values specified in ANY doc — spec gap, not just build gap (🩹). |
| 2.4 | ✅ PASS | E8 bump-fee procedure rehearsed + gas reserve + Gate C recovery-speed law cover stuck Sepolia txs. |
| 2.5 | ⛔ BLOCKED | Human-words revert decoding is build. |
| 2.6 | ✅ PASS | Beat 3 scripted: no refresh tokens, `expiresAt` shown live, re-ask loop pre-framed as feature. |
| 2.7 | ⛔ BLOCKED | ☠️ soul-row: expired-consent refusal has a stated design (check-before-every-act) but no written enforcement point for the swap path. |

### Beat 3 — ENSv2 subnames (weakest beat on paper: 0 passes, all runtime)
| # | Verdict | Why |
|---|---|---|
| 3.1 | ⛔ BLOCKED | Idempotent issuance (existing-name returned) is contract/app code. |
| 3.2 | ⛔ BLOCKED | "Naming…" pending card state is UI build (🩹). |
| 3.3 | ⛔ BLOCKED | Address-fallback + one-click retry is build. |
| 3.4 | ⛔ BLOCKED | Records-matching-claims is build-truth; pinned-address discipline + storyboard Beat-3 fallback capture are the mitigations (☠️ if mismatched). |
| 3.5 | ⛔ BLOCKED | Chain-id guard is code; Gate A4 mandates it, nothing implements it yet (☠️). |
| 3.6 | ⛔ BLOCKED | Owner-check-before-signature is build. |

### Beat 4 — Aqua stewardship
| # | Verdict | Why |
|---|---|---|
| 4.1 | ✅ PASS | Dock-kills-strategy and maker-custodies-until-pull are Aqua-protocol-inherent (bytecode verified 09-23) + `approve(Aqua,0)` brake documented — *conditional on R1 forge tests going green Fri*. |
| 4.2 | ✅ PASS | Strategy immutability is protocol-inherent; re-ship = dock+ship is documented (aqua-plan beat 4) — the immutability IS the story. |
| 4.3 | ⛔ BLOCKED | ☠️☠️ the demo's soul: agent-refuses-unblessed needs the consent-check call graph, which exists nowhere on paper; mock-judge already threatens "show me the line." |
| 4.4 | ✅ PASS | E3 `make demo-fork` + pinned block + snapshot + Gate C9 (≤90s cold start, rehearsed 3×). |
| 4.5 | ⛔ BLOCKED | Revert-decode UX is build; position-survives-revert is protocol (🩹). |
| 4.6 | ✅ PASS | Honest answer scripted verbatim in BOTH docs; prize rules allow forks. ⚠️ but the two docs pick different chains for the answer — see Fix #5. |
| 4.7 | ❌ **FAIL** | Deck slide 6 sells *"Scoped consent onchain: caps, duration, allowed actions — **enforced, not promised**"* (`tokyo-pitch/index.html` §6 + speaker note "enforced by the protocol, not by the agent's good behavior") — but the only contract spec on paper is `steward` + `blessingId` fields (`aqua-weekend-plan.md` BlessingPool row): no caps/duration/allowed-actions mechanism exists even as a design. Worse, our own rehearsed Q3 answer concedes rung-1 is an **app-layer trigger** (`winning-submissions.md` HARD Q&A Q3). A 1inch judge reading the slide then hearing Q3 catches the overpromise. Row expectation: "proves the guard is real, not theater" — today it's theater. |
| 4.8 | ✅ PASS | Gate D11 ends every full run with approval-cleanup; brake documented (🩹). |

### Beat 5 — Denied path (best-planned beat in the dossier)
| # | Verdict | Why |
|---|---|---|
| 5.1 | ✅ PASS | Stand-down scripted line-for-line, denial is a first-class ledger outcome, never-cut law, fallback tape mandatory. |
| 5.2 | ✅ PASS | Fresh `device_authorization` call is protocol-clean (denial is per-request); verify pilot rate limits Friday (booth Q#5). |
| 5.3 | ✅ PASS | Both wire shapes pre-mapped from live bundle recon (`denied`/`rejected`/`expired` ×34 strings); defensive rule "any terminal non-token state → dignified stop"; Friday capture confirms. |
| 5.4 | ⛔ BLOCKED | Last-write-truth race correction is build; note: real device flow barely admits post-grant deny — the true risk is phantom local state (Gate A1 again). |

### Beat 6 — One-tx revoke
| # | Verdict | Why |
|---|---|---|
| 6.1 | ⛔ BLOCKED | Idempotent revoke is code. |
| 6.2 | ⛔ BLOCKED | Reload-shows-chain-truth is code (☠️). |
| 6.3 | ⛔ BLOCKED | Race is code: post-revoke Aqua swap-revert is protocol, but agent-side refusal is orchestrator build (☠️). |
| 6.4 | ❌ **FAIL** | The ★ moment has **no choreography spec**. Consent-script Beat 5 ⚙️ explicitly defers the on-chain binding: *"the ENS/Aqua lanes surface it on-chain if their lanes bind it — coordination point, not a promise"* — while `video-storyboard.md` Beat 6 promises **three panes flipping simultaneously** and deck slide 7 says *"consent burns, positions unwind, name releases."* Three systems with three finalities (off-chain session that may live to `exp` per Beat-5 risk (a); two Sepolia txs needing ≥2 blocks inside a 35s window under possible gas spike E8) and zero written ordering, no partial-failure script. A 2-of-3 flip on stage is a visible zombie — the goosebump moment becomes the funeral, live. |
| 6.5 | ✅ PASS | All three proof surfaces are real by design (agent re-attempt, etherscan dock, `/approved-apps`) — rehearse the show-me (🩹). |
| 6.6 | ✅ PASS | Silent-fallback stated; assets bundle locally (📝). |

### Cross-cutting
| # | Verdict | Why |
|---|---|---|
| 7.1 | ⛔ BLOCKED | First-approval-wins is pilot server semantics, unverified — same Friday capture as 1.1. |
| 7.2 | ✅ PASS | Denied path IS a rehearsed beat with ≤30s scripted recovery — a judge denying for us is a gift, not a bug. |
| 7.3 | ✅ PASS | Approval requires Shaka's World app; pilot's own copy ("Only approve a sign-in you started") + scripted say-out-loud line. |
| 7.4 | ✅ PASS | Prevention is checklist (sleep disabled, Gate D12) + E4 backup machine + fork replay; gauntlet injects this at T00:00. |
| 7.5 | ✅ PASS | Gate D12: DND on, updates frozen (📝). |
| 7.6 | ✅ PASS | Honest "watch on mine" scripted; never-hand-over-signing rule (📝). |
| 7.7 | ✅ PASS | Wallet-window pre-positioning is in the rehearsal plan (🩹). |

---

## 2. TOP-10 FIX LIST — ranked by (likelihood × demo-fatality)

| # | What breaks (cite) | Cheapest fix | Owner | Bell |
|---|---|---|---|---|
| 1 | **No OIDC client = no World leg = no $7.5k track.** `client_id` registration path still UNVERIFIED (`consent-flow-demo-script.md` Part 3 #1, self-flagged "fatal-risk #2"); every Beat-1 row assumes it. If registration isn't self-serve, even the Friday-night fallback recording can't be made. | Friday **booth hour one**: register a real client at `/portal` before any other work; if blocked, escalate to World booth immediately and take the IDKit-gated fallback architecture decision by Fri 19:00 (answer pre-drafted in `winning-submissions.md` Q1). | **PIT** (Shaka's finger) | **Fri noon** (booth hour) |
| 2 | **The ★ three-pane revoke has no choreography** (row 6.4 FAIL: consent-script Beat 5 vs storyboard Beat 6 vs deck §7). Two Sepolia txs + one off-chain session inside 35s, no ordering, no partial-failure script. | Write the one-page revoke ordering spec before any contract code: fire World-session recheck + ENS `revokeRoles` + Aqua `dock` in a defined sequence with per-pane honest fallbacks (storyboard already allows terminal `getState` substitute — extend to all three panes); script the 2-of-3 narration *"two systems confirmed, third confirming — watch it land."* | **Tauro + PIT** | **Fri night** |
| 3 | **"Enforced, not promised" is currently theater** (row 4.7 FAIL: deck §6 vs BlessingPool's 2-field spec vs our own Q3 rung-1 answer). Judge clones repo, finds only a steward-address check, deck claim dies. | Two-option decision Fri night: (a) spec the minimal real guard — steward-gated `ship`/`dock` + consent-registry read in `swap` path, even one modifier deep — or (b) soften deck §6 to *"scoped at the app layer, settled onchain — and we show you exactly which line does it"* (matches Q3's honest ladder). Never ship slide and code that disagree. | **Tauro** (Spector reviews guard) | **Fri night** |
| 4 | **Shaka's Orb credential status unknown** (booth Q#4; persona law requires fresh 4.0; legacy persona throws pilot errors per `consent-flow-demo-script.md` filming rules). No verified human → Beat 1 dies → no demo at all. | Thu pre-flight: Shaka opens World app, confirms 4.0 credential + live session, disables auto-update (E7). If legacy/missing → book nearest Tokyo Orb for Friday morning; lead time is the enemy. | **Mahalo** (checklist) / Shaka | **Thu pre-flight** |
| 5 | **Two docs, two chains.** Storyboard Beat 4 films a **fork terminal** ("official contracts, local fork") while `aqua-weekend-plan.md` TL;DR #2 declares **Sepolia-live primary** ("all visible on sepolia.etherscan.io"). Partner judging is 100% submission materials (`mock-judge-pass-1.md`) — a 1inch judge cross-checking video vs submission text finds the seam. Late discovery = Saturday re-shoot. | One canonical line, decided Fri night before any recording: recommended = **live Sepolia primary in video Beat 4, fork capture as the labeled fallback** (fork determinism still rehearsed). Update storyboard Beat 4 V.O. + capture list + deck §6 note in the same commit. | **Mahalo** (chain truth) | **Fri night** |
| 6 | **SepETH gap + zeroed rehearsal wallets** (`aqua-weekend-plan.md`: 2.34 vs 3.0 target; ALL rehearsal wallets 0.0; S1 distribution = one 10-min Shaka signature session, currently scheduled Fri evening — if it slips, Sat-morning Sepolia runs are impossible and the noon gate auto-flips). | Run the pk910 gap-close session Thu pre-flight (already Mahalo's recommendation, unstarted); **move S1 distribution to Fri doors (~17:00)**, ledger each tx within the hour. | **Mahalo** | **Thu pre-flight** |
| 7 | **Friday wire-truth is unscheduled as a deliverable.** Six BLOCKED Beat-1/5/6 rows (1.1, 1.3, 5.4, 7.1 + lifetime/revoke-lag unknowns) all reduce to "capture it with a real client Friday" — but no artifact owns that capture list. | PIT ships `wire-truth.md` Fri night: exact denial wire format, `expires_in`, second-scan behavior, post-revoke invalidation lag, token/session lifetimes — each with the captured JSON. Feeds Gate A sign-off. | **PIT** | **Fri night** |
| 8 | **ENSv2 deployment churn is real** (`ensv2-sepolia.md`: 09-03 + 09-15 redeploys; ensjs support in open PRs #377/#380). Building Sat against stale pins or half-supported ensjs = Beat 3 dies mid-morning. | Fri noon: Tauro re-verifies every pinned address on-chain (`cast code`), decides ensjs-vs-raw-`cast` per call BEFORE build day. 30 minutes, kills a whole failure class. | **Tauro** | **Fri noon** |
| 9 | **Beat-6's 35s window vs Sepolia block time.** Two chain txs (ENS strip + dock) at ~12s/block + wallet confirms + possible E8 gas spike = the pane window can blow even with perfect choreography (fix #2). | Sat dress runs: measure the real two-tx revoke end-to-end twice; if >30s, re-sequence (World pane first — instant — then chain panes) and re-cut the beat. Gate C8 already demands ≤60s recovery; this demands ≤35s *success*. | **Kaaak** (pane choreography) + Mahalo | **Sat noon gate** |
| 10 | **The public deck leaks process + one wrong protocol claim.** `/shared/public/tokyo-pitch/index.html` speaker notes (press S / view-source) contain squad chatter ("Crea's showcase copy lands in wave 2", "PLACEHOLDER"); slide 4 says *"proof lands onchain… only the nullifier"* — that's IDKit architecture, NOT the pilot OIDC path (pairwise `sub`, no onchain proof, per consent-script Beat 2 ⚙️); slide 9 is placeholder; slide 12 QR is "WAVE 2". | Fri night: scrub `aside.notes` of internal chatter; rewrite slide-4 bullet to pilot truth ("no biometrics leave the phone — we hold a pairwise sub and an Orb-grade acr claim"). Sat night: slide 9 real bullets + live QR. Spector reviews the public surface once before submission. | **Kaaak** (Spector review) | **Fri night** (scrub) + **Sat night** (content) |

**Fixes by bell**: Thu pre-flight ×2 · Fri noon ×3 (incl. S1 half of #6) · Fri night ×4 (+ scrub half of #10) · Sat noon ×1 · Sat night ×1 (content half of #10).

---

## 3. THREE NEW ADVERSARIAL ROWS (fresh doctrine)

### A. ⛓️ "ORCHESTRATOR AMNESIA" — kill the glue, then say *prove it*
**Attack**: The three sponsors live on three substrates that never touch: World = off-chain OIDC pilot, ENSv2 = Sepolia-only, Aqua = Sepolia-unofficial/fork. The *only* thing binding human `sub` ↔ ENS name ↔ Aqua `blessingId` is our orchestrator's local state. Mid-demo: kill the agent process and wipe its working directory (or E4 laptop death). Chain truth still has the name and the strategy — but the *linkage* and the debrief receipt's evidence lived in RAM/localStorage on one laptop.
**Verdict: ❌ FAIL.** `qa-test-plan.md` Gate A.1 + E4 promise "chain/**server** truth" and state-restore, yet no document specifies where the binding ledger lives or survives; `consent-flow-demo-script.md` Beat 2 ⚙️ ("our app keys agent permissions to the pairwise `sub`") and Beat 6 ("assembled from real artifacts… nothing mocked") both assume it; `video-storyboard.md` Beat 7's *"every line traceable to a wire event"* becomes unfabricatable-after-the-fact. Without the ledger, the trinity is three disconnected demos and the receipt is a painting.
**Fix**: make the linkage *re-derivable*, not remembered — `blessingId = keccak256(sub ‖ sessionId)` (deterministic: no state needed to prove the bind), ledger = append-only JSONL on disk (git-committed hourly), `blessingId` written into the ENS `agent-context` text record (ENSIP-26, cheap per `ensv2-sepolia.md`). Add "orchestrator-kill drill" to the gauntlet's chaos round. Owner: PIT + Tauro. Bell: Fri night.

### B. 🎙️ "PUBLISHED-SOFTBALL WHIFF" — the 3 Q&A questions drop Friday; we rehearsed everything except them
**Attack**: The finalist prep questions are public (`tokyo2026-final-prizes.md`: *"What inspired your project? What tools did you use, and why? What challenges did you solve, and how?"* — 3 min for 3 answers). Our entire rehearsal arsenal (`winning-submissions.md` HARD Q&A Q1–Q5) trains sponsor-voice *gotchas*. The published three are softballs whose failure mode is **rambling and self-contradiction**: ~45s per answer, unrehearsed, ad-libs that drift off-script — the "tools" answer must match deck slide 11 + disclosures slide 10 verbatim, and the "challenges" answer must not narrate the Sat-noon gate as panic. Partner judging is materials-only, so finalist Q&A is our *only live unscripted surface* — and it's the one we haven't drilled.
**Verdict: ❌ FAIL.** Coverage gap is real and total: zero of the three published questions appear in any rehearsal artifact (grep-confirmed); `mock-judge-pass-1.md` next-pass note even schedules hard-Q&A #2 but still not the published three.
**Fix**: Sat night, 20 minutes: Shaka answers the three published questions aloud, recorded, 45s hard cap each; Kaaak checks every claim against the deck; "challenges" answer pre-framed as *"getting three sponsor stacks to tell one consent story — here's the exact line of code that does it"* (uses fix #3's enforcement line as the punchline). Owner: Kaaak + Shaka. Bell: Sat night.

### C. 🤐 "THE NAMECHAIN SLIP" — a judge hears the scrapped word
**Attack**: Q&A adrenaline, Shaka ad-libs *"…and on Namechain—"*. Namechain (the ENS L2) is **not part of the Sepolia beta deployment** we build on (`ensv2-sepolia.md` line 19); the prize is explicitly "ENSv2 (Sepolia)". To an ENS judge, that one word says we don't know what chain we're on — aimed at the exact sponsor who wrote our concept into their prize text twice.
**Verdict: ✅ PASS (guarded).** Grep-verified: **zero** judge-facing occurrences — deck (`/shared/public/`), storyboard, and consent script are all clean; the only mention in the dossier is internal intel using it correctly. But the guard is *passive*: the 60-second live pitch script is still unwritten ("lands in a later wave", storyboard §5), and humans ad-lib the word they've read most.
**Fix (keep it true)**: ① add `Namechain`, `id.worldcoin.org`, and token tickers to the banned-words grep that already runs on video exports (storyboard cross-cutting rules) — extend to deck exports + Gate D12 morning check; ② lock the 60s script's ENS line verbatim: *"ENSv2 subnames on Sepolia — expiring, revocable, non-transferable"*; ③ speaker-note sweep before the deck URL goes anywhere judge-facing (folds into fix #10). Owner: Kaaak. Bell: Fri night.

---

*Doctrine upheld: tabletop = attack the written plan, no invented code. Every FAIL cites the file+section that dies. ACTUAL columns in `qa-test-plan.md` stay ⬜ until the Fri/Sat live gauntlets — this file is the paper enemy; the laptop is the real one.* 🐛🔨
