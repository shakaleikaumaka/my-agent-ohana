#!/usr/bin/env bash
# test.sh — spector-scan ship test.
# Proves the scanner (STATIC + DYNAMIC) does its job:
#   (a) the REAL consent-server scans CLEAN (0 BLOCKER, 0 SHOULD → exit 0),
#   (b) a tiny PLANTED-VULN fixture is FOUND (>=1 BLOCKER incl. 0.0.0.0 bind +
#       unauth revoke route → exit 3),
#   (c) the dynamic black-box self-test (vulnerable vs hardened HTTP doubles) passes.
# Prints PASS/FAIL per assertion; exits non-zero on any failure.
#
# Spector 🕵️ — reviews, not certified audits.
set -u
cd "$(dirname "$0")"

CONSENT_SERVER="${CONSENT_SERVER:-/shared/tokyo/consent-server}"
FIXTURE="fixtures/vuln-backend"
PASS=0; FAIL=0
mkdir -p reports

ok()   { echo "  PASS: $1"; PASS=$((PASS+1)); }
bad()  { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }
# assert exit code:  desc  expected  actual
code() { if [ "$2" = "$3" ]; then ok "$1 (exit $3)"; else bad "$1 (expected exit $2, got $3)"; fi; }
# assert a finding id is present in a json report:  desc  jsonfile  id
hasid(){ if node -e 'const j=require(require("path").resolve(process.argv[1]));process.exit(j.findings.some(f=>f.id===process.argv[2])?0:1)' "$2" "$3"; then ok "$1"; else bad "$1"; fi; }
# assert a finding id is ABSENT
noid() { if node -e 'const j=require(require("path").resolve(process.argv[1]));process.exit(j.findings.some(f=>f.id===process.argv[2])?1:0)' "$2" "$3"; then ok "$1"; else bad "$1"; fi; }
clean(){ if node -e 'const j=require(require("path").resolve(process.argv[1]));process.exit(j.clean===true?0:1)' "$2"; then ok "$1"; else bad "$1"; fi; }

echo "== spector-scan ship test =="
echo

# ── (a) STATIC: real consent-server must scan CLEAN ─────────────────────────
echo "[a] STATIC scan of real consent-server ($CONSENT_SERVER)"
if [ -d "$CONSENT_SERVER" ]; then
  node scan.mjs --source "$CONSENT_SERVER" --quiet \
    --out reports/consent-server-static.md --json reports/consent-server-static.json
  A=$?
  code "consent-server exits 0 (clean)" 0 "$A"
  clean "consent-server report marked clean" reports/consent-server-static.json
  hasid "confirms F6 CLOSED (server-side verify present)" reports/consent-server-static.json SRC-F6-OK
  noid  "no false 0.0.0.0-bind finding on doc/comment lines" reports/consent-server-static.json SRC-BIND-0000
  noid  "no false fail-open finding on the fail-CLOSED catch" reports/consent-server-static.json SRC-FAIL-OPEN-CATCH
else
  echo "  SKIP: consent-server not found at $CONSENT_SERVER"
fi
echo

# ── (b) STATIC: planted-vuln fixture must be FOUND ──────────────────────────
echo "[b] STATIC scan of planted-vuln fixture ($FIXTURE)"
node scan.mjs --source "$FIXTURE" --quiet \
  --out reports/vuln-fixture-static.md --json reports/vuln-fixture-static.json
B=$?
code "vuln fixture exits 3 (blocker present)" 3 "$B"
hasid "FINDS planted 0.0.0.0 bind"            reports/vuln-fixture-static.json SRC-BIND-0000
hasid "FINDS planted unauth revoke route"     reports/vuln-fixture-static.json SRC-F11-REVOKE-UNAUTH
hasid "FINDS planted unauth ledger route"     reports/vuln-fixture-static.json SRC-F11-ADMIN-UNAUTH
hasid "FINDS planted hardcoded secret"        reports/vuln-fixture-static.json SRC-SECRET-COMMITTED
hasid "FINDS planted client-only authz (F6)"  reports/vuln-fixture-static.json SRC-F6-NO-BACKEND
if node -e 'const j=require(require("path").resolve("reports/vuln-fixture-static.json"));process.exit(j.clean===false?0:1)'; then
  ok "vuln fixture NOT clean"; else bad "vuln fixture NOT clean"; fi
echo

# ── (c) DYNAMIC: black-box HTTP self-test (vulnerable vs hardened doubles) ───
echo "[c] DYNAMIC black-box self-test (HTTP doubles)"
node test/run-tests.mjs
C=$?
code "dynamic self-test passes" 0 "$C"
echo

# ── (d) INTERCEPTA: destination screening + 4-verdict logic + real call path ─
echo "[d] Intercepta destination-screening module (screen.mjs)"
node test/intercepta.test.mjs
D=$?
code "intercepta screening test passes (incl. live call path)" 0 "$D"
echo

echo "== $([ $FAIL -eq 0 ] && echo "ALL TESTS PASSED ✅ ($PASS assertions)" || echo "$FAIL FAILED ❌ / $PASS passed") =="
[ $FAIL -eq 0 ] || (exit 1)
