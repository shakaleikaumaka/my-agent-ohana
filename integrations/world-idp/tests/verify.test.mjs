// verify.test.mjs — unit tests for the World IDKit verify gate. Zero deps: `node --test`.
// Proves: valid proof -> ALLOW; denied/cancelled/expired -> dignified deny; insufficient credential
// -> ineligible; signal mismatch/replay/malformed -> fail-closed; and the REAL-path fetch contract.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { verifyGate, OUTCOME, resolveGate, classifyError } from "../src/idkit-gate/verify.mjs";
import { mockProof, mockError } from "../src/idkit-gate/mock.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, "../agents.config.json"), "utf8"));
assert.equal(config.mockProof, true, "config ships in mock mode for offline dev");

const AGENTS = ["pit", "shaka", "trace", "terri", "spector", "crops"];

test("config resolves all 6 agents with a minimum-sufficient credential", () => {
  for (const id of AGENTS) {
    const g = resolveGate(config, id);
    assert.ok(g.action && g.credentialKey && g.scope?.length && g.duration, `${id} fully specified`);
    assert.ok(g.rationale && g.rationale.length > 20, `${id} states WHY the credential is proportionate`);
  }
});

test("ONE gate x6: every agent card gets a valid ALLOW with a correct-credential proof", async () => {
  for (const id of AGENTS) {
    const g = resolveGate(config, id);
    const signal = `${g.ens}#${Date.now()}`;
    const payload = mockProof({ credential: g.credentialKey, action: g.action, signal });
    const r = await verifyGate({ config, agentId: id, signal, payload });
    assert.equal(r.ok, true, `${id} should ALLOW`);
    assert.equal(r.outcome, OUTCOME.ALLOW);
    assert.equal(r.receipt.agentId, id);
    assert.equal(r.receipt.outcome, "allow");
    assert.equal(r.receipt.usedCredential, g.credentialKey);
    assert.ok(r.receipt.nullifier, "receipt carries a nullifier");
    assert.equal(r.receipt.mock, true, "mock receipt honestly labelled");
  }
});

test("DENIED path is dignified: nothing authorized, receipt still issued", async () => {
  const r = await verifyGate({ config, agentId: "pit", signal: "s", payload: mockError("access_denied") });
  assert.equal(r.ok, false);
  assert.equal(r.outcome, OUTCOME.DENIED);
  assert.match(r.message, /not authorized|chose not to bless/i);
  assert.equal(r.receipt.outcome, "denied", "a receipt is produced even on denial (DEBRIEF element)");
  assert.equal(r.receipt.agentId, "pit");
});

test("CANCELLED and EXPIRED map to their own dignified outcomes", async () => {
  const c = await verifyGate({ config, agentId: "terri", payload: mockError("cancelled") });
  assert.equal(c.outcome, OUTCOME.CANCELLED);
  const e = await verifyGate({ config, agentId: "terri", payload: mockError("expired_token") });
  assert.equal(e.outcome, OUTCOME.EXPIRED);
});

test("INELIGIBLE: a device proof cannot satisfy an Orb-gated action (pit)", async () => {
  const g = resolveGate(config, "pit"); // requires orb
  const payload = mockProof({ credential: "device", action: g.action });
  const r = await verifyGate({ config, agentId: "pit", payload });
  assert.equal(r.ok, false);
  assert.equal(r.outcome, OUTCOME.INELIGIBLE);
  assert.match(r.message, /Orb/);
});

test("consent MINIMIZATION works upward: an Orb proof satisfies a device-gated action (spector)", async () => {
  const g = resolveGate(config, "spector"); // requires device
  const payload = mockProof({ credential: "orb", action: g.action });
  const r = await verifyGate({ config, agentId: "spector", payload });
  assert.equal(r.ok, true, "higher assurance meets a lower requirement");
});

test("signal mismatch fails closed (anti-replay/anti-frontrun)", async () => {
  const g = resolveGate(config, "trace");
  const payload = mockProof({ credential: g.credentialKey, action: g.action, signal: "ISSUED-A" });
  const r = await verifyGate({ config, agentId: "trace", signal: "DIFFERENT-B", payload });
  assert.equal(r.ok, false);
  assert.equal(r.receipt.errorCode, "signal_mismatch");
});

test("malformed payload fails closed (never treat junk as authorization)", async () => {
  const r = await verifyGate({ config, agentId: "pit", payload: { responses: [] } });
  assert.equal(r.ok, false);
  assert.equal(r.outcome, OUTCOME.ERROR);
});

test("replay guard: reused nullifier is blocked", async () => {
  const g = resolveGate(config, "crops");
  const used = new Set();
  const seen = async (n) => used.has(n);
  const p1 = mockProof({ credential: g.credentialKey, action: g.action, nullifier: "0xdead" });
  const r1 = await verifyGate({ config, agentId: "crops", payload: p1, seen });
  assert.equal(r1.ok, true);
  used.add("0xdead");
  const p2 = mockProof({ credential: g.credentialKey, action: g.action, nullifier: "0xdead" });
  const r2 = await verifyGate({ config, agentId: "crops", payload: p2, seen });
  assert.equal(r2.ok, false);
  assert.equal(r2.receipt.errorCode, "nullifier_reused");
});

test("REAL path: forwards complete result to /verify/{rp_id} and honors success/deny (mocked fetch)", async () => {
  const realCfg = { ...config, mockProof: false, rpId: "rp_test123", environment: "staging" };
  const g = resolveGate(realCfg, "terri");
  // success case
  let seenUrl = null, seenBody = null;
  const okFetch = async (url, opts) => { seenUrl = url; seenBody = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ success: true, environment: "staging", nullifier: "0xabc", results: [{ identifier: "device", success: true, nullifier: "0xabc" }], action: g.action, session_id: "session_x" }) }; };
  const ok = await verifyGate({ config: realCfg, agentId: "terri", payload: mockProof({ credential: "device", action: g.action }), fetchImpl: okFetch });
  assert.equal(ok.ok, true);
  assert.equal(seenUrl, "https://developer.world.org/api/v4/verify/rp_test123", "posts to rp_id endpoint");
  assert.equal(seenBody.action, g.action, "server sets the action, not the client");
  assert.ok(Array.isArray(seenBody.responses), "forwards the complete responses array");
  // deny case: portal returns success:false
  const denyFetch = async () => ({ ok: true, json: async () => ({ success: false, code: "access_denied" }) });
  const deny = await verifyGate({ config: realCfg, agentId: "terri", payload: mockProof({ credential: "device", action: g.action }), fetchImpl: denyFetch });
  assert.equal(deny.ok, false);
  assert.equal(deny.outcome, OUTCOME.DENIED);
  // network failure -> fail closed
  const boom = async () => { throw new Error("network down"); };
  const err = await verifyGate({ config: realCfg, agentId: "terri", payload: mockProof({ credential: "device", action: g.action }), fetchImpl: boom });
  assert.equal(err.ok, false);
  assert.equal(err.receipt.errorCode, "verify_unreachable");
});

test("classifyError maps OIDC/device-flow + widget codes to our vocabulary", () => {
  assert.equal(classifyError("access_denied"), OUTCOME.DENIED);
  assert.equal(classifyError({ error: "expired_token" }), OUTCOME.EXPIRED);
  assert.equal(classifyError("user_cancelled"), OUTCOME.CANCELLED);
  assert.equal(classifyError("something_weird"), OUTCOME.ERROR);
});
