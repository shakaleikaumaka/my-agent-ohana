# 🗺️ TESTNET TRUTH & THE ROAD TO MAINNET

**Rule we build by: mechanisms first, money later.** Everything consequential runs — for real —
on **Ethereum Sepolia**, and every value-bearing token in the demo is a **deliberately valueless
mock**. This page says exactly what is real, what is mock *on purpose*, and how it goes to
mainnet. (Mirrored live in the roadmap section at the bottom of myagentohana.com.)

## ✅ What is REAL on Sepolia, today

| Piece | Address / proof |
|---|---|
| ENSv2 parent `myagentohana.eth` + **10 agent subnames** (orbie, trace, terri, pit, spector, crops, shaka, oso, globy, registry) | `contracts/ens/ADDRESSES.md` — register/bless txs pinned |
| **EAC roles** — bless = grantRoles, revoke = revokeRoles, attestations set/cleared | ceremony scripts `contracts/ens/00–06`, 38-check test |
| **UserRegistry** (ENSv2 PermissionedRegistry) `0x62c1e3e88802A5547d0956a6Cf1fa6703D8e3c20` | `registry.myagentohana.eth` resolves to it — *don't trust, check* |
| **1inch Aqua registry** (real Aqua source, hackathon redeploy) `0xCE1C50ce349aC075b227585C84DA22d4B7fa3360` | `contracts/aqua/` |
| **BlessingPool** strategy (shipped, virtual balances chain-verified) `0xd29110bEd6E896701A26202eE59E79C9b82F2e51` | fork tests + live reads on the site |
| **PoolGuard** — one verified human, one capped pool slot (1%); World ID `sub` never stored raw (keccak only) `0xabe7F81D58172e06E32C418826e338D3739c292f` | `contracts/aqua/src/PoolGuard.sol`, 5/5 forge |
| **World ID consent sessions** — real device-code flow vs World sandbox auth, real JWKS verify | `consent-server/` (CF Worker + Durable Object) |
| **agent-records convention** — prices & endpoints *in the name* (`agent:price`, `agent:pay`, `agent:endpoint`…) on `spector.myagentohana.eth` | `contracts/ens/AGENT-RECORDS.md` — answers the ENS keynote ask from Friday |

## 🎭 What is MOCK — on purpose

`GIFT` and `ALOHA` are **valueless MockERC20s on Sepolia, by design**. Three reasons:

1. **Real-value law** — we don't put strangers' money at risk during a 36-hour build. Ever.
2. **The mechanism is the proof** — custody-keeping virtual balances, personhood-capped slots,
   and revocable blessings are what's being judged; those run identically with mock tokens.
3. **Security before liquidity** — no audit, no mainnet value. Full stop.

Nothing on the demo site sells or offers a token.

## 🌕 The road to mainnet — four phases

1. **Harden** — external audit of BlessingPool + PoolGuard + consent server; multisig ownership;
   World ID production (orb) credentials replacing sandbox.
2. **Real agent tokens** — each ʻohana agent gets its real ticker and treasury, priced in its
   ENS name per the agent-records convention (the name is the storefront).
3. **Mainnet Aqua, three chains** — the pool mechanics deployed against production 1inch Aqua.
4. **Guarded human LP** — open liquidity with PoolGuard live: one verified human, one slot,
   capped share; sybil crowds structurally locked out.

## ⛓️ The ≥3-chain launch — every agent, near future

Every agent in the family launches on **at least three chains: Ethereum, Base, and BNB Chain**
— identity anchored once in ENS, execution wherever the users are:

- **Artifacts are chain-agnostic today**: the Aqua deploy scripts take a chain RPC + registry
  constant; the ENS identity layer stays the single source of naming/roles; the x402 payment
  lane already settles in USDC on Base.
- **Ethereum + Base launch is automated** in the launch tooling; **BNB is a deliberate manual
  ceremony** (a human blesses each chain expansion — consent applies to the agents' own
  economic lives too).
- Cross-chain record pointers use CAIP-10/CAIP-19 form (see `agent:registry` records), so a
  resolver on any chain can find the canonical registry.

**Same principle at every layer: names that resolve, humans that consent, mechanisms proven on
testnet before a single dollar is at stake — then three chains, every agent, with receipts.**
