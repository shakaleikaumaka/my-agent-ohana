// SPDX-License-Identifier: MIT
// pit-intake — "Feed the Pit" intake worker.
//
// Doors per pit ("live" | "scribe" | "gard"):
//   POST /submit  { pit, type:"drive", driveUrl, note?, from?, name? }  -> normalized Drive entry
//   POST /submit  { pit, type:"note", text, name?, from? }              -> words for the wall (the gard's tribute door)
//   POST /upload  multipart { pit, file(video/*, <=45MB), note?, from? } -> R2-backed entry
// Public:
//   GET  /feed?pit=live|scribe|gard   -> newest-first entries (cap 50)
//   GET  /file/<key>             -> stream an uploaded clip from R2 (byte-range capable)
//   GET  /healthz
// Admin (X-Admin-Key):
//   DELETE /entry { pit, id }    -> remove from feed (R2 object deleted too, if upload)
//
// Consent doctrine: the door is a gift-box, not a grab — every entry carries a note +
// optional "from", and removal requests are honored (admin key held by sysadmin).

import { DurableObject } from "cloudflare:workers";
import * as jose from "jose";
import { createPublicClient, createWalletClient, http, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

export interface Env {
  INTAKE_DO: DurableObjectNamespace;
  BUCKET: R2Bucket;
  ADMIN_KEY?: string;
  MAX_UPLOAD_MB?: string;
  FEED_CAP?: string;
  SUBMIT_RATE_LIMIT?: string;
  SUBMIT_RATE_WINDOW_SEC?: string;
  WID_CLIENT_ID?: string;
  WID_CLIENT_SECRET?: string;
  WID_ISSUER?: string;
  /** Sepolia PoolGuard attester key (CF secret) — signs claimSlot() only. */
  ATTESTER_PK?: string;
  SEPOLIA_RPC?: string;
}

// ---------------- Aqua PoolGuard lane (Sepolia, REAL) ----------------
// One verified human = one capped slot of the Aqua blessing pool.
// Deployed 2026-09-27 (harvest moon). Chain-agnostic by design: same
// artifacts redeploy to other chains post-review by swapping this block.
const AQUA = {
  chainId: 11155111,
  registry: "0xCE1C50ce349aC075b227585C84DA22d4B7fa3360",
  blessingPool: "0xd29110bEd6E896701A26202eE59E79C9b82F2e51",
  poolGuard: "0xabe7F81D58172e06E32C418826e338D3739c292f",
  gift: "0x7932D0157b8610b428596B180b44005C2a2eDDc2",
  aloha: "0xE5fc4F18f87D86cf70D0706fe6c9FC6e2A791192",
  strategyHash: "0x84f8ef918c2045e1d38674cb52a6cb741fe433f3b5516f4efa653e70aaee1a52",
  agent: "0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6", // trace.myagentohana.eth owner (Sepolia)
} as const;

const GUARD_ABI = [
  {
    type: "function", name: "claimSlot", stateMutability: "nonpayable",
    inputs: [{ name: "subHash", type: "bytes32" }],
    outputs: [{ name: "index", type: "uint32" }],
  },
  {
    type: "function", name: "slotOf", stateMutability: "view",
    inputs: [{ name: "subHash", type: "bytes32" }],
    outputs: [
      { name: "claimed", type: "bool" }, { name: "index", type: "uint32" },
      { name: "capBps", type: "uint16" }, { name: "claimedAt", type: "uint64" },
    ],
  },
  { type: "function", name: "slotCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
] as const;

const AQUA_ABI = [
  {
    type: "function", name: "rawBalances", stateMutability: "view",
    inputs: [
      { name: "maker", type: "address" }, { name: "app", type: "address" },
      { name: "strategyHash", type: "bytes32" }, { name: "token", type: "address" },
    ],
    outputs: [{ name: "balance", type: "uint248" }, { name: "tokensCount", type: "uint8" }],
  },
] as const;

const POOL_ABI = [
  {
    type: "function", name: "positions", stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "agent", type: "address" }, { name: "token0", type: "address" },
      { name: "token1", type: "address" }, { name: "active", type: "bool" },
      { name: "salt", type: "bytes32" },
    ],
  },
] as const;

function rpcClient(env: Env) {
  return createPublicClient({
    chain: sepolia,
    transport: http(env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com", { timeout: 15_000 }),
  });
}

let jwksCache: { url: string; keyset: ReturnType<typeof jose.createRemoteJWKSet> } | null = null;
function widKeyset(issuer: string) {
  const url = `${issuer}/.well-known/jwks.json`;
  if (!jwksCache || jwksCache.url !== url) {
    jwksCache = { url, keyset: jose.createRemoteJWKSet(new URL(url), { cooldownDuration: 60_000 }) };
  }
  return jwksCache.keyset;
}

const PITS = ["live", "scribe", "gard"] as const;
type Pit = (typeof PITS)[number];

interface Entry {
  id: string;
  pit: Pit;
  type: "drive" | "upload" | "note";
  fileId?: string;
  previewUrl?: string;
  viewUrl?: string;
  url?: string; // worker-relative /file/<key> for uploads
  name?: string;
  note?: string;
  from?: string;
  ts: number;
}

// ---------------- utils ----------------
function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Admin-Key,Range",
    "Access-Control-Expose-Headers": "Content-Range,Accept-Ranges,Content-Length",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
function withCors(res: Response, origin: string | null): Response {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) h.set(k, v as string);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
function err(code: string, status: number, extra?: Record<string, unknown>): Response {
  return json({ ok: false, error: code, ...(extra ?? {}) }, status);
}
function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
function clean(s: unknown, max: number): string | undefined {
  if (typeof s !== "string") return undefined;
  const v = s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return v ? v.slice(0, max) : undefined;
}
function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() || "clip";
  const safe = base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return safe || "clip";
}

// ---------------- Drive normalization ----------------
// Accepts: /file/d/<id>/..., /open?id=<id>, /uc?id=<id>, ?id=<id> on drive.google.com,
// or a bare 25-60 char file ID. Everything else is politely rejected.
const ID_RE = /^[A-Za-z0-9_-]{25,60}$/;
function normalizeDriveId(raw: string): string | null {
  const s = raw.trim();
  if (ID_RE.test(s)) return s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.hostname.toLowerCase() !== "drive.google.com") return null;
  const m = u.pathname.match(/\/file\/d\/([A-Za-z0-9_-]{25,60})/);
  if (m) return m[1];
  const id = u.searchParams.get("id");
  if (id && ID_RE.test(id)) return id;
  return null;
}

// ---------------- Durable Object ----------------
export class IntakeStore extends DurableObject {
  private feedKey(pit: Pit) {
    return `feed:${pit}`;
  }
  async add(pit: Pit, entry: Entry, cap: number): Promise<Entry[]> {
    const key = this.feedKey(pit);
    const list = (await this.ctx.storage.get<Entry[]>(key)) ?? [];
    list.unshift(entry);
    if (list.length > cap) list.length = cap;
    await this.ctx.storage.put(key, list);
    return list;
  }
  async list(pit: Pit): Promise<Entry[]> {
    return (await this.ctx.storage.get<Entry[]>(this.feedKey(pit))) ?? [];
  }
  async remove(pit: Pit, id: string): Promise<Entry | null> {
    const key = this.feedKey(pit);
    const list = (await this.ctx.storage.get<Entry[]>(key)) ?? [];
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const [gone] = list.splice(idx, 1);
    await this.ctx.storage.put(key, list);
    return gone;
  }
  // per-IP fixed-window rate limit (atomic inside the DO)
  async rateLimit(
    bucket: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; retryAfterSec: number }> {
    if (limit <= 0) return { allowed: true, retryAfterSec: 0 };
    const now = Date.now();
    const key = `rl:${bucket}`;
    const cur = await this.ctx.storage.get<{ count: number; resetAt: number }>(key);
    if (!cur || now >= cur.resetAt) {
      await this.ctx.storage.put(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSec: 0 };
    }
    if (cur.count >= limit) {
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) };
    }
    cur.count += 1;
    await this.ctx.storage.put(key, cur);
    return { allowed: true, retryAfterSec: 0 };
  }
}

// ---------------- Worker ----------------
function stub(env: Env) {
  const id = env.INTAKE_DO.idFromName("global");
  return env.INTAKE_DO.get(id) as unknown as IntakeStore;
}
function isPit(p: unknown): p is Pit {
  return typeof p === "string" && (PITS as readonly string[]).includes(p);
}
function adminOk(req: Request, env: Env): boolean {
  const key = env.ADMIN_KEY;
  if (!key) return false;
  return safeEqual(req.headers.get("x-admin-key") || "", key);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("Origin");
    if (req.method.toUpperCase() === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    return withCors(await route(req, env), origin);
  },
};

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;
  const method = req.method.toUpperCase();
  const db = stub(env);
  const feedCap = Math.max(1, parseInt(env.FEED_CAP || "50", 10) || 50);
  const maxUpload = (parseInt(env.MAX_UPLOAD_MB || "45", 10) || 45) * 1024 * 1024;
  const rlLimit = parseInt(env.SUBMIT_RATE_LIMIT || "12", 10) || 12;
  const rlWindow = (parseInt(env.SUBMIT_RATE_WINDOW_SEC || "60", 10) || 60) * 1000;

  try {
    // ---- World IdP device-flow proxy (booth lane) ----
    // The client_secret never leaves the worker; the browser only sees the
    // device grant +, after the human approves, the one-time id_token.
    if ((pathname === "/world/device" || pathname === "/world/token") && method === "POST") {
      const ip = req.headers.get("cf-connecting-ip") || "local";
      const rl = await db.rateLimit(`world:${ip}`, 30, 60_000);
      if (!rl.allowed) return err("rate_limited", 429, { retry_after_sec: rl.retryAfterSec });
      if (!env.WID_CLIENT_ID || !env.WID_CLIENT_SECRET) return err("not_configured", 503);
      const issuer = (env.WID_ISSUER || "https://sandbox.auth.world.org").replace(/\/$/, "");
      const upstream =
        pathname === "/world/device"
          ? { url: `${issuer}/api/v1/device_authorization`, form: { scope: "openid" } }
          : null;
      let form: Record<string, string>;
      let target: string;
      if (upstream) {
        form = upstream.form;
        target = upstream.url;
      } else {
        let body: { device_code?: unknown };
        try {
          body = await req.json();
        } catch {
          return err("bad_request", 400);
        }
        if (typeof body.device_code !== "string" || !body.device_code) return err("bad_request", 400);
        form = { grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: body.device_code };
        target = `${issuer}/api/v1/token`;
      }
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 10_000);
      try {
        const up = await fetch(target, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            authorization: "Basic " + btoa(`${env.WID_CLIENT_ID}:${env.WID_CLIENT_SECRET}`),
          },
          body: new URLSearchParams(form).toString(),
          signal: ctl.signal,
        });
        const text = await up.text();
        // RFC 8628 poll states are NOT errors: authorization_pending / slow_down arrive as 400s
        // but each one paints a red console line on camera. Map them to 200 — body unchanged.
        let status = up.status;
        if (pathname === "/world/token" && status === 400) {
          try {
            const j = JSON.parse(text);
            if (j && (j.error === "authorization_pending" || j.error === "slow_down")) status = 200;
          } catch { /* leave status as-is */ }
        }
        return new Response(text, {
          status,
          headers: { "content-type": up.headers.get("content-type") || "application/json" },
        });
      } catch {
        return err("world_upstream", 502, { hint: "World IdP unreachable or timed out" });
      } finally {
        clearTimeout(to);
      }
    }

    // ---- GET /aqua/state — REAL Sepolia reads, one JSON for the frontends ----
    if (pathname === "/aqua/state" && method === "GET") {
      try {
        const pc = rpcClient(env);
        const [g, a, pos, count] = await Promise.all([
          pc.readContract({ address: AQUA.registry, abi: AQUA_ABI, functionName: "rawBalances", args: [AQUA.blessingPool, AQUA.blessingPool, AQUA.strategyHash, AQUA.gift] }),
          pc.readContract({ address: AQUA.registry, abi: AQUA_ABI, functionName: "rawBalances", args: [AQUA.blessingPool, AQUA.blessingPool, AQUA.strategyHash, AQUA.aloha] }),
          pc.readContract({ address: AQUA.blessingPool, abi: POOL_ABI, functionName: "positions", args: [AQUA.strategyHash] }),
          pc.readContract({ address: AQUA.poolGuard, abi: GUARD_ABI, functionName: "slotCount" }),
        ]);
        return json({
          ok: true, chain: "sepolia", chainId: AQUA.chainId, addresses: AQUA,
          position: { agent: pos[0], token0: pos[1], token1: pos[2], active: pos[3] },
          virtualBalances: { gift: g[0].toString(), aloha: a[0].toString() },
          slots: Number(count), capBps: 100,
        });
      } catch {
        return err("chain_unreachable", 502, { hint: "Sepolia RPC read failed" });
      }
    }

    // ---- POST /aqua/claim — verify a REAL World id_token, claim the human's slot on-chain ----
    if (pathname === "/aqua/claim" && method === "POST") {
      const ip = req.headers.get("cf-connecting-ip") || "local";
      const rl = await db.rateLimit(`aqua:${ip}`, 10, 60_000);
      if (!rl.allowed) return err("rate_limited", 429, { retry_after_sec: rl.retryAfterSec });
      if (!env.ATTESTER_PK || !env.WID_CLIENT_ID) return err("not_configured", 503);
      let body: { id_token?: unknown };
      try {
        body = await req.json();
      } catch {
        return err("bad_request", 400);
      }
      if (typeof body.id_token !== "string" || body.id_token.split(".").length !== 3) {
        return err("bad_request", 400, { hint: "id_token (compact JWS) required" });
      }
      const issuer = (env.WID_ISSUER || "https://sandbox.auth.world.org").replace(/\/$/, "");
      let sub: string;
      try {
        const { payload } = await jose.jwtVerify(body.id_token, widKeyset(issuer), {
          issuer,
          audience: env.WID_CLIENT_ID,
        });
        if (!payload.sub) throw new Error("no sub");
        sub = payload.sub;
      } catch {
        // A wallet or bot without a real World proof stops HERE — that IS the pool guard.
        return err("personhood_required", 401, { hint: "id_token failed verification" });
      }
      const subHash = keccak256(toBytes(sub));
      try {
        const pc = rpcClient(env);
        const existing = await pc.readContract({ address: AQUA.poolGuard, abi: GUARD_ABI, functionName: "slotOf", args: [subHash] });
        if (existing[0]) {
          // Same human, same slot — idempotent by construction.
          return json({ ok: true, existing: true, subHash, index: Number(existing[1]), capBps: Number(existing[2]), claimedAt: Number(existing[3]) });
        }
        const account = privateKeyToAccount(env.ATTESTER_PK as `0x${string}`);
        const wc = createWalletClient({ account, chain: sepolia, transport: http(env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com", { timeout: 20_000 }) });
        const txHash = await wc.writeContract({ address: AQUA.poolGuard, abi: GUARD_ABI, functionName: "claimSlot", args: [subHash] });
        const receipt = await pc.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
        const slot = await pc.readContract({ address: AQUA.poolGuard, abi: GUARD_ABI, functionName: "slotOf", args: [subHash] });
        return json({
          ok: true, existing: false, subHash, txHash, block: Number(receipt.blockNumber),
          index: Number(slot[1]), capBps: Number(slot[2]), claimedAt: Number(slot[3]),
        });
      } catch {
        return err("chain_write_failed", 502, { hint: "Sepolia claim tx failed or timed out" });
      }
    }

    // ---- GET /healthz ----
    if (pathname === "/healthz" && method === "GET") {
      return json({
        ok: true,
        service: "pit-intake",
        pits: PITS,
        r2: !!env.BUCKET,
        max_upload_mb: parseInt(env.MAX_UPLOAD_MB || "45", 10) || 45,
        feed_cap: feedCap,
        admin_configured: !!env.ADMIN_KEY,
        world_proxy: !!(env.WID_CLIENT_ID && env.WID_CLIENT_SECRET),
        aqua_guard: !!(env.ATTESTER_PK && env.WID_CLIENT_ID),
      });
    }

    // ---- GET / -> human hello ----
    if (pathname === "/" && method === "GET") {
      return new Response("pit-intake ok — feed the pit 🕳️ (doors: POST /submit · POST /upload · GET /feed?pit=live|scribe|gard)", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // ---- GET /feed?pit=live|scribe|gard ----
    if (pathname === "/feed" && method === "GET") {
      const pit = url.searchParams.get("pit");
      if (!isPit(pit)) return err("bad_pit", 400, { hint: "pit must be one of: live, scribe, gard" });
      const entries = await db.list(pit);
      return json({ ok: true, pit, count: entries.length, entries });
    }

    // ---- POST /submit { pit, type:"drive"|"note", driveUrl|text, note?, from?, name? } ----
    if (pathname === "/submit" && method === "POST") {
      const ip = req.headers.get("cf-connecting-ip") || "local";
      const rl = await db.rateLimit(`submit:${ip}`, rlLimit, rlWindow);
      if (!rl.allowed) return err("rate_limited", 429, { retry_after_sec: rl.retryAfterSec });

      let body: { pit?: unknown; type?: unknown; driveUrl?: unknown; text?: unknown; note?: unknown; from?: unknown; name?: unknown };
      try {
        body = await req.json();
      } catch {
        return err("bad_request", 400, { hint: "JSON body required" });
      }
      if (!isPit(body.pit)) return err("bad_pit", 400, { hint: "pit must be one of: live, scribe, gard" });
      if (body.type === "note") {
        // the tribute door — words for the wall, consent-first (removal honored, admin key with sysadmin)
        const text = clean(body.text, 560);
        if (!text) return err("bad_request", 400, { hint: "text is required on the note door" });
        const entry: Entry = {
          id: randomId("ent"),
          pit: body.pit,
          type: "note",
          name: clean(body.name, 120),
          note: text,
          from: clean(body.from, 80),
          ts: Date.now(),
        };
        await db.add(body.pit, entry, feedCap);
        return json({ ok: true, entry });
      }
      if (body.type !== "drive") return err("bad_type", 400, { hint: 'type is "drive" (a tape link) or "note" (words for the wall) — clips go to /upload' });
      if (typeof body.driveUrl !== "string" || !body.driveUrl.trim()) {
        return err("bad_request", 400, { hint: "driveUrl is required" });
      }
      const fileId = normalizeDriveId(body.driveUrl);
      if (!fileId) {
        return err("not_a_drive_link", 400, {
          hint: "that doesn't look like a Google Drive link — paste the full share link (drive.google.com/file/d/…) or just the file ID",
        });
      }
      const entry: Entry = {
        id: randomId("ent"),
        pit: body.pit,
        type: "drive",
        fileId,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        viewUrl: `https://drive.google.com/file/d/${fileId}/view`,
        name: clean(body.name, 120),
        note: clean(body.note, 280),
        from: clean(body.from, 80),
        ts: Date.now(),
      };
      await db.add(body.pit, entry, feedCap);
      return json({ ok: true, entry });
    }

    // ---- POST /upload (multipart: pit, file, note?, from?) ----
    if (pathname === "/upload" && method === "POST") {
      const ip = req.headers.get("cf-connecting-ip") || "local";
      const rl = await db.rateLimit(`upload:${ip}`, Math.max(2, Math.floor(rlLimit / 2)), rlWindow);
      if (!rl.allowed) return err("rate_limited", 429, { retry_after_sec: rl.retryAfterSec });

      // hard cap before reading the body (64KB tolerance for multipart framing)
      const len = parseInt(req.headers.get("content-length") || "0", 10) || 0;
      if (len > maxUpload + 64 * 1024) {
        return err("too_large", 413, { hint: `clips are capped at ${Math.round(maxUpload / 1024 / 1024)} MB — big tapes go in via the Drive-link door`, max_bytes: maxUpload });
      }
      let form: FormData;
      try {
        form = await req.formData();
      } catch {
        return err("bad_request", 400, { hint: "multipart/form-data expected (fields: pit, file, note?, from?)" });
      }
      const pit = form.get("pit");
      if (!isPit(pit)) return err("bad_pit", 400, { hint: "pit must be one of: live, scribe, gard" });
      const file = form.get("file");
      if (!(file instanceof File)) return err("bad_request", 400, { hint: "file field missing" });
      const ctype = (file.type || "").toLowerCase();
      if (!ctype.startsWith("video/")) {
        return err("not_a_video", 400, { hint: "video clips only on this door (video/*) — got " + (file.type || "unknown") });
      }
      if (file.size > maxUpload) {
        return err("too_large", 413, { hint: `clips are capped at ${Math.round(maxUpload / 1024 / 1024)} MB — big tapes go in via the Drive-link door`, max_bytes: maxUpload });
      }
      const fname = sanitizeFilename(file.name || "clip");
      const key = `uploads/${Date.now()}-${randomId("clip").slice(5)}-${fname}`;
      await env.BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: ctype },
        customMetadata: { pit, name: fname },
      });
      const entry: Entry = {
        id: randomId("ent"),
        pit,
        type: "upload",
        url: `/file/${key}`,
        name: clean(form.get("name"), 120) ?? fname,
        note: clean(form.get("note"), 280),
        from: clean(form.get("from"), 80),
        ts: Date.now(),
      };
      await db.add(pit, entry, feedCap);
      return json({ ok: true, entry });
    }

    // ---- GET /file/<key> — stream an upload (byte-range capable for mobile <video>) ----
    const fileMatch = pathname.match(/^\/file\/(.+)$/);
    if (fileMatch && method === "GET") {
      const key = decodeURIComponent(fileMatch[1]);
      if (!key.startsWith("uploads/") || key.includes("..")) return err("not_found", 404);
      const range = req.headers.get("range");
      if (range) {
        const head = await env.BUCKET.head(key);
        if (!head) return err("not_found", 404);
        const size = head.size;
        const m = range.match(/bytes=(\d+)-(\d*)/);
        if (!m) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
        const start = parseInt(m[1], 10);
        const end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
        if (start >= size || start > end) {
          return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
        }
        const obj = await env.BUCKET.get(key, { range: { offset: start, length: end - start + 1 } });
        if (!obj) return err("not_found", 404);
        const h = new Headers();
        h.set("Content-Type", head.httpMetadata?.contentType || "application/octet-stream");
        h.set("Content-Length", String(end - start + 1));
        h.set("Content-Range", `bytes ${start}-${end}/${size}`);
        h.set("Accept-Ranges", "bytes");
        h.set("Cache-Control", "public, max-age=3600");
        return new Response(obj.body, { status: 206, headers: h });
      }
      const obj = await env.BUCKET.get(key);
      if (!obj) return err("not_found", 404);
      const h = new Headers();
      h.set("Content-Type", obj.httpMetadata?.contentType || "application/octet-stream");
      h.set("Content-Length", String(obj.size));
      h.set("Accept-Ranges", "bytes");
      h.set("Cache-Control", "public, max-age=3600");
      return new Response(obj.body, { status: 200, headers: h });
    }

    // ---- DELETE /entry { pit, id }  (X-Admin-Key) ----
    if (pathname === "/entry" && method === "DELETE") {
      if (!adminOk(req, env)) return err("forbidden", 403);
      let body: { pit?: unknown; id?: unknown };
      try {
        body = await req.json();
      } catch {
        return err("bad_request", 400);
      }
      if (!isPit(body.pit) || typeof body.id !== "string") return err("bad_request", 400, { hint: "{pit, id} required" });
      const gone = await db.remove(body.pit, body.id);
      if (!gone) return err("not_found", 404);
      // best-effort: uploaded clips leave R2 too
      if (gone.type === "upload" && gone.url?.startsWith("/file/")) {
        try {
          await env.BUCKET.delete(gone.url.slice("/file/".length));
        } catch {
          /* object may already be gone — feed row is what matters */
        }
      }
      return json({ ok: true, removed: gone.id });
    }

    return err("not_found", 404);
  } catch (e: unknown) {
    return err("internal_error", 500, { detail: (e as Error)?.message });
  }
}
