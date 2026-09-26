// SPDX-License-Identifier: MIT
// Trinity Consent Server — Worker entry + router.
//
// Kills F6: a minimal HOSTED World-token verifier. Every protected act is gated by the
// backend RE-VERIFYING the token AND the app-layer ledger, never by client state.
//
// F11 (endpoint auth, REQUIRED): /v1/revoke is gated by the receipt_token capability;
// /v1/ledger and /v1/admin/* are gated by X-Admin-Key. Fail-closed everywhere. Never
// bind 0.0.0.0 in any deploy/example (see README) — wrangler dev binds localhost only.

import { resolveConfig } from "./config";
import { ConsentStore } from "./do";
import type { ConsentEvent, ConsentRecord, Env, Receipt } from "./types";
import { verifyToken } from "./verify";
import { corsHeaders, err, json, randomId, randomToken, readJson, safeEqual, sha256Hex, truncSub, withCors } from "./util";

export { ConsentStore };

function stub(env: Env) {
  const id = env.CONSENT_DO.idFromName("global");
  return env.CONSENT_DO.get(id) as unknown as ConsentStore;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("Origin");
    // CORS preflight — answer OPTIONS before any routing/auth. 204, no body.
    if (req.method.toUpperCase() === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    // Route, then stamp CORS onto whatever the router returns (success OR error),
    // so the browser can read the real status. Auth semantics are untouched.
    return withCors(await route(req, env), origin);
  },
};

async function route(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;
    const method = req.method.toUpperCase();
    const cfg = resolveConfig(env);
    const db = stub(env);

    try {
      // 1 — GET /healthz
      if (pathname === "/healthz" && method === "GET") {
        return json({
          ok: true,
          service: "trinity-consent",
          issuer: cfg.issuer,
          jwks_source: cfg.mock ? "local-mock" : "remote",
          jwks_kids: cfg.jwksKids,
          configured: cfg.configured,
          require_orb_acr: cfg.requireOrbAcr,
        });
      }

      // 2 — POST /v1/consent/begin { agent_subname }
      if (pathname === "/v1/consent/begin" && method === "POST") {
        // Per-IP DoS bound (defense-in-depth; the CF edge is the primary throttle).
        // No device flow exists, so begin burns no World quota — this only caps
        // unauthenticated DO-state spray. Disabled when BEGIN_RATE_LIMIT="0".
        const ip = req.headers.get("cf-connecting-ip") || "local";
        const rl = await db.rateLimit(`begin:${ip}`, cfg.beginRateLimit, cfg.beginRateWindowMs);
        if (!rl.allowed) {
          return err("rate_limited", 429, { retry_after_sec: rl.retryAfterSec });
        }
        const body = await readJson<{ agent_subname?: string }>(req);
        const agent = body?.agent_subname;
        if (!agent) return err("bad_request", 400);
        if (!(agent in cfg.scopeMap)) return err("unknown_agent", 403);
        const sess = await db.createSession(agent);
        return json({ session_id: sess.session_id, nonce: sess.nonce, expires_at: sess.expires_at });
      }

      // 3 — POST /v1/verify
      if (pathname === "/v1/verify" && method === "POST") {
        if (!cfg.configured) return err("not_configured", 503, { hint: "WID_CLIENT_ID missing" });
        const body = await readJson<{
          id_token?: string;
          session_id?: string;
          agent_subname?: string;
          scope_requested?: string[];
        }>(req);
        if (!body?.id_token || !body.session_id || !body.agent_subname) return err("bad_request", 400);
        const scopeRequested = Array.isArray(body.scope_requested) ? body.scope_requested : [];

        // Steps 1–5: signature + iss + aud + exp.
        const v = await verifyToken(body.id_token, cfg);
        if (!v.ok) return err(v.code, v.status);
        const c = v.claims;

        // Step 6: session must exist and be pending; nonce must echo if present.
        const sess = await db.getSession(body.session_id);
        if (!sess) return err("session_unknown", 401);
        if (sess.status !== "pending") return err("session_not_pending", 409, { status: sess.status });
        if (Date.now() > sess.expires_at) return err("session_expired", 401);
        if (sess.agent_subname !== body.agent_subname) return err("agent_mismatch", 403);
        if (c.nonce && !safeEqual(c.nonce, sess.nonce)) return err("nonce_mismatch", 401);

        // F10 subject pin (optional, before burn): when EXPECTED_SUB is configured, the
        // blessing may bind ONLY to that one human's pairwise sub. A stranger's otherwise-
        // valid Orb token (different sub) is rejected fail-closed and burns no jti. Unset
        // => any valid token may bind (mock/dev). safeEqual to avoid a timing leak.
        if (cfg.expectedSub && !safeEqual(c.sub, cfg.expectedSub)) {
          return err("sub_mismatch", 401);
        }

        // Step 8 (moved before burn): acr / proof-of-personhood gate.
        if (cfg.requireOrbAcr && c.acr !== cfg.orbAcrValue) {
          return err("acr_insufficient", 403, { required: cfg.orbAcrValue, got: c.acr ?? null });
        }
        // Step 9 (moved before burn): scope must be a subset of what this agent may request.
        const allowed = cfg.scopeMap[body.agent_subname] ?? [];
        const bad = scopeRequested.filter((s) => !allowed.includes(s));
        if (bad.length) return err("scope_not_allowed", 403, { denied: bad });
        // Deliberate refinement over the raw spec order: acr+scope are checked BEFORE the
        // jti burn so a *rejected* request does not consume the one-time token. A verified
        // request still burns exactly once => one token mints exactly one consent, ever.

        // Step 7: atomic jti burn (replay guard).
        const fresh = await db.burnJti(c.jti);
        if (!fresh) return err("jti_replayed", 409);

        // Step 10: write consent + grant event; return the receipt_token capability once.
        const consentId = randomId("consent");
        const receiptToken = randomToken(16);
        const now = Date.now();
        const grantEvent: ConsentEvent = {
          ts: now,
          kind: "grant",
          consent_id: consentId,
          sub_trunc: truncSub(c.sub),
          agent_subname: body.agent_subname,
        };
        const rec: ConsentRecord = {
          consent_id: consentId,
          sub: c.sub,
          agent_subname: body.agent_subname,
          scope_granted: scopeRequested,
          jti: c.jti,
          iat: c.iat ?? Math.floor(now / 1000),
          exp: c.exp,
          granted_at: now,
          status: "active",
          receipt_token_hash: await sha256Hex(receiptToken),
          events: [grantEvent],
        };
        await db.putConsent(rec);
        await db.setSessionStatus(body.session_id, "verified");
        await db.appendEvent(grantEvent);

        return json({
          ok: true,
          consent_id: consentId,
          sub: truncSub(c.sub),
          acr: c.acr ?? null,
          exp: c.exp,
          scope_granted: rec.scope_granted,
          receipt_token: receiptToken, // shown ONCE — the human's revoke/debrief capability
        });
      }

      // 4 — POST /v1/consent/check (per protected action)
      if (pathname === "/v1/consent/check" && method === "POST") {
        if (!cfg.configured) return err("not_configured", 503);
        const body = await readJson<{
          id_token?: string;
          consent_id?: string;
          agent_subname?: string;
          action?: string;
        }>(req);
        if (!body?.id_token || !body.consent_id || !body.agent_subname || !body.action) {
          return err("bad_request", 400);
        }
        // Re-verify the presented token (JWKS cached, cheap) — steps 1–5.
        const v = await verifyToken(body.id_token, cfg);
        if (!v.ok) return err(v.code, v.status);
        const c = v.claims;

        const nowSec = Math.floor(Date.now() / 1000);
        const rec = await db.touchExpiry(body.consent_id, nowSec);
        if (!rec) return err("consent_unknown", 404);
        // Token must be the SAME token that minted this consent (jti + sub bind).
        if (rec.jti !== c.jti || rec.sub !== c.sub || rec.agent_subname !== body.agent_subname) {
          return err("token_consent_mismatch", 401);
        }
        if (rec.status === "revoked") return err("consent_revoked", 401);
        if (rec.status === "expired") return err("consent_expired", 401);
        if (!rec.scope_granted.includes(body.action)) return err("scope_not_allowed", 403);

        return json({ ok: true, sub: truncSub(rec.sub), exp: rec.exp, action: body.action });
      }

      // 5 — POST /v1/revoke { consent_id, receipt_token }  (F11: receipt_token capability)
      if (pathname === "/v1/revoke" && method === "POST") {
        const body = await readJson<{ consent_id?: string; receipt_token?: string }>(req);
        if (!body?.consent_id || !body.receipt_token) return err("bad_request", 400);
        const rec = await db.getConsent(body.consent_id);
        if (!rec) return err("not_found", 404);
        const presentedHash = await sha256Hex(body.receipt_token);
        if (!safeEqual(presentedHash, rec.receipt_token_hash)) return err("bad_receipt_token", 403);
        const r = await db.revokeConsent(body.consent_id);
        if (r.status === "not_found") return err("not_found", 404);
        return json({ ok: true, consent_id: body.consent_id, revoked_at: r.revoked_at, already_revoked: r.status === "already_revoked" });
      }

      // 6 — POST /v1/consent/deny { session_id } — denial is a first-class outcome, no row minted
      if (pathname === "/v1/consent/deny" && method === "POST") {
        const body = await readJson<{ session_id?: string }>(req);
        if (!body?.session_id) return err("bad_request", 400);
        const sess = await db.getSession(body.session_id);
        if (!sess) return err("not_found", 404);
        await db.setSessionStatus(body.session_id, "denied");
        await db.appendEvent({ ts: Date.now(), kind: "deny", agent_subname: sess.agent_subname });
        return json({ ok: true });
      }

      // 7 — GET /v1/consent/:id — the debrief card data.
      // The receipt_token capability is read from a HEADER (X-Receipt-Token or
      // Authorization: Bearer), NEVER the query string — a bearer capability in a URL
      // leaks into projector logs, browser history, and referrers. Same SHA-256 hash +
      // constant-time compare as before.
      const consentMatch = pathname.match(/^\/v1\/consent\/([^/]+)$/);
      if (consentMatch && method === "GET") {
        const id = decodeURIComponent(consentMatch[1]);
        const rt = receiptTokenFromHeaders(req);
        if (!rt) return err("receipt_token_required", 403);
        const rec = await db.getConsent(id);
        if (!rec) return err("not_found", 404);
        const presentedHash = await sha256Hex(rt);
        if (!safeEqual(presentedHash, rec.receipt_token_hash)) return err("bad_receipt_token", 403);
        // Lazily reflect expiry in the receipt view.
        const fresh = (await db.touchExpiry(id, Math.floor(Date.now() / 1000))) ?? rec;
        const receipt: Receipt = {
          consent_id: fresh.consent_id,
          sub_trunc: truncSub(fresh.sub),
          agent_subname: fresh.agent_subname,
          scope_granted: fresh.scope_granted,
          granted_at: fresh.granted_at,
          exp: fresh.exp,
          status: fresh.status,
          revoked_at: fresh.revoked_at,
          events: fresh.events,
        };
        return json(receipt);
      }

      // 8 — GET /v1/ledger  (F11: X-Admin-Key)
      if (pathname === "/v1/ledger" && method === "GET") {
        if (!adminOk(req, env)) return err("forbidden", 403);
        const events = await db.getLedger();
        return json({ ok: true, count: events.length, events });
      }

      // admin reset (test/demo convenience) — X-Admin-Key gated
      if (pathname === "/v1/admin/reset" && method === "POST") {
        if (!adminOk(req, env)) return err("forbidden", 403);
        await db.reset();
        return json({ ok: true, reset: true });
      }

      return err("not_found", 404);
    } catch (e: unknown) {
      // Fail-closed: any unexpected error is a 500, never an implicit allow.
      return err("internal_error", 500, { detail: (e as Error)?.message });
    }
}

// Read the receipt_token capability from a header only (never the URL query string).
// Accepts `X-Receipt-Token: <tok>` or `Authorization: Bearer <tok>`.
function receiptTokenFromHeaders(req: Request): string | null {
  const x = req.headers.get("x-receipt-token");
  if (x && x.length > 0) return x;
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m && m[1].length > 0) return m[1].trim();
  return null;
}

function adminOk(req: Request, env: Env): boolean {
  const key = env.ADMIN_KEY;
  const presented = req.headers.get("x-admin-key") || "";
  // Fail-closed: if no ADMIN_KEY configured, the admin routes are unreachable.
  if (!key) return false;
  return safeEqual(presented, key);
}
