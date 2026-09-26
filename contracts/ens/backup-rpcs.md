# 🛰️ BACKUP RPCs — Sepolia demo survival (P0-7)

**Keeper:** Globy Mahalo 🌊 · pre-flighted 2026-09-25 from the agent container. Goal: the ENS/chain leg of the demo **never dies on a dead RPC**. Three tiers: public failover (built into every script) → 2 keyed RPCs (Shaka) → local anvil fork (airplane-proof).

## Tier 1 — Public endpoints (built into `config.sh` + `lib.sh rpc_pick()`)
Live-probed just now (3× `eth_blockNumber`):

| Endpoint | HTTP | Latency | Verdict |
|---|---|---|---|
| `https://ethereum-sepolia-rpc.publicnode.com` | 200 | ~0.13s | ✅ **PRIMARY** (`ENS_RPC`) |
| `https://sepolia.gateway.tenderly.co` | 200 | ~0.07s | ✅ **FALLBACK 1** (fastest; note: rate-limits under write bursts → 429, backoff) |
| `https://1rpc.io/sepolia` | 200 | ~5.8s | ⚠️ **FALLBACK 2** (works but slow/flaky free tier — last resort) |
| `https://rpc.ankr.com/eth_sepolia` | 200 | — | ⛔ now requires API key (Unauthorized) |
| `https://sepolia.drpc.org` | 400 | — | ⛔ Sepolia not on free plan |
| `https://rpc.sepolia.org` | 404 | — | ⛔ dead (2026) |

`rpc_pick()` tries primary→fallback1→fallback2 and returns the first that answers `eth_blockNumber`. **`test.sh` includes a failover drill** (kills the primary → confirms a live fallback is selected) — passes.

## Tier 2 — Keyed RPCs (⚠️ PENDING SHAKA — keys = Shaka only)
Two keyed providers eliminate the free-tier flakiness/rate-limits during the live demo. **I hold no keys** (chain-of-command law). Ask Shaka to create free accounts and drop the URLs into env before the venue:

```bash
# add to the demo machine's env (NOT committed — keys never in git)
export ENS_RPC="https://eth-sepolia.g.alchemy.com/v2/<ALCHEMY_KEY>"          # keyed primary
export ENS_RPC_FALLBACK_1="https://sepolia.infura.io/v3/<INFURA_KEY>"        # keyed fallback
export ENS_RPC_FALLBACK_2="https://ethereum-sepolia-rpc.publicnode.com"      # public safety net
```
- **Alchemy** (`dashboard.alchemy.com` → create app → Ethereum → Sepolia) — generous free tier, stable under bursts. Recommended keyed PRIMARY.
- **Infura** (`infura.io` → API key → enable Sepolia) — recommended keyed FALLBACK.
- Once set, every script + the frontend (`ADDRESSES.md §5`) picks them up automatically — no code change. Pre-flight at the venue with `00-preflight.sh` (it prints which RPC won and the block height).
- ⏱️ **Do this Fri night / Sat AM** so we're not registering accounts at the booth.

## Tier 3 — Local anvil fork (AIRPLANE-PROOF, no network at all)
If venue wifi + mobile data both die, the **entire ENS ceremony runs offline** against a fork of the last-known Sepolia state — this is exactly what `run-all-local.sh` does and what `TEST-RESULTS.md` captured (real ENSv2 bytecode, 26/26 checks, bless+revoke). Recipe:
```bash
# on the demo machine, one-time (needs a recent block cached OR a working RPC to fork from once):
anvil --fork-url https://ethereum-sepolia-rpc.publicnode.com --port 8545 &
# then point everything at the fork:
export RPC=http://127.0.0.1:8545 ENS_RPC=http://127.0.0.1:8545 FORK=1
bash 00-preflight.sh && bash 01-register-parent.sh && bash 02-deploy-registry.sh && bash 03-mint-subnames.sh && bash test.sh
```
- Fork = real contract code, deterministic, zero external calls once started. Bless/revoke land instantly (no 60s commit wait — `FORK=1` warps time).
- **Honesty:** if we present the fork, we say "local fork of Sepolia" — never claim it's live mainnet/testnet. It's a rehearsal net, badged as such (dovetails with the demo's `REHEARSAL DATA` offline rung).
- Snapshot for instant reset between takes: `cast rpc anvil_snapshot` → `anvil_revert <id>`.

## Ladder (what we announce on stage)
1. Keyed RPC live → real Sepolia txs. 2. Keyed down → public failover (automatic). 3. All network down → local anvil fork (badged rehearsal). The ENS leg completes on every rung.
