import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import { readFileSync } from "node:fs";

// Runs the REAL Worker + Durable Object inside workerd (via miniflare) — no network,
// no port. We inject the self-signed RS256 mock JWKS (+ issuer/client_id/admin key) as
// Worker bindings so the full verify->check->revoke->receipt pipeline runs OFFLINE.
// Swapping to real World later = drop MOCK_JWKS, set WID_CLIENT_ID + JWKS_URL. Config only.
const mockJwks = readFileSync("./test/fixtures/mock-jwks.json", "utf8");

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          compatibilityDate: "2024-11-06",
          compatibilityFlags: ["nodejs_compat"],
          bindings: {
            ISSUER_OVERRIDE: "https://mock.trinity.local",
            WID_CLIENT_ID: "trinity-demo-client",
            ADMIN_KEY: "dev-admin-key-change-me",
            MOCK_JWKS: mockJwks,
            REQUIRE_ORB_ACR: "true",
            ORB_ACR_VALUE: "https://world.org/oidc/acr/orb-v3",
            // Mirror wrangler.toml [vars] scopeMap: the REAL myagentohana.eth subnames
            // (globy = canonical post-rename; globie kept as transition alias)
            // + the codename-safe demo placeholder the pipeline tests bind against.
            AGENT_SCOPE_MAP:
              '{"globy.myagentohana.eth":["lesson","greet:human"],"globie.myagentohana.eth":["lesson","greet:human"],"orbie.myagentohana.eth":["story:tell","greet:human"],"trace.myagentohana.eth":["steward:gift","food:surplus-alert"],"terri.myagentohana.eth":["receipt:issue","ledger:write"],"shaka.myagentohana.eth":["verse:perform"],"pit.myagentohana.eth":["knowledge:capture","receipt:issue"],"spector.myagentohana.eth":["security:scan","report:write"],"crops.myagentohana.eth":["repo:scan","report:write"],"tauro.demo.eth":["steward:gift"]}',
            // F10: pin the subject in the test rig (= the default minted sub) so the
            // sub-mismatch path is exercised. `test.sh` runs UNPINNED (no EXPECTED_SUB in
            // .dev.vars) to prove the pin stays optional. Two suites cover both modes.
            EXPECTED_SUB: "0xmocksubject-pairwise-0001",
          },
        },
      },
    },
  },
});
