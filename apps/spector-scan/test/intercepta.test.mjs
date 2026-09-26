// intercepta.test.mjs — proves the Intercepta screening module's call path + 4-verdict logic.
// Run: node test/intercepta.test.mjs
//
// Covers:
//   1. Verdict logic on the four labelled fixtures (pay / cap / ask-human / refuse).
//   2. Fail-closed behaviour: invalid address, 403 body, network error → ask-human.
//   3. The always-ask amount gate.
//   4. THE REAL CALL PATH: hits the production host. Without a key → structured 403 (proves
//      reachability + auth), module maps it to ask-human. With INTERCEPTA_API_KEY → asserts a
//      live 200 verdict on a real, public, benign mainnet address.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  screenDestination,
  decideVerdict,
  resolveCap,
  DEFAULT_POLICY,
  CONSENT_BRIDGE,
} from "../lib/intercepta-screen.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXDIR = path.join(__dirname, "..", "fixtures", "intercepta");
const BENIGN = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // vitalik.eth — public, benign

let failed = 0;
let passed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}

function fromFixture(name) {
  const body = JSON.parse(fs.readFileSync(path.join(FIXDIR, `${name}.json`), "utf8"));
  if (body && typeof body.toxicScore === "number") {
    return { ok: true, httpStatus: 200, address: BENIGN, chain: "ethereum", toxicScore: body.toxicScore, traits: body.traits || [], raw: body, error: null, source: "fixture" };
  }
  return { ok: false, httpStatus: body.status || 403, address: BENIGN, chain: "ethereum", toxicScore: null, traits: [], raw: body, error: body.response || "non-200", source: "fixture-403" };
}

console.log("── 1. verdict logic on labelled fixtures ──");
{
  assert(decideVerdict(fromFixture("clean"), { amount: 1 }).verdict === "pay", "clean → pay");

  const cap = decideVerdict(fromFixture("mild"), { amount: 2 });
  assert(cap.verdict === "cap", "mild (mixer_transfers) → cap");
  assert(cap.action === "SIGN_CAPPED" && cap.consentBridge.consent === "blessing spending cap", "cap bridges to spending cap");
  assert(cap.capTo === 0.2, `cap computes 10% of amount (got ${cap.capTo}, want 0.2)`);

  const ask = decideVerdict(fromFixture("borderline"), { amount: 1 });
  assert(ask.verdict === "ask-human", "borderline (score 48) → ask-human");
  assert(ask.action === "HALT_FOR_CEREMONY" && /consent\/begin/.test(ask.consentBridge.handoff), "ask-human hands off to World consent ceremony");

  const refuse = decideVerdict(fromFixture("sanctioned"), { amount: 1 });
  assert(refuse.verdict === "refuse", "sanctioned (sanction_address) → refuse");
  assert(refuse.action === "ABORT" && refuse.consentBridge.consent === "revoke", "refuse bridges to revoke");
}

console.log("── 2. fail-closed → ask-human (money never moves on a bad read) ──");
{
  const badAddr = await screenDestination({ address: "0xnothex" });
  assert(!badAddr.ok && /invalid/.test(badAddr.error), "invalid address rejected");
  assert(decideVerdict(badAddr, {}).verdict === "ask-human", "invalid address → ask-human");

  assert(decideVerdict(fromFixture("live-403"), {}).verdict === "ask-human", "403 body → ask-human");

  const errScreen = { ok: false, source: "error", error: "network down", toxicScore: null, traits: [] };
  assert(decideVerdict(errScreen, {}).verdict === "ask-human", "network error → ask-human");
}

console.log("── 3. always-ask amount gate ──");
{
  const s = fromFixture("clean");
  const d = decideVerdict(s, { amount: 100, policy: { alwaysAskAboveAmount: 10 } });
  assert(d.verdict === "ask-human", "clean address but amount over ceiling → ask-human");
  const d2 = decideVerdict(s, { amount: 5, policy: { alwaysAskAboveAmount: 10 } });
  assert(d2.verdict === "pay", "clean address, amount under ceiling → pay");
}

console.log("── 4. consent bridge completeness ──");
{
  for (const v of ["pay", "cap", "refuse", "ask-human"]) {
    assert(!!CONSENT_BRIDGE[v] && !!CONSENT_BRIDGE[v].action, `bridge defined for ${v}`);
  }
  assert(resolveCap(3, DEFAULT_POLICY) === 0.3, "resolveCap = 10% by default");
  assert(resolveCap(3, { capAmount: 0.5 }) === 0.5, "resolveCap honors absolute capAmount");
}

console.log("── 5. THE REAL CALL PATH (production host) ──");
{
  const hasKey = !!(process.env.INTERCEPTA_API_KEY || process.env.W3A_API_KEY);
  const live = await screenDestination({ address: BENIGN, chain: "ethereum" });
  assert(live.httpStatus != null, `production host reachable, returned HTTP ${live.httpStatus}`);
  if (hasKey) {
    assert(live.ok && live.source === "live" && typeof live.toxicScore === "number", "with key → live 200 + numeric toxicScore");
    const d = decideVerdict(live, { amount: 1 });
    assert(["pay", "cap", "ask-human", "refuse"].includes(d.verdict), `live verdict on benign addr = ${d.verdict}`);
    console.log(`     (live toxicScore=${live.toxicScore} → ${d.verdict})`);
  } else {
    assert(live.httpStatus === 403 && live.source === "live-403", "no key → real structured 403 (auth path proven)");
    const d = decideVerdict(live, { amount: 1 });
    assert(d.verdict === "ask-human", "no-key live 403 → fail-closed ask-human");
    console.log("     (no INTERCEPTA_API_KEY: live 403 is the expected auth response; key = booth item)");
  }
}

console.log(`\n${failed === 0 ? "✅ ALL PASS" : "❌ FAILURES"}: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
