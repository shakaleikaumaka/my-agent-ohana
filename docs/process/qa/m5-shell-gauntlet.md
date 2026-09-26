# M5-10 Shell Gauntlet — "My Agent Ohana" LIVE demo shell

**Tester:** Globy Bug Buster 🐛🔨 (QA DESTROYER)
**Date:** 2026-09-25 ~12:37 UTC
**Target (live):** https://agentohana-demo-573fkrr6yf-ffieyo32.taur.link/
**Source read:** `/shared/public/agentohana-demo/` (index.html, app.js, agents.json, styles.css)
**Method:** headless browser, full flow ×N + hostile abuse; real observed behavior + DOM/console evidence. No speculation except rows marked BLOCKED (assessed from source, noted as such).
**Viewport:** 1280×720 desktop.

---

## 🔴 SCARIEST FINDING (read this first)

**Browser BACK resurrects a frozen, stale prior-session screen (bfcache phantom).**
Pressing the browser Back button (or a Mac trackpad **two-finger swipe-back**, which is trivially easy to trigger mid-pitch) does **not** step back through the in-app flow — the app has no URL routing. Instead the browser restores the *previous page from bfcache with its old JavaScript state intact*. Observed: after a completed revoke, Back landed me on a **frozen REVOKE stand-down showing the OLD session's debrief receipt (12:29:49)** — a dead, stale screen that looks broken. Recovery requires knowing to click the header **"↺ restart walkthrough"**. During live judging, an instinctive Back/swipe mid-demo drops you onto a corpse screen. **This is the most demo-lethal behavior found** — not because it's unrecoverable, but because it fires easily and looks catastrophic on stage.

> Good news, and it matters: the thing I was told to fear most — the **three-pane REVOKE (prior row 6.4)** — is **SOLID**. The "one word" halt reads as instant (app-layer authority flips first), the World/ENS-role/Aqua legs settle sequentially behind it as receipts, and I saw **no 2-of-3 zombie flip** in any run (Aqua path or non-Aqua path). The core ceremony is strong; the risks below are around the edges.

---

## Tally

- **PASS: 25**
- **FAIL: 6** (2 medium demo-risk, 4 low/cosmetic)
- **BLOCKED: 4** (need real time/network/mobile/live-integration to close)

---

## PASS matrix

| # | Test | Result |
|---|------|--------|
| P1 | Shelf renders 5 featured + 3 listing cards (config-driven from agents.json) | PASS |
| P2 | Trace detail renders (scope/may/mayNot/duration/chains/subname) | PASS |
| P3 | Consent screen: QR + user_code + verification_uri render | PASS |
| P4 | World phone-mirror renders with Approve/Deny | PASS |
| P5 | Binding: 5-leg choreography (Trace/Aqua), app-layer LIVE instant, chain legs settle, CTA gated→enabled | PASS |
| P6 | Blessed card renders, countdown ticking (00:59:xx) | PASS |
| P7 | Utility rescue-match runs, receipt stamped w/ subname + role + sub | PASS |
| P8 | **Three-pane REVOKE (Trace): instant HALT, EAC/Aqua/World settle in order, NO zombie flip** | PASS ⭐ |
| P9 | Debrief receipt correct (who/blessed/scope/granted/revoked/did-while-blessed) | PASS |
| P10 | Refresh mid-flow (at consent) → clean reset to shelf, no phantom state | PASS |
| P11 | Deny path → "Blessing declined. No action taken." first-class stand-down | PASS |
| P12 | Consent "timeout path" link → renders stand-down (SCOPED/TIMED/EXPIRED/RE-ASK) | PASS |
| P13 | "Ask again" from expired → recovers to consent (no dead-end) | PASS |
| P14 | PIT binding: 4 legs, **no Aqua leg** (config-correct for non-Aqua agent) | PASS |
| P15 | Wrong-word revoke ("halt"+Enter) → blocked, amber border, input clears, stays BLESSED | PASS |
| P16 | PIT revoke: rapp/reac/rworld legs (no Aqua dock), consistent | PASS |
| P17 | Shaka twin verse utility runs (bard.ohana.eth · role BARD) | PASS |
| P18 | Terri receipt utility runs (terri.ohana.eth) | PASS |
| P19 | Ohana concierge utility runs (concierge.ohana.eth) | PASS |
| P20 | Double-click Approve → safe (1st click navigates, 2nd has no target; no double-fire) | PASS |
| P21 | **Race: Run utility → instant Revoke → action ABORTED by authority re-check**, single clean stand-down | PASS ⭐ |
| P22 | Re-entrant go("standdown") from aborted action → no duplicate receipt/legs | PASS |
| P23 | Listing cards (Aries/Taurus/your-agent) non-interactive (cursor default, no nav) | PASS |
| P24 | Config integrity: all 5 featured cards reach utility + revoke, no dead-end | PASS |
| P25 | No console errors/warnings on load or through flow | PASS |

## FAIL matrix

| # | Severity | Finding | Evidence |
|---|----------|---------|----------|
| **F1** | **MED** | **`?mode=offline` is a silent no-op.** Advertised "offline fixtures mode" does **not exist** in app.js — the param is ignored and the normal online registry (all 8 cards) loads by fetching agents.json. The *only* offline path is `fetch().catch()`, which (a) triggers **only on real network failure**, and (b) falls back to a **1-agent stub (Trace only)** — silently losing Terri/Shaka/PIT/Ohana. So "offline mode" gives false confidence and, if it ever fires for real, drops 4 of 5 agents. | `?mode=offline` → 8 cards render identically to online; no `mode` handling anywhere in source; catch-block registry has 1 featured agent. |
| **F2** | **MED** | **Browser Back → bfcache phantom (the scariest finding above).** No URL routing; Back restores a frozen prior-session screen. Recoverable only via header restart. | Back after revoke → froze on old REVOKE stand-down w/ stale 12:29:49 receipt. |
| **F3** | LOW-MED | **Consent timeout path mislabels a pre-approval device-code timeout as an expired *blessing*.** Reached from the consent/QR screen *before any approval*, the copy reads "The blessing expired… waits to be re-blessed" — but nothing was ever blessed. Correct semantics: the **sign-in code** expired (nobody approved). A sharp judge can catch "I never approved it — how did it expire?" | expLink from consent → "blessing expired" copy with zero prior grant. |
| **F4** | LOW | **Declined/pre-bless-expired lights the stepper to REVOKE-active** with BROWSE→UTILITY shown "done", implying full progression that never happened. Cosmetic but contradicts the ceremony. | Deny at HIRE → stepper active step = REVOKE. |
| **F5** | LOW | **ENS subname leg absent from every revoke choreography.** Binding *mints* the subname (ENS leg), but revoke shows app/EAC/(Aqua)/World and never addresses the name. Likely intentional continuity (name persists) — but it's unexplained on-screen; a judge may ask "what happens to the name / who owns it now?" Add one line. | Revoke legs: rapp, reac, (raqua), rworld — no rens in source. |
| **F6** | LOW | **Binding screen has no in-screen back/cancel** during the ~3s chain-settle. Never-dead-end law is technically satisfied by the global header "↺ restart," but this is the only screen lacking an in-content way back. If a settle ever hangs, user's only exit is the header. | viewBinding renders CTA only; no back link. |

## BLOCKED matrix (could not close in this environment)

| # | Item | Why blocked |
|---|------|-------------|
| B1 | Real 1-hour blessing expiry (countdown→0 auto stand-down) | Can't wait 1h; only the expLink shortcut path tested. Countdown logic present in source and ticking correctly. |
| B2 | True network-offline fallback render (fetch failure → 1-agent stub) | Can't force a fetch failure from the browser tool; assessed from source only (see F1). |
| B3 | Mobile / narrow-viewport layout | Tested desktop 1280×720 only. Phone-mirror + split panels should be re-checked at ~390px. |
| B4 | Real World / ENS / Aqua integrations | All are disclosed demo fixtures (honesty note is clear + honest); live-integration behavior not testable in the shell. |

---

## Top-3 fixes for Kaaak (prioritized)

1. **Kill the bfcache phantom (F2).** Add a `pageshow` guard so a Back/swipe restore always re-boots to a fresh shelf:
   ```js
   window.addEventListener('pageshow', function(e){ if(e.persisted){ resetAgent(); go('shelf'); } });
   ```
   Cheap, ~2 lines, removes the single most demo-lethal behavior. (Optional bonus: trap Back within the app via history so swipe-back steps screens instead of leaving.)

2. **Make offline real, or drop the claim (F1).** Either implement `?mode=offline` to load the **full** bundled registry from an inline fixture, **and** make the `fetch().catch()` fallback carry all 5 featured agents (not a 1-agent stub) — so offline never silently loses 4 cards. If offline is a demo contingency (flaky venue wifi), this is worth doing before Sat.

3. **Fix the timeout/stepper honesty nits (F3+F4).** Pre-approval timeout copy should read "the sign-in code expired — nobody approved; nothing was blessed" (distinct from a granted blessing expiring), and do **not** light the stepper REVOKE-active for a declined or pre-bless-expired outcome. Small copy/stepper change; removes two "gotcha" openings for judges.

---

## What's rock-solid (don't touch)

- Three-pane instant revoke + sequential chain-leg settle — **no zombie flip** (Aqua and non-Aqua). This was the prior top fear; it's the shell's strongest beat.
- Authority re-check aborts a mid-flight action on revoke (run→instant-revoke → no action performed).
- Wrong-word revoke is guarded; only "Stop" halts.
- Deny is a genuine first-class outcome ("no action taken").
- Refresh (reload) resets cleanly — no phantom on refresh (only on Back/bfcache).
- All 5 featured agents are fully config-driven end-to-end (browse→utility→revoke), subnames/roles/legs all derive from agents.json.
