#!/usr/bin/env bash
set -euo pipefail

LOG_DIR=${1:-"/tmp"}
mkdir -p "$LOG_DIR"

if [[ -z "${ATTIO_API_KEY:-}" ]]; then
  echo "⚠️ ATTIO_API_KEY not set. E2E tests will be skipped."
  echo "Tip: export ATTIO_API_KEY=... then rerun."
fi

echo "🔎 Running targeted E2E diagnostics (logs in $LOG_DIR)"

declare -a TESTS=(
  "should create task linked to company record"
  "should delete individual tasks"
  "should retrieve record details across resource types"
  "should handle note retrieval and pagination validation"
)

for testname in "${TESTS[@]}"; do
  echo "---\n▶ $testname"
  LOG_FILE="$LOG_DIR/e2e-$(echo "$testname" | tr ' ' '-' | tr -cd '[:alnum:]-').log"
  TASKS_DEBUG=true MCP_LOG_LEVEL=DEBUG LOG_FORMAT=json E2E_MODE=true USE_MOCK_DATA=false \
    npx vitest run --config vitest.config.e2e.ts -t "$testname" --reporter=verbose --bail=0 \
    |& tee "$LOG_FILE" || true
  echo "log: $LOG_FILE"
done

echo "✅ Diagnostics complete"

