#!/usr/bin/env bash
# 00-preflight.sh — verify RPC + ENSv2 addresses are live & wired, before any write.
# Read-only. Safe to run against real Sepolia any time. No key needed.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; . "$HERE/config.sh"; . "$HERE/lib.sh"
need_tools

RPC="$(rpc_pick)" || die "no working RPC among primary+fallbacks"
cr_grn "RPC live: $RPC  (block $(cast block-number --rpc-url "$RPC"))"
CID=$(cast chain-id --rpc-url "$RPC"); [ "$CID" = "$CHAIN_ID" ] || cr_ylw "  note: chain-id=$CID (expected $CHAIN_ID)"

fail=0
check_code() { local n="$1" a="$2"; local c; c=$(cast code "$a" --rpc-url "$RPC" 2>/dev/null); if [ "${#c}" -gt 4 ]; then cr_grn "  ✓ $n has code ($(( (${#c}-2)/2 )) bytes)"; else cr_red "  ✗ $n EMPTY at $a"; fail=1; fi; }
cr_grn "ENSv2 contracts:"
check_code "ETHRegistry"       "$ETH_REGISTRY"
check_code "ETHRegistrar"      "$ETH_REGISTRAR"
check_code "RootRegistry"      "$ROOT_REGISTRY"
check_code "VerifiableFactory" "$VERIFIABLE_FACTORY"
check_code "UserRegistryImpl"  "$USER_REGISTRY_IMPL"
check_code "PermResolverImpl"  "$PERM_RESOLVER_IMPL"
check_code "MockUSDC"          "$MOCK_USDC"

# registry wiring sanity: root .eth must point at ETHRegistry
GOT=$(cast call "$ROOT_REGISTRY" "getSubregistry(string)(address)" "$PARENT_TLD" --rpc-url "$RPC" 2>/dev/null)
if [ "${GOT,,}" = "${ETH_REGISTRY,,}" ]; then cr_grn "  ✓ RootRegistry.getSubregistry('$PARENT_TLD') == ETHRegistry"; else cr_red "  ✗ .eth wiring changed: got $GOT (ENS may have re-deployed — re-pin addresses!)"; fail=1; fi

# parent name availability + price
AVAIL=$(cast call "$ETH_REGISTRAR" "isAvailable(string)(bool)" "$PARENT_LABEL" --rpc-url "$RPC" 2>/dev/null)
PRICE=$(cast call "$ETH_REGISTRAR" "getRegisterPrice(string,uint64,address)(uint256,uint256)" "$PARENT_LABEL" "$PARENT_DURATION" "$MOCK_USDC" --rpc-url "$RPC" 2>/dev/null | head -1)
cr_grn "  parent '$PARENT_NAME' available=$AVAIL price=${PRICE} (MockUSDC, 6dp)"

# deployer / authorizer balance
BAL=$(cast balance "$AUTHORIZER" --rpc-url "$RPC" --ether 2>/dev/null)
cr_grn "  authorizer $AUTHORIZER balance ${BAL} ETH"
awk -v b="$BAL" 'BEGIN{ if (b+0 < 0.02) exit 1 }' || cr_ylw "  ⚠ low gas — top up before writes (est. whole ceremony < 0.02 ETH on Sepolia @1gwei)"

# MockUSDC.mint reachability (view of decimals as a cheap liveness proxy)
DEC=$(cast call "$MOCK_USDC" "decimals()(uint8)" --rpc-url "$RPC" 2>/dev/null)
cr_grn "  MockUSDC decimals=$DEC (mint(address,uint256) is public — verified open on fork against real bytecode)"

[ "$fail" = 0 ] && cr_grn "PRE-FLIGHT PASS ✅" || { cr_red "PRE-FLIGHT FAIL ✗"; exit 1; }
