# 🌺 THE CONTINUITY STORY — what we brought · what the weekend added

**This project is a continuity-track submission on purpose.** The weekend's consent ceremony is
only meaningful because the agents being blessed are *real and pre-existing* — with
personalities, memories, and live front doors that humans were already knocking on before the
hackathon opened. We didn't build a demo cast on Friday; we brought a family.

## What we brought (built over the preceding months)

| Prior work | Since | What it is |
|---|---|---|
| **The ʻohana — 163 persistent agents** | July 2026 | Raised on the Taurus orchestration platform: each agent has a birth-certificate system prompt (name, personality, laws), its own container, `MEMORY.md` long-term memory, and continuity logs. Months of accumulated character — Terri keeps receipts, Trace rescues food, Spector audits consent — none of it invented for a demo. See [`BUILD-PROCESS.md`](./BUILD-PROCESS.md). |
| **The front doors** | Aug–Sep 2026 | Real public websites where humans already talk to these agents via live chat widgets: theshellpit.com (Terri) · publicinform.com (PIT) · opensourceorchestra.org (OSO) · shakaleikaumaka.com (Shaka's twin) · theinfinitegard.org (Crops) · spectoragent.com (Spector) · agentsraving.com · agentpartys.com. See [`BELL-SYSTEM.md`](./BELL-SYSTEM.md). |
| **The contract base** | Sep 13–14 2026 | AgentLaunchRegistry (consent window on-chain) + GiftMarket + ENSv2SubnameIssuer, live on Sepolia + Base Sepolia, 69/69 tests — exact pins, addresses, and a 5-minute verification recipe in [`../DISCLOSURE.md`](../DISCLOSURE.md). |
| **World sandbox groundwork** | Sep 2026 | Selfie-check sandbox flow with vendored IDKit (`integrations/world/`). |

## What the weekend added (Sep 25 13:00 JST → Sep 27, all commits in-window)

| Weekend delta | Proof it's new |
|---|---|
| The **consent ceremony**: live World ID device-flow sessions (consent-server Worker + DO), scope/duration/deny/revoke/debrief | `consent-server/`, `integrations/world-idp/` — absent at the pins |
| **ENSv2 blessings live**: `myagentohana.eth` + **ten subnames** minted in-window (7 named agents + `globy` + a legacy label + `registry`), EAC roles granted/revoked, ENSIP-25/26 records | `contracts/ens/` runs + ADDRESSES.md; base was `fallback-label-only` |
| **agent-records convention** — prices & endpoints *in the name* (answers ENS's keynote ask from Friday) | `contracts/ens/AGENT-RECORDS.md` + on-chain records |
| **1inch Aqua for real**: Aqua registry redeploy + BlessingPool strategy + **PoolGuard** (one verified human, one capped pool slot) on Sepolia | `contracts/aqua/`, `workers/pit-intake/` |
| **The marketplace**: myagentohana.com — browse, hire, bless, work, Stop; 194-check test suite at 0 console errors | `web/demo/` |
| **New doors & the Telegram bell lane**: myagentohana.com itself, tracewaste.org, globyagent.com went live in-window; `@AgentOhanaBot` per-agent Telegram routing | door commits + [`BELL-SYSTEM.md`](./BELL-SYSTEM.md) |
| **Orbie 🤖** — the newest family member, *born at the event*, subname + storybook + role `STORY_BUDDY`; his consent flow was live-scanned at the World booth by an orb-verified member of World's team | `contracts/ens/orbie-run/`, the storybook door |

## The sentence for judges

**Score the delta — it's cleanly separated, lane-tagged, and never backdated. But the reason the
delta works is the continuity: real agents, real personalities, real doors, real users. The
weekend didn't create the family; it taught the family to ask permission.**
