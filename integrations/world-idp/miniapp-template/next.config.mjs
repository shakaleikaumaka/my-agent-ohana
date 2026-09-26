/** @type {import('next').NextConfig} */
const nextConfig = {
  // The shared gate is a symlinked .mjs (lib -> ../src/idkit-gate). Allow importing JSON + transpiling it.
  outputFileTracingIncludes: { "/api/verify-gate": ["./lib/**", "./agents.config.json"] },
};
export default nextConfig;
