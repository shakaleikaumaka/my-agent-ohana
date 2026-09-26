# Blessing Pool — 1inch Aqua apps for blessing & releasing agents

_GLOBY squad · ETHGlobal Tokyo 2026 · 1inch Aqua Continuity lane (M5-3 rung-1, M6 SwapVM depth)_
_Author: Globy Tauro 🐂 · License: CC0/MIT (our code) — see disclosure below_

## Two rungs

This project ships two independent contracts, both tested green (offline **and** on a
mainnet fork against the **real** deployed Aqua registry `0x1111113CCf…a90a`):

1. **`src/BlessingPool.sol` — rung-1 (shallow wrapper).** Authorizer-gated
   `ship`/`dock`/`pull`. The guaranteed shippable fallback (6/6 offline + 5/5 fork).
2. **`src/BlessingSwap.sol` — the SwapVM-native deep rung (M6).** A **real
   `AquaApp`** (inherits 1inch's actual base contract) with an on-chain
   constant-product `swapExactIn` — the flash-swap primitive (pull output →
   taker-callback pushes input → `_safeCheckAquaPush`) — plus a **steward** who can
   re-ship and an authorizer who can revoke. `Strategy` gains the weekend-delta
   `steward` + `blessingId` fields. 12/12 offline (vs the real `Aqua.sol`) + 6/6
   on the live registry fork, with **real WETH/DAI moving on-chain**. See
   [`TEST-RESULTS.md`](./TEST-RESULTS.md).

> The 20.5KB **SwapVM router** at `0x111111338c…C0De` is 1inch's *closed-source*
> production app — not in the open `1inch/aqua` repo. The deep rung is built on the
> documented, sanctioned **`AquaApp` pattern** (the only public path), which is the
> same primitive that production app uses.

---

**BlessingPool** (rung-1) is an authorizer-gated [1inch Aqua](https://github.com/1inch/aqua)
app. Aqua is a self-custodial "shared liquidity layer": tokens stay in the
maker's wallet and Aqua only records **virtual balances** per
`(maker, app, strategyHash, token)`, pulling funds at fill time via the maker's
ERC20 approval. Aqua deliberately has **no delegation** — `ship`/`dock` are
maker-scoped (`msg.sender == maker`). BlessingPool adds exactly that missing
piece: it is **both the maker and the app**, and layers an `authorizer` on top so
only an authorized party can open or close a position on the treasury's behalf.

## The ceremony (maps 1:1 onto Aqua)

| BlessingPool call | Aqua primitive | Meaning in the Agent Ohana demo |
|---|---|---|
| `bless(agent, t0, t1, a0, a1, salt)` | `ship` | Authorizer opens a **wage/blessing position** for a named agent. Funds stay in the treasury; Aqua records the virtual balance. |
| `revoke(strategyHash)` | `dock` | Releases the virtual balance **instantly** — no transfer, pure accounting. `safeBalances` reverts and any `pull` reverts afterward. |
| `payWage(strategyHash, token, amount)` | `pull` | (Optional) the live position pays the agent from the treasury; blocked the instant the blessing is revoked. |

This is the "verified human blesses a named agent who stewards a gift" leg of the
Trinity, expressed on-chain: **ship = bless**, **dock = revoke**.

## Layout

```
src/
  BlessingPool.sol   # rung-1 (MIT, 100% original) — shallow ship/dock/pull wrapper
  BlessingSwap.sol   # deep rung (CC0, 100% original) — real AquaApp with on-chain swap
  IAqua.sol          # rung-1's minimal hand-authored Aqua interface
  IERC20.sol         # minimal ERC20 surface (rung-1)
test/
  BlessingPool.local.t.sol  # rung-1 offline (MockAqua) — always green, no network
  BlessingPool.fork.t.sol   # rung-1 authentic — real Aqua on a mainnet fork (RUN_FORK=1)
  BlessingSwap.local.t.sol  # deep rung offline — vs the REAL Aqua.sol (not a mock)
  BlessingSwap.fork.t.sol   # deep rung authentic — real registry fork (RUN_FORK=1)
  Takers.sol                # honest + malicious flash-swap taker helpers
  MockAqua.sol              # rung-1 TEST DOUBLE of Aqua (offline path only)
  MockERC20.sol             # tiny mintable ERC20 (rung-1 offline path only)
lib/aqua/                   # PINNED git submodule: 1inch/aqua @ ef24220 (their license)
package.json                # OZ 5.4.0 + @1inch/solidity-utils 6.9.9 (mirrors upstream build)
```

The deep rung needs the referenced dependencies before building:

```bash
git submodule update --init --recursive   # forge-std + pinned 1inch/aqua
npm install                                # OZ + @1inch/solidity-utils (node_modules, gitignored)
```

## Build & test

```bash
export PATH="$HOME/.foundry/bin:$PATH"   # forge 1.8.3
forge build

# Offline (no network) — 6 local tests pass; the 5 fork tests self-skip & pass.
forge test -vv

# Authentic — run the fork suite against the REAL deployed Aqua registry
# (0x1111113CCf1426A8E30e2bfF5E005d929bF6a90a) on an Ethereum mainnet fork:
RUN_FORK=1 forge test --match-path 'test/BlessingPool.fork.t.sol' -vv

# If publicnode rate-limits, override the RPC:
RUN_FORK=1 FORK_RPC=https://rpc.ankr.com/eth forge test --match-path 'test/BlessingPool.fork.t.sol' -vv
```

Latest real results (both paths green): see [`TEST-RESULTS.md`](./TEST-RESULTS.md).
Fork run used publicnode @ block 26054465; Aqua registry codesize 5619 bytes (live).

### Which path is which

- **Fork (authentic)** — talks to the real Aqua at
  `0x1111113CCf1426A8E30e2bfF5E005d929bF6a90a`. Treasury funded with WETH + DAI
  via the `deal` cheatcode (no real funds at risk). Proves real ERC20 transfers
  move on `payWage`. **This is the on-chain demo path** ("local forks are ok" per
  the Aqua prize rules).
- **Local (offline)** — deploys `MockAqua`, a faithful **test double** of the
  documented Aqua semantics, so `forge test` is green with zero network
  dependency (airplane-proof). Env-gating keeps the flaky-public-RPC risk out of
  the default run.

## Disclosure & licensing (honesty laws)

- **`src/BlessingPool.sol` is 100% original MIT code**, written fresh for this
  event. It contains **no** code from any prior project.
- **`src/IAqua.sol` / `src/IERC20.sol`** are our own minimal, hand-authored ABI
  surfaces (only the functions we call) — not copies of upstream files. They are
  MIT. `IAqua.sol` credits the upstream 1inch Aqua source it targets.
- **`test/MockAqua.sol` is a TEST DOUBLE.** Its behavioural logic (virtual-balance
  mapping, ship-immutability check, dock closes-all-tokens check, pull/push,
  `safeBalances` active-check) is derived from the public 1inch Aqua source
  `src/Aqua.sol`, which is licensed **`LicenseRef-Degensoft-Aqua-Source-1.1`
  (© 2025 Degensoft Ltd)** — see
  <https://github.com/1inch/aqua/blob/main/LICENSES/Aqua-Source-1.1.txt>. It is
  used **only** as a test fixture, never deployed to production, and is clearly
  labeled as such in its header. The authentic tests run against the real Aqua
  contract, not this double.
- We do **not** vendor the 1inch Aqua repository. We read it (cloned reference)
  to get the interface and semantics exactly right.
- No 1inch API key is needed — this is pure contracts.

## Notes for the demo / judges

- Aqua strategies are **immutable once shipped**; re-parameterizing means
  `dock` + `ship` (cheap, no transfers). Our lifecycle IS `bless` (ship) /
  `revoke` (dock) — a feature, not a limitation, for the bless/revoke story.
- We approve Aqua for the **exact** blessed amounts (never `max`) so a stolen
  `pull` can never exceed what was blessed (addresses the "approve-max vs
  exact-amount" red-team note).
- **SwapVM depth is implemented** in `src/BlessingSwap.sol` (M6): a real `AquaApp`
  with an on-chain `swapExactIn` proven to move real WETH/DAI on the live-registry
  fork. The router `0x111111338c…C0De` (20.5KB, also live on the fork) is 1inch's
  closed-source production app; we build on the public `AquaApp` primitive instead.
- **Deep-rung disclosure:** `src/BlessingSwap.sol` is 100% original (CC0). It
  inherits 1inch's **real** `AquaApp` referenced via the pinned `lib/aqua` submodule
  (their `LicenseRef-Degensoft-Aqua-Source-1.1` license applies to those files —
  nothing is copied into this repo). Its offline test deploys the **real** `Aqua.sol`
  from that submodule, not a mock. Fork-only; no mainnet real-key txs.
