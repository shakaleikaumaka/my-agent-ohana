// SPDX-License-Identifier: MIT
// Sign a mock id_token with the offline test key. TEST/DEMO ONLY.
// Usage: node scripts/mint.mjs '<json-overrides>'
//   node scripts/mint.mjs                       # default valid Orb token, +10min exp
//   node scripts/mint.mjs '{"nonce":"abc"}'     # set/override claims
//   node scripts/mint.mjs '{"exp_in":-10}'      # exp 10s in the PAST (expired token)
//   node scripts/mint.mjs '{"acr":"weak"}'      # non-Orb acr
// Prints the compact JWT to stdout.
import { importJWK, SignJWT } from "jose";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const priv = JSON.parse(readFileSync(join(root, "test", "fixtures", "mock-private.jwk.json"), "utf8"));
const key = await importJWK(priv, "RS256");

const overrides = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const now = Math.floor(Date.now() / 1000);
const expIn = overrides.exp_in ?? 600;
delete overrides.exp_in;

const claims = {
  sub: overrides.sub ?? "0xmocksubject-pairwise-0001",
  jti: overrides.jti ?? `jti-${Math.random().toString(36).slice(2)}-${now}`,
  acr: overrides.acr ?? "https://world.org/oidc/acr/orb-v3",
  ...(overrides.nonce ? { nonce: overrides.nonce } : {}),
};
for (const k of ["sub", "jti", "acr", "nonce", "exp_in"]) delete overrides[k];
Object.assign(claims, overrides);

const jwt = await new SignJWT(claims)
  .setProtectedHeader({ alg: "RS256", kid: priv.kid })
  .setIssuedAt(now)
  .setIssuer(overrides.iss ?? "https://mock.trinity.local")
  .setAudience(overrides.aud ?? "trinity-demo-client")
  .setExpirationTime(now + expIn)
  .sign(key);

process.stdout.write(jwt);
