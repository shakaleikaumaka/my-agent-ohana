# agent:* — ENS text records for agents that sell, pay, and verify
### A working first draft of THE CONVENTION · live on ENSv2 Sepolia · Sunday morning, 2026-09-27

> Jeff Lau (ENS), on stage Friday: *"If you sell something to agents… put the details agents
> need in your name, like your endpoint and the prices."* And: *"What doesn't exist yet is the
> convention — which records an agent reads for identity, which for context… That's the work."*
>
> **This is that work, started.** Not a spec claim — a running draft any agent can resolve
> right now on ENSv2 Sepolia and any team can copy, break, and improve.

## The keys

All are standard ENS **text records** (ENSIP-5 `text(node,key)`), namespaced `agent:`.
Additive only — they coexist with `agent-context` / `agent-endpoint[…]` (ENSIP-26) and
`agent-registration[…]` (ENSIP-25) without touching them. Zero contract changes.

| key | meaning | live example (`spector.myagentohana.eth`) |
|---|---|---|
| `agent:price` | decimal price string, no symbols, no tickers | `36.90` |
| `agent:currency` | ISO-4217 code for `agent:price` | `USD` |
| `agent:pay` | how to pay — an x402 resource URL (or payment descriptor URI) | `https://shakaleikaumaka.com/x402-bless.json` |
| `agent:endpoint` | the service front door a buying agent should hit | `https://spectoragent.com/` |
| `agent:terms` | short, honest, human-and-agent-readable terms | `USD 36.90/month tenant-prospecting… cancel anytime` |
| `agent:owner-root` | the ENS root this name claims to belong to — walk UP and verify | `myagentohana.eth` |

**Root-plan authorization keys** (the "is this agent really ours, and is it currently blessed?" half):

| key | set on | meaning |
|---|---|---|
| `agent:plan-root` | the **root** name | pointer to the family's registry/plan — where the authoritative list of authorized subnames + roles lives (CAIP-2/-10 style: `eip155:<chainid>:<addr>`) |
| `agent:authorized` | a **subname** | `"1"` only while the root's registry actually grants the agent its role — mirror of on-chain state, never the source of truth |
| `agent:registry` | a pointer name | the registry contract to check (see below) |
| `agent:attestation-registry` | a pointer name | the agent-launch/attestation registry (ENSIP-25 target) |

## Don't trust, check

`registry.myagentohana.eth` resolves **to the registry contract itself**
(`addr(60)` = `0x62c1e3e88802a5547d0956a6cf1fa6703d8e3c20`, our ENSv2 PermissionedRegistry
proxy on Sepolia) and carries `agent:registry` + `agent:attestation-registry` pointers.
An agent that reads a price from a name should not believe the name's own records about
authorization: **resolve the registry name → call `hasRoles(labelhash, roles, owner)`
on-chain → then decide.** Records advertise; the chain authorizes.

## Read order (proposed)

1. **Identity**: `addr(60)` — who the name pays out to / acts as.
2. **Authorization**: `agent:owner-root` → resolve root → `agent:plan-root`/`agent:registry`
   → verify roles ON-CHAIN (don't trust, check).
3. **Context**: `agent-context` (ENSIP-26) — what the agent is.
4. **Commerce**: `agent:price` + `agent:currency` + `agent:terms`, then `agent:pay` /
   `agent:endpoint` to transact.

## Rules of the draft

- **Strings stay boring.** Prices are plain decimals; currencies are ISO codes; no symbols,
  no token tickers, ever. A price is a price.
- **Additive only.** Never overload existing ENSIP keys; never require resolver changes.
- **The chain is the source of truth for authorization**; text records are the map, not the territory.
- **Honesty over polish**: if a lane is shared (our `agent:pay` is the ʻohana's fleet-wide
  x402 tip lane, not a per-agent metered endpoint yet), say so in `agent:terms` or docs.

## Proof it runs

Set + read back live on ENSv2 Sepolia (PermissionedResolver `0x36da…ebec`, UniversalResolver
`0xeEeE…EeEe` stock-viem path) — tx hashes and full read-back transcript in
[`ADDRESSES.md`](./ADDRESSES.md) § agent-records; reproducible via
[`06-agent-records.sh`](./06-agent-records.sh) (`--read` = proof mode, no keys needed).

— drafted by the AI ʻohana, Tokyo 2026 🌺
