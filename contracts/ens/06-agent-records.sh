#!/usr/bin/env bash
# 06-agent-records.sh — PRICE-IN-THE-NAME + DON'T-TRUST-CHECK (agent:* records).
# Jeff Lau (ENS), on stage Friday: put "the details agents need in your name,
# like your endpoint and the prices" — and "what doesn't exist yet is THE CONVENTION."
# This script is a working first draft of that convention, live on ENSv2 Sepolia.
# Convention doc: AGENT-RECORDS.md · pins: ADDRESSES.md § agent-records
#
# ① spector.myagentohana.eth — additive text records ONLY (existing records untouched):
#      agent:price / agent:currency / agent:pay / agent:endpoint / agent:terms / agent:owner-root
# ④ registry.myagentohana.eth — new subname resolving TO our UserRegistry + pointer records
#      ("don't trust, check": any agent can resolve this name and verify blessings on-chain)
#
# Needs AUTHORIZER_PK in env. Idempotent: re-running just refreshes the records.
#   usage: ./06-agent-records.sh          (write + read-back)
#          ./06-agent-records.sh --read   (read-back only, no txs, no key needed)
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; . "$HERE/config.sh"; . "$HERE/lib.sh"; need_tools
RPC="${RPC:-$(rpc_pick)}" || die "no RPC"; state_load
[ -n "${USER_REGISTRY:-}" ] || die "USER_REGISTRY not in state — run 02 first"
[ -n "${RESOLVER:-}" ]      || die "RESOLVER not in state — run 02 first"
READ_ONLY=""; [ "${1:-}" = "--read" ] && READ_ONLY=1
ZERO="0x0000000000000000000000000000000000000000"

# ── ① the agent:* record set for spector (values verified live 2026-09-26) ────
SP_FQN="spector.${PARENT_NAME}"; SP_DNS=$(dns_encode "$SP_FQN")
A_PRICE="36.90"
A_CURRENCY="USD"
# The fleet-wide x402 lane spector's door already carries (x402-tip.js v1.3):
# x402Version:1 resource JSON — USDC on Base via facilitator.payai.network. Verified live.
A_PAY="https://shakaleikaumaka.com/x402-bless.json"
A_ENDPOINT="https://spectoragent.com/"
A_TERMS="USD 36.90/month tenant-prospecting for CRE brokers; human consent required; cancel anytime; full terms at spectoragent.com"
A_OWNER_ROOT="${PARENT_NAME}"

# ── ④ don't-trust-check pointers for registry.<parent> ────────────────────────
RG_LABEL="registry"; RG_FQN="${RG_LABEL}.${PARENT_NAME}"; RG_DNS=$(dns_encode "$RG_FQN")
RG_DESC="don't trust, check. This name resolves to the ohana UserRegistry (ENSv2 PermissionedRegistry) — read roles/attestations on-chain before believing any blessing claim."
RG_REG_CAIP="eip155:${CHAIN_ID}:${USER_REGISTRY}"
RG_ATT_CAIP="eip155:${AGENT_REGISTRY_CHAINID}:${AGENT_REGISTRY_ADDR}"

if [ -z "$READ_ONLY" ]; then
  cr_grn "== ① agent:* records on ${SP_FQN} (resolver $RESOLVER) =="
  send "$RESOLVER" "setText(bytes,string,string)" "$SP_DNS" "agent:price"      "$A_PRICE"      || die "agent:price"
  send "$RESOLVER" "setText(bytes,string,string)" "$SP_DNS" "agent:currency"   "$A_CURRENCY"   || die "agent:currency"
  send "$RESOLVER" "setText(bytes,string,string)" "$SP_DNS" "agent:pay"        "$A_PAY"        || die "agent:pay"
  send "$RESOLVER" "setText(bytes,string,string)" "$SP_DNS" "agent:endpoint"   "$A_ENDPOINT"   || die "agent:endpoint"
  send "$RESOLVER" "setText(bytes,string,string)" "$SP_DNS" "agent:terms"      "$A_TERMS"      || die "agent:terms"
  # ⚠️ SCAR (2026-09-26): `cast send` eagerly ENS-resolves any bare *.eth argument — even for
  # `string` params — turning "myagentohana.eth" into 0x000…0 on-chain. `cast calldata` encodes
  # offline and is safe, so any record whose VALUE is a bare .eth name must go raw-calldata:
  CD=$(cast calldata "setText(bytes,string,string)" "$SP_DNS" "agent:owner-root" "$A_OWNER_ROOT")
  send "$RESOLVER" "$CD" || die "agent:owner-root"

  cr_grn "== ④ ${RG_FQN} — don't trust, check =="
  RG_SLH=$(labelhash "$RG_LABEL"); ST=$(get_status "$USER_REGISTRY" "$RG_SLH")
  if [ "$ST" = "2" ]; then cr_ylw "  already registered (status=2) — refreshing records only"
  else
    NOW=$(cast block latest -f timestamp --rpc-url "$RPC"); EXP=$((NOW + SUBNAME_TTL))
    # owner = AUTHORIZER (infrastructure name, not an agent; root keeps it), roleBitmap=0
    send "$USER_REGISTRY" "register(string,address,address,address,uint256,uint64)" \
      "$RG_LABEL" "$AUTHORIZER" "$ZERO" "$RESOLVER" 0 "$EXP" || die "register $RG_LABEL"
  fi
  # the name RESOLVES TO the registry contract itself — resolve → read → verify
  send "$RESOLVER" "setAddress(bytes,uint256,bytes)" "$RG_DNS" 60 "$USER_REGISTRY" || die "setAddress registry"
  send "$RESOLVER" "setText(bytes,string,string)" "$RG_DNS" "description"                "$RG_DESC"     || die "description"
  send "$RESOLVER" "setText(bytes,string,string)" "$RG_DNS" "agent:registry"             "$RG_REG_CAIP" || die "agent:registry"
  send "$RESOLVER" "setText(bytes,string,string)" "$RG_DNS" "agent:attestation-registry" "$RG_ATT_CAIP" || die "agent:attestation-registry"
fi

# ── READ-BACK PROOF (resolver.resolve + UniversalResolver spot-check) ─────────
echo; cr_grn "== READ-BACK · ${SP_FQN} =="
for K in agent:price agent:currency agent:pay agent:endpoint agent:terms agent:owner-root; do
  printf '  %-18s = %s\n' "$K" "$(read_text "$RESOLVER" "$SP_FQN" "$K")"
done
echo; cr_grn "== READ-BACK · ${RG_FQN} =="
printf '  %-27s = %s\n' "addr(60)" "$(read_addr "$RESOLVER" "$RG_FQN")"
for K in description agent:registry agent:attestation-registry; do
  printf '  %-27s = %s\n' "$K" "$(read_text "$RESOLVER" "$RG_FQN" "$K")"
done
echo; cr_grn "== UniversalResolver spot-check (the stock viem path, $UNIVERSAL_RESOLVER) =="
NODE=$(node_of "$SP_FQN"); CD=$(cast calldata "text(bytes32,string)" "$NODE" "agent:price")
RAW=$(cast call "$UNIVERSAL_RESOLVER" "resolve(bytes,bytes)(bytes,address)" "$SP_DNS" "$CD" --rpc-url "$RPC" 2>/dev/null | head -1)
printf '  UR text(%s, agent:price) = %s\n' "$SP_FQN" "$(cast abi-decode "text(bytes32,string)(string)" "$RAW" 2>/dev/null)"
NODE=$(node_of "$RG_FQN"); CD=$(cast calldata "addr(bytes32)" "$NODE"); RG_DNSX=$(dns_encode "$RG_FQN")
RAW=$(cast call "$UNIVERSAL_RESOLVER" "resolve(bytes,bytes)(bytes,address)" "$RG_DNSX" "$CD" --rpc-url "$RPC" 2>/dev/null | head -1)
printf '  UR addr(%s)             = %s\n' "$RG_FQN" "$(cast abi-decode "addr(bytes32)(address)" "$RAW" 2>/dev/null)"
cr_grn "✅ agent-records ceremony complete"
