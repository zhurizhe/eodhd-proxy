#!/usr/bin/env bash

# A simple smoke test that exercises the proxy endpoints when running
# in mock mode. This script starts the minimal test server included
# in this repository, sends a series of curl requests and verifies
# aspects of the responses using jq. If any assertion fails the
# script will exit with a non‑zero status.

set -euo pipefail

THIS_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$THIS_DIR/.." && pwd)"

# Configure environment for mock mode and provide a dummy bearer token.
export MOCK_MODE=1
export PROXY_BEARER_TOKEN="testtoken"

PORT=3000

# Launch the test server in the background
node "$THIS_DIR/test_server.js" &
SERVER_PID=$!
echo "Started test server (PID $SERVER_PID)"

# Clean up on exit
function cleanup {
  echo "Stopping test server"
  kill $SERVER_PID || true
}
trap cleanup EXIT

# Give the server a moment to start
sleep 1

echo "Performing health check..."
curl -s "http://localhost:$PORT/api/health" | jq -e '.ok == true and (.ts | tonumber > 0)' >/dev/null
echo "Health check passed"

echo "Testing bulk snapshot with auth..."
response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PROXY_BEARER_TOKEN" \
  -d '{"trade_date":"20230821"}' \
  "http://localhost:$PORT/api/eod/bulk-snapshot")
count=$(echo "$response" | jq -r '.count // 0')
if [[ "$count" -lt 1 ]]; then
  echo "Expected count > 0, got $count"
  exit 1
fi
echo "Bulk snapshot returned $count items"

echo "Testing history with auth..."
hist=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PROXY_BEARER_TOKEN" \
  -d '{"symbols":["600519.SHG"],"start_date":"20230801","end_date":"20230803"}' \
  "http://localhost:$PORT/api/eod/history")
rows=$(echo "$hist" | jq -r '.data[0].rows | length // 0')
if [[ "$rows" -lt 1 ]]; then
  echo "Expected rows > 0, got $rows"
  exit 1
fi
echo "History returned $rows rows"

echo "Testing unauthorized request..."
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"trade_date":"20230821"}' \
  "http://localhost:$PORT/api/eod/bulk-snapshot")
if [[ "$status" != "401" ]]; then
  echo "Expected 401 Unauthorized, got $status"
  exit 1
fi
echo "Unauthorized request correctly returned $status"

echo "Smoke test completed successfully"