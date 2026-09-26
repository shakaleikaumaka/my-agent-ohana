// fixtures/vuln-backend/server.js — a DELIBERATELY INSECURE consent backend.
// This is a TEST FIXTURE for spector-scan's static analyzer. It is NOT a real service
// and must never be deployed. Every "vuln" here is planted so the scanner can prove it
// catches the real F-class threats. See ../../test.sh.
//
// Planted weaknesses:
//   1. binds 0.0.0.0                       -> SRC-BIND-0000        (F11)
//   2. /v1/revoke has no capability check  -> SRC-F11-REVOKE-UNAUTH(F11)
//   3. /v1/ledger has no admin-key check   -> SRC-F11-ADMIN-UNAUTH (F11)
//   4. hardcoded credential in source      -> SRC-SECRET-COMMITTED (F2)
//   5. catch{} returns ok:true (fail-open) -> SRC-FAIL-OPEN-CATCH  (AP-2)
//   6. no server-side token verification   -> SRC-F6-NO-BACKEND    (F6)

import http from "node:http";

// (4) PLANTED: a hardcoded credential committed in source (not from env).
const apiKey = "sk_live_hardcoded_planted_credential_do_not_ship_123456";

const consents = new Map();

const server = http.createServer((req, res) => {
  const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  const body = {}; // (pretend parsed)

  // (6) PLANTED: "verify" trusts client-supplied claims — no signature check, no JWKS.
  if (req.url === "/v1/verify") {
    // No jose.jwtVerify, no createRemoteJWKSet — the client just asserts it's blessed.
    const blessed = body.blessed === true;
    return send(200, { ok: blessed, sub: body.sub, scope_granted: body.scope_requested });
  }

  // (3) PLANTED: ledger dumps the human<->agent linkage with NO admin key.
  if (req.url === "/v1/ledger") {
    return send(200, { ok: true, events: [...consents.values()] });
  }

  // (2) PLANTED: revoke mutates state with NO receipt_token / capability check.
  if (req.url === "/v1/revoke") {
    consents.delete(body.consent_id);
    return send(200, { ok: true, revoked: body.consent_id });
  }

  send(404, { ok: false, error: "not_found" });
});

// (5) PLANTED: any error is swallowed into a success — fails OPEN.
try {
  // (1) PLANTED: binds 0.0.0.0 — reachable from the whole venue LAN.
  server.listen(8080, "0.0.0.0", () => console.log("vuln backend on 0.0.0.0:8080"));
} catch (e) {
  // swallow and pretend everything is fine
  return { ok: true };
}
