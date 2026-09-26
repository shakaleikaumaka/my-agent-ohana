#!/usr/bin/env bash
# BAD PRACTICE (planted for the test): token hardcoded instead of read from env.
export GITHUB_TOKEN=ghp_FAKE000000000000000000000000000000AB
git push origin main
