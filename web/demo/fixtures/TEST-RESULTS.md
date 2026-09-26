# TEST-RESULTS — lane M5-6 (utility fixtures + World debrief) · Terri 🐢

**Run:** `bash test.sh` · **Host:** container · **Date:** $(date -u '+%Y-%m-%d %H:%M UTC')
**Deps:** jq + python3 (both present) · no network.

**Result: 25/25 PASS, 0 FAIL.**

Covers: JSON validity · Trace listing→match→signed-receipt chain · real anchors (Bonanza \$642.96, onions 120→55) · illustrative-row labeling · Terri signed hash-chained ledger · HMAC signature recompute + tamper-rejection · deterministic byte-identical regen · debrief rubric coverage · embargo (no \$-token names).

```
== 1. JSON validity (jq) ==
  PASS: trace-fixtures.json parses as JSON
  PASS: terri-receipts.json parses as JSON
== 2. Trace chain: listing -> match -> signed receipt ==
  PASS: trace has listings[] (>=1)
  PASS: trace listings have {id,label,out,meals}
  PASS: trace has match linked to a listing id
  PASS: trace match.matched == true
  PASS: trace has signed receipt over the match input
  PASS: receipt result rescued lb == match total
== 3. Real anchor numbers (honesty) ==
  PASS: Bonanza receipt total == 642.96
  PASS: onion loop 120 -> 55
  PASS: illustrative rows are labeled
  PASS: terri indexes real 642.96 anchor
== 4. Terri ledger: every action signed + hash-chained ==
  PASS: terri ledger has entries[] (>=1)
  PASS: every entry has a signature
== 5. Cryptographic verification (recompute HMAC + chain, published demo key) ==
  PASS: trace receipt signature verifies
  PASS: every terri ledger entry signature verifies
  PASS: terri ledger hash-chain (prevSig links) intact
  PASS: tampered entry is rejected (tamper-evident)
== 6. Deterministic regen (re-run == identical) ==
  PASS: trace-fixtures.json regenerates byte-identical
  PASS: terri-receipts.json regenerates byte-identical
== 7. Debrief renders ==
  PASS: world-integration-debrief.md exists & non-trivial
  PASS: debrief covers time-to-first-success
  PASS: debrief covers friction
  PASS: debrief covers top improvement
== 8. Embargo (no token names in shipped artifacts) ==
  PASS: no $-token names in fixtures/debrief

==================== RESULT: 25 passed, 0 failed ====================
```
