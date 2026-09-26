#!/usr/bin/env node
// screen.mjs — Intercepta payment-screening CLI for the My Agent Ohana consent flow.
// Screen a payment/blessing DESTINATION address BEFORE a blessing signs, and emit ONE of four
// verdicts — pay / refuse / cap / ask-human — with the World-consent bridge made visible.
//
// Spector 🕵️ — reviews, not certified audits. Money never moves on a failed check (fail-closed).
//
// Usage:
//   INTERCEPTA_API_KEY=... node screen.mjs 0x<address> [--chain ethereum] [--amount 1.5] [--json]
//   node screen.mjs 0x<address>                 # no key: makes the real call, gets 403 → ask-human
//   node screen.mjs --fixture sanctioned        # exercise a verdict path offline (labelled fixture)
//   node screen.mjs --demo                      # run all four verdict paths (fixtures) for the judge
//
// Exit: 0 = pay · 10 = cap · 20 = ask-human · 30 = refuse · 1 = usage error.
// (Non-pay is a non-zero exit so a CI/agent loop can branch on it.)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { screenDestination, decideVerdict } from "./lib/intercepta-screen.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXDIR = path.join(__dirname, "fixtures", "intercepta");

const EXIT = { pay: 0, cap: 10, "ask-human": 20, refuse: 30 };
const GLYPH = { pay: "🟢 PAY", cap: "🟡 CAP", "ask-human": "🙋 ASK-HUMAN", refuse: "🔴 REFUSE" };

// A few real, public, non-private mainnet reference addresses used by --demo labels.
const REFS = {
  benign: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // vitalik.eth — public, benign
  sanctioned: "0x8589427373D6D84E98730D7795D8f6f8731FDA16", // Tornado Cash (OFAC SDN) — public sanctioned
};

function parseArgs(argv) {
  const a = { address: null, chain: "ethereum", amount: null, json: false, fixture: null, demo: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--chain") a.chain = argv[++i];
    else if (t === "--amount") a.amount = Number(argv[++i]);
    else if (t === "--json") a.json = true;
    else if (t === "--fixture") a.fixture = argv[++i];
    else if (t === "--demo") a.demo = true;
    else if (t === "--help" || t === "-h") a.help = true;
    else if (!t.startsWith("-")) a.address = t;
    else { console.error(`unknown arg: ${t}`); a.bad = true; }
  }
  return a;
}

const HELP = `screen.mjs — Intercepta destination screening → 4 verdicts → World consent bridge

  INTERCEPTA_API_KEY=... node screen.mjs 0x<addr> [--chain ethereum] [--amount N] [--json]
  node screen.mjs 0x<addr>            real call; without a key you get a live 403 → ask-human
  node screen.mjs --fixture <name>    offline verdict path via labelled fixture
                                      (clean|mild|borderline|sanctioned|live-403)
  node screen.mjs --demo              run all four verdict paths for a judge

Verdict → consent bridge:  pay→SIGN · cap→SPENDING CAP · refuse→REVOKE · ask-human→World ceremony`;

function loadFixture(name) {
  const f = path.join(FIXDIR, `${name}.json`);
  if (!fs.existsSync(f)) throw new Error(`no such fixture: ${name} (looked in ${FIXDIR})`);
  const body = JSON.parse(fs.readFileSync(f, "utf8"));
  // Rebuild a screenDestination()-shaped result from the recorded body.
  if (body && typeof body.toxicScore === "number") {
    return { ok: true, httpStatus: 200, address: null, chain: "ethereum", toxicScore: body.toxicScore, traits: body.traits || [], raw: body, error: null, source: "fixture" };
  }
  // e.g. live-403.json — a non-200 body → fail-closed
  return { ok: false, httpStatus: body.status || 403, address: null, chain: "ethereum", toxicScore: null, traits: [], raw: body, error: (body.response || "non-200 fixture"), source: "fixture-403" };
}

function printHuman(d, { labelAddr } = {}) {
  const addr = d.address || labelAddr || "(address)";
  console.log(`\n  ${GLYPH[d.verdict]}   destination ${addr}${d.chain ? " on " + d.chain : ""}`);
  if (d.toxicScore != null) console.log(`  toxicScore: ${d.toxicScore}   drivers: ${d.drivers.join(" · ")}`);
  else console.log(`  drivers: ${d.drivers.join(" · ")}`);
  console.log(`  reason: ${d.reason}`);
  console.log(`  → action: ${d.action}   consent: ${d.consentBridge.consent ?? "(none — proceed)"}`);
  if (d.consentBridge.handoff) console.log(`  → handoff: ${d.consentBridge.handoff}`);
  if (d.capTo != null) console.log(`  → cap amount to: ${d.capTo}`);
  console.log(`  bridge: ${d.consentBridge.note}`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.bad) { console.log(HELP); process.exit(args.bad ? 1 : 0); }

  const hasKey = !!(process.env.INTERCEPTA_API_KEY || process.env.W3A_API_KEY);

  // --demo: run all four verdict paths via labelled fixtures, judge-facing.
  if (args.demo) {
    console.log("═══ Intercepta screening demo — four verdicts, one flow ═══");
    console.log(`(live key present: ${hasKey ? "YES → these would be real calls" : "NO → labelled fixtures; real 403 also shown"})`);
    const plan = [
      ["clean", REFS.benign, 1.0],
      ["mild", REFS.benign, 1.0],
      ["borderline", REFS.benign, 1.0],
      ["sanctioned", REFS.sanctioned, 1.0],
      ["live-403", REFS.benign, 1.0],
    ];
    const results = [];
    for (const [fx, addr, amt] of plan) {
      const screen = loadFixture(fx);
      screen.address = addr;
      const d = decideVerdict(screen, { amount: amt });
      printHuman(d, { labelAddr: addr });
      results.push({ fixture: fx, verdict: d.verdict });
    }
    console.log(`\n  summary: ${results.map((r) => `${r.fixture}=${r.verdict}`).join("  ")}`);
    process.exit(0);
  }

  let screen;
  let labelAddr = args.address;
  if (args.fixture) {
    screen = loadFixture(args.fixture);
    screen.address = args.address || REFS.benign;
    labelAddr = screen.address;
  } else {
    if (!args.address) { console.error("error: need an address (or --fixture / --demo)\n"); console.log(HELP); process.exit(1); }
    screen = await screenDestination({ address: args.address, chain: args.chain });
  }

  const decision = decideVerdict(screen, { amount: args.amount });

  if (args.json) {
    console.log(JSON.stringify({ screen: { source: screen.source, httpStatus: screen.httpStatus, toxicScore: screen.toxicScore, traits: screen.traits, error: screen.error }, decision }, null, 2));
  } else {
    printHuman(decision, { labelAddr });
    if (!hasKey && !args.fixture) console.log("\n  note: no INTERCEPTA_API_KEY set — the live host returned 403, so this failed CLOSED to ask-human (by design).");
  }
  process.exit(EXIT[decision.verdict] ?? 1);
}

main().catch((e) => { console.error("fatal:", e && e.message ? e.message : e); process.exit(1); });
