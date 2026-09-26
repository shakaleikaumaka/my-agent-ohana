// IDKitGate.jsx — the ONE React component all 6 agent cards mount. Parameterized via {agentId, action, signal}.
// It is a THIN client: it collects a proof with the World IDKit widget, then hands the raw result to the
// server (`/api/verify-gate`) which runs verify.mjs. The client NEVER decides pass/fail (prize law).
//
// Install: pnpm add @worldcoin/idkit
// The credential requested per agent comes from agents.config.json (minimum-sufficient-credential thesis).
//
// Mock/real is a SERVER concern (agents.config.json `mockProof`). In mock mode you can also bypass the
// widget entirely with the <MockGate> helper below for offline UI demos (badged REHEARSAL DATA).

import React, { useState } from "react";
import { IDKitWidget } from "@worldcoin/idkit"; // v4 — verify unified into IDKit (MiniKit.verify is DEPRECATED)
import agentsConfig from "../../agents.config.json";

// map our minimum-sufficient credential keys -> IDKit v4 verification levels (strings)
const LEVEL = { device: "device", orb: "orb", document: "document", secure_document: "secure_document", selfie: "device" };

export function IDKitGate({ agentId, action, signal, onAllow, onDeny, appId }) {
  const agent = agentsConfig.agents[agentId];
  if (!agent) throw new Error(`IDKitGate: unknown agentId ${agentId}`);
  const act = action || agent.action;
  const credKey = agent.credential;
  const [state, setState] = useState({ outcome: null, message: "" });

  // Server-side verification: hand the whole IDKit result to OUR backend, which calls verify.mjs.
  const handleVerify = async (proof) => {
    const res = await fetch("/api/verify-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, action: act, signal, payload: proof }),
    });
    const result = await res.json();
    if (!result.ok) {
      // IDKitWidget treats a throw as a failed verification -> keeps the modal honest.
      setState({ outcome: result.outcome, message: result.message, receipt: result.receipt });
      throw new Error(result.message);
    }
    setState({ outcome: "allow", message: result.message, receipt: result.receipt });
  };

  return (
    <IDKitWidget
      app_id={appId || agentsConfig.appId}
      action={act}
      signal={signal}
      verification_level={LEVEL[credKey] || "device"}
      handleVerify={handleVerify}
      onSuccess={(r) => onAllow?.(state.receipt)}
      onError={(e) => { const outcome = e?.code || "cancelled"; onDeny?.({ outcome, agentId, action: act }); }}
    >
      {({ open }) => (
        <button className="gate-btn" onClick={open}>
          Bless {agent.displayName} · needs {agentsConfig.credentialCatalog[credKey].label}
        </button>
      )}
    </IDKitWidget>
  );
}

// MockGate — offline UI helper (no widget, no network). Badge it REHEARSAL DATA in the UI.
export function MockGate({ agentId, action, signal, deny = false, onResult }) {
  const run = async () => {
    const { verifyGate } = await import("./verify.mjs");
    const { mockProof, mockError } = await import("./mock.mjs");
    const agent = agentsConfig.agents[agentId];
    const payload = deny ? mockError("access_denied") : mockProof({ credential: agent.credential, action: action || agent.action, signal });
    const r = await verifyGate({ config: agentsConfig, agentId, action, signal, payload });
    onResult?.(r);
  };
  return <button className="gate-btn mock" onClick={run}>[MOCK] {deny ? "Deny" : "Bless"} {agentId}</button>;
}
