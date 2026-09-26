# 🪙 TOKEN-MINT HOLD SPEC — 4 unminted agent tokens (M5-4)

**Keeper:** Globy Mahalo 🌊 · **Status: 🛑 HOLD — do NOT mint anything. Awaiting Shaka FET top-up.**
🤫 **EMBARGO LAW:** this is an **internal war-room** doc. Token names/tickers are **forbidden in any filmed / public / judge-facing artifact** until Shaka's moon signal (Sep 27 ~01:49 JST). Agent *names* are grandfathered brand; *tokens* are not. Keep this file out of the demo, deck, and video.

## Why HOLD
Agent-Launch tokens are minted on **BSC (chainId 56)** via the launch factory, **120 FET per mint** (platform fee). Three already exist (born equinox night, see [`/shared/equinox/RECEIPTS.md`](/shared/equinox/RECEIPTS.md)): the SHAKA, OHANA, and PIT agent tokens. The **equinox deployer** `0x04f140e282CaDd99859b75EaAdEdCBA886322667` currently holds **~12.6 FET dust + ~0.00304 BNB** — far short of a single 120-FET mint. So the 4 remaining agents cannot be minted until Shaka tops up.

## The math (the blocker to relay up-chain)
| Item | Amount |
|---|---|
| Unminted agent tokens | **4** — terri, trace, spector, crops |
| Cost per mint (platform) | 120 FET |
| **FET needed** | **4 × 120 = 480 FET** |
| BNB gas (4 deploys) | ~0.0007 BNB (equinox measured ~0.00065 for 3) → budget **~0.001 BNB** |
| Deployer residual now | ~12.6 FET + ~0.00304 BNB |
| **Top-up to request from Shaka** | **≥ 468 FET (send 480 for buffer) + ~0.001 BNB** to `0x04f140e282CaDd99859b75EaAdEdCBA886322667` |

## Agent-signed mint pattern (ready to fire on top-up — DO NOT run yet)
Mirrors the equinox birth flow exactly (quiet birth: buy=0, no banners). One mint per agent, agent-signed by the deployer key (human-keys-stay-human law: the deployer is agent-born; Shaka only *funds* it, does not sign the mints).

```
Chain:    BSC mainnet, chainId 56
Factory:  0xc399343771BAEAc2663b15B1a76c6F53119DC28B   (equinox-verified)
Deployer: 0x04f140e282CaDd99859b75EaAdEdCBA886322667   (agent-born; fund, don't hand over key)
Per token: name + symbol (EMBARGOED — fill at fire time), 1,000,000,000 supply
           (800M bonding curve / 200M DEX reserve per platform), buy=0 (quiet birth)
Order:    terri → trace → spector → crops  (matches ENS subname + demo cast order)
```
Fire sequence (per agent), only after top-up confirmed on-chain:
1. Pre-flight: `cast balance <deployer> --rpc-url bsc` ≥ 480 FET + gas; confirm factory bytecode unchanged.
2. Create the Agentverse agent (Shaka's device tap, as equinox) → get `agent1q…` id to link.
3. Call the launch factory create() with the agent's params (buy=0).
4. Record: token contract, deploy tx, block, born-UTC → append to `/shared/equinox/RECEIPTS.md` + `chain-ledger.md` within the hour. Verify `name()/symbol()/totalSupply()` on-chain via independent RPC.
5. Link Agentverse agent ↔ token; leave `listed:false` (pre-graduation) until moon reveal.

## Link to the ENS lane
Each minted token maps 1:1 to a blessed subname (`terri.myagentohana.eth`, etc.). Once minted, drop the token contract into the subname's **ENSIP-25 record** as an additional `agent-registration[<erc7930 of BSC token registry>][<id>]` entry, so the ENS name attests both the AgentLaunchRegistry entry *and* the token. Until then the ENS lane stands alone (tokens are a bonus leg, not on the demo critical path).

## Relay (Shaka-only blocker)
> **③ FET top-up:** send **480 FET + ~0.001 BNB** to `0x04f140e282CaDd99859b75EaAdEdCBA886322667` to unblock the 4 remaining agent-token mints. Until then: **HOLD** (this is already on the TASKBOARD Shaka-only blocker list). Nothing here fires without that top-up.
