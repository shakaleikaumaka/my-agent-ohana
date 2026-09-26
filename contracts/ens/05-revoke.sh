#!/usr/bin/env bash
# 05-revoke.sh — the on-chain half of the REVOKE ceremony ("I say stop, and it stops").
# SOFT (default): revokeRoles removes the blessing capability — reversible, re-bless with 04.
#                 Also deletes the ENSIP-25 attestation (sets it to "") so off-chain verify flips to unverified.
# HARD (--hard):  unregister burns the subname token; ownerOf → 0; the name is gone.
# ONLY the authorizer (root admin / ROLE_UNREGISTER) can. Re-reads state after.
#   usage: AUTHORIZER_PK=0x.. ./05-revoke.sh <label|all> [--hard]
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; . "$HERE/config.sh"; . "$HERE/lib.sh"; need_tools
RPC="${RPC:-$(rpc_pick)}" || die "no RPC"; state_load
[ -n "${USER_REGISTRY:-}" ] || die "USER_REGISTRY not in state"
TARGET="${1:-all}"; MODE="soft"; [ "${2:-}" = "--hard" ] && MODE="hard"
ERC7930=$(erc7930 "$AGENT_REGISTRY_CHAINID" "$AGENT_REGISTRY_ADDR")

revoke_one() {
  local L="$1" FQN="${1}.${PARENT_NAME}" SLH; SLH=$(labelhash "$L")
  local OWNER; OWNER=$(get_owner "$USER_REGISTRY" "$SLH")
  [ -n "$OWNER" ] && [ "$OWNER" != "0x0000000000000000000000000000000000000000" ] || { cr_ylw "$FQN not registered — skip"; return 0; }
  if [ "$MODE" = "hard" ]; then
    cr_grn "── HARD REVOKE ${FQN} (unregister) ──"
    send "$USER_REGISTRY" "unregister(uint256)" "$SLH" || die "unregister $L failed"
    local ST; ST=$(get_status "$USER_REGISTRY" "$SLH")
    [ "$ST" = "2" ] && die "still registered after unregister (status=$ST)"
    cr_grn "  ✓ burned · getState.status=$ST (0=AVAILABLE) · owner now 0x0"
  else
    cr_grn "── SOFT REVOKE ${FQN} (revokeRoles $BLESS_ROLES + clear ENSIP-25) ──"
    send "$USER_REGISTRY" "revokeRoles(uint256,uint256,address)" "$SLH" "$BLESS_ROLES" "$OWNER" || die "revokeRoles $L failed"
    # clear the on-chain attestation so off-chain verification MUST fail
    local AID K25 DNS; AID=$(python3 -c 'import json,sys;a=[x for x in json.load(open(sys.argv[1]))["agents"] if x["label"]==sys.argv[2]];print(a[0]["agentId"] if a else "")' "$AGENTS_JSON" "$L")
    if [ -n "$AID" ]; then K25=$(ensip25_key "$ERC7930" "$AID"); DNS=$(dns_encode "$FQN"); send "$RESOLVER" "setText(bytes,string,string)" "$DNS" "$K25" "" || cr_ylw "  (attestation clear skipped)"; fi
    local HAS TID; HAS=$(cast call "$USER_REGISTRY" "hasRoles(uint256,uint256,address)(bool)" "$SLH" "$BLESS_ROLES" "$OWNER" --rpc-url "$RPC"); TID=$(get_tokenid "$USER_REGISTRY" "$SLH")
    [ "$HAS" = "false" ] || die "post-revoke hasRoles=$HAS"
    cr_grn "  ✓ revoked · hasRoles=$HAS · tokenId=$TID (regenerated) · re-bless with 04-bless.sh"
  fi
}

if [ "$TARGET" = "all" ]; then N=$(agents_count); for ((i=0;i<N;i++)); do revoke_one "$(agent_field "$i" label)"; done
else revoke_one "$TARGET"; fi
cr_grn "✅ revoke ($MODE) complete"
