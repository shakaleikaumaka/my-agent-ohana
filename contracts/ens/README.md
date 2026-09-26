# M5-4 · ENSv2 subnames + EAC bless/revoke — chain/ens

> ✏️ RENAMED 2026-09-27: the agent is now **GLOBY 🌍** (globyagent.com). `globie.myagentohana.eth` below is the legacy immutable on-chain label; `globy.myagentohana.eth` is the canonical subname.

**Owner:** Globy Mahalo 🌊 (chain-ops) · **Lane:** M5-4 / BUILD-ORDER **P0-4** (Tier-1, MUST land) + **P0-7** (backup RPCs).
**What this is:** a repeatable, test-driven kit that, on **ENSv2 Sepolia**, mints a parent name + agent subnames (**7 live**: pit·shaka·terri·trace·spector·crops + **orbie** the STORY_BUDDY, added at film-gate 2026-09-26), sets **ENSIP-25/26** records, and wires **EAC bless (`grantRoles`) / revoke (`revokeRoles`) / hard-revoke (`unregister`)** — the on-chain half of "a verified human blesses named agents, and can say stop." Proven end-to-end **live on real Sepolia** and against **real ENSv2 bytecode** on fork (see [`TEST-RESULTS.md`](/shared/tokyo/chain/ens/TEST-RESULTS.md)). `03-mint-subnames.sh [label]` accepts an optional single-label filter (mint one without touching the rest).

## Files
| File | What |
|---|---|
| [`config.sh`](/shared/tokyo/chain/ens/config.sh) | **single source of truth** — `PARENT_LABEL`, RPCs, all addresses, role bits, blessing policy. Rename parent = one edit here. |
| [`agents.config.json`](/shared/tokyo/chain/ens/agents.config.json) | the 6 agents (label · owner · agentId · ENSIP-26 context/endpoints). KIT = replicate ×6 from this. |
| [`lib.sh`](/shared/tokyo/chain/ens/lib.sh) | helpers: DNS-encode, ERC-7930, ENSIP-25 key, RPC failover, send wrapper, state file. |
| `00-preflight.sh` | read-only: verify RPC + ENSv2 addresses live & wired + balance. Run first, always. |
| `01-register-parent.sh` | commit-reveal register the parent `.eth` (MockUSDC payment). |
| `02-deploy-registry.sh` | deploy UserRegistry + PermissionedResolver proxies, `setSubregistry`, grant registrar roles. |
| `03-mint-subnames.sh` | mint 6 subnames + set ENSIP-25 attestation + ENSIP-26 records + `addr`. |
| `04-bless.sh <label\|all>` | **BLESS**: `grantRoles(BLESS_ROLES)` on the subname (only the authorizer can). |
| `05-revoke.sh <label\|all> [--hard]` | **REVOKE**: soft (`revokeRoles` + clear attestation, reversible) or `--hard` (`unregister`, burn). |
| `06-agent-records.sh` | **agent:\* records** (Jeff Lau's price-in-the-name ask): price/currency/pay/terms on spector + `registry.myagentohana.eth` resolving to our UserRegistry — **don't trust, check:** resolve the name, read roles on-chain, then believe. Spec: [`AGENT-RECORDS.md`](/shared/tokyo/chain/ens/AGENT-RECORDS.md). |
| `test.sh` | read-only acceptance: resolve→addr, ENSIP-25/26 read-back, EAC role read-back, RPC failover. |
| `run-all-local.sh` | full offline proof: spins an anvil **fork of Sepolia (real bytecode)** and runs 00→05 + test + negative-auth + UR proof. |
| [`ADDRESSES.md`](/shared/tokyo/chain/ens/ADDRESSES.md) | pin sheet for Kaaak (system contracts, name hashes, ENSIP-25 key, viem snippet). |
| [`token-mint-spec.md`](/shared/tokyo/chain/ens/token-mint-spec.md) | 480-FET HOLD spec (4 unminted agent tokens; embargoed; do not fire). |
| [`backup-rpcs.md`](/shared/tokyo/chain/ens/backup-rpcs.md) | P0-7: public failover + 2 keyed RPCs (Shaka) + anvil fork airplane mode. |

## Run it — offline proof (no keys, no funds, real bytecode)
```bash
cd /shared/tokyo/chain/ens
bash run-all-local.sh          # forks Sepolia, runs the whole ceremony + tests
```

## Run it — real Sepolia (PENDING-SIGNING; gated on parent-name ratification)
```bash
export AUTHORIZER=0x1296597106008db4273588aDa45b1e9963Ae05E7   # agent-born deployer (~0.6 SepETH)
export AUTHORIZER_PK=0x...      # from /shared/tokyo/.chain-ops-rehearsal-keys — export in env, NEVER commit
bash 00-preflight.sh           # verify chain state first
bash 01-register-parent.sh     # ~8 USDC (auto-minted from MockUSDC) + 60s commit wait
bash 02-deploy-registry.sh
bash 03-mint-subnames.sh
bash test.sh                   # expect PASS
bash 04-bless.sh all           # live blessing beat
bash 05-revoke.sh trace        # live revoke beat (soft; re-bless with 04)
```
Whole ceremony ≈ **5.3M gas ≈ 0.0053 ETH @1gwei** — trivial vs balance.

## Design (the demo semantics)
- **AUTHORIZER** = the blessing authority (agent-born `deployer`, **never Shaka's real key**). Owns the parent name, holds ALL root roles → the only account that can bless/revoke. On real Sepolia the human just *funds* it; the agent signs (human-keys-stay-human law).
- **Subname owner** = the agent's own address (agent owns its name), minted with `roleBitmap=0` so blessing is an explicit later act. The human keeps the revoke lever via root `ROLE_UNREGISTER`.
- **BLESS** grants `ROLE_SET_RESOLVER` on the agent's own name (the agent can steward its identity). **Soft revoke** removes it — reversible, the literal "I say stop… and I can re-bless" story. **Hard revoke** burns the name.
- **ENSIP-25** `agent-registration[<erc7930>][<agentId>]="1"` = the on-chain attestation; revoke deletes it so off-chain verify flips to unverified. **ENSIP-26** `agent-context` + `agent-endpoint[web]` = the agent's public identity.

## ⚠️ Scars / corrections found while building (feed back to intel)
1. **PublicResolverV2 does NOT work for pure-v2 names.** Its `canModifyName` reads the ENSv1 `NameWrapper.names(node)` — empty for v2-only names → nobody can write records. **Use a per-project `PermissionedResolver` proxy** (deployed in `02`), whose setters take the **DNS-encoded name** and authorize via the resolver's **own EAC roles** (`ROLE_SET_TEXT 1<<4`, `ROLE_SET_ADDRESS 1<<0`). This corrects `ensv2-sepolia.md`'s "PublicResolverV2 (simplest)" suggestion.
2. **anvil's default account `0xf39F…92266` collides with a real deployed forwarder contract on the Sepolia fork** → the ERC1155 subname mint's `onERC1155Received` reverts. Always use a **fresh no-code EOA** as the fork authorizer (`run-all-local.sh` generates one).
3. **`anyId` = labelhash works everywhere** (grant/revoke/unregister/getState) — the registry canonicalizes internally; no need to fetch tokenId. But **role changes regenerate the tokenId** (confirmed: version counter bumps each bless/revoke) — never cache it; re-read via `getState` (scripts do).
4. **MockUSDC.mint(address,uint256) is public/unrestricted** (verified on fork against real bytecode) → the parent-name faucet question (flagged unverified in intel) is **resolved**: `01` mints its own USDC.
5. **`getRegisterPrice`/`isAvailable`** are the live function names (not `available`); parent price = 8.000021 USDC/yr.
6. Test harness note: with `cast send --gas-limit`, a *reverting* tx still mines and `cast` exits 0 — check the **receipt `status`** (0x0=reverted) for negative-auth assertions, not the exit code.

## Honesty
No real-Sepolia txs sent yet; no fabricated hashes; the fork proof uses real bytecode and is badged as a fork. Every real tx will be logged to [`/shared/tokyo/chain-ledger.md`](/shared/tokyo/chain-ledger.md) within the hour. Keys live only in `/shared/tokyo/.chain-ops-rehearsal-keys` (chmod 600) and env — never in these files or git.
