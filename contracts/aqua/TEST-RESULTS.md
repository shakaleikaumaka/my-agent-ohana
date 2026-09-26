# Blessing Pool — Test Results (real output)

_Recorded by Globy Tauro 🐂 · ETHGlobal Tokyo 2026 · 1inch Aqua Continuity lane_
_Rung-1 (M5-3): 2026-09-25 · SwapVM-native deep rung (M6): 2026-09-26_

This project ships **two rungs** against 1inch Aqua, both green:

| Rung | Contract | What it proves | Offline | Mainnet fork (real registry) |
|---|---|---|---|---|
| **Rung-1 (shallow wrapper)** | [`src/BlessingPool.sol`](src/BlessingPool.sol) | authorizer-gated ship/dock/pull (delegation Aqua lacks) | **6/6** (MockAqua) | **5/5** vs real `Aqua` |
| **Deep rung (SwapVM-native)** | [`src/BlessingSwap.sol`](src/BlessingSwap.sol) | a REAL `AquaApp` with an on-chain constant-product `swapExactIn` (flash-swap: pull → taker-callback push → `_safeCheckAquaPush`) + steward re-ship + revoke | **12/12** (vs real `Aqua.sol`) | **6/6** vs real registry |

**Grand total: `forge test` = 29 passed / 0 failed** (offline; fork suites self-skip). With `RUN_FORK=1`, both fork suites run for real → still **29 passed / 0 failed**.

Live registry `0x1111113CCf1426A8E30e2bfF5E005d929bF6a90a` confirmed on the fork (`codesize = 5619 bytes`). The 1inch **SwapVM router** `0x111111338c5091E8440b67B168bAe16a668AC0De` is also live (`codesize = 20541 bytes`) — that address is 1inch's **closed-source production app** (not in the open `1inch/aqua` repo), so the depth here is built on the **documented, sanctioned `AquaApp` pattern** (the only public path), which is the same primitive that closed-source app uses.

---

## Deep rung — SwapVM-native `BlessingSwap` (M6)

### Known-good baseline (upstream 1inch/aqua example suite, on my fork)
Before extending, the upstream repo's own tests were brought green as a baseline:

```
forge test                    -> 50 passed / 0 failed  (core Aqua suites)
FOUNDRY_TEST=examples/test forge test --match-contract XYCSwap
                              -> 22 passed / 0 failed  (the canonical AquaApp swap)
```

`BlessingSwap` inherits 1inch's **real** `AquaApp` (via the pinned `lib/aqua` submodule) and reuses that exact `swapExactIn` shape (constant product, reentrancy transient-lock, `_safeCheckAquaPush`), then adds the weekend delta.

### The weekend delta (what didn't exist before)
- `Strategy` gains **`address steward`** + **`bytes32 blessingId`** (ties the Aqua strategy to the World-ID/ENS blessing ceremony).
- **Delegation / access control** Aqua deliberately lacks: `bless`/`revoke` are authorizer-gated; `reship` is gated to the **named steward** (or authorizer) and is invariant-checked so a steward can re-tune but never re-assign the gift.
- The full ceremony maps 1:1 onto the Aqua strategy lifecycle: `bless == ship`, `reship == dock+ship`, `revoke == dock`, and `swapExactIn` is the only moment real ERC-20s move.

### Commands
```bash
export PATH="$HOME/.foundry/bin:$PATH"
npm install                # OZ 5.4.0 + @1inch/solidity-utils 6.9.9 (mirrors upstream build)
git submodule update --init --recursive   # forge-std + pinned 1inch/aqua
forge build

# Offline (no network): rung-1 MockAqua + deep-rung vs REAL Aqua.sol; fork suites self-skip.
forge test -vv

# Authentic mainnet fork vs the LIVE registry:
RUN_FORK=1 forge test --match-path 'test/BlessingSwap.fork.t.sol' -vv
RUN_FORK=1 forge test        # everything, both fork paths real
```

### `forge test` offline — real output
```
Ran 6 tests for test/BlessingSwap.fork.t.sol:BlessingSwapForkTest
[PASS] test_fork_bless_opens_on_real_registry() (gas: 2626)   <- self-skip (RUN_FORK unset)
[PASS] test_fork_malicious_taker_reverts() (gas: 2501)
[PASS] test_fork_only_authorizer_can_bless_and_revoke() (gas: 2391)
[PASS] test_fork_revoke_kills_next_swap() (gas: 2589)
[PASS] test_fork_steward_reship() (gas: 2419)
[PASS] test_fork_swap_moves_real_erc20() (gas: 2617)
Suite result: ok. 6 passed; 0 failed; 0 skipped

Ran 12 tests for test/BlessingSwap.local.t.sol:BlessingSwapLocalTest
[PASS] test_bless_opens_strategy_zero_token_movement() (gas: 278047)
[PASS] test_double_bless_reverts() (gas: 255734)
[PASS] test_double_revoke_reverts() (gas: 303591)
[PASS] test_malicious_taker_cannot_steal() (gas: 618113)
[PASS] test_only_authorizer_can_bless() (gas: 41719)
[PASS] test_only_authorizer_can_revoke() (gas: 254264)
[PASS] test_reship_cannot_reassign_blessing() (gas: 262697)
[PASS] test_reship_requires_steward_or_authorizer() (gas: 262503)
[PASS] test_revoke_kills_next_swap() (gas: 454328)
[PASS] test_steward_reship_reparameterizes() (gas: 581473)
[PASS] test_swap_moves_real_erc20() (gas: 407523)
[PASS] test_swap_respects_min_out() (gas: 274289)
Suite result: ok. 12 passed; 0 failed; 0 skipped

(+ rung-1: BlessingPool.local 6/6, BlessingPool.fork 5/5 self-skip)
Ran 4 test suites: 29 tests passed, 0 failed, 0 skipped (29 total tests)
```

### `RUN_FORK=1` — the beat chain, executed on a mainnet fork @ block 26056935
```
Ran 6 tests for test/BlessingSwap.fork.t.sol:BlessingSwapForkTest
[PASS] test_fork_bless_opens_on_real_registry() (gas: 246201)
[PASS] test_fork_malicious_taker_reverts() (gas: 634860)
[PASS] test_fork_only_authorizer_can_bless_and_revoke() (gas: 279863)
[PASS] test_fork_revoke_kills_next_swap() (gas: 438242)
[PASS] test_fork_steward_reship() (gas: 563375)
[PASS] test_fork_swap_moves_real_erc20() (gas: 412765)
Suite result: ok. 6 passed; 0 failed; 0 skipped
```

### On-chain proof — the swap moves REAL WETH/DAI (from `-vvvv` trace)
A 1 WETH exact-in swap against a 5 WETH / 10,000 DAI blessing (0.30% fee), settled on the fork against the live registry:

```
emit Pulled(maker=BlessingSwap, app=BlessingSwap, token=DAI,  amount=1662.497915624478906119)   # maker -> recipient
  emit Transfer(from=BlessingSwap, to=recipient, amount=1662.497… DAI)   # REAL DAI moved
emit Pushed(maker=BlessingSwap, app=BlessingSwap, token=WETH, amount=1.0)                        # taker -> maker
  emit Transfer(from=HonestTaker, to=BlessingSwap, amount=1.0 WETH)      # REAL WETH moved
emit Swapped(taker=HonestTaker, tokenIn=WETH, tokenOut=DAI, amountIn=1.0, amountOut=1662.497…)
```
Constant product check: `out = (1·0.997·10000)/(5 + 1·0.997) = 1662.4979…` ✓. This satisfies the "real on-chain execution / real ERC-20 transfers" criterion — not virtual accounting alone.

### What each beat proves (against the live registry)
- **bless == ship**: opens the strategy for the named steward; `safeBalances` returns the virtual balances; **real ERC-20 balances of the treasury are unchanged** (zero token movement — the magic).
- **swapExactIn**: the flash-swap pulls the output to the taker, the taker callback pushes the input back, `_safeCheckAquaPush` verifies it — **real WETH/DAI transfers** on-chain; virtual balances track the trade.
- **reship == dock+ship**: the **steward** re-parameterizes (new fee); the old strategy's `safeBalances` reverts (dead), the new one trades at the new fee. Blessing identity (`steward`+`blessingId`) is invariant.
- **revoke == dock**: instant; `safeBalances` reverts → the **very next `swapExactIn` reverts** (`SafeBalancesForTokenNotInActiveStrategy`). The gift dies the moment consent is withdrawn.
- **safety**: a malicious taker that keeps the pulled output but never pushes → whole swap reverts (`AquaApp.MissingTakerAquaPush`), **no DAI leaked**. Access control (`NotAuthorizer` / `NotStewardOrAuthorizer` / `ReshipMustKeepBlessing`) holds on the live registry.

---

## Rung-1 — `BlessingPool` (guaranteed shippable fallback, unchanged)

| Path | File | Result |
|---|---|---|
| Offline (MockAqua test double) | `test/BlessingPool.local.t.sol` | **6 passed, 0 failed** |
| Mainnet fork (real Aqua registry) | `test/BlessingPool.fork.t.sol` | **5 passed, 0 failed** |

`bless==ship` / `revoke==dock` (instant release) / `payWage==pull` (real WETH moves pool→agent, blocked after revoke). Only-authorizer-dock + double-dock-revert covered. This rung is **intact and green** — it remains the demo-solid fallback if the deep rung isn't chosen at the moon gate.

---

## Caveats (honest)
- The fork pins to whatever block the public RPC serves at run time (26056935 on this run); re-runs use a newer block — behaviour is block-agnostic.
- `deal` funds the treasury + taker with WETH/DAI (both deal-friendly, standard `balanceOf` slots). **No real funds are used or at risk. Fork-only — no mainnet real-key txs.**
- The 1inch Aqua base contracts (`AquaApp`/`Aqua`/`IAqua`) are **referenced via the pinned `lib/aqua` git submodule** and remain under their own license (LicenseRef-Degensoft-Aqua-Source-1.1). Nothing from that repo is copied into this CC0 project — we inherit the real base so our swap runs on identical primitives.
- The deep rung requires EIP-1153 transient storage (`AquaApp`'s reentrancy lock) → `evm_version = "cancun"` in `foundry.toml`. Any post-Cancun chain / fork (incl. the live registry's chains) supports it.
- `bless`/`reship` use exact-amount `approve` (not max) so a pull can never exceed what was blessed. Pair is WETH/DAI (both return-bool ERC-20s); non-standard tokens (e.g. USDT) would need `forceApprove` — out of scope for the demo pair.
