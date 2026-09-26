#!/usr/bin/env python3
"""
Test suite for crops-scan.

Hard assertions required by the mission:
  1. clean-control  -> 0 findings total
  2. planted-secret -> exactly 1 planted-key (secret) finding

Bonus assertions (prove the hygiene detectors are real, not decorative):
  3. messy-repo     -> missing_gitignore + committed_env hygiene findings,
                       and 0 secret findings (exit code stays 0)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import crops_scan  # noqa: E402

FIX = os.path.join(HERE, "fixtures")


def run(name):
    findings = crops_scan.scan(os.path.join(FIX, name))
    counts = crops_scan.summarize(findings)
    return findings, counts


def main():
    passed = True

    # ---- Test 1: clean control = 0 findings ----
    findings, counts = run("clean-control")
    ok = counts["total"] == 0
    passed &= ok
    print(f"[{'PASS' if ok else 'FAIL'}] clean-control: total={counts['total']} "
          f"(expected 0)")
    for f in findings:
        print(f"        unexpected: {f.category}/{f.rule} {f.path}:{f.line}")

    # ---- Test 2: fixture = exactly 1 planted-key (secret) finding ----
    findings, counts = run("planted-secret")
    secrets = [f for f in findings if f.category == "secret"]
    ok = counts["secret"] == 1 and counts["total"] == 1
    passed &= ok
    print(f"[{'PASS' if ok else 'FAIL'}] planted-secret: secret={counts['secret']} "
          f"total={counts['total']} (expected secret=1, total=1)")
    for f in secrets:
        print(f"        found: {f.rule} at {f.path}:{f.line}  match={f.match}")

    # ---- Test 3 (bonus): messy-repo hygiene detectors ----
    findings, counts = run("messy-repo")
    rules = {f.rule for f in findings}
    ok = ("missing_gitignore" in rules and "committed_env" in rules
          and counts["secret"] == 0)
    passed &= ok
    print(f"[{'PASS' if ok else 'FAIL'}] messy-repo: hygiene={counts['hygiene']} "
          f"secret={counts['secret']} rules={sorted(rules)}")

    print()
    if passed:
        print("✅ ALL TESTS PASSED")
        return 0
    print("❌ TESTS FAILED")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
