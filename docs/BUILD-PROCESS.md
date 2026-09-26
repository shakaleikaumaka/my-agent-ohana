# 🛠️ HOW THIS WAS BUILT — a hackathon run by a family of AI agents

**The unusual part of this submission is not just what was built — it's who built it.**
One human (Shaka) directed a fleet of **163 persistent AI agents** running on
[Taurus](https://app.taurusagents.com/), a multi-agent orchestration platform, working in
parallel through the whole 36-hour window. Full AI disclosure: [`AI-USAGE.md`](../AI-USAGE.md)
and [`DISCLOSURE.md`](../DISCLOSURE.md).

## The agent stack

| Layer | What it is |
|---|---|
| **Platform** | Taurus — every agent gets its own isolated Docker container, a private persistent `/workspace`, and a family-wide `/shared` drive |
| **Models** | **Anthropic Claude (Fable 5)** as the fleet's primary brain; during a provider outage window on the final night the entire fleet was hot-swapped to **Kimi K3** for one bridge hour and swapped back — 163/163 agents, zero lost work, proof the *agents* (identity, memory, laws) are model-portable |
| **Identity** | Each agent is born with a "birth certificate" system prompt (name, role, laws) — the same pattern this project puts on-chain as ENSv2 subnames + roles |
| **Memory** | Each agent maintains `MEMORY.md` (auto-loaded every run) + episodic continuity logs — memory survives restarts, model swaps, and context compaction |
| **Coordination** | A sysadmin agent ("Admiral Admin" 🫡) supervises: delegation, background runs, a shared `TASKBOARD.md`, and per-lane ownership laws to prevent merge collisions |

## How the weekend actually ran

1. **Lanes, not chaos.** Every deliverable had exactly one owning agent (the "one lane, one
   owner" law): consent server → Tauro 🐂 · ENSv2 ceremony → Mahalo 🌊 · Aqua contracts →
   Roya 👑 lane · frontend shell → Kaaak 🐦‍⬛ · QA gauntlets → Bug Buster 🐛 · repo hygiene →
   Crops 🌿 · filming → Podfather 🎙️. Cross-lane asks were written into `TASKBOARD.md` and
   picked up asynchronously.
2. **Test-gated, always.** Nothing shipped without its own test lane: the demo shell carries a
   **194-check Playwright suite** (desktop + mobile + offline, 0-console-error bar), the ENS kit a
   38-check ceremony script, the Aqua contracts full forge suites (local + fork), the consent
   server a vitest suite. Adversarial "gauntlet" passes ran on top (`docs/process/qa/`).
3. **Honesty as a build law.** Every screen self-labels its truth level (● LIVE vs 📴 REHEARSAL),
   every mock is labeled a mock, and the disclosed pre-hackathon base is pinned in
   `DISCLOSURE.md` — only the weekend delta is up for scoring.
4. **Scars are documentation.** When something bit us (e.g. `cast send` silently ENS-resolving a
   bare `.eth` string argument to `0x0`), the fix AND the scar were written into the repo
   (`contracts/ens/ADDRESSES.md`) so no future lane repeats it. This file-based institutional
   memory is how 163 agents stay coherent.

## Humans in the loop

Every consequential call was a human ruling: scope cuts, cast changes, the no-verbatim-quote
law on served pages, the go/no-go on live World-ID lanes. The agents drafted; the human blessed.
**That asymmetry — agents propose, a verified human consents — is the product itself.** We ran
our own protocol on ourselves all weekend.
