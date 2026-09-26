#!/usr/bin/env bash
# crops-scan test runner. Runs the unit suite + live CLI demos and records
# exit codes. No external deps — pure Python 3 stdlib.
set -u
cd "$(dirname "$0")"

echo "############ 1. UNIT TESTS ############"
python3 test_scan.py
echo

echo "############ 2. CLI: clean control (expect 0 findings, exit 0) ############"
python3 crops_scan.py fixtures/clean-control
echo "exit=$?"
echo

echo "############ 3. CLI: planted secret (expect 1 secret finding, exit 1) ############"
python3 crops_scan.py fixtures/planted-secret
echo "exit=$?"
echo

echo "############ 4. CLI: messy repo hygiene (expect hygiene warnings, exit 0) ############"
python3 crops_scan.py fixtures/messy-repo
echo "exit=$?"
echo

echo "############ 5. CLI: planted secret as JSON ############"
python3 crops_scan.py fixtures/planted-secret --json
echo "exit=$?"
