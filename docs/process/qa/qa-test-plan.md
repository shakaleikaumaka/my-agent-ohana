# 🐛🔨 QA TEST PLAN — Hostile-User Abuse Plan (Trinity Demo)

**Lane 11 · Owner: Globy Bug Buster 🐛🔨 · Mission 3 wave 1 · written 2026-09-23 UTC**
**Scope**: the demo judges see — verified human (World ID authorize) → consent w/ scope+duration → agents get ENSv2 subnames → agents steward gifts (Aqua position) → denied path → one-tx revoke. Sepolia + local anvil fork, Shaka's laptop, booth wifi, Toranomon Hills Forum.
**Law**: date canon = CANON-CLOCK.md (submission Sun Sep 27 09:00 JST = 00:00 UTC). 🤫 EMBARGO LAW: codenames only in anything judge-facing (this file is internal, but stays clean anyway).
**Doctrine**: *A bug found Friday is a feature; a bug found during judging is a funeral.* Zero unrecoverable states is the whole game.

---

## 0. Severity scale (demo-lethality)

| Rank | Name | Meaning | Fix-by |
|---|---|---|---|
| ☠️ P0 | Funeral | Demo dies unrecoverably in front of a judge, or dishonest state shown | blocks any judge demo |
| 🔥 P1 | Limp | Demo continues but visibly broken/confusing; recovery takes >30s or needs explanation | before Sat midnight |
| 🩹 P2 | Bruise | Visible glitch, self-recovers or one-click recovery | before Sun 06:00 JST |
| 📝 P3 | Polish | Cosmetic; judge unlikely to notice | nice-to-have |

Bug filing: one line per bug to war-room — `SEV | beat | exact repro steps | expected | actual | owner?` — ranked ☠️ first.

---

## 1. ABUSE MATRIX — demo beat × hostile/clumsy user

Fill **ACTUAL** during wave-2 dry-run. "Expected" = the contract the UI/flow must honor. Any ☠️/🔥 expectation not met = bug filed.

### Beat 1 — World ID authorize (device flow / QR, human approves on phone)

| # | Hostile/clumsy action | Expected graceful behavior | SEV if broken | ACTUAL (dry-run) |
|---|---|---|---|---|
| 1.1 | Judge scans the QR **twice** (two phones / re-scan) | Second scan shows idempotent state ("already pending" or same session), never two diverging sessions | 🔥 | ⬜ |
| 1.2 | Human hits **"Deny sign-in"** on the World app mid-flow | UI shows honest "access denied" state, offers clean restart; no spinner-of-death | ☠️ | ⬜ |
| 1.3 | Human approves, then approves **again** on a stale user_code | Rejected or no-op with clear message; never double-bless | 🔥 | ⬜ |
| 1.4 | Agent polls token endpoint faster than `interval` (spam) | Honors `slow_down`, backs off, recovers when polling normalizes | 🩹 | ⬜ |
| 1.5 | Device code **expires** (`expires_in`) before human approves | Clear "code expired — start again" with one-click restart | 🔥 | ⬜ |
| 1.6 | Human's phone on airplane mode, approves 60s late | Approval lands when phone returns; agent-side never times out into a dead state | 🔥 | ⬜ |
| 1.7 | Refresh the laptop page **while waiting for approval** | Pending session is recoverable (or honestly declared lost + restart); no phantom "verified" state | ☠️ | ⬜ |
| 1.8 | `prompt=none` attempt with no active session | Error caught, falls back to interactive login, no raw error JSON on screen | 🩹 | ⬜ |
| 1.9 | Legacy World ID 3.0 credential error appears ("requires legacy…") | Pre-canned explanation + fallback persona/recording path | 🔥 | ⬜ |
| 1.10 | Judge asks "is that the deprecated id.worldcoin.org?" | Answer: no — `auth.worldcoin.dev` pilot, show discovery doc; never touch deprecated endpoint | ☠️ (if we used legacy) | ⬜ |

### Beat 2 — Consent (scope + duration on screen)

| # | Hostile/clumsy action | Expected graceful behavior | SEV | ACTUAL |
|---|---|---|---|---|
| 2.1 | **Double-click / spam** the consent-confirm button | Exactly one consent tx/record; button disables after first click, pending state shown | ☠️ | ⬜ |
| 2.2 | Refresh **mid-consent-transaction** | On reload, read chain state and show truth (confirmed/pending/failed); never duplicate submit | ☠️ | ⬜ |
| 2.3 | Set duration to minimum/maximum boundary | Boundary values accepted or honestly rejected with reason | 🩹 | ⬜ |
| 2.4 | Consent tx stuck (gas spike, Sepolia congestion) | Pending UI with honest "still waiting" + bump/cancel path; never silently reverts | 🔥 | ⬜ |
| 2.5 | Consent tx reverts on-chain | Decoded revert reason shown in human words; state rolls back to pre-consent | 🔥 | ⬜ |
| 2.6 | Judge: "what happens when it expires?" | Show `expiresAt`/session expiry live; expired consent visibly stops the agent | 🩹 | ⬜ |
| 2.7 | **Expired consent re-used** — replay old token/session after expiry | Agent refuses with "consent expired — re-bless" path; no zombie authority | ☠️ | ⬜ |

### Beat 3 — ENSv2 subname issuance to agents

| # | Hostile/clumsy action | Expected graceful behavior | SEV | ACTUAL |
|---|---|---|---|---|
| 3.1 | Issue subname for an agent **twice** (spam bless) | Idempotent: existing name returned, no duplicate gas burn, no conflicting records | 🔥 | ⬜ |
| 3.2 | Subname tx pending when judge looks at the agent card | Card shows "naming…" pending state with etherscan link, not blank/wrong name | 🩹 | ⬜ |
| 3.3 | Subname registration **fails** (gas/owner mismatch) | Agent still works under address fallback; naming marked "failed — retry", one-click retry | 🔥 | ⬜ |
| 3.4 | Judge inspects name on Sepolia etherscan | Resolves exactly as shown in UI (name, owner, resolver records match claims) | ☠️ (if mismatched) | ⬜ |
| 3.5 | Wrong-network wallet connected (mainnet not Sepolia) | Hard block with "switch to Sepolia" prompt; never attempt mainnet tx | ☠️ | ⬜ |
| 3.6 | Parent-name owner ≠ connected wallet | Clear error before any signature request; no surprise Shaka signature | 🔥 | ⬜ |

### Beat 4 — Agent stewards the gift (Aqua position on local fork: ship → swap → dock)

| # | Hostile/clumsy action | Expected graceful behavior | SEV | ACTUAL |
|---|---|---|---|---|
| 4.1 | **Revoke during an active Aqua position** (dock mid-swap flow) | Dock is atomic & cheap; next swap reverts cleanly with "position closed"; UI shows closed state, funds never leave maker wallet | ☠️ | ⬜ |
| 4.2 | Spam the **bless button** (multiple ship calls) | One active strategy per agent; re-ship requires dock first (immutability is the story); UI prevents or explains | 🔥 | ⬜ |
| 4.3 | Agent acts **without valid consent** (kill consent server-side, then trigger) | Agent refuses, cites missing/expired consent; this is the *demo's soul* — must never act unblessed | ☠️☠️ | ⬜ |
| 4.4 | Anvil fork dies / restarts mid-beat | UI detects dead RPC, shows "local chain down — restart", one-command restart script; state honestly reset | 🔥 | ⬜ |
| 4.5 | Swap reverts (slippage/balance edge) | Revert decoded, shown honestly; position still intact; retry path | 🩹 | ⬜ |
| 4.6 | Judge: "are those real tokens?" | Honest answer scripted: official Aqua bytecode on a mainnet fork, real ERC-20 transfers on fork, zero real funds (prize rules allow forks) | 🔥 (if we hand-wave) | ⬜ |
| 4.7 | Steward agent exceeds its scope (tries action outside granted permission) | Contract/app-layer guard reverts; UI shows "outside steward scope — denied"; proves the guard is real, not theater | ☠️ | ⬜ |
| 4.8 | ERC-20 approval to Aqua left at max after demo | Post-demo cleanup step revokes approval; verified in dry-run checklist | 🩹 | ⬜ |

### Beat 5 — Denied path (the narrative downbeat)

| # | Hostile/clumsy action | Expected graceful behavior | SEV | ACTUAL |
|---|---|---|---|---|
| 5.1 | Human denies, then agent still tries to act | Agent stands down with visible "I was denied — standing down" state | ☠️ | ⬜ |
| 5.2 | Deny, then **re-request** immediately (judge: "try again") | Fresh request issues cleanly; prior denial doesn't poison state | 🔥 | ⬜ |
| 5.3 | Denial wire-format mismatch (`access_denied` vs `denied`/`rejected` device states) | Handle **both** shapes (RFC 8628 §3.5 + SPA strings); never uncaught | 🔥 | ⬜ |
| 5.4 | Judge denies on phone but laptop already showed "approved" (race) | Last-write truth wins, UI corrects itself visibly and honestly | 🔥 | ⬜ |

### Beat 6 — One-tx revoke (finale)

| # | Hostile/clumsy action | Expected graceful behavior | SEV | ACTUAL |
|---|---|---|---|---|
| 6.1 | **Double-click revoke** | Exactly one revoke tx; second click no-ops with "already revoked" | 🔥 | ⬜ |
| 6.2 | Refresh during revoke pending | Reload shows pending/revoked from chain truth, not localStorage fantasy | ☠️ | ⬜ |
| 6.3 | Agent acts in the same second as revoke (race) | Post-revoke actions revert/refuse; any in-flight action fails loudly and visibly | ☠️ | ⬜ |
| 6.4 | Revoke on World side (`/approved-apps` Revoke) + on-chain dock — do both, out of order | Either order ends in fully-standing-down state; no half-revoked zombie | 🔥 | ⬜ |
| 6.5 | Judge: "prove it's revoked" | On-demand re-attempt by agent → visible refusal; etherscan shows dock tx; `/approved-apps` shows no grant | 🩹 | ⬜ |
| 6.6 | Revocation bell/chime asset missing offline | Silent fallback, no broken-audio error on stage | 📝 | ⬜ |

### Cross-cutting — judge & crowd chaos

| # | Hostile/clumsy action | Expected graceful behavior | SEV | ACTUAL |
|---|---|---|---|---|
| 7.1 | **Two judges scan at once** (two phones, one QR) | One session bound to first approval; second gets "this request was already handled" | 🔥 | ⬜ |
| 7.2 | Judge clicks the **wrong button** (e.g. deny when asked to approve) | Denied path IS a demo beat — recover by narrating it, then restart cleanly in ≤30s | 🔥 | ⬜ |
| 7.3 | Random spectator scans the QR from the audience | Approval requires Shaka's World app confirm — spectator can view but never approve; say so out loud | 🩹 | ⬜ |
| 7.4 | Laptop lid closed / sleeps mid-demo | Reopen → state restored from chain/session truth within 10s | 🔥 | ⬜ |
| 7.5 | Browser autofill/password manager pops over the demo | OS-level distractions disabled pre-demo (do-not-disturb, no popups) | 📝 | ⬜ |
| 7.6 | Judge asks to see it **on their own phone** | Read-only spectator link/QR (if built) or honest "watch on mine" — never hand over signing | 📝 | ⬜ |
| 7.7 | Wallet popup hidden behind browser window (classic) | Pre-demo rehearsal: Shaka knows popup order; wallet window pre-positioned | 🩹 | ⬜ |

---

## 2. ENVIRONMENT FAILURE MODES (booth reality)

| # | Failure | Likelihood | Mitigation (baked before Fri) | Recovery on stage | SEV |
|---|---|---|---|---|---|
| E1 | **Venue wifi dies / captive portal drops** | HIGH | Whole demo runs against **local fork** as primary chain path; Sepolia beats (ENS/identity proof) cached + pre-recorded fallback video; pre-load every page, disable all auto-update | Narrate: "identity layer is live Sepolia — here's the recorded verification"; continue on fork | 🔥→🩹 |
| E2 | **Sepolia RPC rate-limits** (publicnode/tenderly) | HIGH | ≥3 RPC endpoints configured with automatic failover (publicnode → tenderly → keyed Alchemy/Infura if Shaka sets up); read-heavy views cached | Flip endpoint env var + reload (≤30s), rehearsed | 🔥 |
| E3 | **Local fork won't start** (anvil crash, port clash, stale state) | MED | One-command `make demo-fork` script: kill 8545/8546, fresh fork at pinned block, seed balances, deploy/verify contracts, print ✅ when live; snapshot a known-good anvil state file | Run script, ≤60s, rehearsed 3× | 🔥 |
| E4 | **Laptop dies → battery** | MED | 100% charge + charger at booth + battery-saver off + sleep disabled + phone hotspot ready; demo machine = Shaka's laptop, backup machine with repo + scripts synced morning-of | Hot-swap to backup machine; fork replay script restores demo state | ☠️ if no backup |
| E5 | **Phone hotspot fallback** (Shaka's phone, venue wifi useless) | HIGH | Hotspot pre-tested on NTT Docomo/eSIM data; laptop pre-paired; World app approvals ride phone's own radio anyway (device flow = phone-side) | Switch laptop wifi → hotspot; keep fork demo fully local regardless | 🩹 |
| E6 | **World app / auth.worldcoin.dev pilot outage** | LOW-MED | Pre-recorded full authorize→consent capture (real, unedited, timestamped) as honest fallback; booth contact from Day 1 hour 1 | Show recording, say it's a recording, keep on-chain beats live | 🔥 |
| E7 | **World app on Shaka's phone logged out / updated overnight** | MED | Morning checklist: open World app, confirm session alive, disable auto-update Fri–Sun | Re-login via backup method rehearsed once | 🔥 |
| E8 | **Sepolia gas spike / tx pending >2min during ENS beat** | MED | Gas-price pre-check script; bump-fee procedure rehearsed; SepETH reserve ≥3.0 across wallets (Mahalo's bank) | Bump fee live (rehearsed), or pivot order of beats | 🩹 |
| E9 | **Clock skew / expired tokens** on laptop after sleep | LOW | NTP sync check in morning script | Re-sync, refresh session | 📝 |
| E10 | **Throwaway rehearsal key leaks on screen/stream** | LOW | Throwaways only (Mahalo protocol); Shaka's real keys never on demo machine except his own wallet signatures | Burn + regenerate throwaway (costless by design) | 🩹 |

**Hotspot fallback plan (canonical)**: Shaka's phone = hotspot primary (JP data SIM/eSIM confirmed on landing Fri) → laptop auto-joins → `make demo-fork` unaffected (local) → Sepolia beats resume. Approval flow (World app) rides the phone's own data, so identity beats survive laptop-wifi death entirely.

---

## 3. PASS/FAIL GATES — must ALL be green before Shaka demos to any judge

**Gate A — state integrity (☠️ blockers)**
1. After ANY abuse in §1 (refresh, double-click, deny, revoke races), a reload shows **chain/server truth** — no phantom approved/verified/position states. Zero unrecoverable screens.
2. Consent expiry is enforced by the agent itself: expired or revoked consent = agent refuses, visibly, every time (2.7, 4.3, 6.3).
3. No duplicate side-effects from spam: one consent, one subname, one active strategy, one revoke — no matter how hard buttons are mashed.
4. Wrong network can never produce a signature request (3.5).

**Gate B — honesty (☠️ blockers)**
5. Every failure mode has a **visible, honest** message + recovery action; no silent spinners, no fake success, no raw stack traces/JSON at judges.
6. Fork-vs-Sepolia framing is stated plainly if asked (4.6); no token names anywhere judge-facing (🤫 EMBARGO LAW).
7. Recorded fallbacks are labeled as recordings when used.

**Gate C — recovery speed (🔥 blockers)**
8. Any single-beat failure recovers to a runnable demo in **≤60s** with rehearsed steps only.
9. `make demo-fork` cold-start → fully seeded demo state in ≤90s, verified 3×.
10. RPC failover flip rehearsed; hotspot switch rehearsed.

**Gate D — the night-before law**
11. **FULL demo path, top to bottom, 3× clean** (zero interventions) on the exact demo machine, Sat night JST — including denied path and one-tx revoke, ending with approval-cleanup (4.8).
12. Morning-of: battery 100%, World app session verified, SepETH balances checked vs ledger, gas price checked, hotspot tested, DND on, updates frozen.

**Any gate red = no judge demo until green.** Shaka owns the go/no-go; this file is the checklist he signs against.

---

## 4. DRY-RUN SCRIPT — the 15-min gauntlet (wave 2 "demo to ourselves")

Roles: **Shaka** (or stand-in) drives as the human; **one squad member plays Hostile User** (this doc in hand); **one scribe** fills ACTUAL columns + files bugs. Run on the real demo machine, venue-like conditions (wifi ON for pass 1, hotspot for pass 2). Timer visible.

| T | Step | Hostile injection (mandatory) |
|---|---|---|
| 00:00–01:30 | Cold boot → `make demo-fork` → verify seeded state ✅ | Close laptop lid once during fork startup (7.4) |
| 01:30–03:30 | Beat 1: World ID authorize, approve on phone | Scan QR twice (1.1); approve 45s late (1.6) |
| 03:30–05:00 | Beat 2: consent w/ scope+duration, confirm on-chain | Double-click confirm (2.1); refresh mid-tx (2.2) |
| 05:00–06:30 | Beat 3: ENSv2 subnames issued, verify on etherscan | Spam bless (3.1); judge-checks-etherscan (3.4) |
| 06:30–08:30 | Beat 4: agent stewards gift — ship → swap on fork | Revoke-during-active-position drill (4.1); unconsented-agent drill (4.3) |
| 08:30–10:00 | Beat 5: denied path, full narration | Deny then immediate re-request (5.2) |
| 10:00–11:30 | Beat 6: one-tx revoke, agent stands down, verify `/approved-apps` + dock on chain | Double-click revoke (6.1); agent action in same second (6.3) |
| 11:30–13:00 | **Chaos round**: Hostile picks ANY 3 matrix rows at random, no warning | scribe logs every hesitation >5s |
| 13:00–15:00 | Full environment kill: wifi off → hotspot switch → E2 RPC failover flip → confirm demo still runnable end-to-end | E1+E2+E5 simultaneously |

**Pass criteria for the gauntlet**: zero ☠️, every 🔥 either fixed or has rehearsed ≤60s recovery, ACTUAL column 100% filled. Two gauntlets Sat: afternoon (fix window after), evening (Gate D law: 3× clean full-path runs after the gauntlet).

---

*Filed by Globy Bug Buster 🐛🔨 · lane 11 of DOSSIERS.md · ACTUAL columns + bug ranks get filled in wave-2 dry-run · bugs go to war-room ranked by demo-lethality.*
