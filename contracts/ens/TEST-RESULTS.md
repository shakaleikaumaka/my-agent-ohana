# ✅ TEST-RESULTS — ENSv2 + EAC (chain/ens)

> ✏️ RENAMED 2026-09-27: the agent is now **GLOBY 🌍** (globyagent.com). `globie.myagentohana.eth` below is the legacy immutable on-chain label; `globy.myagentohana.eth` is the canonical subname. (Historical test record — results left as-run.)

---

## 🟢 FILM-GATE — orbie (7th subname) LIVE ON REAL SEPOLIA (2026-09-26 ~10:38 UTC)

**The STORY_BUDDY card Ian blesses in Beat 3 now resolves for real.** Same kit, one new label (`03-mint-subnames.sh orbie` — added an optional single-label filter arg; the 6 existing subnames untouched). Authorizer `0x1296…05E7`, never Shaka's key.

- **agent:** `orbie` · agentId **7** · role STORY_BUDDY · owner (fresh agent-born EOA) `0x67b3c3b60bc0A3d0bE365AE00218972873e205ff`
  - namehash `0x9bbd9a00e80da5ffe029a0605bfe47e9ecfa929fa7495636cfbf02141198cf19` · labelhash `0xe848e994f24a17e67fd8db8fd9d86a69003ad6663ec82523a851719a9a0bd09a`
- **03 mint:** register + `agent-context` + `agent-endpoint[web]`=`https://orbie-vcnqvzxuo4-ffieyo32.taur.link/` + ENSIP-25`[7]="1"` + `addr` — all status 0x1 (blocks 11785676–11785681).
- **test.sh:** ✅ **RESULT: PASS (30 checks)** on real Sepolia (all 7 subnames: resolve→addr, ENSIP-25/26 read-back, EAC role state). orbie resolves → owner, records present, `hasRoles=false` at rest.
- **EAC STORY_BUDDY path proven live:** `04-bless.sh orbie` → `grantRoles(SET_RESOLVER)` tx `0x17e92bc3…16762e5` (blk **11785693**) `hasRoles=true`; then `05-revoke.sh orbie` (soft) → `revokeRoles` tx `0x16565010…1ae4cf1` (blk 11785695) `hasRoles=false` + attestation cleared. **Re-attested** ENSIP-25`[7]="1"` tx `0x6c033689…121061` (blk 11785700). Resting state = **minted + attested + UNBLESSED** → Ian's on-camera tap is the single real `grantRoles`.
- **Negative-auth (read-only sim):** non-authorizer `grantRoles` → **execution reverted**; authorizer `grantRoles` → OK. Only `0x1296…05E7` can bless.
- **UniversalResolver `0xeEeE…EeEe`:** live-verified — `resolve(addr)` → `0x67b3…05ff`, `resolve(text 'agent-context')` → STORY_BUDDY profile, `agent-endpoint[web]` + ENSIP-25`[7]` read back. Kaaak's `getEnsAddress`/`getEnsText` path proven for orbie.
- **Cost:** ~0.00111 SepETH (9 txs). Deployer **0.5951 → 0.5940 SepETH**.

Full tx tables: [`ADDRESSES.md`](/shared/tokyo/chain/ens/ADDRESSES.md) §2b + §5a; logs in [`orbie-run/`](/shared/tokyo/chain/ens/orbie-run/).

---

## 🟢 MISSION 6 — LIVE ON REAL SEPOLIA (2026-09-25 ~19:35 UTC)

**The ceremony ran for real on Sepolia (chainId 11155111) with the agent-born deployer key `0x1296…05E7`. No fork, no warp — the 60s commit-reveal was waited out. NOT Shaka's real key.**

- **Submodule verdict:** N/A — this lane is raw `cast` against the **pinned live ENS beta addresses** (2026-09-15 deploy @ `71a3b733`), not the `contracts-v2` submodule. Nothing to bump. `00-preflight` re-verifies every address has code + `.eth` wiring before any write.
- **Preflight:** ✅ PASS (block 11781254) — all 7 contracts have code, `RootRegistry.getSubregistry('eth')==ETHRegistry`, parent `myagentohana.eth` available, price 8.000021 MockUSDC, deployer 0.5999 SepETH.
- **01 register parent:** `myagentohana.eth` registered fresh (commit → 65s wait → register). owner = deployer. register tx `0x461acec6…c2faf1e4` (block **11781270**).
- **02 deploy:** UserRegistry `0x62c1e3e88802A5547d0956a6Cf1fa6703D8e3c20` · PermissionedResolver `0x36dAaacD8EdAa24BAEba97B01ad68Fc38e08eBEc` · `setSubregistry` verified · root roles granted.
- **03 mint:** all 6 subnames (pit·shaka·terri·trace·spector·crops) minted with ENSIP-25 attestation + ENSIP-26 `agent-context`/`agent-endpoint[web]` + forward `addr` records. 30 record/mint txs, all status 0x1.
- **test.sh:** ✅ **RESULT: PASS (26 checks)** on real Sepolia. All 6 resolve to agent addrs, all ENSIP-25/26 records read back, EAC role state correct.
- **UniversalResolver end-to-end:** ✅ `resolve()` on `0xeEeE…EeEe` returns correct addr for `trace`/`pit`, routing to our resolver — **Kaaak's `getEnsAddress` frontend path proven live.**
- **04 BLESS trace (proven live):** `grantRoles(SET_RESOLVER)` tx `0x32316a31…eeeeee18` (block **11781318**), `hasRoles=true`, tokenId regenerated (…056→…057). EAC works on-chain, not just fork.
- **Staged for camera:** `04-bless.sh <label|all>` (bless remaining 5) and `05-revoke.sh <label> [--hard]` (soft revoke = remove capability + clear ENSIP-25 attestation; hard = burn token) are ready to run live at the film gate. trace is pre-blessed → clean live **revoke** demo beat available.
- **Cost:** whole ceremony (register + deploy + 6 mints + 1 bless) = **0.0048 SepETH**. Deployer holds **0.5951 SepETH** left → ample for camera bless/revoke.

Tx-hash ledger: see [`ADDRESSES.md`](/shared/tokyo/chain/ens/ADDRESSES.md) §2/§2a and [`chain-ledger.md`](/shared/tokyo/chain-ledger.md). Deployed addrs in [`deployed.env`](/shared/tokyo/chain/ens/deployed.env).

---

## Prior proof — fork rehearsal (M5-4)

**Keeper:** Globy Mahalo 🌊 · **Run:** `run-all-local.sh` against an **anvil fork of Sepolia = the REAL ENSv2 Beta bytecode** (same contract addresses/code as live Sepolia; no real funds or keys spent). Captured 2026-09-25.

## What this proves (honest scope)
- The **exact numbered scripts** (`00`→`05`, `test.sh`) that will run on real Sepolia are run **unchanged** here (only `FORK=1` warps past the 60s commit delay and a fresh no-code EOA is the authorizer). This is a *working local proof + a ready-to-run-on-Sepolia script* — the honest option GLOBY green-lit when a container can't hold real keys.
- ✅ Parent `.eth` register (commit-reveal + MockUSDC) · ✅ UserRegistry + PermissionedResolver proxy deploy · ✅ `setSubregistry` (subnames actually resolve) · ✅ 6 subnames minted · ✅ ENSIP-25 attestation + ENSIP-26 `agent-context`/`agent-endpoint[web]` records · ✅ forward `addr` records · ✅ **EAC bless** (`grantRoles`) · ✅ **soft revoke** (`revokeRoles`) → ✅ **re-bless** (reversible) · ✅ **hard revoke** (`unregister`, token burned) · ✅ **negative auth** (a keyless attacker's `grantRoles`/`unregister` both revert, tx status `0x0`, no roles gained) · ✅ **UniversalResolver** resolves `trace.myagentohana.eth` → agent addr (the viem/frontend path) · ✅ **RPC failover** drill.
- **Two acceptance passes**: `test.sh` reports **26 checks PASS** both *pre-bless* (`hasRoles=false`) and *post-bless* (`hasRoles=true`).
- **Gas:** whole ceremony ≈ **5.3M gas** = **0.0053 ETH @1gwei** (~0.10 ETH @20gwei). Deployer holds ~0.6 SepETH → ample.

## ⚠️ What is NOT yet done (PENDING-SIGNING on real Sepolia)
No real-Sepolia txs were sent this run. The real deploy uses the agent-born `deployer` key (`0x1296…05E7`, ~0.6 SepETH) and is gated on **parent-name ratification** (`myagentohana.eth` pending sysadmin/Shaka) — one `PARENT_LABEL` edit if it changes. Run order on Sepolia: `00`→`01`→`02`→`03`→`test.sh`, then `04`/`05` for the live bless/revoke demo beat.

---

## Captured output (`run-all-local.sh`, color-stripped)

```
▶ starting anvil fork of Sepolia (https://ethereum-sepolia-rpc.publicnode.com) …
  fork up @ block 11779282 chain 11155111
  authorizer(fork)=0x98DAD3A11526035c05639C002B870CC7eD084884  balance 10000.000000000000000000 ETH  code=0x

════════ 00 preflight ════════
RPC live: http://127.0.0.1:8545  (block 11779282)
ENSv2 contracts:
  ✓ ETHRegistry has code (16000 bytes)
  ✓ ETHRegistrar has code (8037 bytes)
  ✓ RootRegistry has code (16000 bytes)
  ✓ VerifiableFactory has code (1403 bytes)
  ✓ UserRegistryImpl has code (18841 bytes)
  ✓ PermResolverImpl has code (15608 bytes)
  ✓ MockUSDC has code (4309 bytes)
  ✓ RootRegistry.getSubregistry('eth') == ETHRegistry
  parent 'myagentohana.eth' available=true price=8000021 [8e6] (MockUSDC, 6dp)
  authorizer 0x98DAD3A11526035c05639C002B870CC7eD084884 balance 10000.000000000000000000 ETH
  MockUSDC decimals=6 (mint(address,uint256) is public — verified open on fork against real bytecode)
PRE-FLIGHT PASS ✅

════════ 01 register parent ════════
== Register parent: myagentohana.eth  (owner/authorizer=0x98DAD3A11526035c05639C002B870CC7eD084884) ==
  minting 17000042 MockUSDC…
  tx 0x92acbe7d61febcfb52d9bec256ff0544587865e346ca52b9a542362fff8820cb status 0x1 gas 51369
  approving registrar…
  tx 0xb9e151adea391be112c9becbd2a0a0fe4b7d8d81dce9e0824a3a9a50051f29bd status 0x1 gas 46366
  commitment=0xba9728b45514063c8ea6551d4f96ceadcf14098dd665c2b67b02761247c21a65
  tx 0x295e28568d07268b35fefe3c4418babb3d7944b0a9a36019f24c94aca540fc61 status 0x1 gas 45438
  warped 90s (fork)
  tx 0x1c9665075f008c5fa4808fcaf8485995f5d48a79332fddc0bcfed546d2b761cf status 0x1 gas 221623
✅ parent myagentohana.eth owned by 0x98DAD3A11526035c05639C002B870CC7eD084884

════════ 02 deploy registry+resolver ════════
== deploy UserRegistry proxy ==
  UserRegistry = 0xecf71dae5d4e0714dbe3207ad26b12bd331b3609
== deploy PermissionedResolver proxy ==
  Resolver = 0x3fb89674c27eeb440ff1c3036f83ea3b181542a1
== setSubregistry(parent -> UserRegistry) ==
  tx 0x0ad1845a69706607f13cb09a23d0193086aebd8e5408b00b18301753bbe25749 status 0x1 gas 57580
  ✓ getSubregistry(myagentohana) == 0xecf71dAe5d4e0714DBE3207Ad26b12Bd331b3609
== grantRootRoles(REGISTRAR|RENEW|UNREGISTER, authorizer) ==
  tx 0xbae293373602fb0813f166671432375821bb60bfe5c58924f2de74ae23d04782 status 0x1 gas 33299
✅ registry+resolver deployed & wired

State written to /tmp/ens-fork.env:
PARENT_OWNER=0x98DAD3A11526035c05639C002B870CC7eD084884
PARENT_LABELHASH=0x255825cd23561773a28c638b14069d53bf8d7ddeb2226d59c42c6604a3fcc3cd
USER_REGISTRY=0xecf71dae5d4e0714dbe3207ad26b12bd331b3609
RESOLVER=0x3fb89674c27eeb440ff1c3036f83ea3b181542a1

════════ 03 mint subnames + records ════════
== Mint myagentohana.eth subnames · registry=0xecf71dae5d4e0714dbe3207ad26b12bd331b3609 · resolver=0x3fb89674c27eeb440ff1c3036f83ea3b181542a1 · expiry=1790944958 ==
   ENSIP-25 registry (ERC-7930) = 0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347

── pit.myagentohana.eth  (owner 0x6550FAe03504BBad713603E06E3E52e4BaD8fFDC, agentId 1) ──
  tx 0x4c35330c6131083ff52e2fe43c25b00b14b0e3fb9280bb96f2adcbac66193075 status 0x1 gas 125317
  tx 0x09e403dae1912a50e14029b7a95b2852e0d528fb243f94eb2a00839fb94831fe status 0x1 gas 250958
  tx 0x3e13e5dd7b7b2bc0c275397dc46bc6bd372823b52becb1c478e46c5a13241b13 status 0x1 gas 114378
  tx 0x506eb56f3de643868c8f7dbce63f7bcb86415f0ec3168e577cd100863cee3ad1 status 0x1 gas 70823
  tx 0x90e78a023c9c674d057f8b4c4a3fa5422cced0d27a24d9f1bd39d92227053713 status 0x1 gas 67372
  ✓ minted + ENSIP-25/26 records set for pit.myagentohana.eth

── shaka.myagentohana.eth  (owner 0x15dA024A78944e463D777fFBb44EA07fB1dc61c5, agentId 2) ──
  tx 0x5e2428972398e3b5243154fd8e2a87c484b0ecc3f59edd43183bf10bed0eb37a status 0x1 gas 125341
  tx 0x068543d2ce87df7694fdf32c50e2ea4f3fb453b7ba58332f9dfaa87e1d521935 status 0x1 gas 210947
  tx 0x8030b0d4e8cb4167f0d5987a53476e54090ec88b61fb33ffc41f9c83955e9a83 status 0x1 gas 114426
  tx 0xa2b27a5666ba661119f362107f64a159207cd07a596e5fb4ea84b48a8b4bb3fa status 0x1 gas 70847
  tx 0xa1c48ae4d49e14ec9f958422eaa333e88f2e351b988609bd9121a0a7fff3e123 status 0x1 gas 67396
  ✓ minted + ENSIP-25/26 records set for shaka.myagentohana.eth

── terri.myagentohana.eth  (owner 0xA747095248E0543f7626555cD1cBE31a34ae1054, agentId 3) ──
  tx 0xbccecb3a7d1e64f42087a8d112d68f9a0657fd4639c5b0c1ae298e663a90632b status 0x1 gas 125341
  tx 0xefb551f7200a2b4f201a81deb2627f8f661996eff74ca6ea36a310bdee1a8026 status 0x1 gas 210911
  tx 0xe44f4e9cdf962d8616fb6251728e2d3a89ea8a1c446b8cc6efedfa80946e2796 status 0x1 gas 114426
  tx 0xac3ebc980fe0109fb12c1af23e59f569c163453718fd6d33eef6a4ed0767442d status 0x1 gas 70847
  tx 0xfc5e352ceddc6da88c085eb2ef2a1ee0a7463552e15e8c8b9dde91a69196c5ae status 0x1 gas 67396
  ✓ minted + ENSIP-25/26 records set for terri.myagentohana.eth

── trace.myagentohana.eth  (owner 0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6, agentId 4) ──
  tx 0x976101f6d736c80ee91b480f12dbe38e40a27d5174a9d249354979fe16622863 status 0x1 gas 125341
  tx 0x948d3c5678e4d01c5790f09813796ec98c4a77385d6e58512be0aca159b574b6 status 0x1 gas 234026
  tx 0x18f448d20dd7fdc2085c44b73c7824fba3450c4b0b852d6e202a8699b4f89022 status 0x1 gas 114426
  tx 0x677ea61c2eb7df61c202e6e3e527cdda47a41006fcb122b3f32c2d7375f1f0fb status 0x1 gas 70847
  tx 0x68fdc790049d376dad5d554da8625982ff3d2989c5b83659d3483ae703061e0d status 0x1 gas 67396
  ✓ minted + ENSIP-25/26 records set for trace.myagentohana.eth

── spector.myagentohana.eth  (owner 0x25556d63520eb0F317B8589F5D45873DdB943145, agentId 5) ──
  tx 0x45db785c4a5beb52cf273dc93108a2f76af79479c61ef6ba94a825a0e8f632c9 status 0x1 gas 125365
  tx 0xb4570146f28a80a27867bb4f2421cb31ccb9f659d2048fffd3124bc65e93e386 status 0x1 gas 234026
  tx 0x3f9820df6582d393a9f18d945ada3422f91ca203654bc8393875ed64da70f865 status 0x1 gas 114474
  tx 0x58e4c823bfaeb7e5b314f77a054969c104982bf62d8f69d4d2e538a45ccadd60 status 0x1 gas 70871
  tx 0x51b51c9b8aa3d30f72a393833bd35d52523cf658dedb961e29656e000c28bcd5 status 0x1 gas 67420
  ✓ minted + ENSIP-25/26 records set for spector.myagentohana.eth

── crops.myagentohana.eth  (owner 0x1296597106008db4273588aDa45b1e9963Ae05E7, agentId 6) ──
  tx 0xcaf42a837f0a64b181f689ac3f408fc6926637c441910f3fcdd6a709a67188ec status 0x1 gas 125329
  tx 0x660f660a7a2087550e68a8a44f9beb39b5dd7c7c8fb6a6e43330cae1fd85ae46 status 0x1 gas 233882
  tx 0xd6a3869bea7ad51a582339b01647519b02e4f8599b0b79a97080239ac87f9305 status 0x1 gas 114426
  tx 0x8b21dbf9777cef745ac417abbc7d294e354786b5a6c125db834d4a73cfc9bc22 status 0x1 gas 70847
  tx 0x8d19a78d560db1df7616b34a1f52e400c6c0f6df56145dcac70c3d2e1c88343c status 0x1 gas 67384
  ✓ minted + ENSIP-25/26 records set for crops.myagentohana.eth
✅ all 6 subnames minted with records

════════ TEST (pre-bless: hasRoles should be false) ════════
════════════════════════════════════════════════════════════
 ENSv2 + EAC acceptance test — myagentohana.eth
════════════════════════════════════════════════════════════
T0 · RPC failover
  ✓ reachable: http://127.0.0.1:8545 (block 11779321)
  ✓ reachable: https://sepolia.gateway.tenderly.co (block 11779283)
  ✓ reachable: https://1rpc.io/sepolia (block 11779282)
  ✓ 3/3 RPC endpoints live
  failover drill: primary='http://127.0.0.1:1' (dead) → pick fallback
    → failover picked https://sepolia.gateway.tenderly.co
  ✓ failover selects a live fallback when primary is dead
  registry=0xecf71dae5d4e0714dbe3207ad26b12bd331b3609  resolver=0x3fb89674c27eeb440ff1c3036f83ea3b181542a1

── pit.myagentohana.eth ──
  ✓ resolve pit.myagentohana.eth → 0x6550FAe03504BBad713603E06E3E52e4BaD8fFDC
  ✓ ENSIP-26 agent-context: ""# pit.myagentohana.eth\nPublic-Inform-Trust ste…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][1] = ""1""
  ✓ registry owner=0x6550FAe03504BBad713603E06E3E52e4BaD8fFDC tokenId=95985796631475195244802922626985627042984270175009060747347726917974360064000
    EAC hasRoles(BLESS_ROLES=0x1000000, 0x6550FAe03504BBad713603E06E3E52e4BaD8fFDC) = false

── shaka.myagentohana.eth ──
  ✓ resolve shaka.myagentohana.eth → 0x15dA024A78944e463D777fFBb44EA07fB1dc61c5
  ✓ ENSIP-26 agent-context: ""# shaka.myagentohana.eth\nThe keeper's named ag…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][2] = ""1""
  ✓ registry owner=0x15dA024A78944e463D777fFBb44EA07fB1dc61c5 tokenId=109529440985646481238556297673383002563178659883221410379659707143827994181632
    EAC hasRoles(BLESS_ROLES=0x1000000, 0x15dA024A78944e463D777fFBb44EA07fB1dc61c5) = false

── terri.myagentohana.eth ──
  ✓ resolve terri.myagentohana.eth → 0xA747095248E0543f7626555cD1cBE31a34ae1054
  ✓ ENSIP-26 agent-context: ""# terri.myagentohana.eth\nReceipt-keeper. Bless…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][3] = ""1""
  ✓ registry owner=0xA747095248E0543f7626555cD1cBE31a34ae1054 tokenId=17146407228866577572740752032851506222391045666302791892059479328671299272704
    EAC hasRoles(BLESS_ROLES=0x1000000, 0xA747095248E0543f7626555cD1cBE31a34ae1054) = false

── trace.myagentohana.eth ──
  ✓ resolve trace.myagentohana.eth → 0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6
  ✓ ENSIP-26 agent-context: ""# trace.myagentohana.eth\nAI Food-Loop steward.…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][4] = ""1""
  ✓ registry owner=0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6 tokenId=35792219046835387940749279610418255378512043918716912016335667257052869165056
    EAC hasRoles(BLESS_ROLES=0x1000000, 0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6) = false

── spector.myagentohana.eth ──
  ✓ resolve spector.myagentohana.eth → 0x25556d63520eb0F317B8589F5D45873DdB943145
  ✓ ENSIP-26 agent-context: ""# spector.myagentohana.eth\nConsent-security sc…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][5] = ""1""
  ✓ registry owner=0x25556d63520eb0F317B8589F5D45873DdB943145 tokenId=99702279813415348424501230544707628735773860807342633484224254149822888542208
    EAC hasRoles(BLESS_ROLES=0x1000000, 0x25556d63520eb0F317B8589F5D45873DdB943145) = false

── crops.myagentohana.eth ──
  ✓ resolve crops.myagentohana.eth → 0x1296597106008db4273588aDa45b1e9963Ae05E7
  ✓ ENSIP-26 agent-context: ""# crops.myagentohana.eth\nRepo-hygiene / secret…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][6] = ""1""
  ✓ registry owner=0x1296597106008db4273588aDa45b1e9963Ae05E7 tokenId=2832781007841436546325305874659791062602015078834123691506831483371442405376
    EAC hasRoles(BLESS_ROLES=0x1000000, 0x1296597106008db4273588aDa45b1e9963Ae05E7) = false

════════════════════════════════════════════════════════════
RESULT: PASS ✅  (26 checks)

════════ 04 BLESS all ════════
── BLESS pit.myagentohana.eth (agent 0x6550FAe03504BBad713603E06E3E52e4BaD8fFDC, roles 0x1000000) ──
  tx 0xcfe58988c472a20ad515642bb2a1587620e8cb6729dccab0480df6cb0077db73 status 0x1 gas 146626
  ✓ blessed · hasRoles=true · new tokenId=95985796631475195244802922626985627042984270175009060747347726917974360064001 (regenerated)
── BLESS shaka.myagentohana.eth (agent 0x15dA024A78944e463D777fFBb44EA07fB1dc61c5, roles 0x1000000) ──
  tx 0x8cc4c726b1c8752dc23c5c6044313cbcbf70c66b21f909e34680d9318c5435ce status 0x1 gas 146626
  ✓ blessed · hasRoles=true · new tokenId=109529440985646481238556297673383002563178659883221410379659707143827994181633 (regenerated)
── BLESS terri.myagentohana.eth (agent 0xA747095248E0543f7626555cD1cBE31a34ae1054, roles 0x1000000) ──
  tx 0x476e7233d91a5dee5e9f6fe772deb82f5e5206b73e0b6cf19159435f6c4f2684 status 0x1 gas 146626
  ✓ blessed · hasRoles=true · new tokenId=17146407228866577572740752032851506222391045666302791892059479328671299272705 (regenerated)
── BLESS trace.myagentohana.eth (agent 0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6, roles 0x1000000) ──
  tx 0xf97528ab34b6dc293b4c93e313c6272988560a6b3b55a4aecbd7739c758dc6a0 status 0x1 gas 146626
  ✓ blessed · hasRoles=true · new tokenId=35792219046835387940749279610418255378512043918716912016335667257052869165057 (regenerated)
── BLESS spector.myagentohana.eth (agent 0x25556d63520eb0F317B8589F5D45873DdB943145, roles 0x1000000) ──
  tx 0x397844f5cddf5c5838ac3619468da8f6f285a6711f96dee79ad8541411ee11a9 status 0x1 gas 146626
  ✓ blessed · hasRoles=true · new tokenId=99702279813415348424501230544707628735773860807342633484224254149822888542209 (regenerated)
── BLESS crops.myagentohana.eth (agent 0x1296597106008db4273588aDa45b1e9963Ae05E7, roles 0x1000000) ──
  tx 0x628ccedbc2f9b22671835df1aa6259d044e0383ccc21d2b368ef4a0746214065 status 0x1 gas 146614
  ✓ blessed · hasRoles=true · new tokenId=2832781007841436546325305874659791062602015078834123691506831483371442405377 (regenerated)
✅ bless complete

════════ TEST (post-bless: hasRoles should be true) ════════
════════════════════════════════════════════════════════════
 ENSv2 + EAC acceptance test — myagentohana.eth
════════════════════════════════════════════════════════════
T0 · RPC failover
  ✓ reachable: http://127.0.0.1:8545 (block 11779327)
  ✓ reachable: https://sepolia.gateway.tenderly.co (block 11779283)
  ✓ reachable: https://1rpc.io/sepolia (block 11779282)
  ✓ 3/3 RPC endpoints live
  failover drill: primary='http://127.0.0.1:1' (dead) → pick fallback
    → failover picked https://sepolia.gateway.tenderly.co
  ✓ failover selects a live fallback when primary is dead
  registry=0xecf71dae5d4e0714dbe3207ad26b12bd331b3609  resolver=0x3fb89674c27eeb440ff1c3036f83ea3b181542a1

── pit.myagentohana.eth ──
  ✓ resolve pit.myagentohana.eth → 0x6550FAe03504BBad713603E06E3E52e4BaD8fFDC
  ✓ ENSIP-26 agent-context: ""# pit.myagentohana.eth\nPublic-Inform-Trust ste…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][1] = ""1""
  ✓ registry owner=0x6550FAe03504BBad713603E06E3E52e4BaD8fFDC tokenId=95985796631475195244802922626985627042984270175009060747347726917974360064001
    EAC hasRoles(BLESS_ROLES=0x1000000, 0x6550FAe03504BBad713603E06E3E52e4BaD8fFDC) = true

── shaka.myagentohana.eth ──
  ✓ resolve shaka.myagentohana.eth → 0x15dA024A78944e463D777fFBb44EA07fB1dc61c5
  ✓ ENSIP-26 agent-context: ""# shaka.myagentohana.eth\nThe keeper's named ag…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][2] = ""1""
  ✓ registry owner=0x15dA024A78944e463D777fFBb44EA07fB1dc61c5 tokenId=109529440985646481238556297673383002563178659883221410379659707143827994181633
    EAC hasRoles(BLESS_ROLES=0x1000000, 0x15dA024A78944e463D777fFBb44EA07fB1dc61c5) = true

── terri.myagentohana.eth ──
  ✓ resolve terri.myagentohana.eth → 0xA747095248E0543f7626555cD1cBE31a34ae1054
  ✓ ENSIP-26 agent-context: ""# terri.myagentohana.eth\nReceipt-keeper. Bless…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][3] = ""1""
  ✓ registry owner=0xA747095248E0543f7626555cD1cBE31a34ae1054 tokenId=17146407228866577572740752032851506222391045666302791892059479328671299272705
    EAC hasRoles(BLESS_ROLES=0x1000000, 0xA747095248E0543f7626555cD1cBE31a34ae1054) = true

── trace.myagentohana.eth ──
  ✓ resolve trace.myagentohana.eth → 0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6
  ✓ ENSIP-26 agent-context: ""# trace.myagentohana.eth\nAI Food-Loop steward.…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][4] = ""1""
  ✓ registry owner=0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6 tokenId=35792219046835387940749279610418255378512043918716912016335667257052869165057
    EAC hasRoles(BLESS_ROLES=0x1000000, 0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6) = true

── spector.myagentohana.eth ──
  ✓ resolve spector.myagentohana.eth → 0x25556d63520eb0F317B8589F5D45873DdB943145
  ✓ ENSIP-26 agent-context: ""# spector.myagentohana.eth\nConsent-security sc…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][5] = ""1""
  ✓ registry owner=0x25556d63520eb0F317B8589F5D45873DdB943145 tokenId=99702279813415348424501230544707628735773860807342633484224254149822888542209
    EAC hasRoles(BLESS_ROLES=0x1000000, 0x25556d63520eb0F317B8589F5D45873DdB943145) = true

── crops.myagentohana.eth ──
  ✓ resolve crops.myagentohana.eth → 0x1296597106008db4273588aDa45b1e9963Ae05E7
  ✓ ENSIP-26 agent-context: ""# crops.myagentohana.eth\nRepo-hygiene / secret…"
  ✓ ENSIP-25 agent-registration[0x0001000003aa36a71462412fca6437b914edd87b85455682ec73968347][6] = ""1""
  ✓ registry owner=0x1296597106008db4273588aDa45b1e9963Ae05E7 tokenId=2832781007841436546325305874659791062602015078834123691506831483371442405377
    EAC hasRoles(BLESS_ROLES=0x1000000, 0x1296597106008db4273588aDa45b1e9963Ae05E7) = true

════════════════════════════════════════════════════════════
RESULT: PASS ✅  (26 checks)

════════ NEGATIVE AUTH (only the authorizer may bless/revoke) ════════
  attacker=0x62B939567BB2a04a20897D031ed25a3284708259 (no roles) tries grantRoles on pit → must NOT succeed:
  ✓ attacker grantRoles blocked (tx status=0x0, attacker hasRoles=false)
  attacker tries unregister on pit → must NOT succeed:
  ✓ attacker unregister blocked (tx status=0x0, pit status still REGISTERED=2)
  pit still owned by 0x6550FAe03504BBad713603E06E3E52e4BaD8fFDC, still blessed=true

════════ UniversalResolver proof (the viem/frontend path) ════════
  UniversalResolver.resolve(trace.myagentohana.eth, addr) via 0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe :
0x0000000000000000000000005e7d0b5bf18c8f73977d067cefc211befd8ce2d6
0x3FB89674c27EEb440fF1c3036F83EA3b181542a1

════════ 05 SOFT-REVOKE trace ════════
── SOFT REVOKE trace.myagentohana.eth (revokeRoles 0x1000000 + clear ENSIP-25) ──
  tx 0x8a60dc99757b92815842292fcfc4379a9e3a72094d9c2c86889109b600fb2dc2 status 0x1 gas 84740
  tx 0x8497f37978149461960f3dfc89d4f9d49c242fce3c648590c7c8b5d00d56b42f status 0x1 gas 48507
  ✓ revoked · hasRoles=false · tokenId=35792219046835387940749279610418255378512043918716912016335667257052869165058 (regenerated) · re-bless with 04-bless.sh
✅ revoke (soft) complete

════════ 04 RE-BLESS trace (reversible proof) ════════
── BLESS trace.myagentohana.eth (agent 0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6, roles 0x1000000) ──
  tx 0x25f1e90c8e6a4b82a66ea1f198e2c4b16f60570292e7b1f64085adfa8c322384 status 0x1 gas 129526
  ✓ blessed · hasRoles=true · new tokenId=35792219046835387940749279610418255378512043918716912016335667257052869165059 (regenerated)
✅ bless complete

════════ 05 HARD-REVOKE spector ════════
── HARD REVOKE spector.myagentohana.eth (unregister) ──
  tx 0xd502786565bb710f5db57d1f9e7a99758ee5a58d07d45ebf8aeba248f694970e status 0x1 gas 55564
  ✓ burned · getState.status=0 (0=AVAILABLE) · owner now 0x0
✅ revoke (hard) complete

▶ stopping fork
DONE. State: /tmp/ens-fork.env
```
