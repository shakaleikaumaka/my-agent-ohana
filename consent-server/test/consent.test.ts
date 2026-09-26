// SPDX-License-Identifier: MIT
// Full offline pipeline test: begin -> verify(mock token) -> check(ok) -> revoke ->
// check(401 consent_revoked) -> receipt, plus every fail-closed case. Runs the real
// Worker + Durable Object in workerd (miniflare); tokens signed with a self-signed
// RS256 test key. NO network, NO real World client_id needed.
import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { importJWK, SignJWT } from "jose";
import priv from "./fixtures/mock-private.jwk.json";

const ISSUER = "https://mock.trinity.local";
const AUD = "trinity-demo-client";
const ORB = "https://world.org/oidc/acr/orb-v3";
const ADMIN = "dev-admin-key-change-me";
const AGENT = "tauro.demo.eth";

async function mint(overrides: Record<string, unknown> = {}): Promise<string> {
  const key = await importJWK(priv as Record<string, unknown>, "RS256");
  const now = Math.floor(Date.now() / 1000);
  // Capture control fields BEFORE stripping them from claim overrides.
  const expIn = (overrides.exp_in as number) ?? 600;
  const iss = (overrides.iss as string) ?? ISSUER;
  const aud = (overrides.aud as string) ?? AUD;
  const claims: Record<string, unknown> = {
    sub: overrides.sub ?? "0xmocksubject-pairwise-0001",
    jti: overrides.jti ?? `jti-${Math.random().toString(36).slice(2)}-${now}`,
    acr: overrides.acr ?? ORB,
  };
  if (overrides.nonce) claims.nonce = overrides.nonce;
  for (const k of ["sub", "jti", "acr", "nonce", "exp_in", "iss", "aud"]) delete overrides[k];
  Object.assign(claims, overrides);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: (priv as { kid: string }).kid })
    .setIssuedAt(now)
    .setIssuer(iss)
    .setAudience(aud)
    .setExpirationTime(now + expIn)
    .sign(key);
}

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await SELF.fetch(`https://consent.local${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}
async function get(path: string, headers: Record<string, string> = {}) {
  const res = await SELF.fetch(`https://consent.local${path}`, { headers });
  return { status: res.status, body: (await res.json()) as any };
}
async function begin(agent = AGENT) {
  const r = await post("/v1/consent/begin", { agent_subname: agent });
  return r;
}

beforeEach(async () => {
  await post("/v1/admin/reset", {}, { "x-admin-key": ADMIN });
});

describe("healthz + config", () => {
  it("reports configured + mock JWKS kid", async () => {
    const { status, body } = await get("/healthz");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.configured).toBe(true);
    expect(body.jwks_source).toBe("local-mock");
    expect(body.jwks_kids).toContain("mock-issuer-key-1");
    expect(body.issuer).toBe(ISSUER);
  });
});

describe("CORS", () => {
  const ORIGIN = "https://agentohana-demo-573fkrr6yf-ffieyo32.taur.link";
  it("answers OPTIONS preflight with 204 + CORS headers", async () => {
    const res = await SELF.fetch("https://consent.local/v1/consent/begin", {
      method: "OPTIONS",
      headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    const ah = (res.headers.get("access-control-allow-headers") || "").toLowerCase();
    expect(ah).toContain("x-receipt-token");
    expect(ah).toContain("x-admin-key");
    expect(ah).toContain("authorization");
  });
  it("stamps ACAO on real responses too (and reflects any *.taur.link https origin)", async () => {
    const res = await SELF.fetch("https://consent.local/healthz", {
      headers: { Origin: "https://something-else.taur.link" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://something-else.taur.link");
    expect(res.headers.get("vary")).toContain("Origin");
  });
  it("falls back to the pinned demo origin for a non-allowlisted origin (never bare *)", async () => {
    const res = await SELF.fetch("https://consent.local/healthz", {
      headers: { Origin: "https://evil.example.com" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
  });
});

describe("real ENS subnames (myagentohana.eth)", () => {
  for (const sub of [
    "globy.myagentohana.eth",
    "globie.myagentohana.eth",
    "orbie.myagentohana.eth",
    "trace.myagentohana.eth",
    "terri.myagentohana.eth",
    "shaka.myagentohana.eth",
    "pit.myagentohana.eth",
    "spector.myagentohana.eth",
    "crops.myagentohana.eth",
  ]) {
    it(`begin succeeds for ${sub}`, async () => {
      const { status, body } = await begin(sub);
      expect(status).toBe(200);
      expect(body.session_id).toMatch(/^sess_/);
    });
  }
});

describe("begin", () => {
  it("issues session+nonce for a known agent", async () => {
    const { status, body } = await begin();
    expect(status).toBe(200);
    expect(body.session_id).toMatch(/^sess_/);
    expect(typeof body.nonce).toBe("string");
    expect(body.expires_at).toBeGreaterThan(Date.now());
  });
  it("rejects an unknown agent (403 unknown_agent)", async () => {
    const { status, body } = await begin("stranger.demo.eth");
    expect(status).toBe(403);
    expect(body.error).toBe("unknown_agent");
  });
});

describe("HAPPY PATH: begin -> verify -> check -> revoke -> check(401) -> receipt", () => {
  it("walks the whole ceremony and halts instantly on revoke", async () => {
    const b = await begin();
    const token = await mint({ nonce: b.body.nonce });

    // verify
    const v = await post("/v1/verify", {
      id_token: token,
      session_id: b.body.session_id,
      agent_subname: AGENT,
      scope_requested: ["steward:gift"],
    });
    expect(v.status).toBe(200);
    expect(v.body.ok).toBe(true);
    expect(v.body.consent_id).toMatch(/^consent_/);
    expect(v.body.receipt_token).toBeTruthy();
    expect(v.body.scope_granted).toEqual(["steward:gift"]);
    expect(v.body.sub).toContain("…"); // truncated
    const { consent_id, receipt_token } = v.body;

    // check — allowed
    const c1 = await post("/v1/consent/check", {
      id_token: token, consent_id, agent_subname: AGENT, action: "steward:gift",
    });
    expect(c1.status).toBe(200);
    expect(c1.body.ok).toBe(true);

    // revoke (receipt_token capability)
    const rv = await post("/v1/revoke", { consent_id, receipt_token });
    expect(rv.status).toBe(200);
    expect(rv.body.ok).toBe(true);
    expect(rv.body.revoked_at).toBeGreaterThan(0);

    // check — instant 401 consent_revoked (this powers the demo's instant halt)
    const c2 = await post("/v1/consent/check", {
      id_token: token, consent_id, agent_subname: AGENT, action: "steward:gift",
    });
    expect(c2.status).toBe(401);
    expect(c2.body.error).toBe("consent_revoked");

    // receipt (debrief card data) shows revoked + full event trail.
    // Capability now travels in a HEADER (X-Receipt-Token), never the URL query string.
    const rc = await get(`/v1/consent/${consent_id}`, { "x-receipt-token": receipt_token });
    expect(rc.status).toBe(200);
    expect(rc.body.status).toBe("revoked");
    expect(rc.body.agent_subname).toBe(AGENT);
    expect(rc.body.scope_granted).toEqual(["steward:gift"]);
    const kinds = rc.body.events.map((e: any) => e.kind);
    expect(kinds).toContain("grant");
    expect(kinds).toContain("revoke");
  });
});

describe("fail-closed cases", () => {
  it("forged signature -> 401 invalid_signature", async () => {
    const b = await begin();
    const token = await mint({ nonce: b.body.nonce });
    // flip a char in the signature segment
    const parts = token.split(".");
    parts[2] = parts[2].slice(0, -2) + (parts[2].slice(-2) === "AA" ? "BB" : "AA");
    const tampered = parts.join(".");
    const v = await post("/v1/verify", {
      id_token: tampered, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    expect(v.status).toBe(401);
    expect(v.body.error).toBe("invalid_signature");
  });

  it("jti replay -> 409 jti_replayed", async () => {
    const b1 = await begin();
    const token = await mint({ jti: "fixed-replay-jti", nonce: b1.body.nonce });
    const v1 = await post("/v1/verify", {
      id_token: token, session_id: b1.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    expect(v1.status).toBe(200);
    const b2 = await begin();
    const token2 = await mint({ jti: "fixed-replay-jti", nonce: b2.body.nonce });
    const v2 = await post("/v1/verify", {
      id_token: token2, session_id: b2.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    expect(v2.status).toBe(409);
    expect(v2.body.error).toBe("jti_replayed");
  });

  it("expired token -> 401 token_expired", async () => {
    const b = await begin();
    const token = await mint({ exp_in: -120, nonce: b.body.nonce }); // beyond 60s skew
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    expect(v.status).toBe(401);
    expect(v.body.error).toBe("token_expired");
  });

  it("bad issuer -> 401 bad_issuer", async () => {
    const b = await begin();
    const token = await mint({ iss: "https://evil.example", nonce: b.body.nonce });
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    expect(v.status).toBe(401);
    expect(v.body.error).toBe("bad_issuer");
  });

  it("bad audience -> 401 bad_audience", async () => {
    const b = await begin();
    const token = await mint({ aud: "someone-else", nonce: b.body.nonce });
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    expect(v.status).toBe(401);
    expect(v.body.error).toBe("bad_audience");
  });

  it("insufficient acr (non-Orb) -> 403 acr_insufficient", async () => {
    const b = await begin();
    const token = await mint({ acr: "urn:weak", nonce: b.body.nonce });
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    expect(v.status).toBe(403);
    expect(v.body.error).toBe("acr_insufficient");
  });

  it("scope not allowed at verify -> 403 scope_not_allowed", async () => {
    const b = await begin();
    const token = await mint({ nonce: b.body.nonce });
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["admin:everything"],
    });
    expect(v.status).toBe(403);
    expect(v.body.error).toBe("scope_not_allowed");
  });

  it("action outside granted scope at check -> 403 scope_not_allowed", async () => {
    const b = await begin();
    const token = await mint({ nonce: b.body.nonce });
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    const c = await post("/v1/consent/check", {
      id_token: token, consent_id: v.body.consent_id, agent_subname: AGENT, action: "food:surplus-alert",
    });
    expect(c.status).toBe(403);
    expect(c.body.error).toBe("scope_not_allowed");
  });

  it("nonce mismatch -> 401 nonce_mismatch", async () => {
    const b = await begin();
    const token = await mint({ nonce: "not-the-session-nonce" });
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    expect(v.status).toBe(401);
    expect(v.body.error).toBe("nonce_mismatch");
  });
});

describe("F11 endpoint auth", () => {
  it("revoke with wrong receipt_token -> 403 bad_receipt_token (cannot revoke unauthenticated)", async () => {
    const b = await begin();
    const token = await mint({ nonce: b.body.nonce });
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    const rv = await post("/v1/revoke", { consent_id: v.body.consent_id, receipt_token: "attacker-guess" });
    expect(rv.status).toBe(403);
    expect(rv.body.error).toBe("bad_receipt_token");
    // consent still active
    const c = await post("/v1/consent/check", {
      id_token: token, consent_id: v.body.consent_id, agent_subname: AGENT, action: "steward:gift",
    });
    expect(c.status).toBe(200);
  });

  it("ledger without X-Admin-Key -> 403; with key -> 200", async () => {
    const noKey = await get("/v1/ledger");
    expect(noKey.status).toBe(403);
    const withKey = await get("/v1/ledger", { "x-admin-key": ADMIN });
    expect(withKey.status).toBe(200);
    expect(withKey.body.ok).toBe(true);
    expect(Array.isArray(withKey.body.events)).toBe(true);
  });

  it("receipt view without receipt_token -> 403", async () => {
    const b = await begin();
    const token = await mint({ nonce: b.body.nonce });
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    const rc = await get(`/v1/consent/${v.body.consent_id}`);
    expect(rc.status).toBe(403);
    expect(rc.body.error).toBe("receipt_token_required");
  });

  it("receipt token in the URL query is NO LONGER accepted (leak closed) -> 403", async () => {
    const b = await begin();
    const token = await mint({ nonce: b.body.nonce });
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    // The old ?receipt_token= path must not authenticate anymore.
    const rc = await get(`/v1/consent/${v.body.consent_id}?receipt_token=${v.body.receipt_token}`);
    expect(rc.status).toBe(403);
    expect(rc.body.error).toBe("receipt_token_required");
  });

  it("receipt view accepts Authorization: Bearer <receipt_token>", async () => {
    const b = await begin();
    const token = await mint({ nonce: b.body.nonce });
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    const rc = await get(`/v1/consent/${v.body.consent_id}`, { authorization: `Bearer ${v.body.receipt_token}` });
    expect(rc.status).toBe(200);
    expect(rc.body.status).toBe("active");
    expect(rc.body.agent_subname).toBe(AGENT);
  });
});

describe("F10 subject pin (EXPECTED_SUB set to the default minted sub in the test rig)", () => {
  it("token with a different sub -> 401 sub_mismatch (stranger cannot bind), no jti burned", async () => {
    const b = await begin();
    // A valid Orb token, correct nonce/acr/scope — but the WRONG subject.
    const token = await mint({ sub: "0xNOT-shakas-pairwise-sub", nonce: b.body.nonce });
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    expect(v.status).toBe(401);
    expect(v.body.error).toBe("sub_mismatch");
  });

  it("token with the pinned sub still binds normally (happy path unaffected)", async () => {
    const b = await begin();
    const token = await mint({ nonce: b.body.nonce }); // default sub == EXPECTED_SUB
    const v = await post("/v1/verify", {
      id_token: token, session_id: b.body.session_id, agent_subname: AGENT, scope_requested: ["steward:gift"],
    });
    expect(v.status).toBe(200);
    expect(v.body.ok).toBe(true);
  });
});

describe("begin rate limit (per-IP fixed window, default 30/60s)", () => {
  it("caps unauthenticated begin spray -> 429 rate_limited past the limit", async () => {
    // beforeEach reset wiped the counter; all requests share the same (miniflare) IP.
    let last: { status: number; body: any } = { status: 0, body: {} };
    for (let i = 0; i < 30; i++) {
      last = await begin();
      expect(last.status).toBe(200);
    }
    // The 31st begin in the window is throttled, fail-closed with a retry hint.
    const over = await begin();
    expect(over.status).toBe(429);
    expect(over.body.error).toBe("rate_limited");
    expect(over.body.retry_after_sec).toBeGreaterThan(0);
  });
});

describe("deny path (first-class outcome, no consent minted)", () => {
  it("logs a denial and mints no consent row", async () => {
    const b = await begin();
    const d = await post("/v1/consent/deny", { session_id: b.body.session_id });
    expect(d.status).toBe(200);
    expect(d.body.ok).toBe(true);
    const ledger = await get("/v1/ledger", { "x-admin-key": ADMIN });
    const denies = ledger.body.events.filter((e: any) => e.kind === "deny");
    expect(denies.length).toBe(1);
    const grants = ledger.body.events.filter((e: any) => e.kind === "grant");
    expect(grants.length).toBe(0);
  });
});
