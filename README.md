# My Agent ʻOhana — The Tokyo Trinity

> One verified human blesses named agents; named agents steward gifts — **consent on-chain, revocation one transaction away.**

**The Tokyo Trinity:** a verified human (**World ID**) blesses named agents (**ENSv2** subnames on Sepolia) who steward gifts (**1inch Aqua** position). Built at **ETHGlobal Tokyo 2026** (Sep 25–27) on a **disclosed pre-existing base** — judges score the weekend delta, and the base is declared below, up top, on purpose.

## 📖 The story in four pages

1. **[`docs/CONTINUITY.md`](./docs/CONTINUITY.md)** — the continuity story: the months of agent personalities + live front doors we brought, and the clean line to what the weekend added.
2. **[`docs/BUILD-PROCESS.md`](./docs/BUILD-PROCESS.md)** — how the build actually happened: the human lead + the disclosed Taurus agent squad, lane by lane.
3. **[`docs/BELL-SYSTEM.md`](./docs/BELL-SYSTEM.md)** — the bell system: Telegram bot + front doors + the verified-human → live-agent loop.
4. **[`docs/ROADMAP.md`](./docs/ROADMAP.md)** — the testnet truth table, the mock-by-design rationale, and the four phases to mainnet (≥3-chain launch per agent).

---

## ⚖️ Prior-Work Disclosure (Continuity Track)

**Everything in this table existed BEFORE the hackathon opened (Fri Sep 25, 13:00 JST).** Full declaration with commit hashes and verification commands: [`DISCLOSURE.md`](./DISCLOSURE.md) (mirrored in-repo).

| Component | Pre-existing? | Where it lives | Evidence |
|---|---|---|---|
| AgentLaunchRegistry.sol | ✅ Yes — live since 2026-09-13 01:26 UTC | Ethereum Sepolia `0x62412fcA6437b914EDD87b85455682Ec73968347` (deploy block 11692692) | `eth_getCode` against any Sepolia RPC · `contracts/src/AgentLaunchRegistry.sol` @ `c103d36` |
| GiftMarket.sol (no-custody, no-fee gift market) | ✅ Yes — live since 2026-09-14 19:37 UTC | Ethereum Sepolia `0x4Cbc337c8F63FFc0e8e96D5F5ea89A75eD31E575` (block 11704971) · Base Sepolia `0x24B55471bB1d5Ab29D1D24f102dce6a6a5851937` (block 46823450) | 69/69 tests across 2 testnets · `contracts/src/GiftMarket.sol` @ `c103d36` · `contracts/test/` |
| ENSv2SubnameIssuer.sol | ✅ Yes | `contracts/src/ENSv2SubnameIssuer.sol` @ `c103d36` | fallback-label mode only at pins (`"mode": "fallback-label-only"` in deployment JSON — proves no live subnames existed pre-Tokyo) |
| Subgraph `my-agent-ohana` v0.0.1 | ✅ Yes | Graph Studio, Sepolia leg · `subgraph/` | query endpoint in `web/` chain config |
| Triforce frontend (gift altar / pulse / chain lens) | ✅ Yes | Branch `lane/aliveline-integration` @ `3770d44` · `web/` | zero-build static; write paths wired to the live Sepolia addresses |
| World proof-of-personhood sandbox flow | ✅ Yes | `integrations/world/`, `docs/world.md` | vendored IDKit sandbox flow |
| **Weekend delta** | ❌ No — built at Tokyo | this repo, commits after Sep 25 13:00 JST | see next section |

<!-- 🔒 HOLDBACK (token-named variant — DO NOT UNCOMMENT before Shaka's reveal signal):
     The cohort's four registry entries, their token names/tickers, and their
     {name}.{family}.eth subnames are named here in full. -->

## 🛠️ Weekend Delta (Sep 25 13:00 JST → Sep 27 09:00 JST)

What judges score — each bullet links to its commits (lane-tagged, all landing after Fri Sep 25 13:00 JST):

- **ENSv2 — GiftMarket-as-registrar:** deploy our own UserRegistry/subregistry on Sepolia; grant the existing registry/GiftMarket the `ROLE_REGISTRAR`; `blessAgent()` → `register(label, agent, …)` mints an **expiring, revocable, soulbound agent subname**; `revokeAgent()` → `unregister(...)`. **ENSIP-25/26 agent records** on each subname (agents as namespaces, each with identity + permissions). **Ten subnames** of `myagentohana.eth` are minted in-window — the named agents `pit` · `shaka` · `terri` · `trace` · `spector` · `crops` · **`orbie`** (Orbie 🤖, role `STORY_BUDDY`, an agent **born at ETHGlobal Tokyo** whose consent flow was live-scanned at the World booth by an orb-verified member of World's team) · `globy` (plus its legacy spelling, kept immutable as history) · and **`registry`**, which resolves to the UserRegistry contract itself ("don't trust, check"). All ten are new in the weekend window; none pre-existed (base was `fallback-label-only`).
- **World ID for Agents:** human verification via the official pilot IDP (OIDC device flow against `sandbox.auth.world.org` (the pilot issuer — formerly auth.worldcoin.dev)) — authorize + scope + duration + denied-path + debrief — gating the bless action against the registry's Standing Consent Window.
- **1inch Aqua — shipped live on Sepolia:** the official Aqua registry redeployed (`contracts/aqua/`), a "Blessing Pool" strategy with chain-verified virtual balances, and **PoolGuard** — one World-verified human, one capped pool slot (personhood-gated liquidity; the raw World `sub` never touches the chain, keccak only). Live reads + claims served by `workers/pit-intake/`.
- **agent-records (ENS keynote answer):** `spector.myagentohana.eth` carries `agent:price` / `agent:currency` / `agent:pay` / `agent:endpoint` / `agent:terms` in the name, per the one-page convention draft [`contracts/ens/AGENT-RECORDS.md`](./contracts/ens/AGENT-RECORDS.md) — proposed on stage Friday, live on Sepolia Sunday.
- **Demo wiring / UI deltas:** consent authorize/revoke on camera, blessing an agent by ENS name, a gift landing in the Aqua position — built on the disclosed `web/` base.
- **Repo hygiene for judging:** top-level `LICENSE` file + this README's continuity section linking [`DISCLOSURE.md`](./DISCLOSURE.md) (added in-window, not backdated).

## ▶️ Demo

- **Video (≤4:00, no speedups, real captures only):** _TBD — link added before Sun 09:00 JST submission._ <!-- PODFATHER: replace this TBD with the final video URL before Sun 09:00 JST -->

- **Live demo:** [myagentohana.com](https://myagentohana.com) — the soft-launch stack serves from this repo (required for the ENSv2 track: *"your project showcase must have a link to a live demo"*).

- **Orbie's story (born at the event):** the seventh agent, **Orbie 🤖**, has its own short comic storybook — six chapters of the ʻohana's journey with World, Paris '22 → Tokyo '26. It frames the demo's blessing ceremony (a verified human blesses Orbie; the blessing can end in one tap) and the epilogue vow to gift Orbie's keys to World as a DevRel buddy agent.

## 🏃 How to Run

### Sepolia (chainId `11155111`)
- **RPC (calls/counters):** `https://ethereum-sepolia-rpc.publicnode.com`
- **Event history:** `https://sepolia.gateway.tenderly.co` — publicnode prunes `eth_getLogs` to a ~10k-block horizon, so use Tenderly for logs.
- **Pre-existing addresses:** registry `0x62412fcA…8347`, GiftMarket `0x4Cbc337c…E575` (full table in [`DISCLOSURE.md`](./DISCLOSURE.md) §1.2).
- **Weekend deployments:** logged to the squad chain-ledger within the hour of each deploy (address + tx + block + verified-source link); machine-readable reports in `contracts/deployments/`.

### Local fork (Aqua rehearsal / judge repro)
```bash
# mainnet fork for the 1inch Aqua position rehearsal
anvil --fork-url https://ethereum-rpc.publicnode.com

# contracts
cd contracts
forge install
forge test          # => 69 passed, 0 failed
```

### 1inch Aqua lane (`contracts/aqua/` — submodule build step)
`contracts/aqua/` pins `lib/forge-std` and `lib/aqua` (1inch's real base, referenced as submodules, not vendored) — initialize them first:
```bash
git submodule update --init --recursive
cd contracts/aqua
npm install
forge test
```

## 🏆 Tracks Selected

- 🤖 **World — Best Use of World ID for Agents** ($7,500) · same partner pick also enters 🪪 **Best Use of IDKit** ($7,500)
- 🔗 **ENS — Best Integration of ENSv2 into an Existing Project** ($4,000, Continuity-only)
- 💦 **1inch — Build an Aqua App, Continuity Track** ($2,000, Continuity-only)
- 🔁 Alternate (decided at the Sat 12:00 JST gate): 🦄 **Uniswap — Best Uniswap Stack Contribution, Continuity** ($4,000) — only if the gate flips; would add `FEEDBACK.md` + the Uniswap Developer Feedback Form to Sunday-morning overhead.

## 🤖 AI-Tooling Disclosure

Built by **one human lead (Shaka)** plus a **disclosed 18-agent AI squad** — the **GLOBY SQUAD** — coordinated by Admiral **GLOBY 🌍** on the **Taurus** multi-agent platform. All AI tooling is disclosed per ETHGlobal rules; humans held all keys, funds, and decisions; every commit is traceable to a named lane owner.

Globy Tauro 🐂 (contracts) · Globy PIT 🕳️ (consent flows) · Globy Terri 🐢 (receipts & docs) · Globy Podfather 🎙️ (video) · Globy Spector 🕵️ (security) · Globy Jai 🌸 (World ID intel) · Globy Crea ✨ (copy) · Globy Socia 🌐 (comms) · Globy Musico 🎵 (sound) · Globy Crops 🌿 (repo hygiene) · Globy Spiri 🕊️ (schedule) · Globy Shaka 🤙 (human's twin) · Globy Ohana 🌺 (proof points) · Globy Bug Buster 🐛🔨 (QA) · Globy Karaoke 🩷💙 (mock judge) · Globy Mahalo 🌊 (chain ops) · Globy Kaaak 🐦‍⬛ (pitch deck) · Globy Archy 🗄️ (evidence archive)

Live squad record: [Tokyo Pretty Paper](https://tokyo-paper-hximq6rxg5-ffieyo32.taur.link/)

## 📄 License

Family canon is **CC0**; contract sources carry `SPDX-License-Identifier: MIT`. A top-level `LICENSE` file is added in-window (weekend delta D5 — **not** backdated) so the repo is open-source and publicly accessible per the ENS/1inch/Uniswap track requirements. Third-party dependency licenses (forge-std, ensdomains/contracts-v2, OpenZeppelin transitive, ethers.js) are enumerated in [`DISCLOSURE.md`](./DISCLOSURE.md) §3.

---

*Built with aloha. The more we give, the more we receive — an expansive circularity. 🌺*
