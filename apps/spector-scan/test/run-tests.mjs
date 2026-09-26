// run-tests.mjs — self-test for spector-scan.
// Proves the scanner (a) flags planted weaknesses on the vulnerable double and
// (b) passes the hardened (spec-compliant) double clean.
// Run: node test/run-tests.mjs

import { spawn } from "node:child_process";
import { runAllProbes } from "../lib/probes.mjs";
import { summarize, isClean, verdict } from "../lib/report.mjs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function startFixture(mode, port) {
  const child = spawn(process.execPath, ["fixtures/server.mjs"], {
    env: { ...process.env, MODE: mode, PORT: String(port) },
    cwd: new URL("..", import.meta.url).pathname,
    stdio: ["ignore", "ignore", "inherit"],
  });
  // wait for listen
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (r.ok) break;
    } catch { /* not up yet */ }
    await wait(100);
  }
  return child;
}

let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  ✔ ${msg}`); }
  else { console.error(`  ✗ FAIL: ${msg}`); failed++; }
}

async function main() {
  console.log("== spector-scan self-test ==\n");

  // ── Case 1: vulnerable double → must flag planted weaknesses ────────────────
  console.log("[case 1] vulnerable double (planted weaknesses)");
  const vuln = await startFixture("vulnerable", 8795);
  let vres;
  try {
    vres = await runAllProbes("http://127.0.0.1:8795");
  } finally {
    vuln.kill();
  }
  const vc = summarize(vres.findings);
  const vids = new Set(vres.findings.map((f) => f.id));
  console.log(`  verdict: ${verdict(vres.findings)} — ${JSON.stringify(vc)}`);
  assert(vc.BLOCKER >= 1, `flags at least one BLOCKER (got ${vc.BLOCKER})`);
  assert(vids.has("F11-REVOKE-AUTH"), "detects F11 unauthenticated revoke");
  assert(vids.has("F11-LEDGER-AUTH"), "detects F11 unauthenticated ledger read");
  assert(vids.has("CF-B2-CLIENT-AUTHZ") || vids.has("CF-B1-FORGED"), "detects client-only authz / forged-token accept");
  assert(vids.has("FAIL-CLOSED"), "detects fail-open on malformed input");
  assert(vids.has("CORS-WILDCARD"), "detects CORS wildcard on mutating route");
  assert(vids.has("DENY-PATH-MISSING"), "detects missing denied-path endpoint");
  assert(!isClean(vres.findings), "vulnerable double is NOT clean");

  await wait(150);

  // ── Case 2: hardened double → must pass clean ───────────────────────────────
  console.log("\n[case 2] hardened double (spec-compliant, fail-closed)");
  const hard = await startFixture("hardened", 8796);
  let hres;
  try {
    hres = await runAllProbes("http://127.0.0.1:8796");
  } finally {
    hard.kill();
  }
  const hc = summarize(hres.findings);
  console.log(`  verdict: ${verdict(hres.findings)} — ${JSON.stringify(hc)}`);
  const blockers = hres.findings.filter((f) => f.sev.label === "BLOCKER");
  const shoulds = hres.findings.filter((f) => f.sev.label === "SHOULD");
  if (blockers.length) console.error("  unexpected BLOCKERs:", blockers.map((f) => f.id));
  if (shoulds.length) console.error("  unexpected SHOULDs:", shoulds.map((f) => f.id));
  assert(hc.BLOCKER === 0, `hardened double has 0 BLOCKER (got ${hc.BLOCKER})`);
  assert(hc.SHOULD === 0, `hardened double has 0 SHOULD (got ${hc.SHOULD})`);
  assert(isClean(hres.findings), "hardened double is CLEAN (INFO/NICE allowed)");

  console.log(`\n== ${failed === 0 ? "ALL TESTS PASSED ✅" : failed + " ASSERTION(S) FAILED ❌"} ==`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error("test harness fatal:", e); process.exit(1); });
