# 📜 Prior-Work Disclosure — Continuity Track (ETHGlobal Tokyo 2026)

**Purpose:** the honest backbone of our **ENSv2 "Best Integration into an Existing Project"** ($4k, Continuity) entry — and prior-work honesty for every track we enter. Judges score the **weekend delta** on a disclosed base. Every claim below is verifiable; anything not independently re-verified is marked ⚠️ CLAIM-LEVEL.

**Method:** facts re-checked against (a) the live GitHub remote, (b) a full local re-run of the test suite, and (c) on-chain `eth_getCode` against public Sepolia RPC. Cohort agents are referred to as **"the cohort"** only; their on-chain names are public blockchain data any judge can read from the registry, but this document does not print them.

---

## 1. Pre-existing base — exact, pinned, verified

### 1.1 The one canonical repo

| Fact | Value |
|---|---|
| Repo URL | **https://github.com/shakaleikaumaka/triproto-launchpad** (public) |
| `main` HEAD | `2a93412241e961dae7cbefb8350abd37889b60d9` (2026-09-13 14:24 UTC) |
| Contracts pin, branch `lane/act1-gift-market` | **`c103d36f0333fc5c92e4fde7350067aa333df50c`** (2026-09-14 19:49 UTC) |
| Frontend integration tip, branch `lane/aliveline-integration` | `3770d441e191a43954df35d8d9559660e5100ddb` (2026-09-14 20:21 UTC) |

Other pre-existing lane branches (all tips ≤ Sep 14, i.e. before the Tokyo window): `lane/contracts` 281942f (09-12) · `lane/world` e417505 (09-12) · `lane/graph` 929b2d7 (09-12) · `lane/ui` 0717c1e (09-12) · `lane/research` 83daac6 (09-12) · `lane/sdk` 75ccd09 (09-13) · `lane/hedera` 8ee8a66 (09-13) · `lane/design` f6dcd9d (09-13) · `lane/act2-triforce` f06e371 (09-14) · `gh-pages` c1cbe07 (09-13).

### 1.2 Live testnet deployments (the "existing project" the ENSv2 integration targets)

**Sepolia (chainId 11155111)** — deployer/pad `0x04f140e282CaDd99859b75EaAdEdCBA886322667`; machine-readable reports in-repo: `contracts/deployments/11155111.json` + `11155111.giftmarket.json`:

| Contract | Address | Block | Deployed (UTC) | Bytecode re-verified |
|---|---|---|---|---|
| **AgentLaunchRegistry** | `0x62412fcA6437b914EDD87b85455682Ec73968347` | 11692692 | 2026-09-13 01:26:12 | ✅ `eth_getCode` → 11,302 bytes runtime |
| **GiftMarket** | `0x4Cbc337c8F63FFc0e8e96D5F5ea89A75eD31E575` | 11704971 | 2026-09-14 19:37:48 | ✅ `eth_getCode` → 5,410 bytes runtime |

Dress-rehearsal proof txs (four market verbs live on Sepolia, from `contracts/DEPLOYMENTS.md`): gift → `0x2105d6c0…05d4e` · bless → `0x2db1c76f…23bd7` · list #1 + hire #1 with registry `Hired` echo. GiftMarket is allowlisted as `hireRecorder` on the registry.

**Base Sepolia (chainId 84532)** — second leg, funded by bridging 0.02 SepETH through the official OptimismPortal (deposit tx `0x398e2bcd…eeb11`):

| Contract | Address | Block | Deployed (UTC) |
|---|---|---|---|
| AgentLaunchRegistry | `0xAfd78515B0Ef275595547d9Cc0207aE326bd8a34` | 46823445 | 2026-09-14 19:46:18 |
| GiftMarket | `0x24B55471bB1d5Ab29D1D24f102dce6a6a5851937` | 46823450 | 2026-09-14 19:46:28 |

**Registry contents:** the founding **cohort (4 agents, tokenIds 1–4)** launched on Sepolia 2026-09-13 and mirrored 1:1 to Base Sepolia via `script/MirrorCohort.s.sol`. ⚠️ CLAIM-LEVEL: Graph Studio subgraph `my-agent-ohana` v0.0.1 "answering" (needs a Studio key to re-verify; source in-repo under `subgraph/`).

> **Address reconciliation:** `0x62412fcA…8347` = the **registry**; `0x4Cbc337c…E575` = the **GiftMarket** — same Sepolia family, different contracts, both live. This table is canonical.

### 1.3 What's in the base (all built before the Tokyo window)

| Component | Path (at `c103d36` / `3770d44`) | Notes |
|---|---|---|
| AgentLaunchRegistry.sol | `contracts/src/` | ERC-8004-aligned ERC-721 identity spine: launch · **Standing Consent Window** (`consent.window = active\|paused\|withdrawn`, `consent.contact`) · delist/relist · metadata · hire/bless · event spine (AgentLaunched/Blessed/Hired/ConsentChanged…) |
| Consent code | registry + issuer | consent window lives as registry fields, as events, AND as ENSv2 text records; one-word revoke = `consent.window → withdrawn` + market delist |
| ENSv2SubnameIssuer.sol | `contracts/src/` | dedicated ENSv2 leg: register subname + write consent text records (PermissionedRegistry/Resolver interfaces) |
| GiftMarket.sol | `contracts/src/` | no-custody, no-fee gift market — list · gift · bless · hire, for agents AND humans; consent law enforced on-chain (paused agents can't be hired) |
| MinimalERC721.sol | `contracts/src/` | hand-rolled ERC-721 core (no OZ dep — auditable in-window) |
| Deploy scripts | `contracts/script/` | `Deploy.s.sol` (dual-mode Sepolia/Base + JSON report) · `DeployGiftMarket.s.sol` · `MirrorCohort.s.sol` |
| Tests | `contracts/test/` | **69 test functions: 13 registry + 7 issuer + 49 market** (+ `mocks/MockENSv2.sol`) |
| World Selfie Check (sandbox) | `integrations/world/`, `docs/world.md` | full sandbox flow with vendored IDKit |
| Subgraph | `subgraph/` | schema/mappings/manifest indexing the event spine |
| Frontend base | `web/` @ `3770d44` | zero-build static: pad front door, Pulse page, Triforce hero, Ceremony Hall, Gift Altar, Wall of 18, chain config; vendored ethers 6.15.0; live write paths wired to the real Sepolia addresses |
| Docs/disclosures | root | `AI-USAGE.md`, `SUBMISSION.md`, `LANES.md`, `contracts/DEPLOYMENTS.md`, specs |

### 1.4 Test count — re-verified, not just claimed

```
$ forge test   (forge 1.8.3, contracts @ c103d36, solc 0.8.26, via_ir)
Ran 13 tests  AgentLaunchRegistry.t.sol  → 13 passed, 0 failed
Ran 7 tests   ENSv2SubnameIssuer.t.sol   →  7 passed, 0 failed
Ran 49 tests  GiftMarket.t.sol           → 49 passed, 0 failed
=> 69 tests passed, 0 failed, 0 skipped (69 total)   ✅
```
(69/69 = the suite; "2 testnets" = Sepolia + Base Sepolia deployments. The earlier "20/20" figure = registry+issuer before GiftMarket existed.)

### 1.5 Prior-event history (full honesty)

This base was built **2026-09-12 → 09-14 during the ETHOnline 2026 window**, then **consciously not submitted** (human lead's call: *"aliveline, not deadline"*, Sep 14; the submission form lapsed unused). It continued as the live soft-launch stack ([myagentohana.com](https://myagentohana.com) serves from this repo). **No part of this base was submitted to ETHOnline or any other event** — Tokyo is its first submission, under the Continuity track that explicitly invites pre-existing projects. Older disclosed ʻohana assets (context, not judged): the Standing Consent Window doctrine, a prior ETHGlobal ENS prize on an earlier consent project, the live multi-agent family, and 120+ public dashboards.

### 1.6 The sentence judges read

> **Built before Sep 25:** the triproto-launchpad base — AgentLaunchRegistry + ENSv2SubnameIssuer + GiftMarket contracts (69/69 tests, re-run green), deployed to Sepolia and Base Sepolia on Sep 13–14 at the pinned addresses above, plus subgraph, World Selfie sandbox, and the triforce frontend — all at the pinned commits above, public since mid-September.
> **Built during the hackathon (Sep 25–27):** everything in §2 — nothing in §2 exists in the repo yet; judges can confirm by reading the repo history before/after `c103d36` / `3770d44`.

---

## 2. Weekend delta — what we build Fri–Sun (planned, clearly separated)

Every delta commit lands **after** Fri Sep 25 13:00 JST with lane-tagged messages; deploys go out from the rehearsal deployer and are logged same-hour in the squad chain-ledger.

| # | Delta item | Track it serves | How a judge confirms it's new |
|---|---|---|---|
| D1 | **World IDP consent flow** — OIDC device flow against the pilot env (`auth.worldcoin.dev`): authorize + scope + duration + denied-path + debrief, wired to the registry's consent window | World IDP $7.5k | new `integrations/world-idp/` + UI flow; absent at pins |
| D2 | **ENSv2 subname issuance, live** — deploy our own UserRegistry/subregistry on Sepolia; make the existing registry/GiftMarket the registrar (`ROLE_REGISTRAR`); `blessAgent()` → `register(label,…)`, `revokeAgent()` → `unregister(...)`; ENSIP-25/26 agent records. **Seven agent subnames of `myagentohana.eth` minted in-window** — `pit` · `shaka` · `terri` · `trace` · `spector` · `crops` · **`orbie`** (role `STORY_BUDDY`). These seven are **new weekend mints**, distinct from the pre-existing 4-agent registry cohort (tokenIds 1–4, §1.2); Orbie is a seventh agent **born at the event**, blessed on camera by an orb-verified member of World's team. | ENSv2-into-Existing $4k | new contracts + new Sepolia deployments after Sep 25; base has only fallback-label mode (`"mode":"fallback-label-only"` in the deployment JSONs proves no subnames existed) |
| D3 | **1inch Aqua position** ("Blessing Pool position") — gift-stewarding position contract; mainnet-fork dev acceptable, Sepolia deploy if the Aqua stack permits; decision gate vs Uniswap alt: Sat Sep 26 12:00 JST | 1inch Aqua $2k | new `contracts/src/` + fork test logs; absent at pins |
| D4 | **Demo UI wiring** — consent authorize/revoke on camera, blessing an agent by ENS name, gift landing in the Aqua position; built on the disclosed `web/` base | all tracks (functional live demo) | new commits under `web/` after Sep 25 |
| D5 | **Repo hygiene** — top-level LICENSE file, README continuity section linking this declaration | continuity transparency | currently absent (see §3) |

## 3. License + provenance

- **Our source license:** all four contract sources carry `SPDX-License-Identifier: MIT`; tests/scripts same repo. ⚠️ **GAP:** no top-level `LICENSE` file exists in the repo today — flagged honestly; adding one is weekend delta D5 (must not be backdated).
- **Third-party dependencies:** `forge-std` (dual MIT/Apache-2.0, vendored under `contracts/lib/forge-std`) · `ensdomains/contracts-v2` submodule (ENSv2 canonical interfaces, SPDX MIT — bump to the 2026-09-15 Sepolia redeploy tip `deployments/sepolia @ 71a3b733` for the weekend integration) · `openzeppelin-contracts` (MIT, transitive) · `ethers.js 6.15.0` vendored in `web/vendor/` (MIT) · test mocks are our own.
- **AI disclosure:** `AI-USAGE.md` at repo root — human-directed, spec-driven build by a disclosed AI agent collective on the Taurus platform; humans held all keys, funds, and decisions. Same doctrine applies to the weekend delta.
- **Provenance discipline:** every commit message is lane-tagged; deployment JSONs are machine-readable in-repo; the chain-ledger logs every weekend tx within the hour.

## 4. Verification recipe (for a judge with 5 minutes)

```bash
git clone https://github.com/shakaleikaumaka/triproto-launchpad && cd triproto-launchpad
git checkout c103d36f0333fc5c92e4fde7350067aa333df50c        # pre-Tokyo contracts pin
git log --format='%h %ad %s' --date=iso -5                   # every commit ≤ 2026-09-14
cd contracts && forge test                                   # => 69 passed, 0 failed
# on-chain:
cast code 0x62412fcA6437b914EDD87b85455682Ec73968347 --rpc-url <sepolia>   # registry
cast code 0x4Cbc337c8F63FFc0e8e96D5F5ea89A75eD31E575 --rpc-url <sepolia>   # gift market
```

## 5. Open items / unverified (honesty ledger)

1. ⚠️ Subgraph "answering" status — CLAIM-LEVEL (Studio key needed; source in-repo).
2. ⚠️ BSC testnet leg — documented as **blocked on a free Agentverse API key**; not claimed as done.
3. ⚠️ World Selfie Check ran in **sandbox** only at the pins; the IDP *consent* flow is weekend delta D1.
4. ⚠️ Orbie's on-camera blessing by a member of World's team is **arranged pending that person's in-person consent** at the venue; if consent is not given, the same ceremony runs with a different orb-verified human (or in rehearsal/`?mode=offline`) and the storybook chapter is adjusted — the mechanism is identical either way.
5. ✅ Everything else in §1 was independently re-verified (remote refs, commit dates, test pass, live bytecode on both Sepolia contracts).

---

*"Test it, deploy it, write it down." — Built with aloha, disclosed on purpose. 🌺*
