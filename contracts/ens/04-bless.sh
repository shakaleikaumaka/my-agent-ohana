#!/usr/bin/env bash
# 04-bless.sh — the on-chain half of the BLESS ceremony.
# Grants the agent the blessing capability (BLESS_ROLES, default ROLE_SET_RESOLVER)
# on its own subname resource, via EAC grantRoles. ONLY the authorizer (root admin) can.
# Re-reads tokenId after (role change regenerates the token — never cache the old id).
#   usage: AUTHORIZER_PK=0x.. ./04-bless.sh <label|all>
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; . "$HERE/config.sh"; . "$HERE/lib.sh"; need_tools
RPC="${RPC:-$(rpc_pick)}" || die "no RPC"; state_load
[ -n "${USER_REGISTRY:-}" ] || die "USER_REGISTRY not in state — run 02/03 first"
TARGET="${1:-all}"

bless_one() {
  local L="$1" FQN="${1}.${PARENT_NAME}" SLH; SLH=$(labelhash "$L")
  local OWNER; OWNER=$(get_owner "$USER_REGISTRY" "$SLH")
  [ -n "$OWNER" ] && [ "$OWNER" != "0x0000000000000000000000000000000000000000" ] || die "$FQN not registered"
  cr_grn "── BLESS ${FQN} (agent $OWNER, roles $BLESS_ROLES) ──"
  send "$USER_REGISTRY" "grantRoles(uint256,uint256,address)" "$SLH" "$BLESS_ROLES" "$OWNER" || die "grantRoles $L failed"
  local HAS TID; HAS=$(cast call "$USER_REGISTRY" "hasRoles(uint256,uint256,address)(bool)" "$SLH" "$BLESS_ROLES" "$OWNER" --rpc-url "$RPC")
  TID=$(get_tokenid "$USER_REGISTRY" "$SLH")
  [ "$HAS" = "true" ] || die "post-bless hasRoles=$HAS"
  cr_grn "  ✓ blessed · hasRoles=$HAS · new tokenId=$TID (regenerated)"
}

if [ "$TARGET" = "all" ]; then
  N=$(agents_count); for ((i=0;i<N;i++)); do bless_one "$(agent_field "$i" label)"; done
else bless_one "$TARGET"; fi
cr_grn "✅ bless complete"
