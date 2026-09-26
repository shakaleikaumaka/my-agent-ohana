#!/usr/bin/env bash
# 02-deploy-registry.sh — deploy our UserRegistry proxy + per-project PermissionedResolver
# proxy via VerifiableFactory, mount the registry under the parent name, and grant the
# authorizer the registrar roles. Needs AUTHORIZER_PK + parent already owned (step 01).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; . "$HERE/config.sh"; . "$HERE/lib.sh"; need_tools
RPC="${RPC:-$(rpc_pick)}" || die "no RPC"; state_load
PLH=$(labelhash "$PARENT_LABEL")
PROXY_EVENT_SIG="0x0a2c575ff341b41da136c9ccae74ec230a927a024d18f0dccf46d123f28f5f54"  # ProxyDeployed(address,address,uint256,address)
SALT_VER="${SALT_VER:-1}"

proxy_from_tx() { # $1=txhash
  cast receipt "$1" --rpc-url "$RPC" --json 2>/dev/null | python3 -c '
import sys,json
d=json.load(sys.stdin); sig=sys.argv[1].lower()
for l in d["logs"]:
    if l["topics"][0].lower()==sig: print("0x"+l["topics"][2][-40:]); break' "$PROXY_EVENT_SIG"
}

deploy_proxy() { # $1=impl $2=salt $3=initcalldata  -> echoes proxy addr
  local impl="$1" salt="$2" init="$3" out tx
  out=$(cast send "$VERIFIABLE_FACTORY" "deployProxy(address,uint256,bytes)" "$impl" "$salt" "$init" \
        --private-key "$AUTHORIZER_PK" --rpc-url "$RPC" --json 2>&1) || { cr_red "deployProxy failed"; echo "$out"|tail -3; return 1; }
  tx=$(echo "$out" | python3 -c 'import sys,json;print(json.load(sys.stdin)["transactionHash"])')
  proxy_from_tx "$tx"
}

# 1) UserRegistry proxy — initialize((address,uint256)[] grants) granting authorizer ALL roles at root
cr_grn "== deploy UserRegistry proxy =="
UR_INIT=$(cast calldata "initialize((address,uint256)[])" "[($AUTHORIZER,$ALL_ROLES)]")
UR_SALT=$(cast keccak "$(cast abi-encode "f(string,bytes32,uint256)" "UserRegistry" "$(node_of "$PARENT_NAME")" "$SALT_VER")")
USER_REGISTRY=$(deploy_proxy "$USER_REGISTRY_IMPL" "$UR_SALT" "$UR_INIT") || die "UserRegistry deploy failed"
[ -n "$USER_REGISTRY" ] || die "could not read UserRegistry proxy address"
cr_grn "  UserRegistry = $USER_REGISTRY"
state_set USER_REGISTRY "$USER_REGISTRY"

# 2) PermissionedResolver proxy — initialize((address,uint256)[] grants, bytes[] calls)
cr_grn "== deploy PermissionedResolver proxy =="
RES_INIT=$(cast calldata "initialize((address,uint256)[],bytes[])" "[($AUTHORIZER,$ALL_ROLES)]" "[]")
RES_SALT=$(cast keccak "$(cast abi-encode "f(string,bytes32,uint256)" "OhanaResolver" "$(node_of "$PARENT_NAME")" "$SALT_VER")")
RESOLVER=$(deploy_proxy "$PERM_RESOLVER_IMPL" "$RES_SALT" "$RES_INIT") || die "Resolver deploy failed"
[ -n "$RESOLVER" ] || die "could not read Resolver proxy address"
cr_grn "  Resolver = $RESOLVER"
state_set RESOLVER "$RESOLVER"

# 3) mount UserRegistry under the parent name so subnames resolve
cr_grn "== setSubregistry(parent -> UserRegistry) =="
send "$ETH_REGISTRY" "setSubregistry(uint256,address)" "$PLH" "$USER_REGISTRY" || die "setSubregistry failed"
GOT=$(cast call "$ETH_REGISTRY" "getSubregistry(string)(address)" "$PARENT_LABEL" --rpc-url "$RPC")
[ "${GOT,,}" = "${USER_REGISTRY,,}" ] || die "subregistry mismatch: $GOT"
cr_grn "  ✓ getSubregistry($PARENT_LABEL) == $GOT"

# 4) ensure authorizer holds registrar roles on the UserRegistry root (idempotent)
cr_grn "== grantRootRoles(REGISTRAR|RENEW|UNREGISTER, authorizer) =="
ROOT_GRANT=$(python3 -c "print(hex(int('$ROLE_REGISTRAR',16)|int('$ROLE_RENEW',16)|int('$ROLE_UNREGISTER',16)))")
send "$USER_REGISTRY" "grantRootRoles(uint256,address)" "$ROOT_GRANT" "$AUTHORIZER" || cr_ylw "  (already held — ok)"

cr_grn "✅ registry+resolver deployed & wired"
echo
cr_grn "State written to $STATE_FILE:"; grep -E 'USER_REGISTRY|RESOLVER|PARENT' "$STATE_FILE"
