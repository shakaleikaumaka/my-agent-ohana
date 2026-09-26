// SPDX-License-Identifier: MIT
// Trinity Consent Server — small helpers.

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function err(code: string, status: number, extra: Record<string, unknown> = {}): Response {
  return json({ ok: false, error: code, ...extra }, status);
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 128-bit URL-safe random capability token.
export function randomToken(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return b64url(buf);
}

export function randomId(prefix: string): string {
  return `${prefix}_${randomToken(12)}`;
}

function b64url(buf: Uint8Array): string {
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Constant-time-ish string compare (avoids trivial early-exit timing leak on capability tokens).
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function truncSub(sub: string): string {
  if (sub.length <= 12) return sub;
  return `${sub.slice(0, 6)}…${sub.slice(-4)}`;
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- CORS
// The demo shell is a browser app on a *.taur.link origin, so the Worker must send
// CORS headers (the browser blocks cross-origin fetches + preflights OPTIONS otherwise).
// CORS is ORTHOGONAL to auth: we authenticate with request HEADERS (X-Admin-Key /
// X-Receipt-Token / Authorization: Bearer), never cookies, so no `Allow-Credentials`
// and no bare-`*`-with-credentials footgun. We reflect any https `*.taur.link` origin
// (and the pinned demo origin) and otherwise fall back to the demo origin — never a
// wildcard, so a random site can't read authed responses from a victim's browser.
// BRAND ORIGIN LIVE-WIRING (Shaka direct order 2026-09-26 ~23:37 JST: "we absolutely
// want to bring this live and into production on the main site not taur link"):
// myagentohana.com (+ www) is the production home of the ceremony shell, so its
// origin is now first-class alongside *.taur.link. Still an allow-list, never `*`.
const DEMO_ORIGIN = "https://agentohana-demo-573fkrr6yf-ffieyo32.taur.link";
const BRAND_HOSTS = new Set(["myagentohana.com", "www.myagentohana.com"]);

function allowedOrigin(origin: string | null): string {
  if (origin) {
    try {
      const u = new URL(origin);
      if (
        u.protocol === "https:" &&
        (u.hostname === "agentohana-demo-573fkrr6yf-ffieyo32.taur.link" ||
          u.hostname.endsWith(".taur.link") ||
          BRAND_HOSTS.has(u.hostname))
      ) {
        return origin;
      }
    } catch {
      /* malformed Origin => fall through to the pinned demo origin */
    }
  }
  return DEMO_ORIGIN;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(origin),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-receipt-token, authorization, x-admin-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// Attach CORS headers to an already-built Response without touching its body/status.
export function withCors(resp: Response, origin: string | null): Response {
  const h = new Headers(resp.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) h.set(k, v);
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}
