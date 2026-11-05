# Contributing

1. **Branch** off `main`: `git checkout -b <you>/<short-topic>`.
2. **Commit under your own GitHub account.** Every human commits as themselves, never as someone else. This keeps the Continuity record honest about who built what.
3. **Open a PR** against `main` and link the issue it closes.
4. **Review:** at least one other human approves before merge. CI and test results go in the PR description.
5. **No force-push to `main`.** Tags (e.g. `pre-mumbai-2026-11-05`) are never moved.

## Rules
- **Never commit secrets** (keys, `.env`, JWTs, World/Hedera/0G credentials). `.gitignore` covers the usual files, and the CROPS leak-scan runs on every push.
- AI-assisted commits use the `Co-authored-by:` convention described in [`AI-ATTRIBUTION.md`](./AI-ATTRIBUTION.md).
- Consent first: no real person's name, photo, or voice goes into the repo without their yes.
- Keep the two universes separate. Open Source Orchestra commons code and funds are never mixed with the service pool.

## Running tests
```bash
cd contracts && forge test                    # registry + ENS issuer
cd contracts/aqua && npm install && forge test # Aqua Blessing Pool
cd consent-server && npm install && npx vitest run
cd contracts/ens && ./test.sh                  # read-only, live Sepolia
```
