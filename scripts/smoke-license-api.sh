#!/usr/bin/env bash

set -euo pipefail

RUN_ID="${RUN_ID:-$(date +%s%N)}"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-123456}"
COOKIE_FILE="${COOKIE_FILE:-/tmp/activation-manager-cookie.txt}"
PROJECT_KEY="${PROJECT_KEY:-browser-plugin-${RUN_ID}}"
PROJECT_NAME="${PROJECT_NAME:-browser-plugin-smoke}"
MACHINE_ID="${MACHINE_ID:-machine-smoke-001}"
REQUEST_ID_1="${REQUEST_ID_1:-req-${RUN_ID}-001}"
REQUEST_ID_2="${REQUEST_ID_2:-req-${RUN_ID}-002}"
API_SECRET=""

json_get() {
  local expression="$1"
  python3 -c "import json,sys; data=json.load(sys.stdin); print($expression)"
}

assert_json() {
  local json="$1"
  local expression="$2"
  local expected="$3"
  local actual
  actual="$(printf '%s' "$json" | json_get "$expression")"
  if [[ "$actual" != "$expected" ]]; then
    echo "Assertion failed: ${expression}, expected=${expected}, actual=${actual}" >&2
    exit 1
  fi
}

assert_json_expr() {
  assert_json "$@"
}

license_post() {
  local path="$1"
  local body="$2"
  local timestamp
  local nonce
  local signature

  if [[ -z "$API_SECRET" ]]; then
    echo "API_SECRET is empty; create a project before calling License API" >&2
    exit 1
  fi

  timestamp="$(date +%s)"
  nonce="smoke-${RUN_ID}-${path//\//-}-${RANDOM}"
  signature="$(BODY="$body" API_SECRET="$API_SECRET" PATH_ONLY="$path" TIMESTAMP="$timestamp" NONCE="$nonce" python3 - <<'PY'
import hashlib
import hmac
import os

body = os.environ["BODY"].encode()
canonical = "\n".join(
    [
        "POST",
        os.environ["PATH_ONLY"],
        os.environ["TIMESTAMP"],
        os.environ["NONCE"],
        hashlib.sha256(body).hexdigest(),
    ]
)
print(hmac.new(os.environ["API_SECRET"].encode(), canonical.encode(), hashlib.sha256).hexdigest())
PY
)"

  curl -s \
    -H "Content-Type: application/json" \
    -H "X-License-Timestamp: $timestamp" \
    -H "X-License-Nonce: $nonce" \
    -H "X-License-Signature: $signature" \
    -H "X-License-Signature-Version: v1" \
    -d "$body" \
    "$BASE_URL$path"
}

echo "== 1. Admin login =="
LOGIN_RESPONSE="$(curl -s -c "$COOKIE_FILE" -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" \
  "$BASE_URL/api/admin/login")"
echo "$LOGIN_RESPONSE"
assert_json "$LOGIN_RESPONSE" "data['success']" "True"

echo
echo "== 2. Create project =="
PROJECT_RESPONSE="$(curl -s -b "$COOKIE_FILE" -H "Content-Type: application/json" \
  -d "{\"name\":\"$PROJECT_NAME\",\"projectKey\":\"$PROJECT_KEY\",\"description\":\"License API smoke project\"}" \
  "$BASE_URL/api/admin/projects")"
echo "$PROJECT_RESPONSE"
assert_json "$PROJECT_RESPONSE" "data['success']" "True"
API_SECRET="$(printf '%s' "$PROJECT_RESPONSE" | json_get "data['project']['apiSecret']")"

echo
echo "== 3. Generate count license =="
GENERATE_RESPONSE="$(curl -s -b "$COOKIE_FILE" -H "Content-Type: application/json" \
  -d "{\"projectKey\":\"$PROJECT_KEY\",\"amount\":1,\"licenseMode\":\"COUNT\",\"totalCount\":2}" \
  "$BASE_URL/api/admin/codes/generate")"
echo "$GENERATE_RESPONSE"
assert_json "$GENERATE_RESPONSE" "data['success']" "True"
CODE="$(printf '%s' "$GENERATE_RESPONSE" | json_get "data['codes'][0]['code']")"
echo "Generated code: $CODE"

echo
echo "== 4. Activate, bind device, no consume =="
ACTIVATE_BODY="{\"projectKey\":\"$PROJECT_KEY\",\"code\":\"$CODE\",\"machineId\":\"$MACHINE_ID\"}"
ACTIVATE_RESPONSE="$(license_post "/api/license/activate" "$ACTIVATE_BODY")"
echo "$ACTIVATE_RESPONSE"
assert_json "$ACTIVATE_RESPONSE" "data['success']" "True"
assert_json "$ACTIVATE_RESPONSE" "data['remainingCount']" "2"

echo
echo "== 5. Status remains 2 =="
STATUS_BODY="{\"projectKey\":\"$PROJECT_KEY\",\"code\":\"$CODE\",\"machineId\":\"$MACHINE_ID\"}"
STATUS_RESPONSE="$(license_post "/api/license/status" "$STATUS_BODY")"
echo "$STATUS_RESPONSE"
assert_json "$STATUS_RESPONSE" "data['success']" "True"
assert_json "$STATUS_RESPONSE" "data['isActivated']" "True"
assert_json "$STATUS_RESPONSE" "data['remainingCount']" "2"

echo
echo "== 6. Consume request 1 =="
CONSUME_BODY_1="{\"projectKey\":\"$PROJECT_KEY\",\"code\":\"$CODE\",\"machineId\":\"$MACHINE_ID\",\"requestId\":\"$REQUEST_ID_1\"}"
CONSUME_RESPONSE_1="$(license_post "/api/license/consume" "$CONSUME_BODY_1")"
echo "$CONSUME_RESPONSE_1"
assert_json "$CONSUME_RESPONSE_1" "data['success']" "True"
assert_json "$CONSUME_RESPONSE_1" "data['remainingCount']" "1"
assert_json "$CONSUME_RESPONSE_1" "data['idempotent']" "False"

echo
echo "== 7. Replay request 1, idempotent =="
CONSUME_RESPONSE_2="$(license_post "/api/license/consume" "$CONSUME_BODY_1")"
echo "$CONSUME_RESPONSE_2"
assert_json "$CONSUME_RESPONSE_2" "data['success']" "True"
assert_json "$CONSUME_RESPONSE_2" "data['remainingCount']" "1"
assert_json "$CONSUME_RESPONSE_2" "data['idempotent']" "True"

echo
echo "== 8. Consume request 2 =="
CONSUME_BODY_2="{\"projectKey\":\"$PROJECT_KEY\",\"code\":\"$CODE\",\"machineId\":\"$MACHINE_ID\",\"requestId\":\"$REQUEST_ID_2\"}"
CONSUME_RESPONSE_3="$(license_post "/api/license/consume" "$CONSUME_BODY_2")"
echo "$CONSUME_RESPONSE_3"
assert_json "$CONSUME_RESPONSE_3" "data['success']" "True"
assert_json "$CONSUME_RESPONSE_3" "data['remainingCount']" "0"
assert_json "$CONSUME_RESPONSE_3" "data['valid']" "False"

echo
echo "== 9. Admin consumption logs =="
CONSUMPTION_LOGS_RESPONSE="$(curl -s -b "$COOKIE_FILE" \
  "$BASE_URL/api/admin/consumptions?projectKey=$PROJECT_KEY")"
echo "$CONSUMPTION_LOGS_RESPONSE"
assert_json "$CONSUMPTION_LOGS_RESPONSE" "data['success']" "True"
assert_json "$CONSUMPTION_LOGS_RESPONSE" "len(data['logs'])" "2"
assert_json "$CONSUMPTION_LOGS_RESPONSE" "data['logs'][0]['requestId']" "$REQUEST_ID_2"
assert_json "$CONSUMPTION_LOGS_RESPONSE" "data['logs'][1]['requestId']" "$REQUEST_ID_1"

echo
echo "== 9.1 Future range should be empty =="
CONSUMPTION_RANGE_EMPTY_RESPONSE="$(curl -s -b "$COOKIE_FILE" \
  "$BASE_URL/api/admin/consumptions?projectKey=$PROJECT_KEY&createdFrom=2100-01-01T00:00:00.000Z")"
echo "$CONSUMPTION_RANGE_EMPTY_RESPONSE"
assert_json "$CONSUMPTION_RANGE_EMPTY_RESPONSE" "data['success']" "True"
assert_json "$CONSUMPTION_RANGE_EMPTY_RESPONSE" "len(data['logs'])" "0"

echo
echo "== 10. Admin stats =="
STATS_RESPONSE="$(curl -s -b "$COOKIE_FILE" \
  "$BASE_URL/api/admin/codes/stats")"
echo "$STATS_RESPONSE"
assert_json "$STATS_RESPONSE" "data['success']" "True"
assert_json_expr "$STATS_RESPONSE" "[item['projectKey'] for item in data['projectStats'] if item['projectKey'] == '$PROJECT_KEY'][0]" "$PROJECT_KEY"
assert_json_expr "$STATS_RESPONSE" "[item['countConsumedTotal'] for item in data['projectStats'] if item['projectKey'] == '$PROJECT_KEY'][0]" "2"
assert_json_expr "$STATS_RESPONSE" "[item['countRemainingTotal'] for item in data['projectStats'] if item['projectKey'] == '$PROJECT_KEY'][0]" "0"

echo
echo "== 11. Admin consumption export =="
CONSUMPTION_EXPORT_RESPONSE="$(curl -s -b "$COOKIE_FILE" \
  "$BASE_URL/api/admin/consumptions/export?projectKey=$PROJECT_KEY&keyword=$REQUEST_ID_2&createdFrom=2000-01-01T00:00:00.000Z&createdTo=2100-01-01T00:00:00.000Z")"
echo "$CONSUMPTION_EXPORT_RESPONSE"
printf '%s' "$CONSUMPTION_EXPORT_RESPONSE" | grep -q "$PROJECT_KEY"
printf '%s' "$CONSUMPTION_EXPORT_RESPONSE" | grep -q "$REQUEST_ID_2"

echo
echo "Smoke passed"
echo "BASE_URL=$BASE_URL"
echo "PROJECT_KEY=$PROJECT_KEY"
echo "CODE=$CODE"
