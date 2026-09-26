#!/usr/bin/env bash
# 01-register-parent.sh — commit-reveal register the parent .eth name (MockUSDC payment).
# Idempotent-ish: skips if the parent is already owned. Needs AUTHORIZER_PK in env.
# On a fork, set FORK=1 to warp past MIN_COMMITMENT_AGE instead of sleeping.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; . "$HERE/config.sh"; . "$HERE/lib.sh"; need_tools
RPC="${RPC:-$(rpc_pick)}" || die "no RPC"
ZERO="0x0000000000000000000000000000000000000000"
REF="0x0000000000000000000000000000000000000000000000000000000000000000"
SECRET="${PARENT_SECRET:-0x00000000000000000000000000000000000000000000000000000000ac0ade01}"
PLH=$(labelhash "$PARENT_LABEL")

cr_grn "== Register parent: $PARENT_NAME  (owner/authorizer=$AUTHORIZER) =="
OWNER=$(get_owner "$ETH_REGISTRY" "$PLH")
if [ -n "$OWNER" ] && [ "$OWNER" != "$ZERO" ]; then cr_ylw "  already registered → owner $OWNER (skipping)"; state_set PARENT_OWNER "$OWNER"; exit 0; fi

# 1) fund MockUSDC (mint is public on the mock). On real Sepolia this is a genuine mint tx.
PRICE=$(cast call "$ETH_REGISTRAR" "getRegisterPrice(string,uint64,address)(uint256,uint256)" "$PARENT_LABEL" "$PARENT_DURATION" "$MOCK_USDC" --rpc-url "$RPC" | head -1 | awk '{print $1}')
NEED=$(python3 -c "print(int('${PRICE}')*2 + 1000000)")   # 2x price + buffer
BAL=$(cast call "$MOCK_USDC" "balanceOf(address)(uint256)" "$AUTHORIZER" --rpc-url "$RPC" | awk '{print $1}')
if python3 -c "exit(0 if int('$BAL')>=int('$PRICE') else 1)"; then cr_grn "  USDC balance ok ($BAL)"; else
  cr_grn "  minting $NEED MockUSDC…"; send "$MOCK_USDC" "mint(address,uint256)" "$AUTHORIZER" "$NEED" || die "mint failed"
fi
cr_grn "  approving registrar…"; send "$MOCK_USDC" "approve(address,uint256)" "$ETH_REGISTRAR" "$NEED" || die "approve failed"

# 2) commit
# The parent's own resolver is not central to the demo (records live on SUBNAMES, step 03).
# We attach the shared v1-bridge resolver to the parent purely to satisfy register(); our
# per-project PermissionedResolver is deployed in step 02 and attached to each subname in step 03.
RESOLVER_FOR_PARENT="$PUBLIC_RESOLVER_V2"
COMMIT=$(cast call "$ETH_REGISTRAR" "makeCommitment(string,address,bytes32,address,address,uint64,bytes32)(bytes32)" \
  "$PARENT_LABEL" "$AUTHORIZER" "$SECRET" "$ZERO" "$RESOLVER_FOR_PARENT" "$PARENT_DURATION" "$REF" --rpc-url "$RPC")
cr_grn "  commitment=$COMMIT"; send "$ETH_REGISTRAR" "commit(bytes32)" "$COMMIT" || die "commit failed"

# 3) wait MIN_COMMITMENT_AGE (60s). Fork: warp. Real: sleep.
if [ "${FORK:-0}" = "1" ]; then cast rpc evm_increaseTime 90 --rpc-url "$RPC" >/dev/null; cast rpc evm_mine --rpc-url "$RPC" >/dev/null; cr_grn "  warped 90s (fork)"; else cr_grn "  sleeping 65s (MIN_COMMITMENT_AGE=60)…"; sleep 65; fi

# 4) register
send "$ETH_REGISTRAR" "register(string,address,bytes32,address,address,uint64,address,bytes32)" \
  "$PARENT_LABEL" "$AUTHORIZER" "$SECRET" "$ZERO" "$RESOLVER_FOR_PARENT" "$PARENT_DURATION" "$MOCK_USDC" "$REF" || die "register failed"

OWNER=$(get_owner "$ETH_REGISTRY" "$PLH")
[ "$OWNER" = "$AUTHORIZER" ] || die "post-register owner mismatch: $OWNER"
cr_grn "✅ parent $PARENT_NAME owned by $OWNER"
state_set PARENT_OWNER "$OWNER"; state_set PARENT_LABELHASH "$PLH"
