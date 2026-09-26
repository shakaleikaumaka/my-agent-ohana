#!/usr/bin/env bash
# M5-5 world-kit test harness. Two parts:
#   A) LIVE curl: OIDC discovery + JWKS on the NEW domain (assert 200 + expected fields + kid present)
#   B) OFFLINE unit test: the IDKit verify gate (valid->allow, denied->dignified deny, fail-closed)
# Usage: bash test.sh   (needs: curl, python3, node>=20)
set -u
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PASS=0; FAIL=0
ok(){ echo "  ✅ $1"; PASS=$((PASS+1)); }
no(){ echo "  ❌ $1"; FAIL=$((FAIL+1)); }
ISSUER="https://sandbox.auth.world.org"
OLD_KID="yiX1KR5gDdPTqsHAbT5d0JqIG6-HcTv8wGao4sSTgsY"

echo "== A) LIVE OIDC re-verify on NEW domain ($ISSUER) =="
DISC="$(curl -sS -m 25 -w '\n%{http_code}' "$ISSUER/.well-known/openid-configuration" 2>/dev/null)"
DCODE="$(printf '%s' "$DISC" | tail -n1)"; DBODY="$(printf '%s' "$DISC" | sed '$d')"
[ "$DCODE" = "200" ] && ok "discovery HTTP 200" || no "discovery HTTP $DCODE"
echo "$DBODY" | python3 -c '
import sys,json
d=json.load(sys.stdin)
exp={"issuer":"https://sandbox.auth.world.org",
     "authorization_endpoint":"https://sandbox.auth.world.org/api/v1/authorize",
     "token_endpoint":"https://sandbox.auth.world.org/api/v1/token",
     "device_authorization_endpoint":"https://sandbox.auth.world.org/api/v1/device_authorization",
     "jwks_uri":"https://sandbox.auth.world.org/.well-known/jwks.json"}
bad=[k for k,v in exp.items() if d.get(k)!=v]
assert not bad, "endpoint mismatch: %s"%bad
assert "urn:ietf:params:oauth:grant-type:device_code" in d["grant_types_supported"], "no device grant"
assert "authorization_code" in d["grant_types_supported"], "no auth_code grant"
assert d["code_challenge_methods_supported"]==["S256"], "no PKCE S256"
assert d["acr_values_supported"]==["https://world.org/oidc/acr/orb-v3"], "acr changed"
' >/dev/null 2>/tmp/wk_disc_err && ok "discovery fields correct (issuer/endpoints/device+code grants/PKCE/acr)" || { no "discovery fields"; cat /tmp/wk_disc_err; }

JWKS="$(curl -sS -m 25 -w '\n%{http_code}' "$ISSUER/.well-known/jwks.json" 2>/dev/null)"
JCODE="$(printf '%s' "$JWKS" | tail -n1)"; JBODY="$(printf '%s' "$JWKS" | sed '$d')"
[ "$JCODE" = "200" ] && ok "JWKS HTTP 200" || no "JWKS HTTP $JCODE"
KID="$(printf '%s' "$JBODY" | python3 -c 'import sys,json;print(json.load(sys.stdin)["keys"][0]["kid"])' 2>/dev/null)"
[ -n "$KID" ] && ok "JWKS has a signing kid: $KID" || no "JWKS missing kid"
if [ "$KID" = "$OLD_KID" ]; then no "kid UNCHANGED vs old pin (unexpected)"; else ok "kid ROTATED vs old auth.worldcoin.dev pin (Tauro must re-pin)"; fi
printf '%s' "$JBODY" | python3 -c 'import sys,json;k=json.load(sys.stdin)["keys"][0];assert k["kty"]=="RSA" and k["alg"]=="RS256" and k["use"]=="sig";print("PYOK")' >/dev/null 2>&1 && ok "JWKS key is RSA/RS256/sig" || no "JWKS key shape"

echo "== B) OFFLINE IDKit verify-gate unit test (node --test) =="
if command -v node >/dev/null 2>&1; then
  if node --test "$DIR/tests/verify.test.mjs" >/tmp/wk_unit.log 2>&1; then
    ok "gate unit test suite PASSED ($(grep -c '^✔' /tmp/wk_unit.log) checks)"
    grep -E '^(ℹ tests|ℹ pass|ℹ fail)' /tmp/wk_unit.log | sed 's/^/     /'
  else
    no "gate unit test FAILED"; tail -25 /tmp/wk_unit.log
  fi
else
  no "node not found (skip unit test)"
fi

echo; echo "== SUMMARY: $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
