#!/usr/bin/env python3
"""
gen-fixtures.py — deterministic receipt generator for the My Agent Ohana demo (lane M5-6).

Owner: Globy Terri (receipts & docs keeper).

Produces TWO fixtures, both deterministic (same input -> byte-identical output):
  1) trace-fixtures.json   — the Trace food-loop utility beat: listing -> match -> signed receipt.
  2) terri-receipts.json    — Terri's guaranteed-backup ledger proving "every action logged & signed".

SIGNING (demo, verifiable, NOT a production secret):
  sig = HMAC_SHA256(key=DEMO_KEY, msg=canonical_json(payload)).hexdigest()
  canonical_json = json.dumps(payload, sort_keys=True, separators=(',',':'))
  DEMO_KEY is published in the clear on purpose so test.sh (and any judge) can recompute and
  verify every signature. It is a demo integrity/authenticity marker, NOT a secret key.

HONESTY:
  - REAL anchor: Bonanza Produce Co. receipt 2026-08-25 total $642.96; 120 lb onions -> 55 lb
    forecast surplus (Chef Marcus's worked operator example). These are kept exactly real.
  - ILLUSTRATIVE rows are flagged 'basis: ILLUSTRATIVE' per item. Nothing invented is presented
    as a logged event.
  - EMBARGO: no $-token names. Agent names (Trace/Terri) are grandfathered brand strings.
"""

import hashlib
import hmac
import json

DEMO_KEY = b"MY-AGENT-OHANA-DEMO-KEY-not-a-real-secret"


def canon(payload):
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def sign(payload):
    return hmac.new(DEMO_KEY, canon(payload).encode("utf-8"), hashlib.sha256).hexdigest()


def signed(payload):
    """Return a receipt = payload + deterministic signature over the payload."""
    r = dict(payload)
    r["sig"] = {
        "alg": "HMAC-SHA256",
        "key_id": "ohana-demo-v1",
        "note": "demo integrity marker; key published in gen-fixtures.py so anyone can verify",
        "value": sign(payload),
    }
    return r


# --------------------------------------------------------------------------- TRACE
def build_trace():
    receipt_line_items = [
        {"item": "Bell peppers (green, 5#)", "qty": "2 bags"},
        {"item": "Red potatoes (5 lb lot)", "qty": "2"},
        {"item": "Tomatoes (5# basket)", "qty": "3"},
        {"item": '12" flour tortillas (10/10 ct)', "qty": "2"},
        {"item": "Granny Smith apples (5#)", "qty": "1"},
        {"item": "Bananas (#3 color)", "qty": "2"},
        {"item": "Strawberries", "qty": "1 case"},
        {"item": "Green cabbage", "qty": "2"},
        {"item": "Poly carrots jumbo (25 lb)", "qty": "1"},
        {"item": "Cucumbers (6 ct)", "qty": "2"},
        {"item": "Garlic (colossal 5#)", "qty": "1"},
        {"item": "Lemons", "qty": "2 bags"},
        {"item": "Romaine lettuce", "qty": "4"},
        {"item": "Limes", "qty": "2 bags"},
        {"item": "Yellow onions jumbo (50 lb)", "qty": "1"},
        {"item": "Red onions (5#)", "qty": "2"},
        {"item": "Oranges", "qty": "4 bags"},
    ]

    supply_receipt = {
        "kind": "real-supply-receipt",
        "date": "2026-08-25",
        "store": "Bonanza Produce Co.",
        "location": "Reno, NV",
        "currency": "USD",
        "total": 642.96,
        "context": "Fresh-produce supply run for the camp kitchen (build week). One of four documented supply runs.",
        "items": receipt_line_items,
    }

    loop = {
        "kind": "real-worked-example",
        "sourceNote": "Chef Marcus's own 120 lb onion example, modeled end-to-end against the food-loop event types. Illustrative worked trace, not a live-run log.",
        "item": "onion, yellow",
        "unit": "lb",
        "received": 120,
        "forecastSurplus": 55,
        "events": [
            {"t": "t0", "type": "RECEIPT", "detail": "receive 120 lb yellow onions", "onhand_lb": 120},
            {"t": "t1", "type": "PRODUCTION", "detail": "Mon chili draws 38 lb", "onhand_lb": 82, "burn_lb_per_day": 38},
            {"t": "t2", "type": "ALLOCATION", "detail": "Tue menu BOM allocates 27 lb", "available_unallocated_lb": 55},
            {"t": "t3", "type": "FORECAST", "detail": "projected on-hand Tue close = 55 lb; ~1.4 days cover vs 5-day horizon", "surplus_risk": True},
            {"t": "t4", "type": "FLAG", "detail": "SURPLUS: 55 lb onions projected unneeded by Tue close — flagged EARLY (4+ days runway, not dumpster-night)"},
            {"t": "t5", "type": "RECOMMEND", "detail": "ranked options", "options": [
                {"kind": "PURCHASE", "detail": "cut next order by ~55 lb (dollar saving, zero waste)"},
                {"kind": "RECIPE", "detail": "onion-forward specials Wed/Fri to absorb internally"},
                {"kind": "TRANSFER", "detail": "offer 25-40 lb to participating kitchen B (attestation + handoff record)"},
                {"kind": "RECOVERY", "detail": "schedule refrigerated pickup Thu -> partner manifest"},
            ]},
        ],
    }

    # INPUT: listings (shape matches agentohana-demo/app.js SURPLUS = {id,label,out,meals})
    listings = [
        {
            "id": "onions-loop",
            "label": "Kitchen — 55 lb yellow onions forecast surplus (Tue close)",
            "out": "55 lb onions → onion-forward specials + 25–40 lb transfer to partner kitchen",
            "meals": 45,
            "mealsBasis": "est · 55 lb ÷ ~1.2 lb/meal ≈ 45 meal-equivalents (Feeding America convention)",
            "basis": "REAL — from Marcus's 120→55 lb onion worked loop (loop.events); onions on the real Bonanza 8/25 receipt (50 lb jumbo + 10 lb red)",
        },
        {
            "id": "carrots-25",
            "label": "Kitchen — 25 lb jumbo carrots nearing turn, Reno",
            "out": "25 lb carrots → community kitchen soup + slaw batch",
            "meals": 20,
            "mealsBasis": "est · 25 lb ÷ ~1.2 lb/meal ≈ 20 meal-equivalents",
            "basis": "ILLUSTRATIVE projection — 'Poly carrots jumbo (25 lb)' is a real line on the Bonanza 8/25 receipt; the surplus event is a demo fixture, not a logged flag",
        },
        {
            "id": "oranges-4bags",
            "label": "Kitchen — 4 bags oranges ripe fast, Reno",
            "out": "4 bags oranges → fresh-fruit share to neighbors + juice",
            "meals": 24,
            "mealsBasis": "est · ~4 bags ≈ 30 lb ÷ ~1.2 lb/meal ≈ 24 meal-equivalents",
            "basis": "ILLUSTRATIVE projection — 'Oranges ×4 bags' is a real line on the Bonanza 8/25 receipt; the surplus event is a demo fixture, not a logged flag",
        },
    ]

    # MATCH: deterministic rescue-match result for the selected (real) listing.
    selected_id = "onions-loop"
    selected = next(l for l in listings if l["id"] == selected_id)
    match = {
        "listingId": selected_id,
        "listingLabel": selected["label"],
        "matched": True,
        "partner": {
            "name": "Partner Community Kitchen B",
            "kind": "ILLUSTRATIVE — demo partner (participating-kitchen slot); not a named live org",
            "distance_km": 2.1,
            "accepts_lb": 40,
        },
        "allocation": [
            {"channel": "RECIPE (internal)", "lb": 15, "basis": "onion-forward specials Wed/Fri (loop.events t5)"},
            {"channel": "TRANSFER (partner kitchen)", "lb": 40, "basis": "partner accepts up to 40 lb"},
        ],
        "totalRescued_lb": 55,
        "meals": 45,
        "mealsBasis": "est · 55 lb ÷ ~1.2 lb/meal ≈ 45 meal-equivalents",
        "wasteAvoided_lb": 55,
        "note": "Match logic is deterministic: selected listing → ranked options from loop.events → allocate to internal recipe then partner transfer until surplus is zeroed.",
    }

    # RECEIPT: signed proof of the completed rescue-match action.
    receipt = signed({
        "type": "rescue-match-receipt",
        "agent": {"name": "Trace", "subname": "trace.ohana.eth", "role": "RESCUE_MATCHER"},
        "action": "match-and-route-surplus",
        "authority": {
            "blessedBy": "verified-human (World ID sub, pairwise)",
            "scope": "route surplus-food listings to rescue partners",
            "note": "demo authority handle; real World ID sub bound at live pilot",
        },
        "timestamp": "2026-08-26T18:00:00Z",
        "input": {"listingId": selected_id, "listingLabel": selected["label"]},
        "result": {
            "matched": True,
            "totalRescued_lb": 55,
            "meals": 45,
            "partner": "Partner Community Kitchen B (illustrative demo partner)",
        },
        "provenance": {
            "receipt": "Bonanza Produce Co. 2026-08-25 $642.96 (real)",
            "loop": "Marcus 120→55 lb onion worked example (real operator example, illustrative trace)",
        },
    })

    return {
        "_meta": {
            "title": "Trace food-loop seed fixtures — My Agent Ohana marketplace demo (S7 utility beat)",
            "owner": "Globy Terri (receipts & docs keeper)",
            "generatedBy": "gen-fixtures.py (deterministic)",
            "written": "2026-09-25",
            "chain": "input listing(s) -> match result -> signed receipt",
            "purpose": "Give the Trace 'rescue-match' utility card REAL seed data mirroring the shape agentohana-demo/app.js expects (SURPLUS = {id,label,out,meals}) so the shell can load it cleanly, PLUS a full listing->match->signed-receipt chain for the S7 beat.",
            "honesty": {
                "receipt": "REAL — the $642.96 Bonanza Produce Co. receipt (2026-08-25) is a genuine kitchen supply-run receipt held by the squad.",
                "loop": "REAL WORKED EXAMPLE — the 120→55 lb onion loop is Chef Marcus's own operator example; an illustrative worked trace, NOT a live-run log.",
                "listings": "MIXED — 'onions-loop' is rooted in the real receipt + Marcus loop. The other two are ILLUSTRATIVE surplus projections derived from real bulk items on the same real receipt; flagged per-item via 'basis'.",
                "match.partner": "ILLUSTRATIVE demo partner — not a named live organization.",
                "meals": "ESTIMATE — ~1.2 lb food = 1 meal (Feeding America). Marked 'est'.",
                "embargo": "No token names. Agent name 'Trace' is grandfathered brand.",
            },
            "sources": {
                "receipt": "/shared/public/turtle-food/data.js (Fresh Produce group) + /shared/public/turtle-bins/data.js (supply[] 8/25 Bonanza $642.96)",
                "loop": "/shared/kb/ttc/marcus-food-loop/TECH-EVAL.md §3 (120 lb onions worked as a data trace)",
                "shellShape": "/shared/public/agentohana-demo/app.js (var SURPLUS = [{id,label,out,meals}]) + agents.json (id 'trace')",
            },
            "howToUse": "Shell replaces its hardcoded SURPLUS array with fixtures.listings (identical shape). fixtures.match + fixtures.receipt render the completed-work + signed-receipt panels (S7/S8). Verify signatures with test.sh.",
        },
        "agentId": "trace",
        "name": "Trace",
        "utility": "rescue-match",
        "subname": "trace.ohana.eth",
        "role": "RESCUE_MATCHER",
        "supplyReceipt": supply_receipt,
        "loop": loop,
        "listings": listings,
        "match": match,
        "receipt": receipt,
    }


# --------------------------------------------------------------------------- TERRI
def build_terri():
    # A tamper-evident, hash-chained ledger: every entry signed, each links to prev sig.
    raw_entries = [
        {"seq": 1, "ts": "2026-08-26T17:59:40Z", "actor": "Trace", "subname": "trace.ohana.eth",
         "action": "AUTHORITY_CHECK", "detail": "re-check blessing scope before acting", "result": "allow"},
        {"seq": 2, "ts": "2026-08-26T18:00:00Z", "actor": "Trace", "subname": "trace.ohana.eth",
         "action": "RESCUE_MATCH", "detail": "onions-loop → 55 lb rescued (15 recipe + 40 transfer)", "result": "ok"},
        {"seq": 3, "ts": "2026-08-26T18:00:01Z", "actor": "Terri", "subname": "terri.ohana.eth",
         "action": "RECEIPT_STAMP", "detail": "stamp rescue-match-receipt for Trace action seq=2", "result": "ok"},
        {"seq": 4, "ts": "2026-08-26T18:05:00Z", "actor": "human", "subname": "world:sub(pairwise)",
         "action": "REVOKE", "detail": "one word: stop — EAC role revoked, blessing withdrawn", "result": "revoked"},
        {"seq": 5, "ts": "2026-08-26T18:05:00Z", "actor": "Terri", "subname": "terri.ohana.eth",
         "action": "HALT_LOG", "detail": "agent halted <100ms on local ledger; on-chain legs settle behind as receipts", "result": "halted"},
    ]

    entries = []
    prev_sig = "GENESIS"
    for e in raw_entries:
        payload = dict(e)
        payload["prevSig"] = prev_sig
        entry = signed(payload)
        entries.append(entry)
        prev_sig = entry["sig"]["value"]

    return {
        "_meta": {
            "title": "Terri receipt backup — deterministic signed ledger ('every action logged & signed')",
            "owner": "Globy Terri (receipts & docs keeper)",
            "generatedBy": "gen-fixtures.py (deterministic)",
            "written": "2026-09-25",
            "purpose": "Guaranteed-real safety net behind the S7/S8 utility beat: a tamper-evident, hash-chained ledger where EVERY action is signed and each entry links to the previous signature. Usable if Trace live wiring slips — proves the 'every action logged & signed, one-word revoke halts' beat with deterministic, independently-verifiable receipts.",
            "signing": {
                "alg": "HMAC-SHA256",
                "chain": "each entry embeds prevSig; entry.seq=1 prevSig='GENESIS'. Altering any entry breaks its sig AND every later prevSig link (tamper-evident).",
                "verify": "test.sh recomputes every signature and every chain link with the published DEMO_KEY.",
            },
            "honesty": "The ledger entries model the demo walkthrough (Trace rescue-match + revoke). They are a deterministic DEMO ledger, not a capture of a live production run. The receipts/evidence they reference (Bonanza $642.96, onion loop, on-chain deployments) are the real anchors indexed below.",
            "embargo": "No token names. Agent/cohort names are grandfathered brand strings; keep off headlines in public artifacts.",
        },
        "ledger": {
            "keyId": "ohana-demo-v1",
            "genesis": "GENESIS",
            "entries": entries,
        },
        "realAnchors": {
            "note": "Index of the REAL artifacts the demo stands on; each points to a canonical on-disk source.",
            "receipts": [
                {"id": "bonanza-0825", "claim": "Fresh-produce supply run", "value": {"date": "2026-08-25", "store": "Bonanza Produce Co.", "total_usd": 642.96}, "source": "/shared/public/turtle-food/data.js & /shared/public/turtle-bins/data.js", "verified": "2026-09-25"},
                {"id": "walmart-reno-0825", "claim": "9× 5-gal propane cylinders", "value": {"date": "2026-08-25", "store": "Walmart Reno", "total_usd": 139.32}, "source": "/shared/public/turtle-bins/data.js", "verified": "2026-09-25"},
                {"id": "winco-chefstore-0824", "claim": "Build-week food/hydration/ops/tools", "value": {"date": "2026-08-24", "store": "WinCo ×2 + Chef'Store + Lowe's + TA fuel", "total_usd": 4862.71}, "source": "/shared/public/turtle-bins/data.js", "verified": "2026-09-25"},
                {"id": "homedepot-boulder-0820", "claim": "Build materials, bins, tools", "value": {"date": "2026-08-20", "store": "Home Depot Boulder ×3", "total_usd": 2241.94}, "source": "/shared/public/turtle-bins/data.js", "verified": "2026-09-25"},
            ],
            "workedExamples": [
                {"id": "onion-food-loop", "claim": "120 lb onions → 55 lb surplus forecast → early flag → ranked recommend", "source": "/shared/kb/ttc/marcus-food-loop/TECH-EVAL.md §3", "verified": "2026-09-25", "note": "Illustrative worked trace, not a live-run log."},
            ],
            "chainEvidence": [
                {"id": "ens-registry-sepolia", "claim": "ENS-style registry (Sepolia)", "value": {"address": "0x62412fcA...8347", "block": 11692692, "chain": "Sepolia"}, "source": "/shared/public/triforce-preview/config/deployments.js", "verified": "2026-09-23"},
                {"id": "giftmarket-sepolia", "claim": "GiftMarket (Sepolia)", "value": {"address": "0x4Cbc337c...E575", "block": 11704971, "chain": "Sepolia"}, "source": "/shared/public/triforce-preview/config/deployments.js", "verified": "2026-09-23"},
                {"id": "registry-base", "claim": "Registry (Base)", "value": {"address": "0xAfd78515...8a34", "chain": "Base"}, "source": "/shared/public/triforce-preview/config/deployments.js", "verified": "2026-09-23"},
                {"id": "giftmarket-base", "claim": "GiftMarket (Base)", "value": {"address": "0x24B55471...1937", "chain": "Base"}, "source": "/shared/public/triforce-preview/config/deployments.js", "verified": "2026-09-23"},
            ],
            "worldIdEvidence": [
                {"id": "world-oidc-discovery", "claim": "World ID pilot OIDC discovery + JWKS captured (issuer moved auth.worldcoin.dev → sandbox.auth.world.org)", "source": "/shared/tokyo/world-kit/raw/", "verified": "2026-09-25", "note": "Live device-flow round-trip with real client_id PENDING; timer starts at first venue pilot."},
                {"id": "world-idkit-gate", "claim": "Server-side IDKit verify gate; mock→real one-flag swap; denied path first-class", "source": "/shared/tokyo/world-kit/src/idkit-gate/verify.mjs", "verified": "2026-09-25"},
            ],
        },
    }


def main():
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    trace = build_trace()
    terri = build_terri()
    with open(os.path.join(here, "trace-fixtures.json"), "w") as f:
        json.dump(trace, f, indent=2, ensure_ascii=False)
        f.write("\n")
    with open(os.path.join(here, "terri-receipts.json"), "w") as f:
        json.dump(terri, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("wrote trace-fixtures.json and terri-receipts.json")


if __name__ == "__main__":
    main()
