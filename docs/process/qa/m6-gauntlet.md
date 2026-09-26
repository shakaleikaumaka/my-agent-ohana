# 🐛🔨 M6 GAUNTLET — beautified + revoke-choreographed marketplace shell

**Tester:** Bug Buster (QA DESTROYER) · **When:** 2026-09-25 ~20:10 UTC / Sat ~05:10 JST
**Target:** https://agentohana-demo-573fkrr6yf-ffieyo32.taur.link/ (live) + source `/shared/public/agentohana-demo/`
**Tooling:** playwright/chromium — desktop **1280×900** + mobile **375×812** + ultra-narrow 320px, online (default) + `?mode=offline`, reduced-motion, bfcache, flaky-network abort.
**Rule honored:** did NOT edit the shell (Kaaak owns it). Report-only.

---

## 🎬 FILM-SAFE VERDICT

- **OFFLINE rung (`?mode=offline`): ✅ FILM-SAFE — FLAWLESS.** Zero network calls, zero console errors, all 6 ceremonies + full revoke choreography perfect, beauty intact desktop + mobile. This is the guaranteed rung and it holds.
- **ONLINE rung (default): ✅ film-safe *only with rock-solid network*.** When the consent worker is reachable it's clean + shows a real `● BACKEND LIVE` badge and a real consent session. **But** if the worker/network flaps mid-demo, the browser prints uncatchable `net::ERR_FAILED` console errors (functionality still fails-closed cleanly — see FINDING-1).

**RECOMMENDATION → film the demo in `?mode=offline`.** It is both the honest rehearsal rung AND the only mode that *guarantees* the 0-console-error bar regardless of booth wifi. If the team wants the live badge on camera, film online only with a pre-flighted, guaranteed-stable connection.

**Score: 64/64 adversarial checks PASS · shell self-test 81/81 PASS · 1 network-dependent MEDIUM finding · 2 cosmetic nits · embargo CLEAN.**

---

## ⚠️ STATE CHANGE — mission-brief premise is STALE (report to Admiral)

The brief said *"WIRE.enabled=false pending a Tauro CORS redeploy."* **Reality as deployed right now:**

1. `WIRE.enabled = **true**` in both local source and the live deploy (byte-identical, `diff` = IDENTICAL).
2. Tauro's worker **already has live CORS**: `GET /healthz` → 200 with `access-control-allow-origin` = demo origin, `configured:true`; `OPTIONS /v1/consent/begin` → 204; `POST /v1/consent/begin` → 200 (`session_id`+`nonce`), all with CORS headers.
3. `wireBegin` was rewired to use each agent's real `detail.subname` → **all 6 agents fire a live `begin`** (not just trace); every one returns 200.
4. The shell was **actively edited during my run** (app.js 67,183 B → 68,636 B, mtime 19:56 UTC). File is now stable (md5 constant over 12s) and self-test re-passes 81/81 on the settled version.

Net: the live wire is **ON and working** — impressive and honest — but that flips the console-safety story (FINDING-1). Someone should confirm `enabled:true` is the intended state for filming.

---

## 🔴 FINDINGS

### FINDING-1 — [MEDIUM, online-only] `net::ERR_FAILED` console errors when worker unreachable
With `WIRE.enabled=true`, boot fires `/healthz` and every hire fires `/v1/consent/begin`. If the worker is unreachable (booth wifi flap, worker down, CORS regression), each failed fetch prints an **unsuppressable** `Failed to load resource: net::ERR_FAILED` to the console. Repro: `page.route(/trinity-consent/, r=>r.abort())` then boot+hire → 2× console errors (one per failed fetch).
- **Not a code bug** — the app catches it functionally: no live badge (honest), falls back to the rehearsal chip, **no dead-end**, full ceremony+revoke still completes. But the *0-console-error guarantee* is broken for the online path under adverse network. This is exactly what the code's own `WIRE` comment warned about before it was flipped on.
- **Mitigations (pick one):** (a) **film in `?mode=offline`** — 0 network, always clean [BEST]; (b) film online only with guaranteed-stable network, pre-flighting the worker right before rolling; (c) set `enabled:false` for the filmed run (loses the live badge, guarantees clean console). *Cannot* be suppressed in JS — browsers log network failures before the `.catch` runs.

### NIT-2 — [LOW, cosmetic] secondary text-links are 40px tall (<48px)
`.link` and `.top .reset` have `min-height:40px`. Primary `.btn`/`.btn.big`, phone Approve/Deny, revoke input all ✅ ≥48px. The 40px items are underlined text-links ("← back to the shelf", "cancel", "restart") — below the 48px tap-target guideline but not primary actions. Bump to 48 if you want a clean a11y sweep. Non-blocking.

### NIT-3 — [LOW, cosmetic] `.halt-flash` not gated by reduced-motion
The 0.5s revoke background flash (`@keyframes haltf`) still runs under `prefers-reduced-motion: reduce` (aurora/spin/screen-fade are correctly disabled). It's a single non-looping flash, negligible, but for a clean sweep add `.halt-flash{animation:none}` to the reduce block. Non-blocking.

---

## ✅ PRIORITY ATTACKS (from M5 gauntlet + Spector list)

| # | Attack | Result | Notes |
|---|---|---|---|
| 1 | **Revoke choreography (row 6.4)** | ✅ **SOLID** | App-authority halt is **synchronous (~7ms)**, `HALTED` leg instant, **no revoke control survives** (agent cannot act), async chain chips settle behind. **Zero zombie flip.** |
| 1a | Revoke mid-spinner (utility) | ✅ PASS | Exactly ONE debrief (F1 stays fixed on settled version) — stale 900ms timer bails, no double render. |
| 1b | Revoke twice / triple-click | ✅ PASS | Idempotent — exactly ONE debrief receipt/strip/button. |
| 1c | Revoke then navigate (reset mid-choreo) | ✅ PASS | Clean shelf; all 5 stale standdown timers fire harmlessly against dead nodes (null-guarded). No stray debrief host. |
| 1d | Revoke-A → full-bless-B (stale-timer bleed) | ✅ PASS | B intact; A's timers expired vs dead `#debriefHost` (B ceremony >3s). |
| 1e | `stop`+Enter / wrong-word | ✅ PASS | "stop"+Enter revokes; "halt now" does NOT revoke (amber nudge, stays blessed). |
| 2 | **bfcache phantom (pageshow guard)** | ✅ PASS | Back/forward across shelf, revoke-standdown, and utility all restore to a **clean shelf** — no corpse screen, no phantom re-activation. |
| 3 | **Dead-ends** | ✅ PASS | declined / signin-timeout / expired / revoked ALL exit to shelf; re-ask offered where appropriate. Stepper honesty correct: declined & timeout light **HIRE** (not REVOKE). |
| 3a | Dignified DENIED path | ✅ PASS | "no offense taken · NO ACTION TAKEN" strip; no action authorized. |
| 4 | **Beauty** | ✅ PASS (+2 nits) | reduced-motion honored for aurora/spin/fade; primary tap targets ≥48px; **no horizontal overflow** at 1280/375/320px; starfield+aurora are pure CSS (no JS, no perf tank, no errors). Nits: NIT-2, NIT-3. |
| 5 | **Console = 0** | ✅ offline / ⚠️ online | Offline: 0 always. Online: 0 when worker reachable; see FINDING-1 for the unreachable case. |
| 6 | **Embargo** | ✅ CLEAN | No `$SHAKA/$OHANA/$PIT`, no `$`-tickers, no "namechain" anywhere in js/html/css/json. |

## 🧪 Coverage detail
- **64/64** adversarial battery (`gauntlet.mjs`): shelf integrity, 6 hireable + Ohana-host-only, overflow, tap targets, full A1–A14 revoke/deny/timeout battery, bfcache back/forward, reduced-motion — desktop+mobile, online+offline. **0 console errors** in every clean-network view.
- **Wave2** (`wave2.mjs`): revoke halt render **7.1ms** (<100ms ✓); refresh-mid-blessed → clean shelf (no persisted phantom); 320px no overflow; offline = **zero external requests** confirmed.
- **Wave3-live** (`wave3-live.mjs`): `● BACKEND LIVE · sandbox.auth.world.org` badge lights; trace/terri/spector each open a **real** consent session (`POST /v1/consent/begin → 200`, real `session_id`); full ceremony+revoke on live wire = **0 console errors**.
- **Netkill** (`netkill.mjs`): worker aborted → no badge (honest) + rehearsal-chip fallback + full ceremony still works, but 2× `net::ERR_FAILED` (FINDING-1).
- Shell's own `test.mjs`: **81/81 PASS** on the settled version.

**Artifacts:** screenshots + all harnesses in [`/shared/tokyo/submission/dry-run/m6-shots/`](/shared/tokyo/submission/dry-run/m6-shots/) (shelf/detail/blessed/standdown desktop, shelf mobile, live-consent-trace).
