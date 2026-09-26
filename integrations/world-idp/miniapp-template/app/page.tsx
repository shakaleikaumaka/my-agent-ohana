"use client";
// ONE mini app, replicable x6: which agent this instance represents is set by NEXT_PUBLIC_WORLD_AGENT_ID.
//
// VERIFY = IDKit v4 (unified). Per World docs (2026-09-25): "World ID has been unified into IDKit, so the
// same integration works in both mini apps and desktop. Replace MiniKit.verify(...) with IDKit."
// Inside World App the widget auto-detects the native transport (no QR); on a plain website it falls back
// to the QR/connect-URL flow. SAME widget, both surfaces = why "gate x6" is ONE template.
// MiniKit (via MiniKitProvider in providers.tsx) is kept ONLY for its still-current native commands
// (pay / sendTransaction / wallet-auth / sharing) — NOT verify.
//
// Minimal-but-real: (1) verify via the IDKit v4 widget, (2) a STUB protected action ("run this agent's
// utility") that ONLY unlocks after SERVER-SIDE verification passes.
import { useState } from "react";
import { IDKitRequestWidget, proofOfHuman, passport, selfieCheck } from "@worldcoin/idkit";
import agentsConfig from "../agents.config.json";

const AGENT_ID = (process.env.NEXT_PUBLIC_WORLD_AGENT_ID as string) || "pit";
const agent = (agentsConfig as any).agents[AGENT_ID];
const cred = (agentsConfig as any).credentialCatalog[agent.credential];

// Map our minimum-sufficient credential -> an IDKit v4 preset (the credential the widget will request).
function presetFor(credKey: string): any {
  switch (credKey) {
    case "orb": return proofOfHuman({ verificationLevel: "orb" } as any);   // Orb-grade unique human
    case "device": return proofOfHuman();                                   // Proof of Human (device)
    case "document": return passport();                                     // Passport / NFC
    case "secure_document": return passport();
    case "selfie": return selfieCheck();
    default: return proofOfHuman();
  }
}

export default function Home() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [blessed, setBlessed] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const signal = `${agent.ens}`; // bind proof to this agent's namespace (add a per-request nonce in prod)

  // Step 1: ask OUR backend to sign the RP request (rp_context), then open the widget.
  async function bless() {
    setStatus("Preparing a signed request…");
    const r = await fetch("/api/idkit-request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: AGENT_ID, action: agent.action }),
    });
    const { rp_context } = await r.json();
    setConfig({
      app_id: process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`,
      action: agent.action,
      signal,
      rp_context,
      allow_legacy_proofs: false,
      environment: (process.env.NEXT_PUBLIC_WORLD_ENV as any) || "staging",
      ...presetFor(agent.credential),
    });
    setStatus("");
    setOpen(true);
  }

  // Step 2: widget returns a proof -> validate SERVER-SIDE (prize law: client never decides pass/fail).
  async function handleVerify(result: any) {
    const res = await fetch("/api/verify-gate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: AGENT_ID, action: agent.action, signal, payload: result }),
    });
    const out = await res.json();
    setReceipt(out.receipt);
    if (!out.ok) { setStatus(out.message); throw new Error(out.message); } // dignified deny path
    setStatus(out.message);
  }

  function runUtility() {
    // STUB protected action — only reachable when blessed. Real build wires the agent's utility here.
    setStatus(`✅ ${agent.displayName} ran its utility (scope: ${agent.scope.join(", ")}).`);
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: 24 }}>
      <h1>{agent.displayName}</h1>
      <p style={{ opacity: 0.8 }}>{agent.ens}</p>
      <div style={{ background: "#121a35", borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <p><b>This action needs:</b> {cred.label}</p>
        <p style={{ fontSize: 13, opacity: 0.85 }}>{agent.rationale}</p>
      </div>

      {!blessed ? (
        <button onClick={bless} style={btn}>Bless {agent.displayName} · {cred.label}</button>
      ) : (
        <button onClick={runUtility} style={{ ...btn, background: "#1e9e6a" }}>Run {agent.displayName}'s utility</button>
      )}

      {config && (
        <IDKitRequestWidget
          {...config}
          open={open}
          onOpenChange={setOpen}
          handleVerify={handleVerify}
          onSuccess={() => setBlessed(true)}
          onError={(code: any) => setStatus(`Not authorized (${code}). ${agent.displayName} stays unblessed.`)}
        />
      )}

      {status && <p style={{ marginTop: 16 }}>{status}</p>}
      {receipt && (
        <pre style={{ background: "#0a0f22", padding: 12, borderRadius: 12, fontSize: 11, overflowX: "auto" }}>
{JSON.stringify(receipt, null, 2)}
        </pre>
      )}
    </main>
  );
}

const btn: React.CSSProperties = { width: "100%", padding: "14px 18px", borderRadius: 12, border: "none", background: "#4f7cff", color: "#fff", fontSize: 16, cursor: "pointer" };
