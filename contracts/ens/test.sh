#!/usr/bin/env bash
# test.sh — READ-ONLY acceptance test for the ENSv2 + EAC lane.
# For each subname: resolve → addr, read ENSIP-25/26 records, read EAC role state.
# Plus: RPC-failover check. Exits non-zero on any failure. No key needed.
#   usage: ./test.sh              (uses state file + configured RPC/fallbacks)
#          RPC=http://127.0.0.1:8545 ./test.sh   (fork)
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; . "$HERE/config.sh"; . "$HERE/lib.sh"; need_tools; state_load
pass=0; fail=0
ok()  { cr_grn "  ✓ $*"; pass=$((pass+1)); }
no()  { cr_red "  ✗ $*"; fail=$((fail+1)); }

echo "════════════════════════════════════════════════════════════"
echo " ENSv2 + EAC acceptance test — $PARENT_NAME"
echo "════════════════════════════════════════════════════════════"

# ── T0: RPC failover ──────────────────────────────────────────────────────────
# Individual public endpoints (esp. free tiers) flake; that's WHY we have failover.
# Pass criterion: ≥1 endpoint reachable AND the failover drill picks a live fallback.
cr_grn "T0 · RPC failover"
picked=""; reachable=0
for u in "$ENS_RPC" "$ENS_RPC_FALLBACK_1" "$ENS_RPC_FALLBACK_2"; do
  if rpc_ok "$u"; then cr_grn "  ✓ reachable: $u (block $(cast block-number --rpc-url "$u"))"; reachable=$((reachable+1)); [ -z "$picked" ] && picked="$u"; else cr_ylw "  ~ unreachable now (failover covers this): $u"; fi
done
[ "$reachable" -ge 1 ] && ok "$reachable/3 RPC endpoints live" || no "no RPC endpoint reachable"
RPC="${RPC:-$picked}"; [ -n "$RPC" ] || { no "no RPC at all"; echo "RESULT: FAIL"; exit 1; }
# simulate primary down → confirm a fallback still serves
cr_grn "  failover drill: primary='http://127.0.0.1:1' (dead) → pick fallback"
ENS_RPC="http://127.0.0.1:1" bash -c "$(declare -f rpc_ok rpc_pick); ENS_RPC='http://127.0.0.1:1' ENS_RPC_FALLBACK_1='$ENS_RPC_FALLBACK_1' ENS_RPC_FALLBACK_2='$ENS_RPC_FALLBACK_2'; p=\$(rpc_pick) && echo \"    → failover picked \$p\"" \
  && ok "failover selects a live fallback when primary is dead" || no "failover found no fallback"

[ -n "${USER_REGISTRY:-}" ] || { no "no USER_REGISTRY in state ($STATE_FILE) — run 02/03 first"; echo "RESULT: FAIL ($pass ok / $fail fail)"; exit 1; }
[ -n "${RESOLVER:-}" ]      || { no "no RESOLVER in state"; echo "RESULT: FAIL"; exit 1; }
cr_grn "  registry=$USER_REGISTRY  resolver=$RESOLVER"

ERC7930=$(erc7930 "$AGENT_REGISTRY_CHAINID" "$AGENT_REGISTRY_ADDR")
N=$(agents_count)
for ((i=0;i<N;i++)); do
  L=$(agent_field "$i" label); WANT=$(agent_field "$i" owner); AID=$(agent_field "$i" agentId)
  FQN="${L}.${PARENT_NAME}"; SLH=$(labelhash "$L")
  echo; cr_grn "── ${FQN} ──"

  # T1: subname resolves to the agent address (addr record, coinType 60)
  GOTADDR=$(read_addr "$RESOLVER" "$FQN")
  if [ "${GOTADDR,,}" = "${WANT,,}" ]; then ok "resolve $FQN → $GOTADDR"; else no "addr mismatch: got '$GOTADDR' want '$WANT'"; fi

  # T2: ENSIP-26 agent-context present
  CTX=$(read_text "$RESOLVER" "$FQN" "agent-context")
  [ -n "$CTX" ] && ok "ENSIP-26 agent-context: \"$(echo "$CTX"|head -c 48)…\"" || no "agent-context empty"

  # T3: ENSIP-25 attestation non-empty ("1")
  K25=$(ensip25_key "$ERC7930" "$AID"); ATT=$(read_text "$RESOLVER" "$FQN" "$K25")
  [ -n "$ATT" ] && ok "ENSIP-25 $K25 = \"$ATT\"" || no "ENSIP-25 attestation missing"

  # T4: EAC role read-back — owner + current blessing state
  OWNER=$(get_owner "$USER_REGISTRY" "$SLH"); TID=$(get_tokenid "$USER_REGISTRY" "$SLH")
  HAS=$(cast call "$USER_REGISTRY" "hasRoles(uint256,uint256,address)(bool)" "$SLH" "$BLESS_ROLES" "$OWNER" --rpc-url "$RPC")
  [ "${OWNER,,}" = "${WANT,,}" ] && ok "registry owner=$OWNER tokenId=$TID" || no "owner mismatch: $OWNER"
  cr_grn "    EAC hasRoles(BLESS_ROLES=$BLESS_ROLES, $OWNER) = $HAS"
done

echo; echo "════════════════════════════════════════════════════════════"
if [ "$fail" = 0 ]; then cr_grn "RESULT: PASS ✅  ($pass checks)"; exit 0; else cr_red "RESULT: FAIL ✗  ($pass ok / $fail fail)"; exit 1; fi
