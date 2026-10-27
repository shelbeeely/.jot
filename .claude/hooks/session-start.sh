#!/bin/bash
# SessionStart hook for Claude Code cloud sessions: installs the root devDependencies (axe-core) the browser suites need.
# Playwright and Chromium come with the cloud image. Local sessions are left alone.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
