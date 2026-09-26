// RP-signature route (server-side ONLY — the signing_key is a secret, never shipped to the client).
// IDKit v4 requires an `rp_context` (rp_id + nonce + timestamps + RP ECDSA signature) that the RELYING
// PARTY signs on its backend, then hands to the widget. See docs.world.org/world-id/idkit/signatures.
//
// MOCK -> REAL is one env: set WORLD_SIGNING_KEY (+ WORLD_RP_ID) for the real signature; without it we
// return a mock rp_context so the flow is demoable offline (mock proofs are NOT prize-eligible).
import { NextResponse } from "next/server";
import agentsConfig from "../../../agents.config.json";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { agentId, action } = await req.json();
  const agent = (agentsConfig as any).agents[agentId];
  const act = action || agent?.action;
  const rpId = process.env.WORLD_RP_ID || "rp_mock000000000000";
  const signingKey = process.env.WORLD_SIGNING_KEY;

  if (signingKey) {
    // ---- REAL: sign server-side with @worldcoin/idkit-server ----
    const { signRequest } = await import("@worldcoin/idkit/signing");
    const { sig, nonce, createdAt, expiresAt } = signRequest({ signingKeyHex: signingKey, action: act });
    return NextResponse.json({
      rp_context: { rp_id: rpId, nonce, created_at: createdAt, expires_at: expiresAt, signature: sig },
      mock: false,
    });
  }

  // ---- MOCK: offline-demoable, labelled ----
  const now = Math.floor(Date.now() / 1000);
  const nonce = "0x" + [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return NextResponse.json({
    rp_context: { rp_id: rpId, nonce, created_at: now, expires_at: now + 3600, signature: "0xMOCK_RP_SIGNATURE" },
    mock: true,
  });
}
