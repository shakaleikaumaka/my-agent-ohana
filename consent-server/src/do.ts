// SPDX-License-Identifier: MIT
// Trinity Consent Server — the single Durable Object.
//
// The DO is the ONLY Cloudflare primitive with atomic check-and-set, which the jti
// replay guard requires (KV is eventually-consistent ~60s and would weaken it).
// It owns: pending sessions + nonces, the burned-jti set, the consent records, and the
// append-only event ledger. The app-layer ledger here is the REVOCATION SOURCE OF TRUTH
// for the demo — the World pilot exposes no introspection endpoint, so IdP-side revoke
// lag is unobservable by us. A consent-check MUST 401 immediately after revoke.

import { DurableObject } from "cloudflare:workers";
import type { ConsentEvent, ConsentRecord, SessionRecord } from "./types";
import { randomId, randomToken } from "./util";

const SESSION_TTL_MS = 15 * 60 * 1000; // pending sessions live 15 min

export class ConsentStore extends DurableObject {
  // ---- rate limit (per-IP fixed window, atomic) ----
  // Returns {allowed, retryAfterSec}. Bounds unauthenticated DO-state spray on begin.
  // A fixed window is cheap and atomic inside the DO's single-threaded execution.
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

  // ---- sessions ----
  async createSession(agentSubname: string): Promise<SessionRecord> {
    const now = Date.now();
    const rec: SessionRecord = {
      session_id: randomId("sess"),
      nonce: randomToken(16),
      agent_subname: agentSubname,
      status: "pending",
      created_at: now,
      expires_at: now + SESSION_TTL_MS,
    };
    await this.ctx.storage.put(`sess:${rec.session_id}`, rec);
    return rec;
  }

  async getSession(id: string): Promise<SessionRecord | undefined> {
    return this.ctx.storage.get<SessionRecord>(`sess:${id}`);
  }

  async setSessionStatus(id: string, status: SessionRecord["status"]): Promise<boolean> {
    const rec = await this.ctx.storage.get<SessionRecord>(`sess:${id}`);
    if (!rec) return false;
    rec.status = status;
    await this.ctx.storage.put(`sess:${id}`, rec);
    return true;
  }

  // ---- jti atomic burn (replay guard) ----
  // Returns true if this jti was newly burned; false if it was already burned (replay).
  async burnJti(jti: string): Promise<boolean> {
    return this.ctx.storage.transaction(async (txn) => {
      const existing = await txn.get(`jti:${jti}`);
      if (existing) return false;
      await txn.put(`jti:${jti}`, Date.now());
      return true;
    });
  }

  // ---- consent records ----
  async putConsent(rec: ConsentRecord): Promise<void> {
    await this.ctx.storage.put(`consent:${rec.consent_id}`, rec);
  }

  async getConsent(id: string): Promise<ConsentRecord | undefined> {
    return this.ctx.storage.get<ConsentRecord>(`consent:${id}`);
  }

  // Revoke: flip status -> revoked. Idempotent-safe: revoking an already-revoked consent
  // returns already_revoked (still 200-shaped to the route, which decides the code).
  async revokeConsent(id: string): Promise<{ status: "revoked" | "already_revoked" | "not_found"; revoked_at?: number }> {
    const rec = await this.ctx.storage.get<ConsentRecord>(`consent:${id}`);
    if (!rec) return { status: "not_found" };
    if (rec.status === "revoked") return { status: "already_revoked", revoked_at: rec.revoked_at };
    const now = Date.now();
    rec.status = "revoked";
    rec.revoked_at = now;
    rec.events.push({ ts: now, kind: "revoke", consent_id: id, sub_trunc: rec.events[0]?.sub_trunc });
    await this.ctx.storage.put(`consent:${id}`, rec);
    await this.appendEvent({ ts: now, kind: "revoke", consent_id: id });
    return { status: "revoked", revoked_at: now };
  }

  // Lazily flip active->expired if exp has passed; returns the (possibly updated) record.
  async touchExpiry(id: string, nowSec: number): Promise<ConsentRecord | undefined> {
    const rec = await this.ctx.storage.get<ConsentRecord>(`consent:${id}`);
    if (!rec) return undefined;
    if (rec.status === "active" && rec.exp <= nowSec) {
      const now = Date.now();
      rec.status = "expired";
      rec.events.push({ ts: now, kind: "expire", consent_id: id });
      await this.ctx.storage.put(`consent:${id}`, rec);
      await this.appendEvent({ ts: now, kind: "expire", consent_id: id });
    }
    return rec;
  }

  // ---- append-only event ledger ----
  async appendEvent(evt: ConsentEvent): Promise<void> {
    const events = (await this.ctx.storage.get<ConsentEvent[]>("events")) ?? [];
    events.push(evt);
    await this.ctx.storage.put("events", events);
  }

  async getLedger(): Promise<ConsentEvent[]> {
    return (await this.ctx.storage.get<ConsentEvent[]>("events")) ?? [];
  }

  // Test/demo helper — wipe everything (never exposed on an unauthenticated route).
  async reset(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
