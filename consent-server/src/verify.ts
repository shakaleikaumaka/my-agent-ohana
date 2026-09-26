// SPDX-License-Identifier: MIT
// Trinity Consent Server — the /v1/verify validation pipeline (ordered, fail-closed).
//
// Every step must pass. Order matters: cheap structural checks first, network/JWKS next,
// then claim checks, then the atomic jti burn (done by the caller against the DO), then
// scope. Any failure returns a specific error code and NEVER mints a consent.

import * as jose from "jose";
import type { ResolvedConfig } from "./config";

export interface VerifyClaims {
  sub: string;
  jti: string;
  acr?: string;
  exp: number;
  iat?: number;
  nonce?: string;
  raw: jose.JWTPayload;
}

export type VerifyResult =
  | { ok: true; claims: VerifyClaims }
  | { ok: false; code: string; status: number };

// Structural + cryptographic verification (steps 1–5 of the spec pipeline).
// Does NOT do session / jti / acr / scope — those are step 6–9, handled by the route
// because they need the DO and the session store.
export async function verifyToken(token: string, cfg: ResolvedConfig): Promise<VerifyResult> {
  // Step 1 — JWT shape: three parts, header alg RS256, kid present.
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, code: "malformed_token", status: 401 };
  let header: jose.ProtectedHeaderParameters;
  try {
    header = jose.decodeProtectedHeader(token);
  } catch {
    return { ok: false, code: "malformed_token", status: 401 };
  }
  if (header.alg !== "RS256") return { ok: false, code: "bad_alg", status: 401 };
  if (!header.kid) return { ok: false, code: "missing_kid", status: 401 };

  // Steps 2–5 — JWKS signature + iss + aud + exp (jose enforces iss/aud/exp/nbf).
  // aud is only enforced when a client_id is configured; before that the service is
  // "not configured" and mint routes 503 upstream (see index.ts).
  try {
    const { payload } = await jose.jwtVerify(token, cfg.getKey, {
      issuer: cfg.issuer,
      audience: cfg.clientId, // undefined => aud not checked (pre-client_id); route gates on configured
      clockTolerance: cfg.clockSkewSec,
      algorithms: ["RS256"],
    });

    if (typeof payload.sub !== "string" || !payload.sub) {
      return { ok: false, code: "missing_sub", status: 401 };
    }
    if (typeof payload.jti !== "string" || !payload.jti) {
      return { ok: false, code: "missing_jti", status: 401 };
    }
    if (typeof payload.exp !== "number") {
      return { ok: false, code: "missing_exp", status: 401 };
    }

    return {
      ok: true,
      claims: {
        sub: payload.sub,
        jti: payload.jti,
        acr: typeof payload.acr === "string" ? payload.acr : undefined,
        exp: payload.exp,
        iat: typeof payload.iat === "number" ? payload.iat : undefined,
        nonce: typeof payload.nonce === "string" ? payload.nonce : undefined,
        raw: payload,
      },
    };
  } catch (e: unknown) {
    return { ok: false, ...mapJoseError(e) };
  }
}

function mapJoseError(e: unknown): { code: string; status: number } {
  const code = (e as { code?: string })?.code;
  const name = (e as { name?: string })?.name;
  switch (code) {
    case "ERR_JWT_EXPIRED":
      return { code: "token_expired", status: 401 };
    case "ERR_JWS_SIGNATURE_VERIFICATION_FAILED":
      return { code: "invalid_signature", status: 401 };
    case "ERR_JWKS_NO_MATCHING_KEY":
      return { code: "unknown_kid", status: 401 };
    case "ERR_JWKS_MULTIPLE_MATCHING_KEYS":
      return { code: "ambiguous_kid", status: 401 };
    case "ERR_JWT_CLAIM_VALIDATION_FAILED": {
      const claim = (e as { claim?: string })?.claim;
      if (claim === "iss") return { code: "bad_issuer", status: 401 };
      if (claim === "aud") return { code: "bad_audience", status: 401 };
      return { code: "claim_invalid", status: 401 };
    }
    case "ERR_JWKS_TIMEOUT":
    case "ERR_JWKS_NO_MATCHING_KEY_TIMEOUT":
      // JWKS fetch failure => fail CLOSED (503), never allow through.
      return { code: "jwks_unavailable", status: 503 };
    default:
      if (name === "JWTExpired") return { code: "token_expired", status: 401 };
      return { code: "invalid_signature", status: 401 };
  }
}
