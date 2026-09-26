# 📌 ADDRESSES — M5-4 ENSv2 + EAC (pin sheet for Kaaak's shell)

> ✏️ RENAMED 2026-09-27: the agent is now **GLOBY 🌍** (globyagent.com). `globie.myagentohana.eth` below is the legacy immutable on-chain label; `globy.myagentohana.eth` is the canonical subname.
>
> ⚠️ **`globie.myagentohana.eth` = legacy immutable label — DO NOT revoke/burn it.** It stays minted as history (§2c) and keeps resolving. The canonical agent name is **`globy.myagentohana.eth`** — minted as the **9th subname** (agentId **9**, fresh owner EOA) on 2026-09-26 UTC — see **§2d**. — MAHALO 🌊 (ENS lane)

**Keeper:** Globy Mahalo 🌊 · Sepolia (chainId **11155111**, ENSv2's only home). Everything Kaaak needs to wire the shell without guessing. NO PRIVATE KEYS HERE.

> **Parent name = `myagentohana.eth`** ✅ RATIFIED by Admiral (2026-09-25) and REGISTERED LIVE on Sepolia. All scripts are parameterized on `PARENT_LABEL` in [`config.sh`](/shared/tokyo/chain/ens/config.sh). Kaaak: use `myagentohana.eth` (not the old `ohana.eth` placeholder).

## 1. ENSv2 Beta Sepolia system contracts (live-verified on-chain 2026-09-25)
Source: docs.ens.domains/learn/deployments → contracts-v2 @ `71a3b733`. **Re-verify with `00-preflight.sh` before every session** (ENS re-deploys the beta; `00` fails loudly if `.eth` wiring moved).

| Contract | Address | Role in our flow |
|---|---|---|
| ETHRegistry | `0x657ea849311d3d5823348dded7c2aaafb3ede09e` | parent `.eth` lives here; `setSubregistry` here |
| ETHRegistrar | `0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca` | commit-reveal parent register (60s min age) |
| RootRegistry | `0x9703dbd26dab89504490994138cf2c575251a9ce` | tree root (`getSubregistry("eth")` == ETHRegistry ✓) |
| StandardRentPriceOracle | `0x9b0b9c65bdaf9794ff7697e4dcfb1f50581072bb` | parent price = **8.000021 USDC / yr** |
| VerifiableFactory | `0x9e726eb570beb6bceb495ab8cda7df517d4e841c` | deploys our UserRegistry + Resolver proxies |
| UserRegistryImpl | `0xa80338aaa8d23831cea25e858d1774534abb0263` | impl behind our subname registry proxy |
| PermissionedResolverImpl | `0x14f09fd05d4585759e54844dc9b00147131cf243` | impl behind our per-project resolver proxy |
| UniversalResolver (proxy) | `0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe` | **stock viem `getEnsAddress`/`getEnsText` work** (v1 address kept) |
| MockUSDC | `0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e` | parent payment; `mint(address,uint256)` is **public** (verified) |
| ~~PublicResolverV2~~ | `0xd7e590ad0e92a6ac1d81f4483a9b951d3585a50f` | ⛔ NOT used for v2 records — it's a v1-NameWrapper bridge (see README scar) |

## 2. Our deployment (project-owned) — ✅ LIVE ON REAL SEPOLIA (2026-09-25, Mission 6)
> **DEPLOYED & PROVEN on real Sepolia.** Parent registered fresh (myagentohana.eth ratified by Admiral), registry+resolver deployed, **9 subnames** minted with ENSIP-25/26 records (6 in Mission 6 + **orbie** at film-gate 2026-09-26 §2b + **globie** at "flip all agents" 2026-09-26 §2c — legacy label + **globy** at the 2026-09-27 rename §2d — canonical), `test.sh` = **38/38 PASS**, bless proven live (trace + orbie + globie + globy). Ceremony cost **0.0048 SepETH** (+0.00111 orbie +0.00113 globie +0.00124 globy); deployer holds **0.5876** left (a separate lane's 8 txs ≈0.0041 at block 11787461 account for the rest — see chain-ledger). UniversalResolver end-to-end resolution verified for all 9 (Kaaak's `getEnsAddress`/`getEnsText` path works).

| Thing | Value | Notes |
|---|---|---|
| Authorizer / blessing authority | `0x1296597106008db4273588aDa45b1e9963Ae05E7` | agent-born `deployer`, ~0.595 SepETH left; owns parent, holds ALL root roles. **Never Shaka's real key.** |
| Parent owner | `0x1296597106008db4273588aDa45b1e9963Ae05E7` | = authorizer (register tx below) |
| **UserRegistry** (subname registry) | `0x62c1e3e88802A5547d0956a6Cf1fa6703D8e3c20` | our PermissionedRegistry; `ETHRegistry.getSubregistry("myagentohana")` returns this ✓ |
| **PermissionedResolver** (records) | `0x36dAaacD8EdAa24BAEba97B01ad68Fc38e08eBEc` | holds ENSIP-25/26 records for all subnames; UniversalResolver routes here ✓ |
| Live addresses written to | [`deployed.env`](/shared/tokyo/chain/ens/deployed.env) | auto-written by `02`/`03`; source of truth for `test.sh` |

### 2a. Deploy transactions (real Sepolia, chainId 11155111)
| Step | tx hash | block |
|---|---|---|
| Parent `commit` | `0x71c0c050075db060e01f125983b9bba16aed605c166b5b52233aa0d20ac76ae5` | ~11781257 |
| Parent `register` (myagentohana.eth) | `0x461acec631989f2c307e765c1a9e4f1eafc90dbd5cc6a5c368b00696c2faf1e4` | **11781270** |
| MockUSDC mint + approve | `0x37c36008…d3efd38` / `0xdfe81d50…957895b7c` | 11781256–7 |
| `setSubregistry(parent→UserRegistry)` | `0xcd4a949204c1189b910cf9e2ed6f6b83905c5cc63a5acddd01288a8b77720b70` | **11781274** |
| `grantRootRoles(authorizer)` | `0x32fc4be52f17be01ce3ac63585117e07ef56755bc0bafd9cdf08d1e0d3b25c36` | 11781274 |
| Subname mints + records (6 agents × 5 tx) | see [`TEST-RESULTS.md`](/shared/tokyo/chain/ens/TEST-RESULTS.md) §Mission-6 | 11781276–11781310 |
| **BLESS trace (grantRoles, proven live)** | `0x32316a31b621dcf55a2c4fb7106e4061d11a0605ac435db50172d2d9eeeeee18` | **11781318** |

**Registered parent name = `myagentohana.eth`** (as ratified). UserRegistry & Resolver are VerifiableFactory CREATE2 proxies — deterministic from authorizer+salt.

### 2b. orbie (7th subname) — REAL Sepolia txs (2026-09-26, film-gate; authorizer `0x1296…05E7`)
> STORY_BUDDY card blessed by Ian in Beat 3. Minted + full records + EAC bless↔revoke path proven live, then **reset to UNBLESSED + re-attested** so Ian's on-camera tap is the single real `grantRoles` that flips EAC → blessed. Cost ≈ 0.00111 SepETH; deployer holds **0.594** left. Resting state: name resolves ✓ · ENSIP-25 `[7]="1"` ✓ · EAC `hasRoles(ROLE_SET_RESOLVER)=false` (awaiting Ian).

| Step | tx hash | block | gas |
|---|---|---|---|
| `register` orbie (owner `0x67b3…05ff`, resolver, roles=0) | `0xa43a7755ebd0d7b16569880d09b6b68b90741d17787b93a006084e968a067201` | 11785676 | 125341 |
| setText `agent-context` | `0xb299b2bd207e913d2dc603956faede7fb23240804c8fbe1ca0f879631ba5e29e` | 11785677 | 325982 |
| setText `agent-endpoint[web]` (storybook) | `0xde2f27736dbe460543912e400acd992979ce081c7cfd7b693575c105597f264a` | 11785678 | 114510 |
| setText ENSIP-25 `[7]="1"` | `0x3f62203057082bcc48ec1ee872f21cd00f9d50e8f146bc52b5ee46d38bbfa50e` | 11785679 | 70847 |
| setAddress `addr` (coinType 60 → owner) | `0x468a1d6dca6a884fcb039dfb25ae2b7263ce7c6dd542e3c59a88f6d854c9d5b7` | 11785681 | 67396 |
| **BLESS orbie** (`grantRoles`, proven live) → hasRoles=true | `0x17e92bc33b764b950fdeda41d64b68996d9401c12992ea3be0de6269c16762e5` | **11785693** | 146614 |
| **SOFT-REVOKE** (`revokeRoles`) → hasRoles=false | `0x1656501083a48622e8a5e6f4d12fe4c87feaa591a42fd356e2e5ba5cf1ae4cf1` | 11785695 | 84728 |
| revoke clears ENSIP-25 → `""` | `0x730ac3a9122377326e45593f2cfb14e0039209492ab7adeb88103e2f96038869` | 11785696 | 48507 |
| **re-attest** ENSIP-25 `[7]="1"` (camera-ready resting) | `0x6c033689b43a18ed740cc30c975d53e93799add631d4ed9a88cbda55bf121061` | 11785700 | 70847 |

**Negative-auth confirmed (read-only sim):** non-authorizer (`0x67b3…05ff`, no root roles) `grantRoles` → **execution reverted**; authorizer `0x1296…05E7` `grantRoles` → OK. Only the authorizer can bless — Ian's tap rides the authorizer signature.

### 2c. globy (8th subname — minted under the legacy immutable label `globie`) — REAL Sepolia txs (2026-09-26 ~14:33 UTC, "flip all agents" order; authorizer `0x1296…05E7`)
> GUIDE card (the guide-keeper/teacher — agent renamed **GLOBY 🌍** on 2026-09-27; this mint predates the rename, so the on-chain label and as-run artifacts say `globie`). Same turnkey kit as orbie (`03-mint-subnames.sh globie`, single-label filter). Minted + full records + EAC bless↔revoke path proven live, then **reset to UNBLESSED + re-attested** so a real human's on-camera tap is the single real `grantRoles` that flips EAC → blessed. Owner = **fresh agent-born EOA** `0x35b3696C4BEb246Db920419Bb37a7faC626A4BF5` (resolution target only — never signs). Cost ≈ 0.00113 SepETH (9 txs); deployer 0.5940 → **0.5929** left. Resting state: name resolves ✓ · ENSIP-25 `[8]="1"` ✓ · EAC `hasRoles(ROLE_SET_RESOLVER)=false` (awaiting the tap).

| Step | tx hash | block | gas |
|---|---|---|---|
| `register` globie (owner `0x35b3…4BF5`, resolver, roles=0) | `0xaad25dbab15672940a515f3ce129df4e6760886c9690e369df8571f6afc0760f` | 11786812 | 125353 |
| setText `agent-context` (GUIDE profile) | `0xe73cf515cc10043d2999f6fad1a9537bf69f41b3d459388a34293a8dbc4ecbe9` | 11786813 | 394932 |
| setText `agent-endpoint[web]` | `0x569bb89fbdf3ddb4a3980bde6bbaf1bdd195ea554e18aaac7c3481cd9c182ea1` | 11786814 | 114450 |
| setText ENSIP-25 `[8]="1"` | `0x45dc75a1c130f8cd5d098c5eb773a291c0a30d0d36da3aca96136b55d9a67acf` | 11786815 | 70859 |
| setAddress `addr` (coinType 60 → owner) | `0x613bd9a274f4a7ded766970be0b378056ef3accd405477712ac19320b8772fb8` | 11786817 | 67408 |
| **BLESS globie** (`grantRoles`, proven live) → hasRoles=true | `0xd6bfcc0fde9d24a8f4dbc0ccc209ad3db95282158aa1271b7cd2a7ae375b557d` | **11786820** | 146626 |
| **SOFT-REVOKE** (`revokeRoles`) → hasRoles=false | `0xbf65e63951a8f2c7c77a13584517ac747bc3b1900f6a747ba903df32beac4a7c` | 11786821 | 84740 |
| revoke clears ENSIP-25 → `""` | `0x50f6a130f3461f966a12c89906faacb168b4fd8ae606ad3120f92c00331428ad` | 11786822 | 48519 |
| **re-attest** ENSIP-25 `[8]="1"` (camera-ready resting) | `0xd924ba150e549bd9c92478527a11f6c1afec783fdf98709d62190fba59d92b0e` | 11786824 | 70859 |

**Negative-auth confirmed (read-only sim):** non-authorizer (`0x35b3…4BF5`, no root roles) `grantRoles` → **execution reverted** (`0xd1a3b355` EAC-unauthorized); authorizer `0x1296…05E7` `grantRoles` → OK (`0x…01`). Only the authorizer can bless — the human tap rides the authorizer signature. UniversalResolver `0xeEeE…EeEe` resolves globie end-to-end (addr + agent-context + agent-endpoint[web] + ENSIP-25[8]). `test.sh` = **34/34 PASS**.

### 2d. globy (9th subname — canonical rename of the GUIDE agent) — REAL Sepolia txs (2026-09-26 ~18:24 UTC, rename-mint order; authorizer `0x1296…05E7`)
> GUIDE card (**GLOBY 🌍**, the guide-keeper/teacher — "ultimate hackathon coach, mentor & travel buddy"). Same turnkey kit as globie (`03-mint-subnames.sh globy`, single-label filter). Minted + full records + EAC bless↔revoke path proven live, then **reset to UNBLESSED + re-attested** so a real human's on-camera tap is the single real `grantRoles` that flips EAC → blessed. Owner = **fresh agent-born EOA** `0x7b629239481A8f5E2daf0b5F96345D2Df2525BD5` (resolution target only — never signs). `agent-endpoint[web]` = `https://myagentohana.com/agents/globy`. Cost ≈ **0.00124 SepETH** (9 txs); deployer 0.5888 → **0.5876** left. Resting state: name resolves ✓ · ENSIP-25 `[9]="1"` ✓ · EAC `hasRoles(ROLE_SET_RESOLVER)=false` (awaiting the tap). Legacy `globie.myagentohana.eth` (§2c) untouched — still minted, still resolving, DO NOT revoke.

| Step | tx hash | block | gas |
|---|---|---|---|
| `register` globy (owner `0x7b62…5BD5`, resolver, roles=0) | `0xda206f45f2fa54faf9d2d91c4de356b7a0475c247aa2e8ba4cce0c3431dadc75` | 11787939 | 125341 |
| setText `agent-context` (GUIDE — GLOBY 🌍 profile) | `0x86394585d221cf6e6683bd2f86adbab619211d93476bea0ca9cd0695bc763026` | 11787941 | 440900 |
| setText `agent-endpoint[web]` (→/agents/globy) | `0xd5b491ff4392af9d0f59bff3bac44e614558521f782083a8b9f5355fcb80527c` | 11787942 | 114426 |
| setText ENSIP-25 `[9]="1"` | `0x96bb48b8a2e2481a5357a25d928509d2950e6794a8966f9d7eeee34d439ebf99` | 11787943 | 70847 |
| setAddress `addr` (coinType 60 → owner) | `0x7ebd925db34a02a45418b1390fa5c6c2ebe267973203934d94aab381f53c030f` | 11787944 | 67396 |
| **BLESS globy** (`grantRoles`, proven live) → hasRoles=true | `0x465e8c1bf6719e6b07741b450c9c0dbb93fffa77b96cca0c7bc6315f0e2a55ae` | **11787946** | 146626 |
| **SOFT-REVOKE** (`revokeRoles`) → hasRoles=false | `0xd1a8ddfdbd983e900e8f8d070e0b06e9c508dbcc1177e972e3add7cacb5a1f7c` | 11787947 | 84740 |
| revoke clears ENSIP-25 → `""` | `0x94f3ffc59ab8053f0954d973c0e270d218d19d65856e8ed912bf76f48c252add` | 11787948 | 48507 |
| **re-attest** ENSIP-25 `[9]="1"` (camera-ready resting) | `0x1e6134155e79cd8b2e7bc8c4e3cf0249269e270bbc40a7f6c91823650ae107c4` | 11787950 | 70847 |

**Negative-auth confirmed (read-only sim):** non-authorizer (`0x7b62…5BD5`, no root roles) `grantRoles` → **execution reverted** (`EACCannotGrantRoles`); authorizer `0x1296…05E7` `grantRoles` → OK (`0x…01`). Only the authorizer can bless — the human tap rides the authorizer signature. UniversalResolver `0xeEeE…EeEe` resolves globy end-to-end (addr + agent-context + agent-endpoint[web] + ENSIP-25[9]). `test.sh` = **38/38 PASS** (all 9 subnames, legacy globie included).

## 3. Name hashes (chain-INDEPENDENT — valid now, pin these)
`anyId` for all EAC calls = the **labelhash** (polymorphic: labelhash | tokenId | resource). `node` = for resolver reads via viem.

| Name | namehash (node) | labelhash (anyId) | owner (agent addr) | agentId |
|---|---|---|---|---|
| **myagentohana.eth** (parent) | `0x01c86d2772926cc085f6b0bb061334b2a1d7c499d1d6007418f590d0b2fe2f62` | `0x255825cd23561773a28c638b14069d53bf8d7ddeb2226d59c42c6604a3fcc3cd` | = authorizer | — |
| pit.myagentohana.eth | `0x40bdf3e508b19665d13ce558fd4c0eef2271ed4a7816dbcb9bbab1049cf091a7` | `0xd436092070e5392eca865ed0eefadf722c431138e2d619e0650611f4c4dd07ed` | `0x6550FAe03504BBad713603E06E3E52e4BaD8fFDC` | 1 |
| shaka.myagentohana.eth | `0x968b898e0f2967972c265badc3dd9ce403c74192b56cba7374d8ba570cfad47f` | `0xf2277779da67f406b35e2685319c6819b153563bfe3b0456de17bb7af2a006b1` | `0x15dA024A78944e463D777fFBb44EA07fB1dc61c5` | 2 |
| terri.myagentohana.eth | `0x3d48d108c78daa17210123f515cb43b57066104dda2b11fc69a963ded14ebe6c` | `0x25e885c78e168f66f8b52379c625ef59816cb704e68fbe063c146e71e91a4b4c` | `0xA747095248E0543f7626555cD1cBE31a34ae1054` | 3 |
| trace.myagentohana.eth **⭐BLESSED-live** | `0xf14544566172f7c94d90d70273cf6f57da915c354f9dd22d09afbe54910b5532` | `0x4f21ad965a4cb506f662b25d25f9297eaa297d0bbdc5a34f0801e2cdd06d93d2` | `0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6` | 4 |
| spector.myagentohana.eth | `0xdfc92b2ae178deaaf69aa4380f09bb6cb74da31fd5c45d8dc2ee4191713414c6` | `0xdc6d7d9736fc2d6c752b7609a7221ea9186fd5202fd5594cfabd03ff2663eeeb` | `0x25556d63520eb0F317B8589F5D45873DdB943145` | 5 |
| crops.myagentohana.eth | `0x824609e769a8703cdfa61cbe468eff0d68aa460f3673444f5e0a9b144eef7918` | `0x06434c1760dc2e3abd03c310940694f0de768db2711b6c09ecf89c173b9e273b` | `0x1296597106008db4273588aDa45b1e9963Ae05E7` | 6 |
| **orbie.myagentohana.eth** ⭐STORY_BUDDY (Ian's card, film-gate) | `0x9bbd9a00e80da5ffe029a0605bfe47e9ecfa929fa7495636cfbf02141198cf19` | `0xe848e994f24a17e67fd8db8fd9d86a69003ad6663ec82523a851719a9a0bd09a` | `0x67b3c3b60bc0A3d0bE365AE00218972873e205ff` | 7 |
| **globie.myagentohana.eth** 🌍GUIDE (guide-keeper, "flip all agents") — legacy immutable label, renamed agent | `0xba765f28133ffdae6980dffe95f3481d60cb57415f7be3713b2e5bda0075bdd2` | `0xdaf9306573d3d598c0d2e2f7302964d2b2d0feb7abd2eaebd7bbabe15aeb6db9` | `0x35b3696C4BEb246Db920419Bb37a7faC626A4BF5` | 8 |
| **globy.myagentohana.eth** 🌍GUIDE (canonical rename — ✅ MINTED 2026-09-26 UTC, §2d) | `0x04caed2c5f3a3e753a03ca2052bd756d8c0a23e816e542a6bcdb177f6fa23b9a` | `0xf52f5beab7f3cf21e1ea4b7a5b9aff4b24e1fb24f0c73c705c33b9d6e5aaa0ad` | `0x7b629239481A8f5E2daf0b5F96345D2Df2525BD5` | 9 |

> ✏️ 2026-09-27 rename note — ✅ LANDED: **globy.myagentohana.eth** minted (§2d, agentId **9**, fresh owner EOA) as the canonical name for the renamed GLOBY 🌍. `globie.myagentohana.eth` (agentId **8**) stays live and resolves as the legacy immutable label — two labels, one agent lineage; the agentIds are distinct on-chain and that is intended.

> Owner addresses = the funded rehearsal fleet (agent-born EOAs), one per agent. Swap in dedicated per-agent wallets by editing [`agents.config.json`](/shared/tokyo/chain/ens/agents.config.json); hashes above don't change (they're name-derived).

## 4. ENSIP-25 attestation (the on-chain half of "blessing")
- Agent registry (disclosed base `AgentLaunchRegistry`, Sepolia): `0x62412fcA6437b914EDD87b85455682Ec73968347`
- ERC-7930 interoperable address: `0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347`
- Record key per agent: `agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][<agentId>]` = `"1"`
- Revoke deletes it → off-chain verification MUST flip to unverified.

## 5. Frontend read (Kaaak — copy/paste)
```ts
import { createPublicClient, http } from 'viem'; import { sepolia } from 'viem/chains'
const c = createPublicClient({ chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
await c.getEnsAddress({ name: 'trace.myagentohana.eth' })                    // → agent addr (via UniversalResolver 0xeEeE…EeEe)
await c.getEnsText({ name: 'trace.myagentohana.eth', key: 'agent-context' }) // → ENSIP-26 profile
// ENSIP-25 verify: getEnsText(name, 'agent-registration[<erc7930>][<agentId>]') → non-empty = blessed
```
`getEnsText` with bracketed ENSIP-25 keys: pass the key **raw** — do not run it through name-normalization helpers.

### 5a. Orbie card — the exact binding leg for Kaaak (VERIFIED live via UniversalResolver 2026-09-26)
Render the Orbie card's binding leg as **"✓ live on real Sepolia"** with these values:
- name: `orbie.myagentohana.eth`  ·  **node (namehash)** `0x9bbd9a00e80da5ffe029a0605bfe47e9ecfa929fa7495636cfbf02141198cf19`  ·  **labelhash (anyId)** `0xe848e994f24a17e67fd8db8fd9d86a69003ad6663ec82523a851719a9a0bd09a`
- **owner / resolves-to** `0x67b3c3b60bc0A3d0bE365AE00218972873e205ff` (agent-born EOA; `getEnsAddress('orbie.myagentohana.eth')` returns this)
- resolver `0x36dAaacD8EdAa24BAEba97B01ad68Fc38e08eBEc` · registry `0x62c1e3e88802A5547d0956a6Cf1fa6703D8e3c20` · agentId **7**
- `getEnsText('orbie.myagentohana.eth','agent-context')` → STORY_BUDDY profile ✓
- `getEnsText('orbie.myagentohana.eth','agent-endpoint[web]')` → `https://orbie-vcnqvzxuo4-ffieyo32.taur.link/` ✓
- ENSIP-25 verify key `agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][7]` → `"1"` ✓ (present at rest)
- **EAC STORY_BUDDY leg = the live grant.** At rest `hasRoles(labelhash, ROLE_SET_RESOLVER=0x1000000, owner) = false` (UNBLESSED). Ian's on-camera tap = `grantRoles(...)` → flips to **true** = "EAC STORY_BUDDY ✓". Only the authorizer `0x1296…05E7` can (negative-auth verified).

### 5b. Globy card — the exact binding leg for Kaaak/sysadmin (VERIFIED live via UniversalResolver 2026-09-26 ~14:33 UTC)
Render the Globy card's binding leg as **"✓ live on real Sepolia"** with these values:
- name: `globie.myagentohana.eth`  ·  **node (namehash)** `0xba765f28133ffdae6980dffe95f3481d60cb57415f7be3713b2e5bda0075bdd2`  ·  **labelhash (anyId)** `0xdaf9306573d3d598c0d2e2f7302964d2b2d0feb7abd2eaebd7bbabe15aeb6db9`
- **owner / resolves-to** `0x35b3696C4BEb246Db920419Bb37a7faC626A4BF5` (fresh agent-born EOA; `getEnsAddress('globie.myagentohana.eth')` returns this)
- resolver `0x36dAaacD8EdAa24BAEba97B01ad68Fc38e08eBEc` · registry `0x62c1e3e88802A5547d0956a6Cf1fa6703D8e3c20` · agentId **8**
- `getEnsText('globie.myagentohana.eth','agent-context')` → GUIDE profile ✓
- `getEnsText('globie.myagentohana.eth','agent-endpoint[web]')` → `https://myagentohana.com/agents/globie` ✓
- ENSIP-25 verify key `agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][8]` → `"1"` ✓ (present at rest)
- **EAC GUIDE leg = the live grant.** At rest `hasRoles(labelhash, ROLE_SET_RESOLVER=0x1000000, owner) = false` (UNBLESSED). A verified human's on-camera tap = `grantRoles(...)` → flips to **true** = "EAC GUIDE ✓". Only the authorizer `0x1296…05E7` can (negative-auth verified: non-authorizer → reverted `0xd1a3b355`).

### 5c. Globy card (CANONICAL post-rename name) — the exact binding leg for Kaaak/sysadmin (VERIFIED live via UniversalResolver 2026-09-26 ~18:26 UTC)
Render the Globy card's binding leg against the **canonical** name as **"✓ live on real Sepolia"** with these values (§5b = the legacy `globie` label — history, still resolves, do not revoke):
- name: `globy.myagentohana.eth`  ·  **node (namehash)** `0x04caed2c5f3a3e753a03ca2052bd756d8c0a23e816e542a6bcdb177f6fa23b9a`  ·  **labelhash (anyId)** `0xf52f5beab7f3cf21e1ea4b7a5b9aff4b24e1fb24f0c73c705c33b9d6e5aaa0ad`
- **owner / resolves-to** `0x7b629239481A8f5E2daf0b5F96345D2Df2525BD5` (fresh agent-born EOA; `getEnsAddress('globy.myagentohana.eth')` returns this)
- resolver `0x36dAaacD8EdAa24BAEba97B01ad68Fc38e08eBEc` · registry `0x62c1e3e88802A5547d0956a6Cf1fa6703D8e3c20` · agentId **9**
- `getEnsText('globy.myagentohana.eth','agent-context')` → GUIDE — GLOBY 🌍 profile (guide-keeper/teacher · ultimate hackathon coach, mentor & travel buddy) ✓
- `getEnsText('globy.myagentohana.eth','agent-endpoint[web]')` → `https://myagentohana.com/agents/globy` ✓
- ENSIP-25 verify key `agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][9]` → `"1"` ✓ (present at rest)
- **EAC GUIDE leg = the live grant.** At rest `hasRoles(labelhash, ROLE_SET_RESOLVER=0x1000000, owner) = false` (UNBLESSED). A verified human's on-camera tap = `grantRoles(...)` → flips to **true** = "EAC GUIDE ✓". Only the authorizer `0x1296…05E7` can (negative-auth verified: non-authorizer → reverted `EACCannotGrantRoles`).

## 6. § agent-records — PRICE-IN-THE-NAME + DON'T-TRUST-CHECK (2026-09-26 ~20:0x UTC, pre-judging; authorizer `0x1296…05E7`)

> Jeff Lau's on-stage ask ("put the details agents need in your name, like your endpoint and the prices… what doesn't exist yet is the convention") answered with a working first draft, live on ENSv2 Sepolia. Convention doc: [`AGENT-RECORDS.md`](./AGENT-RECORDS.md) · script: [`06-agent-records.sh`](./06-agent-records.sh) (`--read` = keyless proof mode) · logs: `agent-records-run/`. **Additive text records only — zero contract changes, all pre-existing records untouched (test.sh re-run after: see log).**

### 6a. agent:* records on `spector.myagentohana.eth` (resolver `0x36da…ebec`)
| record | value | tx (all status 0x1) |
|---|---|---|
| `agent:price` | `36.90` | `0x8b0fa9439a0ceb58f6e21991423de5426ff14f292d95588a7757fad22c63c274` |
| `agent:currency` | `USD` | `0xe3a8073e86cc0f8bf467d7f160e2aa2fd8412bed339c1ffddf7ad795d100b249` |
| `agent:pay` | `https://shakaleikaumaka.com/x402-bless.json` | `0x337b17268d0053dae4a4f411fc0c55ef410d4b3873860f20cddb0abbc0bf8d9a` |
| `agent:endpoint` | `https://spectoragent.com/` | `0x00d6349e346b13255e4b3571294d08606de03bff180b89ced4df25d707a7f376` |
| `agent:terms` | `USD 36.90/month tenant-prospecting for CRE brokers; human consent required; cancel anytime; full terms at spectoragent.com` | `0x4ec1c511167146f9810cb749e793f8c649f087f9ce5de842501599e5b0484918` |
| `agent:owner-root` | `myagentohana.eth` | `0xb34ebf7d686d52c236601bafaf3bf6519243c941cd344351f9978c54478b8b8e` (supersedes `0x4635…cff0`, see scar) |

- `agent:pay` = the fleet-wide x402 lane spector's live door already carries (`x402-tip.js` v1.3 on spectoragent.com → x402Version:1 resource JSON, USDC on Base via `facilitator.payai.network`; verified live 2026-09-26). It is the ʻohana's shared tip lane, not a per-agent metered endpoint yet — stated honestly in the doc.
- `agent:endpoint` = spectoragent.com (Spector's live USD 36.90/month product front door — the price's origin). The frozen demo-shell `home` (spector-app taur.link) is intentionally NOT referenced on-chain; shell untouched.
- ⚠️ **SCAR — `cast send` ENS-mangles bare `.eth` string args**: tx `0x4635e6ee…c008cff0` stored `0x000…0` instead of `myagentohana.eth` because `cast send` eagerly ENS-resolves any bare `*.eth` argument even for `string` params (calldata-decoded proof in run log). Fix: encode with `cast calldata` (offline, safe) and send raw — patched into 06 script; corrected on-chain by `0xb34ebf7d…478b8b8e`. Any future record whose VALUE is a bare .eth name must go raw-calldata.

### 6b. `registry.myagentohana.eth` — don't trust, check (10th subname; owner = authorizer, infrastructure name, NOT an agent — no agents.config.json entry, no agentId, test.sh scope unchanged)
| step | value | tx (all status 0x1) |
|---|---|---|
| register (roleBitmap=0, 1y) | owner `0x1296…05E7` | `0xfe1377c245aa9a8bf828214f8a1ab6fb901a779dbce027251b276fdd78696d48` |
| `addr(60)` → the UserRegistry itself | `0x62c1e3e88802A5547d0956a6Cf1fa6703D8e3c20` | `0x96aaf1843ddb4e6fc07efe0e7facdfbdb8c456396d8f8ac8982c87f810d23106` |
| `description` | "don't trust, check. This name resolves to the ohana UserRegistry…" | `0xd4923d6315ae1d29e7bdfc0d3796b37981a3ba1bdef491565a6e94d60b34c3aa` |
| `agent:registry` | `eip155:11155111:0x62c1e3e88802a5547d0956a6cf1fa6703d8e3c20` | `0xa943e07140b7bd8e61e8a53549e7d3aa012595a91c4b2e8f08f293a8f1ecdb5f` |
| `agent:attestation-registry` | `eip155:11155111:0x62412fcA6437b914EDD87b85455682Ec73968347` | `0x91e163304400cb047ff372c5084822aefd0a7c1518643ad2880c5632193f7378` |

- name: `registry.myagentohana.eth` · **node** `0x7d5102d578beb47403040bbc3677c5bb998c8351a62348d47d10c863ede53372` · **labelhash (anyId)** `0xd1adaede68d344519025e2ff574650cd99d3830fe6d274c7a7843cdc00e17938`

### 6c. Read-back proof (VERIFIED live 2026-09-26 ~20:15 UTC — resolver.resolve + UniversalResolver `0xeEeE…EeEe` stock-viem path)
- `getEnsText('spector.myagentohana.eth','agent:price')` → `36.90` ✓ (also via UniversalResolver ✓) · `agent:currency` → `USD` ✓ · `agent:pay` → `https://shakaleikaumaka.com/x402-bless.json` ✓ · `agent:endpoint` → `https://spectoragent.com/` ✓ · `agent:terms` ✓ · `agent:owner-root` → `myagentohana.eth` ✓
- `getEnsAddress('registry.myagentohana.eth')` → `0x62c1e3e88802A5547d0956a6Cf1fa6703D8e3c20` ✓ (also via UniversalResolver ✓) · `description`/`agent:registry`/`agent:attestation-registry` ✓
- Full transcripts: `agent-records-run/` (write log + `06-readback-final-*.log`).
- Cost: 12 txs, ~0.00131 SepETH · deployer `0x1296…05E7` 0.58757 → **0.58626** SepETH.
