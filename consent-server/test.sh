#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# End-to-end curl walk of the consent ceremony against a LOCAL `wrangler dev`.
# Offline: uses the self-signed mock issuer (ISSUER_OVERRIDE + MOCK_JWKS from .dev.vars).
# Walks begin -> verify -> check(ok) -> revoke -> check(401 consent_revoked) -> receipt,
# plus fail-closed cases (forged sig, jti replay=409, expired, unauth revoke=403,
# ledger auth). Prints PASS/FAIL per assertion; exits non-zero on any failure.
#
# SECURITY: wrangler dev binds 127.0.0.1 only. NEVER pass --ip 0.0.0.0 (F11).
set -u
cd "$(dirname "$0")"
export PATH="$HOME/.foundry/bin:$PATH"

PORT="${PORT:-8787}"
BASE="http://127.0.0.1:${PORT}"
ADMIN="dev-admin-key-change-me"
AGENT="tauro.demo.eth"
PASS=0; FAIL=0

jqf() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(s);const p=process.argv[1].split(".");let v=o;for(const k of p)v=v?.[k];process.stdout.write(v===undefined?"":String(v))}catch{process.stdout.write("")}})' "$1"; }
mint() { local o="${1:-}"; [ -z "$o" ] && o='{}'; node scripts/mint.mjs "$o"; }

check() { # desc  expected  actual
  if [ "$2" = "$3" ]; then echo "  PASS: $1 ($3)"; PASS=$((PASS+1));
  else echo "  FAIL: $1 (expected $2, got $3)"; FAIL=$((FAIL+1)); fi
}

# status+body of a POST; sets HTTP + BODY globals
req() { # method path json [header]
  local m="$1" p="$2" j="${3:-}" h="${4:-}"
  local args=(-s -o /tmp/cs_body -w '%{http_code}' -X "$m" "${BASE}${p}" -H 'content-type: application/json')
  [ -n "$h" ] && args+=(-H "$h")
  [ -n "$j" ] && args+=(-d "$j")
  HTTP=$(curl "${args[@]}"); BODY=$(cat /tmp/cs_body)
}
reqg() { local p="$1" h="${2:-}"; local args=(-s -o /tmp/cs_body -w '%{http_code}' "${BASE}${p}"); [ -n "$h" ] && args+=(-H "$h"); HTTP=$(curl "${args[@]}"); BODY=$(cat /tmp/cs_body); }

# --- ensure keys exist ---
[ -f test/fixtures/mock-private.jwk.json ] || node scripts/mkkeys.mjs >/dev/null

# --- start wrangler dev ---
echo "starting wrangler dev on 127.0.0.1:${PORT} ..."
npx wrangler dev --ip 127.0.0.1 --port "${PORT}" >/tmp/cs_wrangler.log 2>&1 &
WPID=$!
trap 'kill $WPID 2>/dev/null' EXIT
# wait for healthz
for i in $(seq 1 60); do
  if curl -s -m 2 "${BASE}/healthz" >/dev/null 2>&1; then break; fi
  sleep 1
done
reqg /healthz
check "healthz reachable" "200" "$HTTP"
[ "$HTTP" != "200" ] && { echo "wrangler dev did not come up; log:"; tail -30 /tmp/cs_wrangler.log; exit 1; }
echo "  configured=$(printf '%s' "$BODY" | jqf configured) issuer=$(printf '%s' "$BODY" | jqf issuer)"

# reset
req POST /v1/admin/reset '{}' "x-admin-key: ${ADMIN}"
check "admin reset" "200" "$HTTP"

echo "== HAPPY PATH =="
req POST /v1/consent/begin "{\"agent_subname\":\"${AGENT}\"}"
check "begin" "200" "$HTTP"
SID=$(printf '%s' "$BODY" | jqf session_id); NONCE=$(printf '%s' "$BODY" | jqf nonce)

TOKEN=$(mint "{\"nonce\":\"${NONCE}\"}")
req POST /v1/verify "{\"id_token\":\"${TOKEN}\",\"session_id\":\"${SID}\",\"agent_subname\":\"${AGENT}\",\"scope_requested\":[\"steward:gift\"]}"
check "verify" "200" "$HTTP"
CID=$(printf '%s' "$BODY" | jqf consent_id); RT=$(printf '%s' "$BODY" | jqf receipt_token)

req POST /v1/consent/check "{\"id_token\":\"${TOKEN}\",\"consent_id\":\"${CID}\",\"agent_subname\":\"${AGENT}\",\"action\":\"steward:gift\"}"
check "check before revoke" "200" "$HTTP"

req POST /v1/revoke "{\"consent_id\":\"${CID}\",\"receipt_token\":\"${RT}\"}"
check "revoke (receipt cap)" "200" "$HTTP"

req POST /v1/consent/check "{\"id_token\":\"${TOKEN}\",\"consent_id\":\"${CID}\",\"agent_subname\":\"${AGENT}\",\"action\":\"steward:gift\"}"
check "check AFTER revoke -> 401" "401" "$HTTP"
check "  reason consent_revoked" "consent_revoked" "$(printf '%s' "$BODY" | jqf error)"

# receipt_token now travels in a HEADER, never the URL query string (leak closed).
reqg "/v1/consent/${CID}" "x-receipt-token: ${RT}"
check "receipt view (header cap)" "200" "$HTTP"
check "  receipt status revoked" "revoked" "$(printf '%s' "$BODY" | jqf status)"
# the deprecated ?receipt_token= query must NO LONGER authenticate
reqg "/v1/consent/${CID}?receipt_token=${RT}"
check "receipt via query -> 403 (leak closed)" "403" "$HTTP"
check "  reason receipt_token_required" "receipt_token_required" "$(printf '%s' "$BODY" | jqf error)"

echo "== FAIL-CLOSED =="
# forged signature
req POST /v1/consent/begin "{\"agent_subname\":\"${AGENT}\"}"; SID=$(printf '%s' "$BODY" | jqf session_id); NONCE=$(printf '%s' "$BODY" | jqf nonce)
TOKEN=$(mint "{\"nonce\":\"${NONCE}\"}")
TAMPERED="${TOKEN%??}XX"
req POST /v1/verify "{\"id_token\":\"${TAMPERED}\",\"session_id\":\"${SID}\",\"agent_subname\":\"${AGENT}\",\"scope_requested\":[\"steward:gift\"]}"
check "forged sig -> 401" "401" "$HTTP"

# jti replay 409
req POST /v1/consent/begin "{\"agent_subname\":\"${AGENT}\"}"; SID=$(printf '%s' "$BODY" | jqf session_id); NONCE=$(printf '%s' "$BODY" | jqf nonce)
TOKEN=$(mint "{\"jti\":\"replay-abc\",\"nonce\":\"${NONCE}\"}")
req POST /v1/verify "{\"id_token\":\"${TOKEN}\",\"session_id\":\"${SID}\",\"agent_subname\":\"${AGENT}\",\"scope_requested\":[\"steward:gift\"]}"
check "replay first verify -> 200" "200" "$HTTP"
req POST /v1/consent/begin "{\"agent_subname\":\"${AGENT}\"}"; SID2=$(printf '%s' "$BODY" | jqf session_id); NONCE2=$(printf '%s' "$BODY" | jqf nonce)
TOKEN2=$(mint "{\"jti\":\"replay-abc\",\"nonce\":\"${NONCE2}\"}")
req POST /v1/verify "{\"id_token\":\"${TOKEN2}\",\"session_id\":\"${SID2}\",\"agent_subname\":\"${AGENT}\",\"scope_requested\":[\"steward:gift\"]}"
check "replay second verify -> 409" "409" "$HTTP"

# expired
req POST /v1/consent/begin "{\"agent_subname\":\"${AGENT}\"}"; SID=$(printf '%s' "$BODY" | jqf session_id); NONCE=$(printf '%s' "$BODY" | jqf nonce)
TOKEN=$(mint "{\"exp_in\":-120,\"nonce\":\"${NONCE}\"}")
req POST /v1/verify "{\"id_token\":\"${TOKEN}\",\"session_id\":\"${SID}\",\"agent_subname\":\"${AGENT}\",\"scope_requested\":[\"steward:gift\"]}"
check "expired -> 401" "401" "$HTTP"
check "  reason token_expired" "token_expired" "$(printf '%s' "$BODY" | jqf error)"

# unauth revoke (wrong receipt token) 403
req POST /v1/consent/begin "{\"agent_subname\":\"${AGENT}\"}"; SID=$(printf '%s' "$BODY" | jqf session_id); NONCE=$(printf '%s' "$BODY" | jqf nonce)
TOKEN=$(mint "{\"nonce\":\"${NONCE}\"}")
req POST /v1/verify "{\"id_token\":\"${TOKEN}\",\"session_id\":\"${SID}\",\"agent_subname\":\"${AGENT}\",\"scope_requested\":[\"steward:gift\"]}"
CID=$(printf '%s' "$BODY" | jqf consent_id)
req POST /v1/revoke "{\"consent_id\":\"${CID}\",\"receipt_token\":\"attacker-guess\"}"
check "unauth revoke -> 403" "403" "$HTTP"
check "  reason bad_receipt_token" "bad_receipt_token" "$(printf '%s' "$BODY" | jqf error)"

# ledger auth (F11)
reqg /v1/ledger
check "ledger no key -> 403" "403" "$HTTP"
reqg /v1/ledger "x-admin-key: ${ADMIN}"
check "ledger with key -> 200" "200" "$HTTP"

echo
echo "RESULT: ${PASS} passed / ${FAIL} failed"
[ "$FAIL" -eq 0 ] || exit 1
