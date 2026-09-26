// intercepta-screen.mjs — Intercepta (Web3 Antivirus / W3A) payment-screening module.
// Spector 🕵️ — screen the DESTINATION before a blessing signs. Reviews, not certified audits.
//
// PRIZE ASK (Intercepta "🛡️ Safe Agent-to-Agent Payments with x402"):
//   screen destination/token/authorization BEFORE an agent signs, then let it decide what
//   happens next — pay / refuse / cap the amount / ask a human — and make that decision visible.
//
// THESIS BRIDGE (My Agent Ohana Trinity):
//   The fourth verdict "ask a human" IS our World consent ceremony ("Bless & Release").
//     • refuse    → REVOKE   (stand the agent down; blessing withdrawn)
//     • cap       → SPENDING CAP on the blessing (sign, but only up to a policy ceiling)
//     • ask-human → hand off to the World consent flow (human blesses / denies in person)
//     • pay       → proceed to sign (blessing already covers this destination)
//
// REAL API (verified from docs.web3antivirus.io 2026-09-25):
//   GET https://api.web3antivirus.io/api/public/v2/extension/account/{address}/toxic-score
//   Auth header: X-API-KEY: <sandbox key>   (403 {"status":403,...} without a valid key)
//   200 body (ToxicScoreShortResponseV2):
//     { toxicScore: number, traits: [ { risk: number, name: <enum>, txsCount: number, description: string } ] }
//   trait name enum: known_scammer, initiator_scam_transactions, sanction_address_communication,
//     suspicious_dex_pair_deployer, suspicious_deployer, attack_money_target, zero_address_risk,
//     sanction_address, fake_phishing_transfer, non_kyc_transfers, mixer_transfers,
//     fake_phishing_contract_communication, rug_pull, rug_pull_trader, blacklist
//
// No dependencies. Node 18+ (global fetch). Key is read from env INTERCEPTA_API_KEY — never hardcoded.

export const API_BASE = "https://api.web3antivirus.io/api/public/v2";

// Trait names that are, on their own, disqualifying (force REFUSE regardless of score).
export const CRITICAL_TRAITS = new Set([
  "sanction_address",
  "sanction_address_communication",
  "known_scammer",
  "blacklist",
  "rug_pull",
  "rug_pull_trader",
  "attack_money_target",
  "fake_phishing_transfer",
  "fake_phishing_contract_communication",
]);

// Trait names that warrant caution (CAP or ASK-HUMAN, not a hard refuse).
export const CAUTION_TRAITS = new Set([
  "mixer_transfers",
  "non_kyc_transfers",
  "suspicious_deployer",
  "suspicious_dex_pair_deployer",
  "initiator_scam_transactions",
  "zero_address_risk",
]);

// Default policy. toxicScore is a numeric risk indicator (higher = riskier). The public docs
// do not pin the scale, so thresholds are treated as an OPEN, OVERRIDABLE policy — the point of
// the prize is that WE decide what happens, not the vendor. Override via screenPolicy() args or env.
export const DEFAULT_POLICY = {
  refuseScore: 70, // >= this  → refuse (revoke)
  askScore: 40, // >= this  → ask a human (World ceremony)
  capScore: 15, // >= this  → cap the amount (spending cap)
  // A blessing that would move more than this ALWAYS asks a human, even if the address is clean.
  // "Large money moving = a human blesses it in person." null disables the amount gate.
  alwaysAskAboveAmount: null,
  // When capping: absolute ceiling to reduce the blessing to (same unit as the caller's amount).
  // If null, the cap is computed as capFraction × requested amount (a "sign a fraction" guardrail).
  capAmount: null,
  capFraction: 0.1,
};

// Resolve the capped amount for a "cap" verdict.
export function resolveCap(amount, p) {
  if (p.capAmount != null) return p.capAmount;
  if (amount != null && Number.isFinite(Number(amount))) {
    return Math.round(Number(amount) * (p.capFraction ?? 0.1) * 1e6) / 1e6;
  }
  return null;
}

/**
 * Make the ONE real screening call for a destination address.
 * Returns { ok, httpStatus, address, chain, toxicScore, traits, raw, error, source }.
 * source = "live" | "live-403" | "error". Never throws.
 */
export async function screenDestination({ address, chain = "ethereum", apiKey, timeoutMs = 15000, fetchImpl } = {}) {
  const out = { ok: false, httpStatus: null, address, chain, toxicScore: null, traits: [], raw: null, error: null, source: "error" };
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    out.error = "invalid or missing EVM address";
    return out;
  }
  const key = apiKey ?? process.env.INTERCEPTA_API_KEY ?? process.env.W3A_API_KEY ?? null;
  const url = `${API_BASE}/extension/account/${address}/toxic-score`;
  const doFetch = fetchImpl || globalThis.fetch;
  if (typeof doFetch !== "function") {
    out.error = "no fetch implementation available (need Node 18+)";
    return out;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = { Accept: "application/json" };
    if (key) headers["X-API-KEY"] = key;
    const res = await doFetch(url, { method: "GET", headers, signal: ctrl.signal });
    out.httpStatus = res.status;
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    out.raw = body;
    if (res.status === 200 && body && typeof body === "object") {
      out.ok = true;
      out.source = "live";
      out.toxicScore = typeof body.toxicScore === "number" ? body.toxicScore : null;
      out.traits = Array.isArray(body.traits) ? body.traits : [];
    } else {
      // Non-200: most commonly 403 (missing/invalid key) or 429 (quota). This proves the
      // real call path even without a key; the verdict layer treats it as fail-closed → ask-human.
      out.source = res.status === 403 ? "live-403" : "live-error";
      out.error = (body && (body.response || body.message)) || `HTTP ${res.status}`;
    }
  } catch (e) {
    out.source = "error";
    out.error = e && e.name === "AbortError" ? `timeout after ${timeoutMs}ms` : String(e && e.message ? e.message : e);
  } finally {
    clearTimeout(timer);
  }
  return out;
}

/**
 * Turn a screening result into ONE of four verdicts, plus the consent-flow bridge.
 * FAIL-CLOSED: if the screen did not return a clean 200 result, the verdict is ask-human
 * (hand to the human ceremony) — NEVER a silent "pay". Money never moves on a failed check.
 *
 * @param screen  result from screenDestination()
 * @param opts    { amount?, policy? }  amount = the blessing/payment size the agent is about to sign
 * @returns { verdict, action, consentBridge, reason, drivers, toxicScore, capTo, screen }
 */
export function decideVerdict(screen, { amount = null, policy = {} } = {}) {
  const p = { ...DEFAULT_POLICY, ...policy };
  const drivers = [];

  // 1. Fail-closed: no clean read → ask a human. (no key, 403, 429, timeout, network, invalid addr)
  if (!screen || !screen.ok) {
    const why = screen && screen.error ? screen.error : "screening unavailable";
    return verdictObject("ask-human", {
      reason: `Screen did not return a clean result (${why}). Fail-closed: hand to the human ceremony rather than sign blindly.`,
      drivers: [`screen.source=${screen ? screen.source : "none"}`, why],
      toxicScore: screen ? screen.toxicScore : null,
      amount,
      policy: p,
      screen,
    });
  }

  const traits = Array.isArray(screen.traits) ? screen.traits : [];
  const traitNames = traits.map((t) => t && t.name).filter(Boolean);
  const score = typeof screen.toxicScore === "number" ? screen.toxicScore : 0;

  const critical = traitNames.filter((n) => CRITICAL_TRAITS.has(n));
  const caution = traitNames.filter((n) => CAUTION_TRAITS.has(n));

  // 2. Critical trait or high score → REFUSE (revoke). Sanctioned / known-scammer / rug destinations.
  if (critical.length > 0) {
    return verdictObject("refuse", {
      reason: `Destination carries disqualifying trait(s): ${critical.join(", ")}. Refuse to sign; stand the agent down (revoke).`,
      drivers: [`traits=${critical.join(",")}`, `toxicScore=${score}`],
      toxicScore: score,
      amount,
      policy: p,
      screen,
    });
  }
  if (score >= p.refuseScore) {
    return verdictObject("refuse", {
      reason: `toxicScore ${score} ≥ refuse threshold ${p.refuseScore}. Refuse to sign; stand the agent down (revoke).`,
      drivers: [`toxicScore=${score}`, `threshold=${p.refuseScore}`],
      toxicScore: score,
      amount,
      policy: p,
      screen,
    });
  }

  // 3. Amount gate or borderline score → ASK A HUMAN (World "Bless & Release" ceremony).
  if (p.alwaysAskAboveAmount != null && amount != null && Number(amount) > Number(p.alwaysAskAboveAmount)) {
    return verdictObject("ask-human", {
      reason: `Amount ${amount} exceeds the always-ask ceiling ${p.alwaysAskAboveAmount}. A human blesses this in person before money moves.`,
      drivers: [`amount=${amount}`, `alwaysAskAbove=${p.alwaysAskAboveAmount}`, `toxicScore=${score}`],
      toxicScore: score,
      amount,
      policy: p,
      screen,
    });
  }
  if (score >= p.askScore) {
    return verdictObject("ask-human", {
      reason: `toxicScore ${score} is borderline (≥ ask threshold ${p.askScore}, < refuse ${p.refuseScore}). Hand to the human ceremony.`,
      drivers: [`toxicScore=${score}`, `askThreshold=${p.askScore}`, caution.length ? `caution=${caution.join(",")}` : "no-critical-trait"],
      toxicScore: score,
      amount,
      policy: p,
      screen,
    });
  }

  // 4. Mild risk → CAP the amount (blessing spending cap), and sign the capped amount.
  if (score >= p.capScore || caution.length > 0) {
    const capTo = resolveCap(amount, p);
    return verdictObject("cap", {
      reason:
        caution.length > 0
          ? `Caution trait(s) present: ${caution.join(", ")}. Sign, but cap the blessing to ${capTo ?? "the policy ceiling"}.`
          : `toxicScore ${score} ≥ cap threshold ${p.capScore}. Sign, but cap the blessing to ${capTo ?? "the policy ceiling"}.`,
      drivers: [`toxicScore=${score}`, `capThreshold=${p.capScore}`, caution.length ? `caution=${caution.join(",")}` : "score-only"],
      toxicScore: score,
      amount,
      capTo,
      policy: p,
      screen,
    });
  }

  // 5. Clean → PAY (sign; the blessing already covers this destination).
  return verdictObject("pay", {
    reason: `toxicScore ${score} < cap threshold ${p.capScore} and no risky traits. Destination is clean — proceed to sign.`,
    drivers: [`toxicScore=${score}`, "no-critical-trait", "no-caution-trait"],
    toxicScore: score,
    amount,
    policy: p,
    screen,
  });
}

// The consent-flow bridge for each verdict — the honest map from Intercepta verdict → our ceremony.
export const CONSENT_BRIDGE = {
  pay: {
    action: "SIGN",
    consent: null,
    note: "Blessing already covers this destination. Proceed to sign the payment.",
  },
  cap: {
    action: "SIGN_CAPPED",
    consent: "blessing spending cap",
    note: "Sign, but only up to the blessing's spending cap. Excess requires a fresh human blessing.",
  },
  refuse: {
    action: "ABORT",
    consent: "revoke",
    note: "Do not sign. Withdraw the blessing (revoke) and stand the agent down.",
  },
  "ask-human": {
    action: "HALT_FOR_CEREMONY",
    consent: "World Bless & Release human ceremony",
    // Where the agent hands control back to the human: our consent-server begins a World verify.
    handoff: "POST /v1/consent/begin  (World ID verify → human blesses or denies in person)",
    note: "Agent halts and asks a human. This IS the Trinity's consent ceremony — the fourth verdict is our whole thesis.",
  },
};

function verdictObject(verdict, { reason, drivers, toxicScore, amount, capTo, policy, screen }) {
  const bridge = CONSENT_BRIDGE[verdict];
  return {
    verdict, // pay | cap | refuse | ask-human
    action: bridge.action, // SIGN | SIGN_CAPPED | ABORT | HALT_FOR_CEREMONY
    consentBridge: bridge, // the map into our World consent flow
    reason,
    drivers,
    toxicScore: toxicScore ?? null,
    amount: amount ?? null,
    capTo: capTo ?? null,
    address: screen ? screen.address : null,
    chain: screen ? screen.chain : null,
    screenSource: screen ? screen.source : null,
  };
}

// One-shot convenience: screen + decide.
export async function screenAndDecide(args = {}) {
  const screen = await screenDestination(args);
  const decision = decideVerdict(screen, { amount: args.amount ?? null, policy: args.policy ?? {} });
  return { screen, decision };
}
