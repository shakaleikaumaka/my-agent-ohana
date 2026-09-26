// probes.mjs — the actual security checks spector-scan runs against a consent backend.
// Each probe is black-box and unauthenticated (the attacker's position on venue Wi-Fi).
// Spector 🕵️ — reviews, not audits.

import { SEV } from "./report.mjs";
import crypto from "node:crypto";

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// A syntactically valid but FORGED RS256 JWT. Real signature is random bytes.
// A correct backend MUST reject this at signature verification (CF-B1).
export function forgedToken({
  iss = "https://auth.worldcoin.dev",
  aud = "app_spectorscan_probe",
  sub = "0xVICTIM_FORGED",
  scope = "openid",
} = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid: "yiX1KR5gDdPTqsHAbT5d0JqIG6-HcTv8wGao4sSTgsY", typ: "JWT" };
  const payload = {
    iss, aud, sub, scope,
    iat: now,
    exp: now + 3600,
    jti: "spectorscan-" + crypto.randomUUID(),
    nonce: "spectorscan-nonce",
    acr: "https://world.org/oidc/acr/orb-v3",
  };
  const sig = b64url(crypto.randomBytes(256)); // bogus signature
  return `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}.${sig}`;
}

// low-level request; never throws — returns a normalized result including transport errors.
async function req(base, path, { method = "GET", headers = {}, body, timeoutMs = 4000 } = {}) {
  const url = base.replace(/\/$/, "") + path;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers },
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
      signal: ac.signal,
      redirect: "manual",
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { ok: true, status: res.status, headers: res.headers, text, json, url };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e), url };
  }
}

const looksOkTrue = (r) =>
  r.ok && r.status >= 200 && r.status < 300 && (r.json?.ok === true || /"ok"\s*:\s*true/.test(r.text || ""));

// ── Probe 1: healthz recon (INFO) ───────────────────────────────────────────
async function probeHealthz(base, notes) {
  const findings = [];
  const r = await req(base, "/healthz");
  if (!r.ok) {
    notes.push(`healthz: unreachable (${r.error})`);
    findings.push({
      id: "RECON-HEALTHZ", sev: SEV.INFO, title: "No /healthz reachable — cannot confirm liveness/config",
      endpoint: "GET /healthz", evidence: `transport error: ${r.error}`,
      recommendation: "Ensure /healthz is live so bells can 30-sec verify issuer + jwks_kids + configured flag.",
    });
    return findings;
  }
  notes.push(`healthz: ${r.status} ${r.text?.slice(0, 200)}`);
  if (r.json && r.json.configured === false) {
    findings.push({
      id: "RECON-UNCONFIGURED", sev: SEV.INFO, title: "Server reports configured:false (client_id not wired)",
      endpoint: "GET /healthz", evidence: `healthz.configured=false; issuer=${r.json.issuer || "?"}`,
      recommendation: "Expected pre-Friday. Confirm WID_CLIENT_ID landed before judging; /verify must 503 not_configured until then (fail-closed).",
    });
  }
  return findings;
}

// ── Probe 2: F11 — unauthenticated REVOKE ────────────────────────────────────
async function probeRevokeAuth(base, notes) {
  const findings = [];
  // Attacker has no receipt_token. Try garbage + missing. A correct server 403s.
  const attempts = [
    { consent_id: "any", receipt_token: "attacker-guess" },
    { consent_id: "any" }, // missing receipt_token entirely
    {}, // empty
  ];
  let accepted = null;
  for (const body of attempts) {
    const r = await req(base, "/v1/revoke", { method: "POST", body });
    notes.push(`revoke ${JSON.stringify(body)} -> ${r.ok ? r.status : r.error}`);
    if (looksOkTrue(r)) { accepted = { body, r }; break; }
  }
  if (accepted) {
    findings.push({
      id: "F11-REVOKE-AUTH", sev: SEV.BLOCKER,
      title: "Revoke accepted WITHOUT a valid receipt_token — anyone can revoke the blessing",
      endpoint: "POST /v1/revoke", cf_gate: "CF-B5", f_id: "F11",
      evidence: `payload ${JSON.stringify(accepted.body)} returned ${accepted.r.status} ${accepted.r.text?.slice(0,120)}`,
      recommendation: "Require the 128-bit receipt_token (compare in constant time); reject with 403 bad_receipt_token. If bound off-localhost, also require CONSENT_API_TOKEN. One curl from venue Wi-Fi must NOT kill a live blessing.",
    });
  } else {
    notes.push("revoke: all unauthenticated attempts rejected ✔");
  }
  return findings;
}

// ── Probe 3: F11 — unauthenticated LEDGER / log read ─────────────────────────
async function probeLedgerAuth(base, notes) {
  const findings = [];
  const paths = ["/v1/ledger", "/v1/consent/log", "/v1/log"];
  for (const p of paths) {
    const noKey = await req(base, p);
    notes.push(`ledger ${p} (no key) -> ${noKey.ok ? noKey.status : noKey.error}`);
    if (noKey.ok && noKey.status >= 200 && noKey.status < 300 && (noKey.text || "").length > 0 && noKey.status !== 404) {
      // Distinguish a real dump from a 200 empty stub: look for event-ish content OR any body on a data route
      const leaks = /sub|consent|grant|revoke|event|agent/i.test(noKey.text || "");
      findings.push({
        id: "F11-LEDGER-AUTH", sev: SEV.BLOCKER,
        title: "Event ledger readable with NO admin key — leaks sub↔agent linkage",
        endpoint: `GET ${p}`, cf_gate: "CF-S5", f_id: "F11",
        evidence: `no X-Admin-Key returned ${noKey.status}; body ${leaks ? "contains" : "present, length " + (noKey.text||"").length + ","} ${noKey.text?.slice(0,120)}`,
        recommendation: "Gate on X-Admin-Key (constant-time compare); 403 without it. The ledger maps humans to agents — it is PII on venue Wi-Fi.",
      });
    }
    // wrong-key attempt
    const wrongKey = await req(base, p, { headers: { "X-Admin-Key": "definitely-wrong-key" } });
    if (wrongKey.ok && wrongKey.status >= 200 && wrongKey.status < 300 && wrongKey.status !== 404 && /sub|consent|event|grant/i.test(wrongKey.text || "")) {
      findings.push({
        id: "F11-LEDGER-WRONGKEY", sev: SEV.BLOCKER,
        title: "Event ledger readable with a WRONG admin key — auth check absent or broken",
        endpoint: `GET ${p}`, cf_gate: "CF-S5", f_id: "F11",
        evidence: `X-Admin-Key: definitely-wrong-key returned ${wrongKey.status} ${wrongKey.text?.slice(0,120)}`,
        recommendation: "Actually compare the admin key; reject mismatches with 403.",
      });
    }
  }
  return findings;
}

// ── Probe 4: CF-B2 — client-supplied authz claims trusted ────────────────────
async function probeClientAuthz(base, notes) {
  const findings = [];
  // Attacker asserts they're blessed by supplying claims directly, NO real token.
  const evilBodies = [
    { id_token: "", session_id: "any", agent_subname: "spector.demo.eth", scope_requested: ["steward:gift"], sub: "0xVICTIM", blessed: true, acr: "https://world.org/oidc/acr/orb-v3" },
    { session_id: "any", agent_subname: "spector.demo.eth", scope_granted: ["steward:gift"], status: "active" },
  ];
  for (const body of evilBodies) {
    const r = await req(base, "/v1/verify", { method: "POST", body });
    notes.push(`verify(client-claims) -> ${r.ok ? r.status : r.error}`);
    if (looksOkTrue(r)) {
      findings.push({
        id: "CF-B2-CLIENT-AUTHZ", sev: SEV.BLOCKER,
        title: "Verify granted consent from client-supplied claims (no real token)",
        endpoint: "POST /v1/verify", cf_gate: "CF-B2",
        evidence: `body ${JSON.stringify(body).slice(0,120)} returned ${r.status} ${r.text?.slice(0,120)}`,
        recommendation: "The raw id_token is the ONLY trusted input. Ignore any client-supplied sub/scope/blessed/status; derive everything from the verified JWT.",
      });
      break;
    }
  }
  return findings;
}

// ── Probe 5: CF-B1 — forged token accepted (signature not verified) ──────────
async function probeForgedToken(base, notes) {
  const findings = [];
  const tok = forgedToken();
  const body = { id_token: tok, session_id: "any", agent_subname: "spector.demo.eth", scope_requested: ["steward:gift"] };
  const r1 = await req(base, "/v1/verify", { method: "POST", body });
  notes.push(`verify(forged token) -> ${r1.ok ? r1.status : r1.error}`);
  if (looksOkTrue(r1)) {
    findings.push({
      id: "CF-B1-FORGED", sev: SEV.BLOCKER,
      title: "Forged RS256 token ACCEPTED — signature is not being verified against JWKS",
      endpoint: "POST /v1/verify", cf_gate: "CF-B1",
      evidence: `forged token (random signature) returned ${r1.status} ${r1.text?.slice(0,120)}`,
      recommendation: "createRemoteJWKSet against auth issuer host, HTTPS only; verify RS256 signature; pin iss+aud; reject with 401 invalid_signature.",
    });
    return findings;
  }
  // CF-B6 best-effort: replay the SAME forged token — both should 401. If first was rejected
  // (correct) this is moot for forged, but we note it as needs-live-token for true jti-burn.
  notes.push("replay(jti-burn): cannot prove black-box without a REAL token — deferred to Friday round-trip (needs-live-token).");
  findings.push({
    id: "CF-B6-REPLAY", sev: SEV.INFO,
    title: "Replay-guard (jti burn) not provable black-box — schedule live-token re-test",
    endpoint: "POST /v1/verify", cf_gate: "CF-B6", f_id: "AP-9",
    evidence: "Forged tokens are (correctly) rejected before jti-burn is reached; jti replay needs one REAL token replayed to a fresh session.",
    recommendation: "At the Friday live round-trip: verify a real token twice → second must 409 jti_replayed. Rebuild burned-jti set from log at boot (restart-safe).",
  });
  return findings;
}

// ── Probe 6: fail-closed on malformed input ──────────────────────────────────
async function probeFailClosed(base, notes) {
  const malformed = [
    { path: "/v1/verify", raw: "not-json-at-all" },
    { path: "/v1/verify", raw: "{" },
    { path: "/v1/verify", raw: JSON.stringify({}) }, // empty object, missing everything
    { path: "/v1/consent/check", raw: JSON.stringify({ action: "steward:gift" }) },
  ];
  const failedOpen = [];
  for (const m of malformed) {
    const r = await req(base, m.path, { method: "POST", body: m.raw });
    notes.push(`failclosed ${m.path} <${m.raw.slice(0,20)}> -> ${r.ok ? r.status : r.error}`);
    if (looksOkTrue(r)) failedOpen.push({ ...m, status: r.status, body: (r.text || "").slice(0, 80) });
  }
  if (failedOpen.length === 0) return [];
  // Consolidate into ONE finding so the report table stays readable.
  const eps = [...new Set(failedOpen.map((f) => `POST ${f.path}`))].join(", ");
  return [{
    id: "FAIL-CLOSED", sev: SEV.BLOCKER,
    title: `Malformed / empty request returned ok:true — server fails OPEN (${failedOpen.length} case${failedOpen.length > 1 ? "s" : ""})`,
    endpoint: eps, cf_gate: "CF-S", f_id: "AP-2",
    evidence: failedOpen.map((f) => `<${f.raw.slice(0,20)}>→${f.status}`).join(" · "),
    recommendation: "Any parse failure / missing required field / exception in the verify path must DENY (4xx). Default deny; exceptions become 500, never a grant.",
  }];
}

// ── Probe 7: CORS wildcard on mutating routes ────────────────────────────────
async function probeCors(base, notes) {
  const findings = [];
  const r = await req(base, "/v1/revoke", {
    method: "OPTIONS",
    headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" },
  });
  const acao = r.ok ? r.headers.get("access-control-allow-origin") : null;
  notes.push(`cors /v1/revoke ACAO=${acao}`);
  if (acao === "*") {
    findings.push({
      id: "CORS-WILDCARD", sev: SEV.SHOULD,
      title: "Access-Control-Allow-Origin: * on a mutating route",
      endpoint: "OPTIONS /v1/revoke", cf_gate: "CF-B", f_id: "F11",
      evidence: "ACAO wildcard lets any origin script the consent API from a judge's browser tab.",
      recommendation: "Echo only the exact demo origin (or send no CORS headers). Never '*' on revoke/verify/check.",
    });
  }
  return findings;
}

// ── Probe 8: error-body information leak ─────────────────────────────────────
async function probeErrorLeak(base, notes) {
  const findings = [];
  // Trigger a validation error, then inspect the body for leaks.
  const r = await req(base, "/v1/verify", {
    method: "POST",
    body: { id_token: "aaa.bbb.ccc", session_id: "nope", agent_subname: "x", scope_requested: ["steward:gift"] },
  });
  const body = r.text || "";
  notes.push(`errorleak sample: ${body.slice(0,120)}`);
  const stack = /\bat\s+[\w$.<>]+\s+\(/.test(body) || /\.(mjs|js|ts):\d+/.test(body);
  const keyMaterial = /BEGIN (PUBLIC|PRIVATE|RSA) KEY/.test(body);
  const expectedLeak = /expected\s+\S+|wanted\s+\S+|nonce\s*[:=]\s*["']?[\w-]{6,}/i.test(body);
  if (stack) {
    findings.push({
      id: "LEAK-STACK", sev: SEV.SHOULD, title: "Error body leaks a stack trace / source path",
      endpoint: "POST /v1/verify", cf_gate: "CF", f_id: "AP-10",
      evidence: `body contains stack/source markers: ${body.slice(0,120)}`,
      recommendation: "Return OAuth-shaped error bodies only ({error, error_description}); log stacks server-side, never to the client.",
    });
  }
  if (keyMaterial) {
    findings.push({
      id: "LEAK-KEY", sev: SEV.BLOCKER, title: "Error body leaks key material",
      endpoint: "POST /v1/verify", cf_gate: "CF-B1",
      evidence: body.slice(0, 120),
      recommendation: "Never emit key material in responses.",
    });
  }
  if (expectedLeak) {
    findings.push({
      id: "LEAK-EXPECTED", sev: SEV.SHOULD, title: "Error names the EXPECTED value (nonce/claim) — aids forgery",
      endpoint: "POST /v1/verify", cf_gate: "CF",
      evidence: body.slice(0, 120),
      recommendation: "Name only the failed CHECK ('nonce_mismatch'), never the expected value.",
    });
  }
  return findings;
}

// ── Probe 9: denied-path first-class (doctrine presence) ─────────────────────
async function probeDeniedPath(base, notes) {
  const findings = [];
  const r = await req(base, "/v1/consent/deny", { method: "POST", body: { session_id: "probe-nonexistent" } });
  notes.push(`deny endpoint -> ${r.ok ? r.status : r.error}`);
  // 404 for unknown session is fine; a transport error / 405 means the route is missing.
  if (!r.ok || r.status === 405 || r.status === 501) {
    findings.push({
      id: "DENY-PATH-MISSING", sev: SEV.SHOULD,
      title: "Denied-path endpoint appears absent — denied is doctrine, not optional",
      endpoint: "POST /v1/consent/deny", cf_gate: "CF-B4",
      evidence: r.ok ? `status ${r.status}` : `transport ${r.error}`,
      recommendation: "Implement /v1/consent/deny: log a first-class denial event, mint NO consent row. Beat-4 receipt depends on it.",
    });
  }
  return findings;
}

export const PROBES = [
  probeHealthz,
  probeRevokeAuth,
  probeLedgerAuth,
  probeClientAuthz,
  probeForgedToken,
  probeFailClosed,
  probeCors,
  probeErrorLeak,
  probeDeniedPath,
];

// Reachability preflight: if the target is entirely unreachable at transport
// level, short-circuit with one clear INFO rather than emitting spurious findings.
async function reachable(base) {
  for (const path of ["/healthz", "/"]) {
    const r = await req(base, path, { timeoutMs: 3000 });
    if (r.ok) return true; // got an HTTP status (any) = reachable
  }
  return false;
}

export async function runAllProbes(base) {
  const notes = [];
  const findings = [];
  if (!(await reachable(base))) {
    notes.push(`preflight: ${base} unreachable at transport level (no HTTP response)`);
    findings.push({
      id: "TARGET-UNREACHABLE", sev: SEV.INFO,
      title: "Target unreachable — nothing to scan yet",
      endpoint: base, evidence: "No HTTP response from /healthz or /. Server not running or wrong URL.",
      recommendation: "Start the consent backend (e.g. `wrangler dev`) or fix --target, then re-run. This is expected before Tauro's server lands.",
    });
    return { findings, notes, checksRun: 0 };
  }
  for (const p of PROBES) {
    try {
      const fs = await p(base, notes);
      if (fs && fs.length) findings.push(...fs);
    } catch (e) {
      notes.push(`probe ${p.name} threw: ${e && e.message}`);
      findings.push({
        id: "PROBE-ERROR-" + p.name, sev: SEV.INFO, title: `Probe ${p.name} errored`,
        endpoint: "—", evidence: String(e && e.message || e),
        recommendation: "Investigate scanner/target interaction; re-run.",
      });
    }
  }
  return { findings, notes, checksRun: PROBES.length };
}
