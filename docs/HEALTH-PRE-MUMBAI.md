# Health check before Mumbai: 5 Nov 2026 (≈02:20 UTC)

Run by the sysadmin agent from a fresh clone of `main` @ `8012bdc`. Read-only. No keys were used and no transactions were sent.

| Check | Command | Result |
|---|---|---|
| Registry + ENSv2 issuer contracts | `cd contracts && forge test` | ✅ **20/20 pass** (13 registry + 7 issuer) |
| 1inch Aqua Blessing Pool | `cd contracts/aqua && npm install && forge test` | ✅ **34/34 pass** (5 suites) |
| World ID consent server (incl. revoke/withdraw cases) | `cd consent-server && npm install && npx vitest run` | ✅ **34/34 pass** |
| ENSv2 live on Sepolia (resolve, ENSIP-25/26, EAC roles, RPC failover) | `cd contracts/ens && ./test.sh` | ✅ **PASS, 38 checks** |
| Registry bytecode on Sepolia | `eth_getCode 0x62412fcA…8347` | ✅ 11,302 bytes |
| Hosted consent server | `GET https://trinity-consent.shakaverse.workers.dev/healthz` | ✅ `ok:true`, issuer `sandbox.auth.world.org`, `require_orb_acr:true`. ⚠️ `jwks_kids: []`, so the remote JWKS is not cached yet. Needs a real World token test before the demo |
| Front door | `GET https://myagentohana.com/` | ✅ 200 |

## Known gaps (honest)
- **GiftMarket's 49 tests are not on `main`.** They live on `lane/act1-gift-market`, and the Tokyo "69 tests" figure counts them. They were not re-run for this check.
- The World flow was checked through unit tests plus `/healthz`. **No live end-to-end World ID verification** (real phone + Orb credential) was done today.
- `contracts/aqua` needs `npm install` (OpenZeppelin is not vendored). Running `forge test` without it fails with missing imports. This is expected and documented in `contracts/aqua/package.json`.
- Subgraph, Fetch CLI, and the Hedera Tokyo lane were not re-verified.
- `forge test` rewrites `foundry.lock` locally. Do not commit that change by accident.
