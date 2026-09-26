// SPDX-License-Identifier: MIT
// Trinity Consent Server — shared types.

export interface Env {
  CONSENT_DO: DurableObjectNamespace;

  // Issuer / verification config.
  // WID_ISSUER    — expected `iss` (World pilot). Baked default below; ISSUER_OVERRIDE wins.
  // ISSUER_OVERRIDE — offline/mock issuer (e.g. "https://mock.trinity.local").
  // JWKS_URL      — remote JWKS endpoint (real World). Ignored when MOCK_JWKS is present.
  // MOCK_JWKS     — a full JWKS JSON string; when set, verification uses a LOCAL key set
  //                 (no network) so the whole pipeline is exercisable offline before the
  //                 real client_id / JWKS land. Swapping to real World = drop MOCK_JWKS +
  //                 set WID_CLIENT_ID + JWKS_URL. Config swap only.
  WID_ISSUER?: string;
  ISSUER_OVERRIDE?: string;
  JWKS_URL?: string;
  MOCK_JWKS?: string;

  // WID_CLIENT_ID — expected `aud`. Booth Q#1 kill dependency for the live leg.
  WID_CLIENT_ID?: string;

  // EXPECTED_SUB — OPTIONAL subject pin (F10). When set, /v1/verify rejects any token
  // whose `sub` != this value with 401 sub_mismatch, so the blessing binds to exactly
  // ONE human's pairwise sub even if a random session_id leaks. Unset => any valid Orb
  // token may bind (mock/dev mode). For the live demo, pin Shaka's captured `sub`.
  EXPECTED_SUB?: string;

  // BEGIN_RATE_* — OPTIONAL DoS bound on POST /v1/consent/begin (per-IP fixed window).
  // BEGIN_RATE_LIMIT begins per BEGIN_RATE_WINDOW_SEC seconds; over the cap => 429
  // rate_limited. Defaults: 30 begins / 60s. Set BEGIN_RATE_LIMIT="0" to disable.
  BEGIN_RATE_LIMIT?: string;
  BEGIN_RATE_WINDOW_SEC?: string;

  // REQUIRE_ORB_ACR — when "true", `acr` must equal ORB_ACR_VALUE (proof-of-personhood gate).
  REQUIRE_ORB_ACR?: string;
  ORB_ACR_VALUE?: string;

  // AGENT_SCOPE_MAP — JSON: { "agent.subname.eth": ["steward:gift", ...] }.
  AGENT_SCOPE_MAP?: string;

  // ADMIN_KEY — capability guarding GET /v1/ledger (F11). Throwaway secret.
  ADMIN_KEY?: string;

  // CLOCK_SKEW_SEC — allowed exp/iat skew (default 60).
  CLOCK_SKEW_SEC?: string;
}

export type EventKind = "grant" | "deny" | "revoke" | "expire" | "jwks_rotation";

export interface ConsentEvent {
  ts: number;
  kind: EventKind;
  consent_id?: string;
  sub_trunc?: string;
  agent_subname?: string;
  note?: string;
}

export interface SessionRecord {
  session_id: string;
  nonce: string;
  agent_subname: string;
  status: "pending" | "verified" | "denied";
  created_at: number;
  expires_at: number;
}

export interface ConsentRecord {
  consent_id: string;
  sub: string; // stored full (pairwise per-client handle), truncated in UI
  agent_subname: string;
  scope_granted: string[];
  jti: string;
  iat: number;
  exp: number;
  granted_at: number;
  status: "active" | "revoked" | "expired";
  revoked_at?: number;
  receipt_token_hash: string; // sha-256 hex of the capability token; plaintext never stored
  events: ConsentEvent[];
}

export interface Receipt {
  consent_id: string;
  sub_trunc: string;
  agent_subname: string;
  scope_granted: string[];
  granted_at: number;
  exp: number;
  status: string;
  revoked_at?: number;
  events: ConsentEvent[];
}
