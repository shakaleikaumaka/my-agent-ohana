# Service Desk Interface: spec only

> **Status: specification. Nothing is implemented.** Implementation happens during ETHGlobal Mumbai. No sponsor SDK code exists in this repo for this spec.

A **desk** is one agent node offering one service. Every desk, in either universe, uses the same interface so the engine can bless it, name it, pay it, run it, pool it, and revoke it the same way.

## Identity
| Field | Source | Example |
|---|---|---|
| `name` | ENS subname | `juka.myagentohana.eth` |
| `universe` | `ohana` \| `oso` | `oso` = Open Source Orchestra commons |
| `blessedBy` | World ID nullifier hash (never raw identity) | `0x…` |
| `consent` | `active` \| `paused` \| `withdrawn` | ENS text `consent.window` |
| `pool` | Aqua position id; `oso` desks MUST use the commons pool | |

## Endpoints (HTTP, JSON)
| Method | Path | Purpose |
|---|---|---|
| GET | `/desk` | Manifest: identity above + `price`, `rail`, `mind` |
| POST | `/desk/quote` | Get a price for a request. `oso` desks quote at cost only |
| POST | `/desk/run` | Do the work. MAY require payment (rail, e.g. x402 `402 Payment Required`) |
| GET | `/desk/receipt/:id` | Receipt: who asked, what ran, what was paid, where the money went |
| POST | `/desk/revoke` | Revoke. Must be honored within one request, sets consent to `withdrawn`, stops runs, and freezes the pool |

## Invariants
1. `consent != active` → `/desk/run` returns `451` and does no work.
2. A revoke is idempotent and can never be overridden by payment.
3. Money from `oso` desks never lands in the service pool, and vice versa.
4. No desk holds user funds (no custody). Fees are disclosed in `/desk`.
5. Receipts contain no personal data beyond what the requester chose to give.

## Pluggable slots (filled during Mumbai)
- `rail`: e.g. Hedera x402
- `mind`: e.g. 0G compute
- `name`: ENSv2 (Sepolia today → mainnet desks)
