// SPDX-License-Identifier: MIT
// Trinity Consent Server — resolved config + verification key set.
//
// NOTE ON THE WORLD ISSUER DOMAIN: the World ID pilot issuer domain MOVED from
// auth.worldcoin.dev -> sandbox.auth.world.org (confirmed by GLOBY/PIT, Sep 2026).
// We bake the new one as the default `iss`/JWKS host. ISSUER_OVERRIDE + MOCK_JWKS let
// the whole pipeline run offline (self-signed RS256) until the real client_id lands.

import * as jose from "jose";
import type { Env } from "./types";

export const DEFAULT_ISSUER = "https://sandbox.auth.world.org";
export const DEFAULT_JWKS_URL = "https://sandbox.auth.world.org/.well-known/jwks.json";
export const DEFAULT_ORB_ACR = "https://world.org/oidc/acr/orb-v3";

export interface ResolvedConfig {
  issuer: string;
  jwksUrl: string;
  mock: boolean;
  clientId: string | undefined;
  expectedSub: string | undefined; // F10 subject pin (optional)
  requireOrbAcr: boolean;
  orbAcrValue: string;
  scopeMap: Record<string, string[]>;
  clockSkewSec: number;
  beginRateLimit: number; // begins per window per IP; 0 disables
  beginRateWindowMs: number;
  jwksKids: string[];
  getKey: jose.JWTVerifyGetKey | ReturnType<typeof jose.createLocalJWKSet>;
  configured: boolean; // false until a client_id (aud) is present
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Cache the key set per-isolate so createRemoteJWKSet reuses its internal cache.
let cachedKeySet: ResolvedConfig["getKey"] | undefined;
let cachedKids: string[] = [];
let cachedSignature = "";

export function resolveConfig(env: Env): ResolvedConfig {
  const issuer = env.ISSUER_OVERRIDE || env.WID_ISSUER || DEFAULT_ISSUER;
  const jwksUrl = env.JWKS_URL || DEFAULT_JWKS_URL;
  const mock = typeof env.MOCK_JWKS === "string" && env.MOCK_JWKS.length > 0;
  const clientId = env.WID_CLIENT_ID;
  const expectedSub = env.EXPECTED_SUB && env.EXPECTED_SUB.length > 0 ? env.EXPECTED_SUB : undefined;
  const requireOrbAcr = (env.REQUIRE_ORB_ACR ?? "true") === "true";
  const orbAcrValue = env.ORB_ACR_VALUE || DEFAULT_ORB_ACR;
  const scopeMap = parseJson<Record<string, string[]>>(env.AGENT_SCOPE_MAP, {});
  const clockSkewSec = Number(env.CLOCK_SKEW_SEC ?? "60") || 60;
  const beginRateLimit = Number(env.BEGIN_RATE_LIMIT ?? "30");
  const beginRateWindowMs = (Number(env.BEGIN_RATE_WINDOW_SEC ?? "60") || 60) * 1000;

  // Signature of the key-source so we rebuild the cached set only when it changes.
  const sig = mock ? `mock:${(env.MOCK_JWKS as string).length}:${hashLite(env.MOCK_JWKS as string)}` : `remote:${jwksUrl}`;

  if (!cachedKeySet || sig !== cachedSignature) {
    if (mock) {
      const jwks = parseJson<{ keys: jose.JWK[] }>(env.MOCK_JWKS, { keys: [] });
      cachedKids = jwks.keys.map((k) => k.kid || "").filter(Boolean);
      cachedKeySet = jose.createLocalJWKSet(jwks as jose.JSONWebKeySet);
    } else {
      cachedKids = [];
      cachedKeySet = jose.createRemoteJWKSet(new URL(jwksUrl), {
        cacheMaxAge: 15 * 60 * 1000,
        cooldownDuration: 30 * 1000,
      });
    }
    cachedSignature = sig;
  }

  return {
    issuer,
    jwksUrl,
    mock,
    clientId,
    expectedSub,
    requireOrbAcr,
    orbAcrValue,
    scopeMap,
    clockSkewSec,
    beginRateLimit: Number.isFinite(beginRateLimit) ? beginRateLimit : 30,
    beginRateWindowMs,
    jwksKids: cachedKids,
    getKey: cachedKeySet,
    configured: Boolean(clientId),
  };
}

function hashLite(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}
