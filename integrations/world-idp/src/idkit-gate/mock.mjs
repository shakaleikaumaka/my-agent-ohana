// mock.mjs — generate mock IDKit widget results for offline dev + tests.
// LABEL: mock proofs are NOT prize-eligible. Real proofs come from the World App widget.
// World's current banner: "We are mocking proofs now, so you don't need sandbox app anymore".
import crypto from "node:crypto";
import { sha256hex } from "./verify.mjs";

/** A mock World ID widget success payload (v4 shape) carrying the given credential identifier. */
export function mockProof({ credential = "device", action, signal, nullifier } = {}) {
  const rand = () => "0x" + crypto.randomBytes(32).toString("hex");
  return {
    protocol_version: "3.0",
    nonce: rand(),
    action,
    responses: [
      {
        identifier: credential,                 // "device" | "selfie" | "document" | "secure_document" | "orb"
        merkle_root: rand(),
        nullifier: nullifier || rand(),         // stable per (human, app, action) in real life
        proof: rand() + rand(),
        signal_hash: signal != null ? sha256hex(signal) : rand(),
        max_age: 304200,
      },
    ],
  };
}

/** A mock widget error payload (deny / cancel / expire / ineligible). */
export function mockError(code = "access_denied") {
  return { error: code };
}
