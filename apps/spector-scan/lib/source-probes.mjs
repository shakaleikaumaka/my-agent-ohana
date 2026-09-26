// source-probes.mjs — STATIC source/config analysis for spector-scan.
// Points at a consent/auth backend SOURCE TREE (e.g. /shared/tokyo/consent-server/)
// and inspects real files + config for the F-class threats — no running server needed.
// Complements the black-box HTTP probes in probes.mjs.
// Spector 🕵️ — reviews, not certified audits. Never ship; make shipping safe.

import { SEV } from "./report.mjs";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// ── file collection ──────────────────────────────────────────────────────────
const SKIP_DIRS = new Set([".git", "node_modules", ".wrangler", "dist", "build", ".next", "coverage"]);
const CODE_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".toml", ".yaml", ".yml",
  ".sh", ".bash", ".env", ".vars", ".pem", ".key", ".md", ".txt", ".conf", ".cfg", ".ini",
]);
const BARE_INTEREST = new Set([".dev.vars", ".env", "Dockerfile", "Procfile", ".gitignore"]);
const MAX_BYTES = 512 * 1024; // skip files > 512KB (nothing security-relevant is that big in source)

function walk(dir, out, root) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(full, out, root);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name);
      const interesting = CODE_EXT.has(ext) || BARE_INTEREST.has(ent.name) || ent.name.startsWith(".env");
      if (!interesting) continue;
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.size > MAX_BYTES) continue;
      let content;
      try { content = fs.readFileSync(full, "utf8"); } catch { continue; }
      out.push({ rel: path.relative(root, full), abs: full, content });
    }
  }
}

// Which files git considers TRACKED (i.e. committed / would be committed). Falls back to
// a small .gitignore matcher when the dir is not a git repo. Used so we only flag secrets
// that actually ship in the repo — a git-ignored .dev.vars is correct hygiene, not a leak.
function trackedSet(root) {
  try {
    const out = execFileSync("git", ["-C", root, "ls-files"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const set = new Set(out.split("\n").map((s) => s.trim()).filter(Boolean));
    return { set, source: "git" };
  } catch {
    // fallback: approximate from .gitignore (common patterns only)
    const ignores = [];
    try {
      const gi = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
      for (const line of gi.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        ignores.push(t.replace(/\/$/, ""));
      }
    } catch { /* no .gitignore */ }
    return { set: null, ignores, source: "gitignore-fallback" };
  }
}

function isTracked(track, rel) {
  const norm = rel.split(path.sep).join("/");
  if (track.source === "git") return track.set.has(norm);
  // fallback: tracked unless it matches an ignore token as a path segment or suffix
  for (const ig of track.ignores) {
    if (!ig) continue;
    if (norm === ig || norm.endsWith("/" + ig) || norm.startsWith(ig + "/") ||
        norm.split("/").includes(ig) || (ig.startsWith("*") && norm.endsWith(ig.slice(1)))) {
      return false;
    }
  }
  return true;
}

// ── search helpers ─────────────────────────────────────────────────────────
function* matchesIn(files, re, filter) {
  for (const f of files) {
    if (filter && !filter(f)) continue;
    re.lastIndex = 0;
    let m;
    const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    while ((m = rx.exec(f.content)) !== null) {
      const line = f.content.slice(0, m.index).split("\n").length;
      const lineText = f.content.split("\n")[line - 1] || "";
      yield { file: f, line, match: m[0], groups: m, lineText: lineText.trim() };
      if (m.index === rx.lastIndex) rx.lastIndex++;
    }
  }
}

function anyMatch(files, re, filter) {
  for (const _ of matchesIn(files, re, filter)) return true;
  return false;
}

// Grab the code region immediately after a match index (used to inspect a route handler body).
function regionAfter(content, index, lines = 45) {
  const rest = content.slice(index);
  return rest.split("\n").slice(0, lines).join("\n");
}

const isCodeFile = (f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f.rel);
const isConfigFile = (f) => /\.(toml|json|ya?ml|conf|cfg|ini|env|vars|sh|bash)$/.test(f.rel) || /(^|\/)\.(dev\.vars|env)/.test(f.rel);
const isDocFile = (f) => /\.(md|markdown|txt|rst)$/i.test(f.rel);

// A line that only *warns against* a pattern rather than doing it. True if the line is a
// comment/prose OR contains a negation word (never/not/avoid/forbid/only) near the token.
function isCommentWarning(lineText, token) {
  const t = lineText.toLowerCase();
  const warns = /\b(never|not|no|avoid|don't|do not|forbid|only|instead)\b/.test(t);
  const commented = /^\s*(#|\/\/|\*|<!--|-\s|>\s)/.test(lineText);
  return t.includes(token) && (warns || commented);
}

// Remove // line comments and /* */ block comments from a code snippet so keyword matches
// (e.g. the word "allow" in "never an implicit allow", or a comment that merely NAMES
// jwtVerify) don't cause false positives/negatives.
function stripCodeComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function lineIsComment(lineText) {
  return /^\s*(\/\/|\*|\/\*|#|<!--)/.test(lineText);
}

// Presence check against COMMENT-STRIPPED code — "is there real code doing X?" (not a
// comment that merely mentions X). Used for verify/replay/alg/scope detection.
const _strippedCache = new WeakMap();
function strippedOf(f) {
  let s = _strippedCache.get(f);
  if (s === undefined) { s = stripCodeComments(f.content); _strippedCache.set(f, s); }
  return s;
}
function hasCode(files, re, _filter) {
  for (const f of files) {
    if (!isCodeFile(f)) continue;
    // fresh regex to avoid lastIndex state on /g patterns
    const rx = new RegExp(re.source, re.flags.replace("g", ""));
    if (rx.test(strippedOf(f))) return true;
  }
  return false;
}

// ── CHECK 1: F6 — a real hosted token-verification backend EXISTS ─────────────
function checkF6SecureBackend(files, notes) {
  const findings = [];
  const verifySignals = [
    /\bjwtVerify\b/, /createRemoteJWKSet/, /createLocalJWKSet/, /jwtVerify\s*\(/,
    /\.well-known\/jwks/, /crypto\.(subtle\.)?verify/, /verifyToken\s*\(/,
  ];
  let hit = null;
  for (const re of verifySignals) {
    // Only count REAL code — skip matches that are inside comments (a comment that merely
    // says "no jwtVerify here" must not read as F6 closed).
    for (const m of matchesIn(files, re, isCodeFile)) {
      if (lineIsComment(m.lineText)) continue;
      hit = m; break;
    }
    if (hit) break;
  }
  const hasHandler = anyMatch(files, /async\s+fetch\s*\(|addEventListener\(['"]fetch|app\.(get|post|use)\(|export\s+default\s*\{|createServer\(/, isCodeFile);
  if (!hit) {
    findings.push({
      id: "SRC-F6-NO-BACKEND", sev: SEV.BLOCKER,
      title: "No server-side token verification found — authz appears client-only (F6)",
      endpoint: "(source)", cf_gate: "CF-B1", f_id: "F6",
      evidence: "No jwtVerify / createRemoteJWKSet / JWKS signature check anywhere in the source tree. The rubric disqualifies client-only authorization.",
      recommendation: "Add a hosted backend that RE-VERIFIES the World id_token (RS256 vs pinned JWKS, iss+aud) server-side. Every protected act must gate on the backend, never client state.",
    });
    notes.push("F6: no server-side verification primitive found");
  } else {
    notes.push(`F6: server-side verification present at ${hit.file.rel}:${hit.line} (${hit.lineText.slice(0, 60)})`);
    findings.push({
      id: "SRC-F6-OK", sev: SEV.INFO,
      title: "F6 CLOSED — hosted server-side token verification present",
      endpoint: "(source)", cf_gate: "CF-B1", f_id: "F6",
      evidence: `${hit.file.rel}:${hit.line} — ${hit.lineText.slice(0, 80)}${hasHandler ? " (wired into a request handler)" : ""}`,
      recommendation: "Confirmed: signature verification exists. At the live round-trip, prove a forged token 401s and a real token verifies.",
    });
  }
  return findings;
}

// ── CHECK 2: F11 — revoke/mutating routes require a capability ────────────────
// Generic: any route that MUTATES consent (revoke/delete) must show an auth check nearby.
function checkRevokeAuth(files, notes) {
  const findings = [];
  const routeRe = /["'`]([^"'`]*\/(revoke|delete|cancel)[^"'`]*)["'`]/i;
  let flagged = false;
  for (const m of matchesIn(files, routeRe, isCodeFile)) {
    const region = regionAfter(m.file.content, m.groups.index, 45);
    const authSignals = /receipt_token|receiptToken|safeEqual|timingSafeEqual|sha256|adminOk|X-Admin-Key|x-admin-key|ADMIN_KEY|authorization|bearer|capability|token_hash|verifyToken|requireAuth/i;
    const gated = authSignals.test(region);
    notes.push(`revoke-route ${m.file.rel}:${m.line} (${m.groups[1]}) auth=${gated ? "yes" : "NO"}`);
    if (!gated) {
      flagged = true;
      findings.push({
        id: "SRC-F11-REVOKE-UNAUTH", sev: SEV.BLOCKER,
        title: "Mutating consent route has no capability/auth check in its handler (F11)",
        endpoint: m.groups[1], cf_gate: "CF-B5", f_id: "F11",
        evidence: `${m.file.rel}:${m.line} — route "${m.groups[1]}" handler shows no receipt_token / admin-key / signature gate within 45 lines.`,
        recommendation: "Gate revoke on the one-time receipt_token capability (constant-time hash compare) or an admin key. One curl from venue Wi-Fi must not kill a live blessing.",
      });
    }
  }
  if (!flagged) notes.push("revoke-auth: all mutating consent routes show a capability/auth gate ✔");
  return findings;
}

// ── CHECK 3: F11 — ledger/admin data routes require an admin key ──────────────
function checkAdminAuth(files, notes) {
  const findings = [];
  const routeRe = /["'`]([^"'`]*\/(ledger|log|admin|events|dump|export)[^"'`]*)["'`]/i;
  let flagged = false;
  for (const m of matchesIn(files, routeRe, isCodeFile)) {
    const region = regionAfter(m.file.content, m.groups.index, 30);
    const authSignals = /adminOk|X-Admin-Key|x-admin-key|ADMIN_KEY|authorization|bearer|safeEqual|timingSafeEqual|requireAuth|apiKey|api_key/i;
    const gated = authSignals.test(region);
    notes.push(`admin/ledger-route ${m.file.rel}:${m.line} (${m.groups[1]}) auth=${gated ? "yes" : "NO"}`);
    if (!gated) {
      flagged = true;
      findings.push({
        id: "SRC-F11-ADMIN-UNAUTH", sev: SEV.BLOCKER,
        title: "Ledger/admin data route has no admin-key gate in its handler (F11)",
        endpoint: m.groups[1], cf_gate: "CF-S5", f_id: "F11",
        evidence: `${m.file.rel}:${m.line} — route "${m.groups[1]}" handler shows no X-Admin-Key / auth gate within 30 lines. The ledger maps humans↔agents (PII).`,
        recommendation: "Gate on X-Admin-Key (constant-time compare); 403 without it. Fail-closed when no key is configured.",
      });
    }
  }
  if (!flagged) notes.push("admin-auth: all ledger/admin routes show an admin-key gate ✔");
  return findings;
}

// ── CHECK 4: 0.0.0.0 bind (F11 — exposes localhost-only service to the LAN) ───
function checkBind0000(files, notes) {
  const findings = [];
  const re = /0\.0\.0\.0/;
  const seen = new Set();
  // Only real config/code binds count — a 0.0.0.0 mention in docs is prose, not a bind.
  for (const m of matchesIn(files, re, (f) => !isDocFile(f))) {
    const key = `${m.file.rel}:${m.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (isCommentWarning(m.lineText, "0.0.0.0")) {
      notes.push(`0.0.0.0 at ${m.file.rel}:${m.line} is a comment WARNING against it ✔ (${m.lineText.slice(0, 50)})`);
      continue;
    }
    // real bind context: host/ip/listen/--host/--ip/bind
    const bindCtx = /(host|ip|listen|bind|address|--host|--ip|-H)/i.test(m.lineText);
    const sev = bindCtx ? SEV.BLOCKER : SEV.SHOULD;
    findings.push({
      id: "SRC-BIND-0000", sev,
      title: "Service binds 0.0.0.0 — reachable from the whole LAN (F11)",
      endpoint: `${m.file.rel}:${m.line}`, cf_gate: "CF-B", f_id: "F11",
      evidence: `${m.file.rel}:${m.line} — ${m.lineText.slice(0, 100)}`,
      recommendation: "Bind 127.0.0.1 for local dev; never 0.0.0.0 on venue Wi-Fi. A public host (CF Worker) must instead put per-route auth on every mutating/data route.",
    });
    notes.push(`0.0.0.0 BIND at ${m.file.rel}:${m.line}: ${m.lineText.slice(0, 60)}`);
  }
  if (findings.length === 0) notes.push("0.0.0.0: no real bind found (localhost-only or warned-against) ✔");
  return findings;
}

// ── CHECK 5: secrets hardcoded in TRACKED (committed) files ───────────────────
function checkSecrets(files, track, notes) {
  const findings = [];
  const patterns = [
    { id: "pem", re: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, label: "PEM private key", sev: SEV.BLOCKER },
    { id: "ghp", re: /\bghp_[A-Za-z0-9]{30,}\b/, label: "GitHub personal access token", sev: SEV.BLOCKER },
    { id: "ghs", re: /\bgh[oprs]_[A-Za-z0-9]{30,}\b/, label: "GitHub token", sev: SEV.BLOCKER },
    { id: "aws", re: /\bAKIA[0-9A-Z]{16}\b/, label: "AWS access key id", sev: SEV.BLOCKER },
    { id: "slack", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, label: "Slack token", sev: SEV.BLOCKER },
    { id: "privkey-jwk", re: /"d"\s*:\s*"[A-Za-z0-9_-]{40,}"/, label: "RSA private-key JWK (has private 'd' param)", sev: SEV.BLOCKER },
    { id: "generic", re: /\b(api[_-]?key|secret|password|passwd|client[_-]?secret|private[_-]?key|access[_-]?token)\b\s*[:=]\s*["'`]([^"'`\s]{12,})["'`]/i, label: "hardcoded credential assignment", sev: SEV.BLOCKER },
  ];
  // A file counts as "test-only key material" if it's under a test/fixtures path or a sibling
  // README explicitly labels it a throwaway test key.
  const testOnly = (f) => /(^|\/)(test|tests|__tests__|fixtures?|examples?|mocks?)(\/|$)/i.test(f.rel);
  const placeholderVal = (v) => /change[_-]?me|example|placeholder|dummy|xxxx|your[_-]|<[^>]+>|\.\.\./i.test(v || "");

  for (const p of patterns) {
    for (const m of matchesIn(files, p.re)) {
      const f = m.file;
      const tracked = isTracked(track, f.rel);
      const captured = m.groups[2] || m.match;
      const isTest = testOnly(f);
      const isPlaceholder = p.id === "generic" && placeholderVal(m.groups[2]);
      // Not tracked (git-ignored, e.g. .dev.vars) => correct hygiene, note as INFO only.
      if (!tracked) {
        findings.push({
          id: "SRC-SECRET-IGNORED", sev: SEV.INFO,
          title: `${p.label} present but in a git-ignored file (not committed)`,
          endpoint: `${f.rel}:${m.line}`, cf_gate: "CF-S", f_id: "F2",
          evidence: `${f.rel}:${m.line} — git-ignored (${track.source}); ${p.label}. Correct hygiene: secret stays out of the repo.`,
          recommendation: "Keep it git-ignored. Rotate before any real deploy; never echo it in logs or screenshots.",
        });
        notes.push(`secret(${p.id}) at ${f.rel}:${m.line} — git-ignored, INFO`);
        continue;
      }
      if (isTest) {
        findings.push({
          id: "SRC-SECRET-TESTFIXTURE", sev: SEV.INFO,
          title: `${p.label} in a test fixture — verify it is a throwaway test-only key`,
          endpoint: `${f.rel}:${m.line}`, cf_gate: "CF-S", f_id: "F2",
          evidence: `${f.rel}:${m.line} — committed under a test/fixtures path. Acceptable IF clearly labeled test-only and it signs nothing real.`,
          recommendation: "Confirm the fixture README labels it a self-signed throwaway that signs no real token. Ensure the same value is never reused as a production secret.",
        });
        notes.push(`secret(${p.id}) at ${f.rel}:${m.line} — test fixture, INFO`);
        continue;
      }
      if (isPlaceholder) {
        notes.push(`secret(${p.id}) at ${f.rel}:${m.line} — placeholder value, skipped`);
        continue;
      }
      findings.push({
        id: "SRC-SECRET-COMMITTED", sev: p.sev,
        title: `${p.label} hardcoded in a committed file`,
        endpoint: `${f.rel}:${m.line}`, cf_gate: "CF-S", f_id: "F2",
        evidence: `${f.rel}:${m.line} — ${p.label}${p.id === "generic" ? ` (value len ${String(captured).length})` : ""}. Tracked by ${track.source}.`,
        recommendation: "Remove from source; load from an environment secret (wrangler secret / .env git-ignored). Rotate the exposed value immediately.",
      });
      notes.push(`secret(${p.id}) at ${f.rel}:${m.line} — COMMITTED, ${p.sev.label}`);
    }
  }
  if (findings.length === 0) notes.push("secrets: no credentials found in tracked files ✔");
  return findings;
}

// ── CHECK 6: fail-open / default-allow anti-patterns ──────────────────────────
function checkFailOpen(files, notes) {
  const findings = [];
  // Auth helper that returns true when the key/secret is MISSING.
  const failOpenAuth = /if\s*\(\s*!\s*\w*(key|secret|token|admin|auth)\w*\s*\)\s*(return\s+true|return\s*\{[^}]*ok\s*:\s*true)/i;
  for (const m of matchesIn(files, failOpenAuth, isCodeFile)) {
    findings.push({
      id: "SRC-FAIL-OPEN-AUTH", sev: SEV.BLOCKER,
      title: "Auth check fails OPEN — returns allow when the secret is unset",
      endpoint: `${m.file.rel}:${m.line}`, cf_gate: "CF-S", f_id: "AP-2",
      evidence: `${m.file.rel}:${m.line} — ${m.lineText.slice(0, 100)}`,
      recommendation: "Fail CLOSED: when no key/secret is configured, DENY (return false / 403). Missing config must never mean 'allow everyone'.",
    });
    notes.push(`fail-open auth at ${m.file.rel}:${m.line}`);
  }
  // catch block that returns success/allow (swallows the error into a grant).
  // Comments are stripped first so the WORD "allow" inside a "never allow" comment
  // (as in a correct fail-CLOSED handler) does not trigger a false positive.
  const catchAllow = /catch\s*(\([^)]*\))?\s*\{([^{}]|\{[^{}]*\})*?\b(ok\s*:\s*true|return\s+true|granted\s*:\s*true|status\s*:\s*["']?(200|ok)\b|return\s+(allow|ALLOW)\b)/i;
  for (const f of files) {
    if (!isCodeFile(f)) continue;
    const stripped = stripCodeComments(f.content);
    const mm = catchAllow.exec(stripped);
    if (mm) {
      // report the line in the ORIGINAL file nearest the catch keyword
      const catchIdx = f.content.search(/catch\s*(\([^)]*\))?\s*\{/);
      const line = catchIdx >= 0 ? f.content.slice(0, catchIdx).split("\n").length : 1;
      findings.push({
        id: "SRC-FAIL-OPEN-CATCH", sev: SEV.BLOCKER,
        title: "catch{} block returns success — errors fail OPEN into a grant",
        endpoint: `${f.rel}:${line}`, cf_gate: "CF-S", f_id: "AP-2",
        evidence: `${f.rel}:${line} — catch handler returns a success/allow shape: ${mm[0].replace(/\s+/g, " ").slice(0, 90)}`,
        recommendation: "Any exception in the verify/authz path must become a 4xx/5xx denial, never an implicit allow.",
      });
      notes.push(`fail-open catch at ${f.rel}:${line}`);
    }
  }
  if (findings.length === 0) notes.push("fail-open: no default-allow / catch-into-grant patterns found ✔");
  return findings;
}

// ── CHECK 7: jti / nonce replay guard present ─────────────────────────────────
function checkReplayGuard(files, notes) {
  const findings = [];
  const hasVerify = hasCode(files, /\bjwtVerify\b|verifyToken\s*\(/, isCodeFile);
  if (!hasVerify) { notes.push("replay-guard: no verify path — skipped"); return findings; }
  const guard = hasCode(files, /burnJti|jti[^a-z].{0,40}(transaction|already|replayed|seen|burn)|replay|nonce_mismatch|nonce\s*!==|safeEqual\(\s*\w*nonce/i, isCodeFile);
  if (!guard) {
    findings.push({
      id: "SRC-REPLAY-GUARD", sev: SEV.SHOULD,
      title: "No jti/nonce replay guard found — a captured token could be replayed",
      endpoint: "(source)", cf_gate: "CF-B6", f_id: "AP-9",
      evidence: "Verification exists but no atomic jti-burn or nonce-match check was found. One captured token could mint multiple consents.",
      recommendation: "Burn the token jti atomically (single-writer store / DO transaction) so one token mints exactly one consent; echo+check the session nonce.",
    });
    notes.push("replay-guard: MISSING");
  } else {
    notes.push("replay-guard: jti/nonce guard present ✔");
  }
  return findings;
}

// ── CHECK 8: scope-escalation guard (requested ⊆ allowed) ─────────────────────
function checkScopeGuard(files, notes) {
  const findings = [];
  const hasScope = hasCode(files, /scope/i, isCodeFile);
  if (!hasScope) { notes.push("scope-guard: no scope concept — skipped"); return findings; }
  const guarded = hasCode(files, /scope\w*\.(filter|every|includes)|allowed[^a-z].{0,60}(includes|filter)|scope_not_allowed|not\s+allowed|scopeMap|subset/i, isCodeFile);
  if (!guarded) {
    findings.push({
      id: "SRC-SCOPE-ESC", sev: SEV.BLOCKER,
      title: "Requested scope is never validated against a per-agent allowlist — scope escalation",
      endpoint: "(source)", cf_gate: "CF-B7", f_id: "F8",
      evidence: "Scopes are referenced but no subset/allowlist check was found. An agent could request a scope it was never granted (e.g. approve(max) vs exact-amount).",
      recommendation: "Reject any requested scope not in the agent's allowlist (scopeMap[agent].includes). Grant only the intersection; deny on any extra scope.",
    });
    notes.push("scope-guard: MISSING");
  } else {
    notes.push("scope-guard: requested⊆allowed check present ✔");
  }
  return findings;
}

// ── CHECK 9: JWT alg pinning / alg-confusion ('none' or unpinned) ─────────────
function checkAlgPinning(files, notes) {
  const findings = [];
  const hasVerify = hasCode(files, /\bjwtVerify\b/, isCodeFile);
  if (!hasVerify) { notes.push("alg-pin: no jwtVerify — skipped"); return findings; }
  // 'none' alg accepted anywhere = critical
  if (hasCode(files, /alg\w*\s*[:=]\s*["']none["']|algorithms?\s*:\s*\[[^\]]*["']none["']/i, isCodeFile)) {
    findings.push({
      id: "SRC-ALG-NONE", sev: SEV.BLOCKER,
      title: "JWT verification permits alg 'none' — signatures can be bypassed",
      endpoint: "(source)", cf_gate: "CF-B1", f_id: "F11",
      evidence: "An 'alg: none' or algorithms:['none'] appears in the verify path.",
      recommendation: "Pin algorithms:['RS256'] only; reject any token whose header alg is not RS256.",
    });
    notes.push("alg-pin: 'none' accepted — BLOCKER");
    return findings;
  }
  const pinned = hasCode(files, /algorithms?\s*:\s*\[\s*["']RS256["']|alg\s*!==\s*["']RS256["']|header\.alg\s*!==\s*["']RS256["']/i, isCodeFile);
  if (!pinned) {
    findings.push({
      id: "SRC-ALG-UNPINNED", sev: SEV.SHOULD,
      title: "jwtVerify does not explicitly pin algorithms:['RS256'] — alg-confusion risk",
      endpoint: "(source)", cf_gate: "CF-B1", f_id: "F11",
      evidence: "jwtVerify is called but no explicit RS256 algorithm allowlist was found.",
      recommendation: "Pass algorithms:['RS256'] to jwtVerify and reject other header.alg values before verifying.",
    });
    notes.push("alg-pin: not explicitly pinned — SHOULD");
  } else {
    notes.push("alg-pin: RS256 pinned ✔");
  }
  return findings;
}

// ── CHECK 10: iss + aud pinning ───────────────────────────────────────────────
function checkIssAudPinning(files, notes) {
  const findings = [];
  const hasVerify = hasCode(files, /\bjwtVerify\b/, isCodeFile);
  if (!hasVerify) return findings;
  const issPinned = hasCode(files, /issuer\s*:/i, isCodeFile);
  const audPinned = hasCode(files, /audience\s*:/i, isCodeFile);
  if (!issPinned) {
    findings.push({
      id: "SRC-ISS-UNPINNED", sev: SEV.BLOCKER,
      title: "JWT issuer (iss) not pinned — tokens from any issuer could be accepted",
      endpoint: "(source)", cf_gate: "CF-B1", f_id: "F11",
      evidence: "jwtVerify called with no issuer constraint.",
      recommendation: "Pin issuer to the World pilot domain (sandbox.auth.world.org).",
    });
    notes.push("iss-pin: MISSING — BLOCKER");
  } else {
    notes.push("iss-pin: issuer pinned ✔");
  }
  if (!audPinned) {
    findings.push({
      id: "SRC-AUD-UNPINNED", sev: SEV.SHOULD,
      title: "JWT audience (aud) not pinned — a token minted for another client could be replayed",
      endpoint: "(source)", cf_gate: "CF-B1", f_id: "F10",
      evidence: "No audience: constraint found in the verify path.",
      recommendation: "Pin audience to WID_CLIENT_ID. If client_id is not yet known, fail-closed (503) on mint routes until it lands, and never mint without an aud check.",
    });
    notes.push("aud-pin: not found — SHOULD");
  } else {
    notes.push("aud-pin: audience referenced ✔");
  }
  return findings;
}

// ── CHECK 11: CORS wildcard in source ─────────────────────────────────────────
function checkCorsWildcard(files, notes) {
  const findings = [];
  const re = /access-control-allow-origin["'`\s:=)]{1,4}["'`]\*/i;
  for (const m of matchesIn(files, re)) {
    findings.push({
      id: "SRC-CORS-WILDCARD", sev: SEV.SHOULD,
      title: "Access-Control-Allow-Origin: * set in source",
      endpoint: `${m.file.rel}:${m.line}`, cf_gate: "CF-B", f_id: "F11",
      evidence: `${m.file.rel}:${m.line} — ${m.lineText.slice(0, 100)}`,
      recommendation: "Echo only the exact demo origin (or emit no CORS headers). Never '*' on a consent API — a judge's browser tab could script revoke/verify.",
    });
    notes.push(`cors wildcard at ${m.file.rel}:${m.line}`);
  }
  if (findings.length === 0) notes.push("cors: no wildcard ACAO in source ✔");
  return findings;
}

// ── CHECK 13: bearer capability read from a URL query string ──────────────────
// A one-time token / receipt / api-key in the URL lands in server logs, browser history
// and is shoulder-surfable on a projector. Hardening recommendation (NICE, non-blocking).
function checkCapabilityInUrl(files, notes) {
  const findings = [];
  const re = /(searchParams\.get|query|req\.query)\s*[.(\[]?\s*["'`]?(receipt_token|receiptToken|token|api[_-]?key|apikey|secret|password|capability|access[_-]?token)\b/i;
  for (const m of matchesIn(files, re, isCodeFile)) {
    if (lineIsComment(m.lineText)) continue;
    findings.push({
      id: "SRC-CAP-IN-URL", sev: SEV.NICE,
      title: "Bearer capability read from a URL query string — lands in logs/history",
      endpoint: `${m.file.rel}:${m.line}`, cf_gate: "CF-S", f_id: "F11",
      evidence: `${m.file.rel}:${m.line} — ${m.lineText.slice(0, 100)}`,
      recommendation: "Move the capability to an Authorization header or POST body. A token in the URL is captured by access logs, browser history, and anyone watching the projector.",
    });
    notes.push(`capability-in-url at ${m.file.rel}:${m.line} — NICE`);
  }
  if (findings.length === 0) notes.push("capability-in-url: no bearer token read from query string ✔");
  return findings;
}

// ── CHECK 12: .gitignore covers secret files ──────────────────────────────────
function checkGitignore(files, track, notes) {
  const findings = [];
  const gi = files.find((f) => f.rel === ".gitignore" || f.rel.endsWith("/.gitignore"));
  const secretFilesOnDisk = files.filter((f) => /(^|\/)\.(dev\.vars|env)(\.|$)/.test(f.rel) || f.rel.endsWith(".dev.vars") || f.rel.endsWith(".env"));
  for (const sf of secretFilesOnDisk) {
    if (isTracked(track, sf.rel)) {
      findings.push({
        id: "SRC-ENV-TRACKED", sev: SEV.BLOCKER,
        title: "A secrets file (.env/.dev.vars) is committed to the repo",
        endpoint: sf.rel, cf_gate: "CF-S", f_id: "F2",
        evidence: `${sf.rel} is tracked by ${track.source} — its contents ship in the repo.`,
        recommendation: "Add it to .gitignore, git rm --cached it, and rotate every value it held.",
      });
      notes.push(`env-file TRACKED: ${sf.rel} — BLOCKER`);
    }
  }
  if (!gi) {
    findings.push({
      id: "SRC-NO-GITIGNORE", sev: SEV.SHOULD,
      title: "No .gitignore — node_modules/secrets risk being committed",
      endpoint: "(repo root)", cf_gate: "CF-S", f_id: "F2",
      evidence: "No .gitignore found in the source tree.",
      recommendation: "Add a .gitignore covering node_modules/, .env, .dev.vars, .wrangler/, dist/, *.log.",
    });
    notes.push(".gitignore: MISSING — SHOULD");
  } else if (secretFilesOnDisk.length && findings.length === 0) {
    notes.push(".gitignore: secret files present and correctly ignored ✔");
  }
  return findings;
}

export const SOURCE_CHECKS = [
  checkF6SecureBackend,
  checkRevokeAuth,
  checkAdminAuth,
  checkBind0000,
  (files, notes, track) => checkSecrets(files, track, notes),
  checkFailOpen,
  checkReplayGuard,
  checkScopeGuard,
  checkAlgPinning,
  checkIssAudPinning,
  (files, notes, track) => checkCorsWildcard(files, notes),
  (files, notes, track) => checkCapabilityInUrl(files, notes),
  (files, notes, track) => checkGitignore(files, track, notes),
];

export async function runSourceProbes(dir) {
  const notes = [];
  const findings = [];
  const root = path.resolve(dir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    findings.push({
      id: "SRC-NO-DIR", sev: SEV.INFO,
      title: "Source directory not found — nothing to scan",
      endpoint: root, evidence: `${root} does not exist or is not a directory.`,
      recommendation: "Point --source at the backend source tree (e.g. /shared/tokyo/consent-server/).",
    });
    return { findings, notes, checksRun: 0, filesScanned: 0 };
  }
  const files = [];
  walk(root, files, root);
  const track = trackedSet(root);
  notes.push(`scanned ${files.length} source/config files under ${root} (tracked-set via ${track.source})`);

  for (const check of SOURCE_CHECKS) {
    try {
      const fs2 = check(files, notes, track);
      if (fs2 && fs2.length) findings.push(...fs2);
    } catch (e) {
      notes.push(`check ${check.name || "anon"} threw: ${e && e.message}`);
      findings.push({
        id: "SRC-CHECK-ERROR", sev: SEV.INFO, title: `Static check ${check.name || "anon"} errored`,
        endpoint: "—", evidence: String((e && e.message) || e),
        recommendation: "Investigate scanner/source interaction; re-run.",
      });
    }
  }
  return { findings, notes, checksRun: SOURCE_CHECKS.length, filesScanned: files.length };
}
