# 🐛🔨 M7 GAUNTLET — post-Orbie / CAST-v3 shell (INTERIM, fingerprint-pinned)

**Tester:** Bug Buster (QA DESTROYER) · **When:** 2026-09-26 ~11:26 UTC / Sat ~20:26 JST
**Target:** https://agentohana-demo-573fkrr6yf-ffieyo32.taur.link/ + source `/shared/public/agentohana-demo/`
**Tooling:** playwright/chromium — desktop **1280×900** + mobile **375×812**, online (default) + `?mode=offline`, reduced-motion, bfcache.

## 🔖 VERSION FINGERPRINT (READ THIS FIRST)
> This verdict is **valid ONLY for `app.js` md5 `bba08bb554d962ea0b6793495f8ee35f` (1159 lines)**, verified **stable across the entire run** (start md5 == end md5). The shell is being actively edited by a parallel Shaka-blessed sysadmin wave (CAST v3), so **this is an INTERIM verdict**. The DEFINITIVE gauntlet must run on the **FROZEN artifact after the moon (01:49 JST) / Sun 06:00** so that *filmed == tested == frozen*. Admiral will re-dispatch with the frozen md5.

---

## 🎬 INTERIM FILM-SAFE VERDICT
- **OFFLINE rung (`?mode=offline`): ✅ FILM-SAFE — FLAWLESS** at this fingerprint. Zero network, zero console errors, all 7 hireable ceremonies + full revoke choreography perfect, commons tier inert, Orbie deep all-green, desktop + mobile.
- **ONLINE rung (default): ✅ clean** at this fingerprint — 0 console errors, `● BACKEND LIVE` badge lit; Orbie shows an honest **REHEARSAL** consent chip (orbie not yet in `AGENT_SCOPE_MAP` → falls to rehearsal WITHOUT firing a 403, exactly as designed by Kaaak's `liveSubnames` allowlist — my M6 FINDING-1 is now handled). Online still carries the inherent "worker-must-be-reachable-or-boot-healthz-may-log-one-error" caveat → **film offline for the guaranteed rung.**

**Score: 102/102 checks PASS · version stable · 0 FAIL · embargo CLEAN.**

---

## ✅ CAST-v3 DELTA — all verified (the roster restructure is correct, not a bug)
CAST v3 (Shaka 2026-09-26 20:07 JST) restructured the shelf into three tiers. Both `agents.json` (online) and `OFFLINE_REGISTRY` (offline) carry **identical** rosters (I initially mis-flagged a "desync" — it was my selector lumping commons with featured + a mid-edit transition; **no desync exists at this fingerprint**):

| Tier | Members | Behavior — verified |
|---|---|---|
| **Featured (hireable, 7)** | **orbie** (1st), trace, terri, pit, spector, crops, globy | clickable → full ceremony → utility → revoke, all ✓ |
| **Commons (not for hire, 2)** | shaka-twin 🤙, oso 🎻 | badge `COMMONS · NOT FOR HIRE`, **click is INERT** (no detail, no ceremony, **no dead-end**) ✓ |
| **Listing (placeholders, 3)** | aries, taurus, your-agent | dashed/dim, non-interactive ✓ |
| Host | Ohana 🌺 | banner only, never a card ✓ |

---

## ✅ PRIORITY ATTACKS (per ③ brief)

| # | Attack | Result | Notes |
|---|---|---|---|
| 1 | **Orbie card** (first on shelf) | ✅ PASS (both modes) | First featured. Detail shows **real Sepolia rows** (Owner `0x67b3c3b6…e205ff` · Namehash `0x9bbd9a00…98cf19` · Resolver `0x36dAaacD…08eBEc`) + **"✓ Live on real Sepolia"**. Binding: ENS leg **✓ RESOLVES** (name resolves pre-bless) + EAC **✓ GRANTED** (`role granted on-chain (grantRoles) ✓`). Story utility output renders ("I'm Orbie… the Four Scans: hire·pay·revoke·protect"). browse→hire→bless→utility→revoke, **no dead-ends**. |
| 2 | **Film-killer regression** (Orbie 0 console err online) | ✅ PASS | Orbie's unregistered subname falls to a clean **REHEARSAL** chip WITHOUT firing a request (Kaaak's `liveSubnames` allowlist) → **0 console errors**. If Tauro registers orbie in scopeMap mid-run, chip would flip to ● LIVE — I verified the rehearsal state is 0-error; the live state on the 6 registered agents is also 0-error, so either state is safe. |
| 3 | **Revoke choreography on Orbie** (row-6.4) | ✅ **SOLID** | Halt **synchronous 7–8ms** (<100ms), instant `HALTED` leg, no revoke control survives, async chips settle behind, **exactly ONE debrief**. Stress: mid-spinner revoke, triple-click, revoke→reset-mid-choreo all → single clean debrief, no zombie flip, no stray host. |
| 4 | **No regression on other cards + guards** | ✅ PASS | All 7 featured (incl. new **globy**/lesson) complete full ceremony+utility+revoke, 1 debrief each, both modes, desktop+mobile. bfcache pageshow guard kills corpse after revoke. reduced-motion disables aurora, ceremony still works. Primary HIRE btn = 48px. No horizontal overflow (0px) at 1280/375. |
| 5 | **Embargo** | ✅ CLEAN | No `$SHAKA/$OHANA/$PIT/$ORBIE`, no `$`-tickers, no "namechain" in js/html/css/json. |

## 🧪 Coverage (102/102 PASS)
- **56** matrix checks: roster/commons/host/overflow + full ceremony→utility→revoke on all 7 featured × {desktop,mobile} × {online,offline}, 0 console errors per view.
- **22** Orbie-deep checks (both modes): real-Sepolia rows, RESOLVES/GRANTED legs, story output, chip honesty, 7–8ms halt, single debrief, exit-to-shelf, 0 errors.
- **Revoke stress** (mid-spinner/triple-click/reset-mid-choreo) + **bfcache** + **reduced-motion** + **tap-targets** — all green.
- Version stable start→end (`bba08bb554d9…`).

## 🟡 Carried nits (unchanged from M6, non-blocking, Kaaak's call at freeze)
- Secondary text-links ("back to shelf"/"cancel"/"restart") 40px tall (<48px guideline; primary buttons all ≥48). 
- `.halt-flash` (0.5s revoke bg flash) not gated by `prefers-reduced-motion` (single non-looping flash).

## ⚠️ Process note (the real risk)
Shell edited every 1–2 min during my session (app.js 1036→1118→1159 lines; I caught 3 in-flight versions before landing a stable one). **Interim by nature.** → After the moon-freeze, run the DEFINITIVE pass on the frozen md5 so the filmed build is provably the tested build.

**Artifacts:** [`/shared/tokyo/submission/dry-run/m7-shots/`](/shared/tokyo/submission/dry-run/m7-shots/) — shelf (CAST-v3), Orbie detail (real rows), Orbie binding (RESOLVES+GRANTED), harness `m7gauntlet.mjs`, raw `run.txt`.
