// verify.mjs — World IDKit VERIFY GATE (server-side). ONE integration, parameterized x6 via agents.config.json.
//
// SECURITY LAW (World "ID for Agents" + "IDKit" prize, verbatim): "Validate identity results in a
// secure backend; do not expose client secrets or treat an unvalidated client response as authorization."
// => This module runs ONLY on the server. The client widget never decides pass/fail; this does.
//
// MOCK->REAL SWAP IS ONE CONFIG CHANGE:
//   mock (offline, testable, NOT prize-eligible):  { mockProof: true }
//   real (Sunday judged run):                      { mockProof: false, rpId: "rp_...", environment: "production" }
// World's prize banner today: "We are mocking proofs now, so you don't need sandbox app anymore" —
// so mockProof:true is the correct offline dev posture; the REAL leg is wired and one flag away.
//
// The DENIED PATH is a first-class return value, not an exception. Every outcome (allow OR deny) yields
// a consent-receipt-shaped object so the DEBRIEF/receipt beat renders with dignity in all cases.

import crypto from "node:crypto";

/** Stable outcome vocabulary shared with the consent-server + UI. */
export const OUTCOME = Object.freeze({
  ALLOW: "allow",
  DENIED: "denied",       // human hit "Deny" / rejected
  CANCELLED: "cancelled", // human closed the widget / walked away
  EXPIRED: "expired",     // proof/session/user_code lapsed
  INELIGIBLE: "ineligible", // credential present but insufficient for this action
  ERROR: "error",         // malformed / verify-service failure -> fail CLOSED
});

/** sha256 hex helper (also used to derive signal_hash for mock proofs). */
export function sha256hex(input) {
  return "0x" + crypto.createHash("sha256").update(String(input)).digest("hex");
}

/** Resolve the {agent, action, credential, scope, duration} contract for a mount. */
export function resolveGate(config, agentId, actionOverride) {
  const agent = config?.agents?.[agentId];
  if (!agent) throw new Error(`unknown agentId: ${agentId}`);
  const credKey = agent.credential;
  const cred = config.credentialCatalog?.[credKey];
  if (!cred) throw new Error(`agent ${agentId} references unknown credential: ${credKey}`);
  return {
    agentId,
    displayName: agent.displayName,
    ens: agent.ens,
    action: actionOverride || agent.action,
    credentialKey: credKey,
    credential: cred,             // { identifier, assurance, label, ... }
    scope: agent.scope,
    duration: agent.duration,
    rationale: agent.rationale,
  };
}

/** Build a consent-receipt-shaped record for ANY outcome (allow or dignified deny). */
function receipt(gate, signal, outcome, extra = {}) {
  return {
    v: 1,
    agentId: gate.agentId,
    agent: gate.displayName,
    ens: gate.ens,
    action: gate.action,
    signal: signal ?? null,
    requiredCredential: gate.credentialKey,           // the MINIMUM sufficient credential we asked for
    requiredCredentialLabel: gate.credential.label,
    scope: gate.scope,
    duration: gate.duration,
    outcome,
    issuedAt: new Date().toISOString(),
    ...extra,
  };
}

/**
 * Map a raw IDKit / widget error into our outcome vocabulary (dignified, never a stack trace).
 * Covers OIDC/device-flow (RFC 6749 / RFC 8628) and IDKit widget error codes.
 */
export function classifyError(errCodeOrObj) {
  const code = (typeof errCodeOrObj === "string" ? errCodeOrObj : errCodeOrObj?.error || errCodeOrObj?.code || "").toLowerCase();
  if (["access_denied", "denied", "rejected", "user_rejected", "verification_rejected"].includes(code)) return OUTCOME.DENIED;
  if (["cancelled", "canceled", "user_cancelled", "closed", "dismissed"].includes(code)) return OUTCOME.CANCELLED;
  if (["expired_token", "expired", "expired_request", "timeout", "code_expired"].includes(code)) return OUTCOME.EXPIRED;
  if (["credential_unavailable", "insufficient_credential", "unsupported_credential"].includes(code)) return OUTCOME.INELIGIBLE;
  return OUTCOME.ERROR; // fail closed by default
}

/** Human-friendly, dignity-preserving message per outcome (feeds the denied-path UI copy). */
export function dignifiedMessage(outcome, gate) {
  switch (outcome) {
    case OUTCOME.DENIED:     return `You chose not to bless ${gate.displayName}. Nothing was authorized, and nothing will run. The shelf stays open.`;
    case OUTCOME.CANCELLED:  return `Blessing cancelled. ${gate.displayName} was not authorized — you can start again whenever you like.`;
    case OUTCOME.EXPIRED:    return `That request expired before it was approved. ${gate.displayName} stays unblessed; request a fresh one to continue.`;
    case OUTCOME.INELIGIBLE: return `This action needs ${gate.credential.label}. That credential wasn't available, so ${gate.displayName} was not authorized.`;
    case OUTCOME.ERROR:      return `We couldn't verify that safely, so we did nothing. ${gate.displayName} stays unblessed (fail-closed).`;
    default:                 return `${gate.displayName} was not authorized.`;
  }
}

/** Assurance check: returned credential must MEET-OR-EXCEED the minimum sufficient one. */
function meetsAssurance(config, requiredKey, providedIdentifier) {
  const req = config.credentialCatalog[requiredKey]?.assurance ?? 999;
  const providedKey = Object.keys(config.credentialCatalog)
    .find((k) => config.credentialCatalog[k].identifier === providedIdentifier);
  const prov = config.credentialCatalog[providedKey]?.assurance ?? -1;
  return { ok: prov >= req, providedKey, providedAssurance: prov, requiredAssurance: req };
}

/**
 * verifyGate — the one server-side entrypoint every one of the 6 agent cards calls.
 *
 * @param {object} args
 * @param {object} args.config   parsed agents.config.json
 * @param {string} args.agentId  one of the 6 agents
 * @param {string} [args.action] override (defaults to the agent's action)
 * @param {string} [args.signal] IDKit signal (binds proof to this request; anti-replay/anti-frontrun)
 * @param {object} [args.payload] IDKit widget result: { protocol_version, nonce, responses:[...] } OR an error {error}
 * @param {function} [args.seen]  optional async(nullifier)->bool replay guard (returns true if already used)
 * @param {function} [args.fetchImpl] injectable fetch (tests)
 * @returns {Promise<{ok:boolean, outcome:string, message:string, receipt:object}>}
 */
export async function verifyGate({ config, agentId, action, signal, payload, seen, fetchImpl }) {
  const gate = resolveGate(config, agentId, action);

  // 0) Widget already reported a non-success (deny/cancel/expire) -> dignified path, no verify call.
  if (payload && payload.error) {
    const outcome = classifyError(payload);
    return { ok: false, outcome, message: dignifiedMessage(outcome, gate), receipt: receipt(gate, signal, outcome, { errorCode: payload.error }) };
  }

  // 1) Structural validation (fail closed on malformed input — never treat junk as authorization).
  if (!payload || !Array.isArray(payload.responses) || payload.responses.length < 1) {
    return { ok: false, outcome: OUTCOME.ERROR, message: dignifiedMessage(OUTCOME.ERROR, gate), receipt: receipt(gate, signal, OUTCOME.ERROR, { errorCode: "malformed_payload" }) };
  }

  // 2) Signal binding: the proof's signal_hash MUST equal sha256(signal) we issued. Anti-replay.
  if (signal != null) {
    const expected = sha256hex(signal);
    const anyMatch = payload.responses.some((r) => (r.signal_hash || "").toLowerCase() === expected.toLowerCase());
    if (!anyMatch) {
      return { ok: false, outcome: OUTCOME.ERROR, message: "Proof was not bound to this request (signal mismatch).", receipt: receipt(gate, signal, OUTCOME.ERROR, { errorCode: "signal_mismatch" }) };
    }
  }

  let verified; // { success, results, nullifier, action, environment, session_id }

  if (config.mockProof) {
    // ---- MOCK PATH (offline, testable, NOT prize-eligible; labelled everywhere) ----
    // A mock proof is "valid" iff it carries the required credential identifier + a nullifier + matching action.
    const resp = payload.responses[0];
    const identifier = resp.identifier;
    const asr = meetsAssurance(config, gate.credentialKey, identifier);
    if (!asr.ok) {
      return { ok: false, outcome: OUTCOME.INELIGIBLE, message: dignifiedMessage(OUTCOME.INELIGIBLE, gate),
        receipt: receipt(gate, signal, OUTCOME.INELIGIBLE, { providedCredential: asr.providedKey, requiredCredential: gate.credentialKey, mock: true }) };
    }
    if (payload.action && payload.action !== gate.action) {
      return { ok: false, outcome: OUTCOME.ERROR, message: "Proof action did not match the requested action.",
        receipt: receipt(gate, signal, OUTCOME.ERROR, { errorCode: "action_mismatch", mock: true }) };
    }
    verified = {
      success: true,
      environment: "mock",
      nullifier: resp.nullifier,
      results: [{ identifier, success: true, nullifier: resp.nullifier }],
      action: gate.action,
      session_id: "mock_session",
    };
  } else {
    // ---- REAL PATH: forward the COMPLETE IDKit result to World's Developer Portal, server-side. ----
    const f = fetchImpl || globalThis.fetch;
    const idOr = config.rpId || config.appId;
    if (!idOr) return { ok: false, outcome: OUTCOME.ERROR, message: "Server misconfigured: no rpId/appId set for live verify.", receipt: receipt(gate, signal, OUTCOME.ERROR, { errorCode: "missing_rp_id" }) };
    const body = {
      protocol_version: payload.protocol_version || config.protocolVersion || "3.0",
      nonce: payload.nonce,
      action: gate.action,
      responses: payload.responses,
      environment: config.environment || "production",
    };
    let res, json;
    try {
      res = await f(`${config.verifyApi}/${idOr}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      json = await res.json();
    } catch (e) {
      // network/parse failure -> fail closed
      return { ok: false, outcome: OUTCOME.ERROR, message: dignifiedMessage(OUTCOME.ERROR, gate), receipt: receipt(gate, signal, OUTCOME.ERROR, { errorCode: "verify_unreachable" }) };
    }
    if (!res.ok || json?.success !== true) {
      const outcome = classifyError(json || {});
      return { ok: false, outcome, message: dignifiedMessage(outcome, gate), receipt: receipt(gate, signal, outcome, { errorCode: json?.code || json?.error || `http_${res.status}`, detail: json?.detail }) };
    }
    // Prize law: assert environment matches (reject staging/sandbox proofs in a production integration).
    if (config.environment === "production" && json.environment && json.environment !== "production") {
      return { ok: false, outcome: OUTCOME.ERROR, message: "Rejected: proof environment did not match production.", receipt: receipt(gate, signal, OUTCOME.ERROR, { errorCode: "environment_mismatch", environment: json.environment }) };
    }
    // Assurance check against the returned identifier.
    const provIdent = json.results?.[0]?.identifier || payload.responses[0].identifier;
    const asr = meetsAssurance(config, gate.credentialKey, provIdent);
    if (!asr.ok) {
      return { ok: false, outcome: OUTCOME.INELIGIBLE, message: dignifiedMessage(OUTCOME.INELIGIBLE, gate), receipt: receipt(gate, signal, OUTCOME.INELIGIBLE, { providedCredential: asr.providedKey, requiredCredential: gate.credentialKey }) };
    }
    verified = json;
  }

  // 3) Uniqueness / replay guard: same human + same action must not pass twice (nullifier reuse).
  const nullifier = verified.nullifier || verified.results?.[0]?.nullifier;
  if (typeof seen === "function" && nullifier) {
    const already = await seen(nullifier);
    if (already) {
      return { ok: false, outcome: OUTCOME.ERROR, message: `This blessing was already used (replay blocked).`, receipt: receipt(gate, signal, OUTCOME.ERROR, { errorCode: "nullifier_reused", nullifier }) };
    }
  }

  // 4) ALLOW — issue the blessing receipt (this is the object the consent-server persists + the UI shows).
  return {
    ok: true,
    outcome: OUTCOME.ALLOW,
    message: `${gate.displayName} is blessed for ${gate.duration}. Scope: ${gate.scope.join(", ")}.`,
    receipt: receipt(gate, signal, OUTCOME.ALLOW, {
      nullifier,
      environment: verified.environment,
      sessionId: verified.session_id || null,
      usedCredential: gate.credentialKey,
      mock: !!config.mockProof,
    }),
  };
}
