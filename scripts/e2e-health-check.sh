#!/usr/bin/env bash
set -euo pipefail

echo "🏥 E2E Health Check Report"
echo "=========================="

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)
# Load .env if present so ATTIO_API_KEY is available for curl
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "⚠️ jq not found. Install jq for JSON parsing (brew install jq)."
fi

if [[ -z "${ATTIO_API_KEY:-}" ]]; then
  echo "⚠️ ATTIO_API_KEY not set. Skipping API connectivity checks."
else
  echo -n "API Status: "
  curl -s --max-time 10 -H "Authorization: Bearer $ATTIO_API_KEY" \
    https://api.attio.com/v2/self | jq -r '.workspace_name' || echo "❌ Failed"

  echo -n "Test Companies (E2E_* prefix): "
  curl -s --max-time 10 -H "Authorization: Bearer $ATTIO_API_KEY" \
    "https://api.attio.com/v2/objects/companies/records/query" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"filter":{"name":{"contains":"E2E_"}}}' \
    | jq '.data | length' || echo "❌ Query failed"
fi

echo -n "Smoke Test (offline): "
E2E_MODE=true npm run test:offline --silent \
  | grep -q "passed" && echo "✅ Passed" || echo "❌ Failed"

echo "=========================="
