// Server-side verification endpoint. THE authority on pass/fail (prize law: validate in a secure backend).
// Reuses the ONE tested gate module (../../../lib/verify.mjs -> shared src/idkit-gate/verify.mjs).
import { NextResponse } from "next/server";
// @ts-ignore — plain .mjs module, shared with the unit-tested gate
import { verifyGate } from "../../../lib/verify.mjs";
import agentsConfig from "../../../agents.config.json";

export const runtime = "nodejs"; // verify.mjs uses node:crypto — pin the Node runtime, not edge.

// Simple in-memory replay guard for the demo. Swap for the consent-server /check + Durable Object in prod.
const usedNullifiers = new Set<string>();

export async function POST(req: Request) {
  const { agentId, action, signal, payload } = await req.json();
  const result = await verifyGate({
    config: agentsConfig,
    agentId,
    action,
    signal,
    payload,
    seen: async (n: string) => usedNullifiers.has(n),
  });
  if (result.ok && result.receipt?.nullifier) usedNullifiers.add(result.receipt.nullifier);
  // Return the receipt for ALLOW and DENY alike (the UI renders both with dignity).
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
