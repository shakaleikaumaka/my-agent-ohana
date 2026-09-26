// server.mjs — TEST DOUBLE consent backends for spector-scan self-tests.
// NOT the real service. Two modes:
//   MODE=hardened   → spec-compliant, fail-closed (should pass the scan clean)
//   MODE=vulnerable → planted weaknesses (should trip multiple BLOCKER findings)
//
// This lets spector-scan build+test against the SPEC-OF-RECORD
// (/shared/tokyo/intel/consent-backend-spec.md) before Tauro's real
// /shared/tokyo/consent-server/ lands. Point --target at either.
//
// Usage: MODE=hardened PORT=8791 node fixtures/server.mjs

import http from "node:http";
import crypto from "node:crypto";

const MODE = (process.env.MODE || "hardened").toLowerCase();
const PORT = Number(process.env.PORT || 8791);
const ADMIN_KEY = process.env.ADMIN_KEY || "correct-admin-key-secret";

const ISSUER = "https://auth.worldcoin.dev";
const KIDS = ["yiX1KR5gDdPTqsHAbT5d0JqIG6-HcTv8wGao4sSTgsY"];

// A fake ledger so the "leak" is demonstrable in vulnerable mode.
const LEDGER = [
  { ts: Date.now(), kind: "grant", consent_id: "c_demo1", sub_trunc: "8f3a…", agent: "spector.demo.eth" },
  { ts: Date.now(), kind: "grant", consent_id: "c_demo2", sub_trunc: "1c9d…", agent: "tauro.demo.eth" },
];

function send(res, status, obj, extraHeaders = {}) {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json", ...extraHeaders });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch { json = undefined; } // undefined = parse fail
  return { raw, json };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  const method = req.method;

  // ── CORS ──────────────────────────────────────────────────────────────────
  if (method === "OPTIONS") {
    if (MODE === "vulnerable") {
      // PLANTED: wildcard CORS on everything, including mutating routes.
      return send(res, 204, "", {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type,x-admin-key",
      });
    }
    // hardened: no CORS headers (same-origin only) → ACAO absent
    return send(res, 204, "");
  }

  const { raw, json } = await readBody(req);

  // ── GET /healthz ────────────────────────────────────────────────────────────
  if (p === "/healthz" && method === "GET") {
    return send(res, 200, { ok: true, issuer: ISSUER, jwks_kids: KIDS, configured: false });
  }

  // ── POST /v1/consent/begin ──────────────────────────────────────────────────
  if (p === "/v1/consent/begin" && method === "POST") {
    if (json === undefined) return failClosed(res);
    return send(res, 200, {
      session_id: "s_" + crypto.randomUUID(),
      nonce: crypto.randomBytes(16).toString("hex"),
      expires_at: Date.now() + 15 * 60 * 1000,
    });
  }

  // ── POST /v1/verify ──────────────────────────────────────────────────────────
  if (p === "/v1/verify" && method === "POST") {
    if (json === undefined) return failClosed(res);
    if (MODE === "vulnerable") {
      // PLANTED 1 (CF-B2): trust client-supplied "blessed"/claims.
      if (json.blessed === true || json.status === "active" || Array.isArray(json.scope_granted)) {
        return send(res, 200, {
          ok: true, consent_id: "c_" + crypto.randomUUID(),
          sub: json.sub || "0xUNKNOWN", scope_granted: json.scope_granted || json.scope_requested || [],
        });
      }
      // PLANTED 2 (CF-B1): accept ANY id_token that is 3 dot-parts, no signature check.
      if (typeof json.id_token === "string" && json.id_token.split(".").length === 3) {
        return send(res, 200, {
          ok: true, consent_id: "c_" + crypto.randomUUID(), sub: "0xFORGED-ACCEPTED",
          scope_granted: json.scope_requested || [],
        });
      }
      return failClosed(res);
    }
    // hardened: no real JWKS wired in this test double → nothing can be verified → DENY.
    // (The real service verifies against live JWKS; a test double must fail closed, not fake a grant.)
    return send(res, 401, { error: "invalid_signature", error_description: "token could not be verified" });
  }

  // ── POST /v1/consent/check ───────────────────────────────────────────────────
  if (p === "/v1/consent/check" && method === "POST") {
    if (json === undefined) return failClosed(res);
    if (MODE === "vulnerable") {
      // PLANTED: trust client claim of active consent.
      if (json.consent_id) return send(res, 200, { ok: true, sub: "0xUNKNOWN", exp: Date.now() + 3600000 });
      return failClosed(res);
    }
    return send(res, 401, { error: "consent_revoked", error_description: "no active consent for token" });
  }

  // ── POST /v1/revoke ──────────────────────────────────────────────────────────
  if (p === "/v1/revoke" && method === "POST") {
    if (MODE === "vulnerable") {
      // PLANTED (F11): revoke succeeds with no / any receipt_token.
      return send(res, 200, { ok: true, revoked_at: Date.now() });
    }
    // hardened: require a valid receipt_token (none is valid in this double) → 403.
    if (!json || !json.receipt_token) return send(res, 403, { error: "bad_receipt_token" });
    return send(res, 403, { error: "bad_receipt_token" });
  }

  // ── POST /v1/consent/deny ────────────────────────────────────────────────────
  if (p === "/v1/consent/deny" && method === "POST") {
    if (MODE === "vulnerable") {
      // PLANTED: denied-path not implemented (doctrine gap).
      return send(res, 405, { error: "method_not_allowed" });
    }
    // hardened: route exists; unknown session → 404 (route present, doctrine honored)
    return send(res, 404, { error: "session_unknown" });
  }

  // ── GET /v1/ledger ───────────────────────────────────────────────────────────
  if (p === "/v1/ledger" && method === "GET") {
    if (MODE === "vulnerable") {
      // PLANTED (F11): no admin-key check — dumps sub↔agent linkage.
      return send(res, 200, { events: LEDGER });
    }
    // hardened: require X-Admin-Key, constant-time compare.
    const key = req.headers["x-admin-key"] || "";
    if (!safeEqual(key, ADMIN_KEY)) return send(res, 403, { error: "forbidden" });
    return send(res, 200, { events: LEDGER });
  }

  // ── GET /v1/consent/:id (receipt) ────────────────────────────────────────────
  if (p.startsWith("/v1/consent/") && method === "GET") {
    const rt = url.searchParams.get("receipt_token");
    if (!rt) return send(res, 403, { error: "bad_receipt_token" });
    return send(res, 404, { error: "not_found" });
  }

  return send(res, 404, { error: "not_found" });

  // ── helpers ─────────────────────────────────────────────────────────────────
  function failClosed(r) {
    if (MODE === "vulnerable") {
      // PLANTED: fail OPEN on malformed input AND leak a stack trace + expected nonce.
      return send(r, 200, {
        ok: true,
        note: "TypeError: cannot read x at verify (/app/src/verify.mjs:42:11)\n    at handler (/app/src/index.mjs:88:7)",
        expected_nonce: "abc123deadbeef",
      });
    }
    return send(r, 400, { error: "invalid_request", error_description: "malformed body" });
  }
});

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

server.listen(PORT, "127.0.0.1", () => {
  console.error(`[fixture:${MODE}] listening on http://127.0.0.1:${PORT}`);
});
