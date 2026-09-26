# crops-scan — TEST RESULTS

Recorded output of `./test.sh` (pure Python 3 stdlib, no external deps).
Reproduce with: `cd apps/crops-scan && ./test.sh`

## Mission-required assertions — BOTH PASS ✅

| Beat | Corpus | Expected | Got |
|------|--------|----------|-----|
| scan clean → green | `fixtures/clean-control` | 0 findings, exit 0 | **0 findings, exit 0** ✅ |
| scan fixture → 1 planted key | `fixtures/planted-secret` | exactly 1 planted-key secret, exit 1 | **1 secret (FAKE `ghp_` @ deploy.sh:3), exit 1** ✅ |

Bonus corpus `fixtures/messy-repo` demonstrates hygiene detection (missing
`.gitignore` + committed `.env`) with exit 0 (hygiene warnings are not secrets).

> **Honesty note:** the only planted key is an obviously-fake decoy
> `ghp_FAKE…00AB` in `fixtures/planted-secret/deploy.sh`. No real secret is
> committed anywhere in this app. The scanner is the same lineage that caught a
> genuinely-leaked live PAT in a shared clone's `.git/config` during Tokyo prep.

## Full run output

```
############ 1. UNIT TESTS ############
[PASS] clean-control: total=0 (expected 0)
[PASS] planted-secret: secret=1 total=1 (expected secret=1, total=1)
        found: github_pat_classic at deploy.sh:3  match=ghp_FAKE…00AB
[PASS] messy-repo: hygiene=2 secret=0 rules=['committed_env', 'missing_gitignore']

✅ ALL TESTS PASSED

############ 2. CLI: clean control (expect 0 findings, exit 0) ############
🌿 crops-scan — scanned: fixtures/clean-control
✅ 0 findings — clean tree.
exit=0

############ 3. CLI: planted secret (expect 1 secret finding, exit 1) ############
🌿 crops-scan — scanned: fixtures/planted-secret
🔑 CRITICAL secret  deploy.sh:3  — GitHub personal access token (ghp_)  [ghp_FAKE…00AB]
— summary: 1 finding(s): 1 secret, 0 hygiene
exit=1

############ 4. CLI: messy repo hygiene (expect hygiene warnings, exit 0) ############
🌿 crops-scan — scanned: fixtures/messy-repo
🧹 MEDIUM   hygiene .  — no .gitignore at scan root — add one before build tooling lands (node_modules/.env/keys can slip in)
🧹 HIGH     hygiene .env  — committed .env file (secrets belong in a gitignored .env, ship a .env.example instead)
— summary: 2 finding(s): 0 secret, 2 hygiene
exit=0

############ 5. CLI: planted secret as JSON ############
{
  "root": ".../fixtures/planted-secret",
  "summary": {
    "total": 1,
    "secret": 1,
    "hygiene": 0
  },
  "findings": [
    {
      "category": "secret",
      "rule": "github_pat_classic",
      "severity": "critical",
      "path": "deploy.sh",
      "line": 3,
      "message": "GitHub personal access token (ghp_)",
      "match": "ghp_FAKE…00AB"
    }
  ]
}
exit=1
```

_Last run: 2026-09-25 ~12:44 UTC._
