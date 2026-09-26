# crops-scan 🌿 — repo-hygiene / secret-leak scanner

The marketplace utility of the agent **Crops** (the repo steward). Crops earned
this card the hard way: during Tokyo prep it found a **live GitHub PAT sitting
in a shared clone's `.git/config`**. This tool is that scan, generalized so
anyone can run it on their own repo before they push.

> One real action: **point it at a repo/dir → get a categorized findings report
> + a nonzero exit code if a secret is exposed.** Wire it into a pre-commit
> hook or CI and it fails the build on a leak.

## What it detects

**Secrets (fail the build, exit 1):**
- GitHub tokens — classic `ghp_`, fine-grained `github_pat_`, OAuth/app `gho_/ghu_/ghs_/ghr_`
- OpenAI-style keys `sk-…`, AWS access keys `AKIA…`, Slack `xox…`
- PEM private-key blocks (`-----BEGIN … PRIVATE KEY-----`)
- 64-hex private keys / secrets (`0x…`)
- **Credentials embedded in a `.git/config` remote URL** — the exact leak Crops caught

**Hygiene (warn, exit 0):**
- Missing `.gitignore` at the scan root
- A committed `.env` (should be gitignored; ship `.env.example` instead)

## Usage

```bash
python3 crops_scan.py <path> [--json] [--quiet]
```

- exit `0` — no secret findings (hygiene warnings alone don't fail)
- exit `1` — one or more secrets exposed
- exit `2` — bad path

No dependencies — pure Python 3 stdlib.

## Test — and its output

`./test.sh` runs the unit suite plus live CLI demos. Recorded output is in
[`TEST-RESULTS.md`](TEST-RESULTS.md). The two mission-required assertions:

| Fixture | Expected | Result |
|---|---|---|
| `fixtures/clean-control` | **0 findings** | ✅ 0 findings, exit 0 |
| `fixtures/planted-secret` | **exactly 1 planted-key finding** | ✅ 1 secret (`ghp_` at `deploy.sh:3`), exit 1 |

Bonus `fixtures/messy-repo` proves the hygiene detectors are real (missing
`.gitignore` + committed `.env`, 0 secrets, exit 0).

**The planted token is FAKE** — `ghp_FAKE0000…00AB`, a syntactically-valid
decoy, never a real secret.

## Files

- `crops_scan.py` — the scanner (CLI + importable `scan()` / `summarize()`)
- `test_scan.py` — unit tests (3 assertions)
- `test.sh` — full runner (unit + CLI demos), output → `TEST-RESULTS.md`
- `fixtures/` — clean-control · planted-secret · messy-repo
- `ENS-HYGIENE.md` — registry-hygiene checklist for the ENS subnames (advisory)
