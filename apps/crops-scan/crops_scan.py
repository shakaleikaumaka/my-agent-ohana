#!/usr/bin/env python3
"""
crops-scan — a real repo-hygiene / secret-leak scanner.

Marketplace utility of the agent "Crops 🌿" (the repo steward — the one that
found a live GitHub PAT sitting in a shared clone's .git/config during Tokyo
prep). This is that scan, generalized and made runnable by anyone.

WHAT IT DOES
  Scans a repo or directory for:
    • SECRETS committed to the tree — GitHub PATs (ghp_/gho_/ghs_/ghr_/
      github_pat_), OpenAI keys (sk-...), AWS access keys (AKIA...), Slack
      tokens (xox...), PEM private-key blocks, and 64-hex private keys.
    • CREDENTIALS embedded in .git/config remote URLs (https://user:token@...)
      — exactly how the leaked PAT was found.
    • HYGIENE problems — a missing .gitignore, and a committed .env file
      (as opposed to a safe .env.example / .env.sample).

USAGE
    python3 crops_scan.py <path> [--json] [--quiet]

EXIT CODE
    0  no SECRET findings (hygiene warnings alone do not fail)
    1  one or more SECRET findings (or credential-in-git-config)

Findings are categorized so callers can assert on them precisely:
    category == "secret"  -> a planted / committed key
    category == "hygiene" -> missing .gitignore, committed .env
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, asdict

# ---------------------------------------------------------------------------
# Secret detectors. Each pattern is written with character classes / length
# quantifiers so this very source file does NOT itself contain a matchable
# literal token (it would otherwise flag itself when self-scanned).
# ---------------------------------------------------------------------------
SECRET_DETECTORS = [
    # (id, human label, compiled regex)
    ("github_pat_classic", "GitHub personal access token (ghp_)",
     re.compile(r"\bghp_[A-Za-z0-9]{36}\b")),
    ("github_pat_fine", "GitHub fine-grained token (github_pat_)",
     re.compile(r"\bgithub_pat_[A-Za-z0-9_]{22,}\b")),
    ("github_oauth", "GitHub OAuth/app/refresh token (gho_/ghu_/ghs_/ghr_)",
     re.compile(r"\b(?:gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b")),
    ("openai_key", "OpenAI-style API key (sk-)",
     re.compile(r"\bsk-[A-Za-z0-9]{20,}\b")),
    ("aws_access_key", "AWS access key id (AKIA)",
     re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("slack_token", "Slack token (xox...)",
     re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("pem_private_key", "PEM private-key block",
     re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----")),
    ("hex_private_key", "64-hex private key / secret (0x...)",
     re.compile(r"\b0x[0-9a-fA-F]{64}\b")),
]

# Credential embedded in a git remote URL, e.g. https://user:ghp_xxx@github.com
GIT_URL_CRED = re.compile(r"https://[^/\s:@]+:[^/\s@]+@")

# Directories we never descend into (noise / vendored / huge).
SKIP_DIRS = {".git", "node_modules", "vendor", "__pycache__",
             ".venv", "venv", "dist", "build", ".mypy_cache", ".pytest_cache"}

# Only scan text files; skip obvious binaries by extension.
BINARY_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf",
              ".zip", ".gz", ".tar", ".mp4", ".mov", ".mp3", ".wav",
              ".woff", ".woff2", ".ttf", ".otf", ".so", ".dylib", ".dll",
              ".exe", ".bin", ".class", ".jar", ".pyc", ".wasm"}

SAFE_ENV_NAMES = {".env.example", ".env.sample", ".env.template",
                  ".env.dist", ".env.local.example"}

MAX_FILE_BYTES = 2_000_000  # skip files larger than ~2MB


@dataclass
class Finding:
    category: str        # "secret" | "hygiene"
    rule: str            # detector id / hygiene rule id
    severity: str        # "critical" | "high" | "medium"
    path: str            # file (or dir) relative to scan root
    line: int            # 1-based line number, or 0 for repo-level findings
    message: str
    match: str = ""      # redacted matched text (secrets only)


def _redact(token: str) -> str:
    """Show enough to locate the token without printing the whole secret."""
    if len(token) <= 12:
        return token[:4] + "…"
    return token[:8] + "…" + token[-4:]


def _is_text_file(path: str) -> bool:
    ext = os.path.splitext(path)[1].lower()
    if ext in BINARY_EXT:
        return False
    try:
        if os.path.getsize(path) > MAX_FILE_BYTES:
            return False
        with open(path, "rb") as fh:
            chunk = fh.read(4096)
        if b"\x00" in chunk:  # NUL byte -> binary
            return False
    except OSError:
        return False
    return True


def _scan_file_secrets(abspath: str, relpath: str) -> list[Finding]:
    findings: list[Finding] = []
    try:
        with open(abspath, "r", encoding="utf-8", errors="replace") as fh:
            for lineno, line in enumerate(fh, start=1):
                for rule_id, label, rx in SECRET_DETECTORS:
                    for m in rx.finditer(line):
                        findings.append(Finding(
                            category="secret",
                            rule=rule_id,
                            severity="critical",
                            path=relpath,
                            line=lineno,
                            message=label,
                            match=_redact(m.group(0)),
                        ))
    except OSError:
        pass
    return findings


def _scan_git_config(root: str) -> list[Finding]:
    """The origin story: look for credentials baked into .git/config remotes."""
    cfg = os.path.join(root, ".git", "config")
    findings: list[Finding] = []
    if not os.path.isfile(cfg):
        return findings
    try:
        with open(cfg, "r", encoding="utf-8", errors="replace") as fh:
            for lineno, line in enumerate(fh, start=1):
                if GIT_URL_CRED.search(line):
                    findings.append(Finding(
                        category="secret",
                        rule="git_remote_credential",
                        severity="critical",
                        path=os.path.join(".git", "config"),
                        line=lineno,
                        message="Credential embedded in git remote URL",
                        match=_redact(line.strip()),
                    ))
                for rule_id, label, rx in SECRET_DETECTORS:
                    m = rx.search(line)
                    if m:
                        findings.append(Finding(
                            category="secret",
                            rule=rule_id,
                            severity="critical",
                            path=os.path.join(".git", "config"),
                            line=lineno,
                            message=label + " (in .git/config)",
                            match=_redact(m.group(0)),
                        ))
    except OSError:
        pass
    return findings


def scan(root: str) -> list[Finding]:
    root = os.path.abspath(root)
    findings: list[Finding] = []
    has_gitignore = False
    saw_env = False

    for dirpath, dirnames, filenames in os.walk(root):
        # prune skip dirs in place
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            abspath = os.path.join(dirpath, fname)
            relpath = os.path.relpath(abspath, root)

            if fname == ".gitignore":
                has_gitignore = True
            if fname == ".env":
                saw_env = True
                findings.append(Finding(
                    category="hygiene",
                    rule="committed_env",
                    severity="high",
                    path=relpath,
                    line=0,
                    message="committed .env file (secrets belong in a "
                            "gitignored .env, ship a .env.example instead)",
                ))
            # .env.* variants that are NOT the safe example names also warn
            elif fname.startswith(".env.") and fname not in SAFE_ENV_NAMES:
                findings.append(Finding(
                    category="hygiene",
                    rule="committed_env_variant",
                    severity="medium",
                    path=relpath,
                    line=0,
                    message=f"committed env-like file '{fname}' — confirm it "
                            "holds no real secrets",
                ))

            if _is_text_file(abspath):
                findings.extend(_scan_file_secrets(abspath, relpath))

    # repo-level: credentials in .git/config
    findings.extend(_scan_git_config(root))

    # repo-level: missing .gitignore
    if not has_gitignore:
        findings.append(Finding(
            category="hygiene",
            rule="missing_gitignore",
            severity="medium",
            path=".",
            line=0,
            message="no .gitignore at scan root — add one before build "
                    "tooling lands (node_modules/.env/keys can slip in)",
        ))

    # stable, readable ordering: secrets first, then by path/line
    findings.sort(key=lambda f: (f.category != "secret", f.path, f.line, f.rule))
    return findings


def summarize(findings: list[Finding]) -> dict:
    secrets = [f for f in findings if f.category == "secret"]
    hygiene = [f for f in findings if f.category == "hygiene"]
    return {
        "total": len(findings),
        "secret": len(secrets),
        "hygiene": len(hygiene),
    }


def _print_human(root: str, findings: list[Finding]) -> None:
    counts = summarize(findings)
    print(f"🌿 crops-scan — scanned: {root}")
    if not findings:
        print("✅ 0 findings — clean tree.")
        return
    for f in findings:
        icon = "🔑" if f.category == "secret" else "🧹"
        loc = f"{f.path}:{f.line}" if f.line else f.path
        extra = f"  [{f.match}]" if f.match else ""
        print(f"{icon} {f.severity.upper():8} {f.category:7} {loc}  "
              f"— {f.message}{extra}")
    print(f"— summary: {counts['total']} finding(s): "
          f"{counts['secret']} secret, {counts['hygiene']} hygiene")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        prog="crops-scan",
        description="Repo-hygiene / secret-leak scanner (Crops 🌿).")
    ap.add_argument("path", help="repo or directory to scan")
    ap.add_argument("--json", action="store_true",
                    help="emit findings as JSON")
    ap.add_argument("--quiet", action="store_true",
                    help="suppress the human report (exit code still set)")
    args = ap.parse_args(argv)

    if not os.path.exists(args.path):
        print(f"error: path not found: {args.path}", file=sys.stderr)
        return 2

    findings = scan(args.path)
    counts = summarize(findings)

    if args.json:
        print(json.dumps({
            "root": os.path.abspath(args.path),
            "summary": counts,
            "findings": [asdict(f) for f in findings],
        }, indent=2))
    elif not args.quiet:
        _print_human(args.path, findings)

    # Fail (exit 1) only on real secret exposure.
    return 1 if counts["secret"] > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
