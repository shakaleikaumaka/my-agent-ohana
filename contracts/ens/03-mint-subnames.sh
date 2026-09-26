#!/usr/bin/env bash
# 03-mint-subnames.sh — mint the agent subnames + set ENSIP-25/26 records on each.
# KIT pattern: ONE loop over agents.config.json → N identical ceremonies.
# Subnames are minted with roleBitmap=0 so the AUTHORIZER controls blessing (step 04).
# Owner = the agent's own address (agent owns its name; human keeps the revoke lever at root).
# Needs AUTHORIZER_PK + steps 01/02 done.
#   usage: ./03-mint-subnames.sh            (mint/refresh ALL agents in the config)
#          ./03-mint-subnames.sh <label>    (mint/refresh ONLY that one label — e.g. orbie)
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; . "$HERE/config.sh"; . "$HERE/lib.sh"; need_tools
RPC="${RPC:-$(rpc_pick)}" || die "no RPC"; state_load
[ -n "${USER_REGISTRY:-}" ] || die "USER_REGISTRY not in state — run 02 first"
[ -n "${RESOLVER:-}" ]      || die "RESOLVER not in state — run 02 first"
ONLY="${1:-}"   # optional: restrict to a single label (leave empty = all)
ZERO="0x0000000000000000000000000000000000000000"
ERC7930=$(erc7930 "$AGENT_REGISTRY_CHAINID" "$AGENT_REGISTRY_ADDR")
NOW=$(cast block latest -f timestamp --rpc-url "$RPC"); EXP=$((NOW + SUBNAME_TTL))
cr_grn "== Mint ${PARENT_NAME} subnames${ONLY:+ (ONLY '$ONLY')} · registry=$USER_REGISTRY · resolver=$RESOLVER · expiry=$EXP =="
cr_grn "   ENSIP-25 registry (ERC-7930) = $ERC7930"

N=$(agents_count)
for ((i=0; i<N; i++)); do
  L=$(agent_field "$i" label); OWNER=$(agent_field "$i" owner); AID=$(agent_field "$i" agentId)
  [ -n "$ONLY" ] && [ "$L" != "$ONLY" ] && continue
  CTX=$(agent_field "$i" "agent-context"); WEB=$(agent_endpoint "$i" web); MCP=$(agent_endpoint "$i" mcp); A2A=$(agent_endpoint "$i" a2a)
  FQN="${L}.${PARENT_NAME}"; SLH=$(labelhash "$L"); DNS=$(dns_encode "$FQN")
  echo; cr_grn "── ${FQN}  (owner $OWNER, agentId $AID) ──"

  ST=$(get_status "$USER_REGISTRY" "$SLH")
  if [ "$ST" = "2" ]; then cr_ylw "  already registered (status=2) — refreshing records only";
  else
    send "$USER_REGISTRY" "register(string,address,address,address,uint256,uint64)" \
      "$L" "$OWNER" "$ZERO" "$RESOLVER" 0 "$EXP" || die "register $L failed"
  fi

  # ENSIP-26: agent-context (the agent's index.html)
  send "$RESOLVER" "setText(bytes,string,string)" "$DNS" "agent-context" "$CTX" || die "setText agent-context $L"
  # ENSIP-26: agent-endpoint[web|mcp|a2a] (only non-empty)
  [ -n "$WEB" ] && { send "$RESOLVER" "setText(bytes,string,string)" "$DNS" "agent-endpoint[web]" "$WEB" || die "setText web $L"; }
  [ -n "$MCP" ] && { send "$RESOLVER" "setText(bytes,string,string)" "$DNS" "agent-endpoint[mcp]" "$MCP" || die "setText mcp $L"; }
  [ -n "$A2A" ] && { send "$RESOLVER" "setText(bytes,string,string)" "$DNS" "agent-endpoint[a2a]" "$A2A" || die "setText a2a $L"; }
  # ENSIP-25: agent-registration[<erc7930>][<agentId>] = "1"  (the on-chain half of the blessing attestation)
  K25=$(ensip25_key "$ERC7930" "$AID")
  send "$RESOLVER" "setText(bytes,string,string)" "$DNS" "$K25" "1" || die "setText ENSIP-25 $L"
  # forward address record (coinType 60 = ETH) → subname resolves to the agent
  send "$RESOLVER" "setAddress(bytes,uint256,bytes)" "$DNS" 60 "$OWNER" || die "setAddress $L"

  cr_grn "  ✓ minted + ENSIP-25/26 records set for ${FQN}"
done
cr_grn "✅ subnames minted with records${ONLY:+ (scoped to '$ONLY')}"
