# M5-10 GAUNTLET — "My Agent Ohana" marketplace shell (CAST-v2, 6 agents)

**Tester:** Globy Bug Buster 🐛🔨 (QA DESTROYER)
**Date:** 2026-09-25 ~13:25 UTC
**Target (live, read-only):** https://agentohana-demo-573fkrr6yf-ffieyo32.taur.link/
**Source:** `/shared/public/agentohana-demo/` — live `app.js` verified **byte-identical** to source (md5 `38033a31…`).
**Method:** headless Chromium (Playwright 1.60), **desktop 1280×900 + mobile 390×844**, **online + `?mode=offline` + hard network-killed offline**. Real observed DOM/console evidence; every flow instrumented for `console.error` / `pageerror` / `requestfailed`. Harnesses on disk: [`/workspace/gauntlet/`](/workspace/gauntlet/) (`g.mjs` ceremony+offline, `adv.mjs` hostile battery, `cov.mjs` coverage, `t1diag.mjs` timing).

---

## 🔴 SCARIEST FINDING (read this first)

**Revoke *during the ~900 ms utility spinner* renders the Debrief receipt TWICE — a doubled goodbye at the emotional climax.**

The revoke **security property is SOLID** — the agent **halts instantly and performs NO privileged act after revoke** (debrief reads *"did while blessed: no privileged act performed"*; no post-revoke controls exist; 0 console errors). This is **NOT the row-6.4 zombie-authority flip** — authority is app-layer and dies correctly.

**But the UI stacks two identical Debrief cards** (2× "Debrief receipt", 2× promise-strip, 2× "The shelf is open — hire anytime →"). Root cause: `runUtility()`'s pending 900 ms `setTimeout` fires *after* the revoke already navigated to `standdown`; it sees `!authority.active`, calls `go("standdown")` **a second time** (`app.js:623`), and `renderDebrief()` **appends** to `#debriefHost` without clearing (`app.js:807`). Fires **100% of the time** the "Stop" lands inside the spinner window (verified at 0/400/850 ms, via both Enter-key and the danger button, on Aqua-Trace and non-Aqua-PIT). Revoke *after* the receipt renders (≥~1000 ms) is clean.

**Why it matters for Sat 18:00 film:** the revoke goodbye is Beat 6 — the goosebump moment. A presenter proving "I can stop it *while it's working*" (or a judge grabbing the keyboard) hits this window and gets a broken-looking doubled receipt on camera. **Screenshot evidence:** [`/workspace/gauntlet/t1-double-debrief.png`](/workspace/gauntlet/t1-double-debrief.png).

**Fix (trivial, ~2 lines):** guard the stale utility callback at `app.js:622`:
```js
setTimeout(function () {
  if (S.screen === "standdown") return;   // revoke already handled the stand-down — don't re-render
  if (!S.authority.active) { S.revoke.reason = "stop"; go("standdown"); return; }
  …
```
Belt-and-suspenders: make `renderDebrief()` idempotent — `if (host.dataset.done) return; host.dataset.done = "1";` before appending.

---

## Tally

| | Count |
|---|---|
| **PASS** | **130** |
| **FAIL** | **1** (F1 double-debrief — HIGH, demo-integrity, authority-safe) |
| **NOTE (LOW)** | 2 (N1 no offline badge · N2 case-sensitive `mode` param) |
| **BLOCKED** | 3 (real 1-h expiry · real World/ENS/Aqua wire · closure-state introspection) |

Across **every** flow — 6 agents × {desktop, mobile, offline}, deny, all adversarial cases — **0 console errors, 0 page errors, 0 failed requests.** Requirement #6 (0 console errors everywhere) = **GREEN**.

---

## Requirement-by-requirement (GLOBY's 7)

| # | Requirement | Verdict | Evidence |
|---|---|---|---|
| 1 | **Never-dead-ends** — every terminal/error/denied/expired state exits to open shelf | ✅ PASS | detail-back, consent-cancel, world→consent, deny, signin-timeout (ask-again + shelf), revoke close-row, restart header, reload-any-screen — all reach the shelf. No strand found. |
| 2 | **Revoke zombie-flip** — instant halt, cannot act after revoke | ✅ PASS (authority) / 🔴 FAIL (UI dup) | Agent halts instantly; **no privileged act after revoke**; no post-revoke controls; double-revoke → single halt; revoke-then-re-run works. **BUT** revoke-mid-spinner doubles the debrief (F1). |
| 3 | **Denied path** dignified + clean exit | ✅ PASS | "Blessing declined — and that's a real answer… no action." Not error-shaped. Stepper = HIRE (not REVOKE). Exits to shelf. |
| 4 | **All 6 agents** full ceremony; Ohana NOT hireable | ✅ PASS | trace·terri·shaka-twin·pit·**spector·crops** all browse→hire→bless→utility→revoke, desktop+mobile+offline. Spector util=consent-scan (0 crit·F11), Crops util=repo-scan (clean 0 / planted 1🔑). Ohana = host banner, **not a card, not clickable**. |
| 5 | **Offline mode** — whole path, zero network | ✅ PASS (N1 nit) | `?mode=offline` loads inline mirror; full ceremony completes with `context.setOffline(true)` + `agents.json` route aborted. 6 agents + host render. No explicit "OFFLINE" chrome badge (N1). |
| 6 | **0 console errors everywhere** | ✅ PASS | 0 across all 130+ assertions, all viewports/modes. |
| 7 | **Adversarial** — rapid clicks, refresh, restart, garbage input, resize | ✅ PASS | rapid triple/quad-click HIRE/approve/run → single screen/receipt; refresh@every-screen → clean shelf; restart@every-screen; garbage & `<img onerror>` XSS into revoke+paste inputs → escaped/no-exec; resize mid-flow OK. |

---

## PASS matrix (grouped)

**Ceremony (g.mjs · 69/69):**
| ID | Test | Result |
|---|---|---|
| C1 | Shelf: Ohana host banner present; Ohana NOT a card; **6** featured; 3 listing — desktop+mobile | PASS |
| C2 | All 6 agents: 5-part kit renders | PASS |
| C3 | All 6 agents: subname derived from parent (`*.myagentohana.eth`; shaka-twin→`shaka.…`) | PASS |
| C4 | All 6 agents: full ceremony → exactly **1** debrief receipt + **1** halt screen | PASS |
| C5 | Desktop + mobile: 0 console/page/net errors | PASS |
| C6 | **Offline** (`?mode=offline` + network killed): 6 agents render; spector+crops full ceremony; 0 errors | PASS |

**Hostile battery (adv.mjs):**
| ID | Test | Result |
|---|---|---|
| T1 | Revoke mid-utility: agent halts, **no privileged act**, single halt, no run btn | PASS (auth) |
| T1 | Revoke mid-utility: **single debrief receipt** | 🔴 **FAIL → got 2** |
| T2 | Post-revoke: no privileged control (only header restart = legit exit) | PASS* |
| T3 | Double-revoke (danger ×2 fast) → single halt + single debrief | PASS |
| T3 | Revoke-then-re-run: card→AVAILABLE, re-hire→blessed again | PASS |
| T4 | Browser **Back** after revoke → clean shelf (bfcache guard holds) | PASS |
| T5 | Deny → dignified (not error), stepper=HIRE, exits clean | PASS |
| T6 | **Refresh** at detail/consent/world/binding/blessed/utility → clean shelf, no phantom (6/6) | PASS |
| T7 | **Restart-walkthrough** from utility + standdown → clean shelf | PASS |
| T8 | Garbage revoke words (`haltnow`,`STOP!`,`<img onerror>`,`st op`,`sto`) → no halt, stays blessed | PASS |
| T8 | Utility paste XSS `<img onerror>` → escaped, did NOT execute | PASS |
| T8 | Trimmed/mixed-case `"  StOp  "` → still halts | PASS |
| T9 | Rapid triple/quad-click HIRE/approve/run → single consent/binding/receipt | PASS |
| T10 | Resize 1280↔390↔360 mid-flow → utility still completes | PASS |

**Coverage (cov.mjs · 19/19):**
| ID | Test | Result |
|---|---|---|
| T11 | Detail-back / world→consent / consent-cancel exits | PASS |
| T12 | Sign-in-timeout: copy = "sign-in request timed out" (not "blessing expired"); stepper=HIRE; Ask-again→consent; back→shelf | PASS |
| T13 | Listing cards (aries/taurus/your-agent) do NOT navigate; Ohana banner NOT clickable | PASS |
| T14 | `?mode=offline` 6 agents; garbage query params (`foo=<script>`) → shelf still renders, 0 errors | PASS |
| T15 | Forward/reload on standdown → clean shelf | PASS |

\* T2 was flagged FAIL by an over-strict assertion; the sole post-revoke control is the header **"↺ restart walkthrough"** — a legitimate exit, not a privileged action. **Reclassified PASS.**

---

## FAIL matrix

| # | Severity | Finding | Repro | Evidence |
|---|---|---|---|---|
| **F1** | **HIGH** (demo-integrity; authority-safe) | **Double Debrief receipt on revoke-mid-utility.** Revoke while the "working — re-checking authority…" spinner shows → 2 debrief cards / 2 promise-strips / 2 "hire anytime" buttons stacked. Agent still halts correctly & does not act. | 1) Hire any agent → bless → Put to work. 2) Click **▶ Run**. 3) Within ~900 ms (before the receipt appears) type **Stop**+Enter *or* click **🛑 REVOKE**. 4) Observe two stacked Debrief receipts. Fires 100% in-window (0/400/850 ms; Enter or button; Aqua + non-Aqua). Revoke ≥~1000 ms (after receipt) = clean. | `app.js:623` re-`go("standdown")`; `app.js:807` `renderDebrief` appends w/o clearing. Screenshot `t1-double-debrief.png`. |

---

## LOW notes (not blockers)

- **N1 — No explicit "OFFLINE" badge.** `?mode=offline` renders identically to online with no top-level "using local fixtures / offline" chrome indicator. Kit items *are* labelled `fixture`/`template` and the footer honesty note covers it, but a judge can't tell online vs offline at a glance. Optional: a small "⚡ OFFLINE — local fixtures" pill in the header when `isOfflineMode()`.
- **N2 — `mode` param is case-sensitive.** `?mode=OFFLINE` (uppercase) silently runs the **online** fetch path (regex `mode=offline`). It still works (fetch-fail falls back to the same mirror), but if the venue is offline and a presenter types uppercase, the shelf briefly waits on a failing fetch before the catch. One-char fix: `/mode=offline/i`.

## BLOCKED (environment-limited)

- **B1 — Real 1-hour blessing expiry** (countdown→0 auto stand-down). Can't wait 1 h; can't fast-forward (state `S` is closure-private, unreachable from page context). Logic present & correct at `app.js:473` (`rem<=0 → reason=expired → standdown`, exits via "Ask again"/shelf). Expired stand-down copy + exits verified via the `expLink` sibling path.
- **B2 — Real World / ENS / Aqua wire.** All disclosed demo fixtures (honesty footer is clear & honest). Live-integration behavior not testable in the shell.
- **B3 — Closure-state introspection** of `S.authority` post-revoke. Cannot read the private flag directly; verified indirectly (no action performed, no controls, debrief text).

---

## What's rock-solid (don't touch)

- **Revoke authority halt is genuinely instant & final** — no zombie action, no post-revoke controls, double-revoke idempotent, revoke-then-re-run clean. The row-6.4 fear (zombie-authority flip) **does not occur.**
- **bfcache phantom (prior F2) is DEAD** — Back/swipe after revoke → clean shelf.
- **`?mode=offline` is REAL** (prior F1) — full ceremony with network fully killed.
- **Honesty nits fixed** (prior F3/F4) — sign-in-timeout copy correct; deny/timeout stepper = HIRE not REVOKE.
- **All 6 agents fully config-driven** end-to-end; Ohana correctly host-only.
- **0 console errors** across the entire gauntlet.
- **Input hardening**: garbage/XSS into revoke + paste inputs is escaped & inert; only exact "stop" (trimmed, case-insensitive) halts.

---

## One ask for Kaaak (M5-13 / shell owner)

Ship the **F1 one-liner guard** before the Sat 18:00 film. It's the only thing between a clean revoke goodbye and a doubled-receipt on camera. Everything else is green.
