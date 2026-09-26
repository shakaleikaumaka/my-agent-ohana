#!/usr/bin/env node
// scan.mjs — spector-scan CLI. A REAL consent-backend security scanner.
// Two modes:
//   STATIC  (--source <dir>)     inspect files + config in a backend source tree.
//   DYNAMIC (--target <baseUrl>) unauthenticated black-box HTTP probes.
// Spector 🕵️ — reviews, not certified audits. Never ship; make shipping safe.
//
// Usage:
//   node scan.mjs --source /shared/tokyo/consent-server --out reports/r.md --json reports/r.json
//   node scan.mjs --target http://127.0.0.1:8787 --out reports/r.md
//   (both may be combined; each writes its own report — dynamic gets a ".dynamic" suffix)
//
// Exit code: 0 = clean (no BLOCKER, no SHOULD) · 2 = SHOULD present · 3 = BLOCKER present · 1 = usage/error.
// When both modes run, the exit code is the WORST of the two.

import { runAllProbes } from "./lib/probes.mjs";
import { runSourceProbes } from "./lib/source-probes.mjs";
import { renderMarkdown, summarize, verdict, isClean } from "./lib/report.mjs";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { target: null, source: null, out: null, json: null, quiet: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target" || a === "-t") args.target = argv[++i];
    else if (a === "--source" || a === "-s") args.source = argv[++i];
    else if (a === "--out" || a === "-o") args.out = argv[++i];
    else if (a === "--json") args.json = argv[++i];
    else if (a === "--quiet" || a === "-q") args.quiet = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else { console.error(`unknown arg: ${a}`); args.bad = true; }
  }
  return args;
}

const HELP = `spector-scan — consent-backend security scanner

  node scan.mjs --source <dir>     # STATIC file/config analysis (no running server)
  node scan.mjs --target <baseUrl> # DYNAMIC unauthenticated black-box HTTP probes
      [--out report.md] [--json report.json] [--quiet]

STATIC (--source) checks (F-class): F6 hosted verify backend exists · F11 revoke needs
capability · F11 ledger/admin needs admin key · 0.0.0.0 binds · secrets in committed
files · fail-open/default-allow · jti/nonce replay guard · scope-escalation guard ·
JWT alg pinning (RS256/none) · iss+aud pinning · CORS wildcard · .gitignore hygiene.

DYNAMIC (--target) checks: unauthenticated revoke (F11) · unauth ledger read (F11) ·
client-supplied authz claims (CF-B2) · forged-token accept (CF-B1) · fail-open on
malformed input · CORS wildcard · error-body leaks · denied-path presence (CF-B4).

Exit: 0 clean · 2 should-fix present · 3 blocker present · 1 usage error.
(When both modes run, exit code is the worst of the two.)`;

function toJson(mode, meta, findings, notes, extra = {}) {
  return {
    mode, ...meta, ...extra,
    verdict: verdict(findings), clean: isClean(findings),
    summary: summarize(findings),
    findings: findings.map((f) => ({
      id: f.id, severity: f.sev.label, title: f.title, endpoint: f.endpoint,
      cf_gate: f.cf_gate || null, f_id: f.f_id || null, evidence: f.evidence, fix: f.recommendation,
    })),
    notes,
  };
}

function writeFileEnsured(p, content) {
  fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true });
  fs.writeFileSync(p, content);
}

// derive a secondary filename (dynamic report when both modes requested)
function suffixed(p, suffix) {
  if (!p) return null;
  const ext = path.extname(p);
  return p.slice(0, p.length - ext.length) + suffix + ext;
}

function severityExit(findings) {
  const c = summarize(findings);
  return c.BLOCKER > 0 ? 3 : c.SHOULD > 0 ? 2 : 0;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { console.log(HELP); return 0; }
  if (args.bad) { console.error(HELP); return 1; }
  if (!args.target && !args.source) {
    console.error("error: one of --source <dir> or --target <baseUrl> is required\n\n" + HELP);
    return 1;
  }
  const both = Boolean(args.target && args.source);
  let worst = 0;

  // ── STATIC pass ──────────────────────────────────────────────────────────
  if (args.source) {
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const { findings, notes, checksRun, filesScanned } = await runSourceProbes(args.source);
    const durationMs = Date.now() - t0;
    const meta = { mode: "static", target: args.source, startedAt, durationMs, checksRun };
    const md = renderMarkdown({ ...meta, findings, notes, filesScanned });
    if (args.out) writeFileEnsured(args.out, md);
    if (args.json) writeFileEnsured(args.json, JSON.stringify(toJson("static", meta, findings, notes, { filesScanned }), null, 2));
    if (!args.quiet) {
      const c = summarize(findings);
      console.log(md);
      console.error(`\n[spector-scan/static] ${verdict(findings)} — ${c.BLOCKER}🔴 ${c.SHOULD}🟡 ${c.NICE}🟢 ${c.INFO}ℹ️ · source=${args.source} · ${filesScanned} files` + (args.out ? ` · report=${args.out}` : ""));
    }
    worst = Math.max(worst, severityExit(findings));
  }

  // ── DYNAMIC pass ─────────────────────────────────────────────────────────
  if (args.target) {
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const { findings, notes, checksRun } = await runAllProbes(args.target);
    const durationMs = Date.now() - t0;
    const meta = { mode: "dynamic", target: args.target, startedAt, durationMs, checksRun };
    const md = renderMarkdown({ ...meta, findings, notes });
    const outPath = both ? suffixed(args.out, ".dynamic") : args.out;
    const jsonPath = both ? suffixed(args.json, ".dynamic") : args.json;
    if (outPath) writeFileEnsured(outPath, md);
    if (jsonPath) writeFileEnsured(jsonPath, JSON.stringify(toJson("dynamic", meta, findings, notes), null, 2));
    if (!args.quiet) {
      const c = summarize(findings);
      console.log(md);
      console.error(`\n[spector-scan/dynamic] ${verdict(findings)} — ${c.BLOCKER}🔴 ${c.SHOULD}🟡 ${c.NICE}🟢 ${c.INFO}ℹ️ · target=${args.target}` + (outPath ? ` · report=${outPath}` : ""));
    }
    worst = Math.max(worst, severityExit(findings));
  }

  return worst;
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error("spector-scan fatal:", e);
  process.exit(1);
});
