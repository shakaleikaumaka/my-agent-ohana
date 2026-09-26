#!/usr/bin/env bash
# test.sh — lane M5-6 utility fixtures (Terri).
# Validates: (1) all JSON parses, (2) listing->match->receipt chain fields exist,
# (3) real anchor numbers present, (4) EVERY signature + hash-chain link re-verifies,
# (5) generator is deterministic (re-run == byte identical), (6) debrief renders.
# Dep-free except jq + python3 (both standard). No network.
set -u
cd "$(dirname "$0")"

PASS=0; FAIL=0
ok(){ echo "  PASS: $1"; PASS=$((PASS+1)); }
no(){ echo "  FAIL: $1"; FAIL=$((FAIL+1)); }
chk(){ if eval "$2"; then ok "$1"; else no "$1"; fi; }

echo "== 1. JSON validity (jq) =="
for f in trace-fixtures.json terri-receipts.json; do
  chk "$f parses as JSON" "jq -e . '$f' >/dev/null 2>&1"
done

echo "== 2. Trace chain: listing -> match -> signed receipt =="
chk "trace has listings[] (>=1)"        "[ \$(jq '.listings | length' trace-fixtures.json) -ge 1 ]"
chk "trace listings have {id,label,out,meals}" "jq -e '(.listings|length) as \$n | ([.listings[] | select(.id and .label and .out and (.meals|type==\"number\"))]|length) == \$n' trace-fixtures.json >/dev/null"
chk "trace has match linked to a listing id" "jq -e '.match.listingId as \$m | (.listings | map(.id) | index(\$m)) != null' trace-fixtures.json >/dev/null"
chk "trace match.matched == true"        "jq -e '.match.matched == true' trace-fixtures.json >/dev/null"
chk "trace has signed receipt over the match input" "jq -e '.receipt.input.listingId == .match.listingId and (.receipt.sig.value|type==\"string\")' trace-fixtures.json >/dev/null"
chk "receipt result rescued lb == match total" "jq -e '.receipt.result.totalRescued_lb == .match.totalRescued_lb' trace-fixtures.json >/dev/null"

echo "== 3. Real anchor numbers (honesty) =="
chk "Bonanza receipt total == 642.96"    "jq -e '.supplyReceipt.total == 642.96' trace-fixtures.json >/dev/null"
chk "onion loop 120 -> 55"               "jq -e '.loop.received == 120 and .loop.forecastSurplus == 55' trace-fixtures.json >/dev/null"
chk "illustrative rows are labeled"      "jq -e '(.listings|length) as \$n | ([.listings[] | select(.basis|test(\"ILLUSTRATIVE|REAL\"))]|length) == \$n' trace-fixtures.json >/dev/null"
chk "terri indexes real 642.96 anchor"   "jq -e '[.realAnchors.receipts[] | select(.value.total_usd == 642.96)] | length >= 1' terri-receipts.json >/dev/null"

echo "== 4. Terri ledger: every action signed + hash-chained =="
chk "terri ledger has entries[] (>=1)"   "[ \$(jq '.ledger.entries | length' terri-receipts.json) -ge 1 ]"
chk "every entry has a signature"        "jq -e '(.ledger.entries|length) as \$n | ([.ledger.entries[] | select(.sig.value|type==\"string\")]|length) == \$n' terri-receipts.json >/dev/null"

echo "== 5. Cryptographic verification (recompute HMAC + chain, published demo key) =="
python3 - <<'PY'
import json, hmac, hashlib, sys
KEY=b"MY-AGENT-OHANA-DEMO-KEY-not-a-real-secret"
def canon(p): return json.dumps(p, sort_keys=True, separators=(",",":"))
def verify_signed(obj):
    o=dict(obj); sig=o.pop("sig"); 
    return hmac.new(KEY, canon(o).encode(), hashlib.sha256).hexdigest()==sig["value"]
fails=0
# trace receipt
t=json.load(open("trace-fixtures.json"))
if verify_signed(t["receipt"]): print("  PASS: trace receipt signature verifies")
else: print("  FAIL: trace receipt signature"); fails+=1
# terri ledger sigs + chain
d=json.load(open("terri-receipts.json"))
prev="GENESIS"; okc=True; oks=True
for e in d["ledger"]["entries"]:
    if not verify_signed(e): oks=False
    if e.get("prevSig")!=prev: okc=False
    prev=e["sig"]["value"]
print(("  PASS" if oks else "  FAIL")+": every terri ledger entry signature verifies"); fails+= (0 if oks else 1)
print(("  PASS" if okc else "  FAIL")+": terri ledger hash-chain (prevSig links) intact"); fails+= (0 if okc else 1)
# tamper check: flip a byte, expect break
import copy
tam=copy.deepcopy(d["ledger"]["entries"][1]); tam["detail"]="TAMPERED"
print(("  PASS" if not verify_signed(tam) else "  FAIL")+": tampered entry is rejected (tamper-evident)"); fails+= (0 if not verify_signed(tam) else 1)
sys.exit(1 if fails else 0)
PY
if [ $? -eq 0 ]; then PASS=$((PASS+4)); else FAIL=$((FAIL+1)); echo "  (crypto block reported a failure)"; fi

echo "== 6. Deterministic regen (re-run == identical) =="
cp trace-fixtures.json .t.bak; cp terri-receipts.json .r.bak
python3 gen-fixtures.py >/dev/null 2>&1
chk "trace-fixtures.json regenerates byte-identical" "diff -q .t.bak trace-fixtures.json >/dev/null"
chk "terri-receipts.json regenerates byte-identical" "diff -q .r.bak terri-receipts.json >/dev/null"
rm -f .t.bak .r.bak

echo "== 7. Debrief renders =="
chk "world-integration-debrief.md exists & non-trivial" "[ \$(wc -c < world-integration-debrief.md) -gt 2000 ]"
chk "debrief covers time-to-first-success" "grep -qi 'time to first success' world-integration-debrief.md"
chk "debrief covers friction"             "grep -qi 'friction' world-integration-debrief.md"
chk "debrief covers top improvement"      "grep -qi 'greatest impact\|improvement' world-integration-debrief.md"

echo "== 8. Embargo (no token names in shipped artifacts) =="
chk "no \$-token names in fixtures/debrief" "! grep -REn '\\\$SHAKA|\\\$OHANA|\\\$PIT' trace-fixtures.json terri-receipts.json world-integration-debrief.md >/dev/null 2>&1"

echo
echo "==================== RESULT: $PASS passed, $FAIL failed ===================="
[ $FAIL -eq 0 ]
