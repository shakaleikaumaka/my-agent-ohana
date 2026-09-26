# shellcheck shell=bash
# ─────────────────────────────────────────────────────────────────────────────
# lib.sh — shared helpers for the ENSv2 + EAC lane. Source AFTER config.sh.
# Requires: foundry `cast`, python3.
# ─────────────────────────────────────────────────────────────────────────────

cr_red()   { printf '\033[31m%s\033[0m\n' "$*"; }
cr_grn()   { printf '\033[32m%s\033[0m\n' "$*"; }
cr_ylw()   { printf '\033[33m%s\033[0m\n' "$*"; }
die()      { cr_red "✗ $*"; exit 1; }
have()     { command -v "$1" >/dev/null 2>&1; }

need_tools() { have cast || die "foundry 'cast' not found (see MEMORY: FOUNDRY_DIR=/workspace/.tools/foundry foundryup)"; have python3 || die "python3 not found"; }

# DNS-wire-encode a name: "trace.myagentohana.eth" -> 0x0574...657468 00
dns_encode() {
  python3 -c '
import sys
out=b""
for lab in sys.argv[1].split("."):
    b=lab.encode(); out+=bytes([len(b)])+b
out+=b"\x00"
print("0x"+out.hex())' "$1"
}

# ENS namehash (== cast namehash; kept as a helper for symmetry)
node_of() { cast namehash "$1"; }

# labelhash of a single label (used as EAC `anyId` — polymorphic: labelhash|tokenId|resource)
labelhash() { cast keccak "$1"; }

# ERC-7930 interoperable address: version||eip155||chainReflen||chainRef||addrlen||addr
erc7930() {
  python3 -c '
import sys
chainid=int(sys.argv[1]); addr=sys.argv[2].lower().replace("0x","")
cr=hex(chainid)[2:]
if len(cr)%2: cr="0"+cr
print("0x0001"+"0000"+("%02x"%(len(cr)//2))+cr+("%02x"%(len(addr)//2))+addr)' "$1" "$2"
}

# ENSIP-25 attestation key for an agentId: agent-registration[<erc7930>][<agentId>]
ensip25_key() {
  local erc="$1" agentId="$2"
  printf 'agent-registration[%s][%s]' "$erc" "$agentId"
}

# ── RPC failover: return the first RPC that answers eth_blockNumber ────────────
rpc_ok() {
  local url="$1"
  local out; out=$(cast block-number --rpc-url "$url" 2>/dev/null) || return 1
  [[ "$out" =~ ^[0-9]+$ ]]
}
rpc_pick() {
  for u in "$ENS_RPC" "$ENS_RPC_FALLBACK_1" "$ENS_RPC_FALLBACK_2"; do
    [ -z "$u" ] && continue
    if rpc_ok "$u"; then echo "$u"; return 0; fi
  done
  return 1
}

# ── send wrapper: prints status, dies on revert; needs AUTHORIZER_PK in env ────
# usage: send <to> "<sig>" [args...]
send() {
  local to="$1"; shift
  local sig="$1"; shift
  [ -n "${AUTHORIZER_PK:-}" ] || die "AUTHORIZER_PK not set (export the signer key; never commit it)"
  local out st
  out=$(cast send "$to" "$sig" "$@" --private-key "$AUTHORIZER_PK" --rpc-url "$RPC" --json 2>&1) || { cr_red "  send failed: $sig"; echo "$out" | tail -3; return 1; }
  st=$(echo "$out" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("status","?"))' 2>/dev/null)
  echo "$out" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("  tx",d.get("transactionHash",""),"status",d.get("status"),"gas",int(d.get("gasUsed","0x0"),16))' 2>/dev/null
  [ "$st" = "0x1" ] || return 1
}

# read the live tokenId for a name (re-read after every bless/revoke — it regenerates)
get_tokenid() {
  local registry="$1" anyId="$2"
  cast call "$registry" "getState(uint256)((uint8,uint64,address,uint256,uint256))" "$anyId" --rpc-url "$RPC" 2>/dev/null \
    | tr -d '()' | awk -F', ' '{print $4}' | awk '{print $1}'
}
get_owner() {
  local registry="$1" anyId="$2"
  cast call "$registry" "getState(uint256)((uint8,uint64,address,uint256,uint256))" "$anyId" --rpc-url "$RPC" 2>/dev/null \
    | tr -d '()' | awk -F', ' '{print $3}'
}
get_status() {
  local registry="$1" anyId="$2"
  cast call "$registry" "getState(uint256)((uint8,uint64,address,uint256,uint256))" "$anyId" --rpc-url "$RPC" 2>/dev/null \
    | tr -d '()' | awk -F', ' '{print $1}'
}

# read a text record from a PermissionedResolver via resolve(dnsName, text(node,key))
read_text() {
  local resolver="$1" name="$2" key="$3"
  local dns node data raw
  dns=$(dns_encode "$name"); node=$(node_of "$name")
  data=$(cast calldata "text(bytes32,string)" "$node" "$key")
  raw=$(cast call "$resolver" "resolve(bytes,bytes)(bytes)" "$dns" "$data" --rpc-url "$RPC" 2>/dev/null)
  [ -n "$raw" ] && [ "$raw" != "0x" ] && cast abi-decode "text(bytes32,string)(string)" "$raw" 2>/dev/null
}
# read the ETH addr (coinType 60) for a name
read_addr() {
  local resolver="$1" name="$2"
  local dns node data raw
  dns=$(dns_encode "$name"); node=$(node_of "$name")
  data=$(cast calldata "addr(bytes32)" "$node")
  raw=$(cast call "$resolver" "resolve(bytes,bytes)(bytes)" "$dns" "$data" --rpc-url "$RPC" 2>/dev/null)
  [ -n "$raw" ] && [ "$raw" != "0x" ] && cast abi-decode "addr(bytes32)(address)" "$raw" 2>/dev/null
}

# jq-free JSON field readers for agents.config.json (uses python)
agents_count() { python3 -c 'import json,sys;print(len(json.load(open(sys.argv[1]))["agents"]))' "$AGENTS_JSON"; }
agent_field()  { python3 -c 'import json,sys;a=json.load(open(sys.argv[1]))["agents"][int(sys.argv[2])];print(a.get(sys.argv[3],""))' "$AGENTS_JSON" "$1" "$2"; }
agent_endpoint(){ python3 -c 'import json,sys;a=json.load(open(sys.argv[1]))["agents"][int(sys.argv[2])];print(a.get("endpoints",{}).get(sys.argv[3],""))' "$AGENTS_JSON" "$1" "$2"; }
agent_index_by_label(){ python3 -c 'import json,sys
a=json.load(open(sys.argv[1]))["agents"]
for i,x in enumerate(a):
    if x["label"]==sys.argv[2]: print(i); break
else: print(-1)' "$AGENTS_JSON" "$1"; }

# state file helpers (persist deployed addresses between numbered scripts)
state_set() { local k="$1" v="$2"; touch "$STATE_FILE"; grep -v "^${k}=" "$STATE_FILE" > "$STATE_FILE.tmp" 2>/dev/null || true; mv "$STATE_FILE.tmp" "$STATE_FILE" 2>/dev/null || true; echo "${k}=${v}" >> "$STATE_FILE"; }
state_load() { [ -f "$STATE_FILE" ] && set -a && . "$STATE_FILE" && set +a || true; }
