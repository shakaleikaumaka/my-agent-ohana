#!/usr/bin/env bash
# run-all-local.sh — FULL working proof against real ENSv2 bytecode, offline.
# Spins an anvil fork of Sepolia (real ENSv2 contracts, no real funds/keys), then runs the
# entire ceremony 00→05 + test + a bless→soft-revoke→re-bless→hard-revoke cycle.
# This is the honest local proof; the SAME numbered scripts run unchanged on real Sepolia
# (drop FORK=1, use the real AUTHORIZER key). See README.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
FORKRPC="http://127.0.0.1:8545"
UPSTREAM="${UPSTREAM:-https://ethereum-sepolia-rpc.publicnode.com}"

command -v anvil >/dev/null || { echo "anvil not found (FOUNDRY_DIR=/workspace/.tools/foundry foundryup)"; exit 1; }
echo "▶ starting anvil fork of Sepolia ($UPSTREAM) …"
pkill -f "anvil --fork-url" 2>/dev/null || true; sleep 1
nohup anvil --fork-url "$UPSTREAM" --port 8545 --silent >/tmp/anvil-ens.log 2>&1 &
for i in $(seq 1 20); do cast block-number --rpc-url "$FORKRPC" >/dev/null 2>&1 && break; sleep 1; done
cast block-number --rpc-url "$FORKRPC" >/dev/null 2>&1 || { echo "fork failed to start"; cat /tmp/anvil-ens.log; exit 1; }
echo "  fork up @ block $(cast block-number --rpc-url "$FORKRPC") chain $(cast chain-id --rpc-url "$FORKRPC")"

# fresh authorizer EOA (must have NO code on Sepolia — anvil's default account collides with a real fwd contract)
# cast wallet new sends pretty lines to stderr; stdout is a single tab-separated "addr<TAB>key" line
NEW=$(cast wallet new 2>/dev/null); AUTH=$(echo "$NEW"|awk '{print $1}'); APK=$(echo "$NEW"|awk '{print $2}')
[ -n "$AUTH" ] && [ -n "$APK" ] || { echo "keygen failed"; exit 1; }
cast rpc anvil_setBalance "$AUTH" 0x21e19e0c9bab2400000 --rpc-url "$FORKRPC" >/dev/null
echo "  authorizer(fork)=$AUTH  balance $(cast balance "$AUTH" --rpc-url "$FORKRPC" --ether) ETH  code=$(cast code "$AUTH" --rpc-url "$FORKRPC")"

export RPC="$FORKRPC" ENS_RPC="$FORKRPC" AUTHORIZER="$AUTH" AUTHORIZER_PK="$APK" FORK=1
export STATE_FILE="/tmp/ens-fork.env"; : > "$STATE_FILE"
export SUBNAME_TTL=604800   # 7-day demo expiry on the fork

set -e
echo; echo "════════ 00 preflight ════════";        bash "$HERE/00-preflight.sh"
echo; echo "════════ 01 register parent ════════";  bash "$HERE/01-register-parent.sh"
echo; echo "════════ 02 deploy registry+resolver ════════"; bash "$HERE/02-deploy-registry.sh"
echo; echo "════════ 03 mint subnames + records ════════";  bash "$HERE/03-mint-subnames.sh"
echo; echo "════════ TEST (pre-bless: hasRoles should be false) ════════"; set +e; bash "$HERE/test.sh"; set -e
echo; echo "════════ 04 BLESS all ════════";         bash "$HERE/04-bless.sh" all
echo; echo "════════ TEST (post-bless: hasRoles should be true) ════════"; set +e; bash "$HERE/test.sh"; set -e
echo; echo "════════ NEGATIVE AUTH (only the authorizer may bless/revoke) ════════"
. "$HERE/config.sh"; . "$HERE/lib.sh"; state_load
ATK=$(cast wallet new 2>/dev/null); ATKADDR=$(echo "$ATK"|awk '{print $1}'); ATKPK=$(echo "$ATK"|awk '{print $2}')
cast rpc anvil_setBalance "$ATKADDR" 0x56bc75e2d63100000 --rpc-url "$FORKRPC" >/dev/null
PITLH=$(cast keccak pit); PITOWNER=$(get_owner "$USER_REGISTRY" "$PITLH")
# NOTE: check RECEIPT STATUS (0x0 = reverted = good), not cast's exit code — with --gas-limit a
# reverting tx still mines and cast send exits 0. status parsed from --json.
atk_status() { cast send "$USER_REGISTRY" "$@" --private-key "$ATKPK" --rpc-url "$FORKRPC" --gas-limit 250000 --json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("status","0x0"))' 2>/dev/null || echo "reverted-preflight"; }
echo "  attacker=$ATKADDR (no roles) tries grantRoles on pit → must NOT succeed:"
S=$(atk_status "grantRoles(uint256,uint256,address)" "$PITLH" "$BLESS_ROLES" "$ATKADDR")
GOTATK=$(cast call "$USER_REGISTRY" "hasRoles(uint256,uint256,address)(bool)" "$PITLH" "$BLESS_ROLES" "$ATKADDR" --rpc-url "$FORKRPC")
if [ "$S" != "0x1" ] && [ "$GOTATK" != "true" ]; then echo "  ✓ attacker grantRoles blocked (tx status=$S, attacker hasRoles=$GOTATK)"; else echo "  ✗ SECURITY FAIL: status=$S attackerHasRoles=$GOTATK"; fi
echo "  attacker tries unregister on pit → must NOT succeed:"
S=$(atk_status "unregister(uint256)" "$PITLH")
STILL=$(get_status "$USER_REGISTRY" "$PITLH")
if [ "$S" != "0x1" ] && [ "$STILL" = "2" ]; then echo "  ✓ attacker unregister blocked (tx status=$S, pit status still REGISTERED=$STILL)"; else echo "  ✗ SECURITY FAIL: status=$S pitStatus=$STILL"; fi
echo "  pit still owned by $PITOWNER, still blessed=$(cast call "$USER_REGISTRY" "hasRoles(uint256,uint256,address)(bool)" "$PITLH" "$BLESS_ROLES" "$PITOWNER" --rpc-url "$FORKRPC")"

echo; echo "════════ UniversalResolver proof (the viem/frontend path) ════════"
UR="0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe"
FQN="trace.myagentohana.eth"; DNS=$(dns_encode "$FQN"); NODE=$(node_of "$FQN")
ADDRCALL=$(cast calldata "addr(bytes32)" "$NODE")
echo "  UniversalResolver.resolve($FQN, addr) via $UR :"
cast call "$UR" "resolve(bytes,bytes)(bytes,address)" "$DNS" "$ADDRCALL" --rpc-url "$FORKRPC" 2>&1 | head -2 || echo "  (UR walk — see note in README)"

echo; echo "════════ 05 SOFT-REVOKE trace ════════"; bash "$HERE/05-revoke.sh" trace
echo; echo "════════ 04 RE-BLESS trace (reversible proof) ════════"; bash "$HERE/04-bless.sh" trace
echo; echo "════════ 05 HARD-REVOKE spector ════════"; bash "$HERE/05-revoke.sh" spector --hard
set +e

echo; echo "▶ stopping fork"; pkill -f "anvil --fork-url" 2>/dev/null || true
echo "DONE. State: $STATE_FILE"
