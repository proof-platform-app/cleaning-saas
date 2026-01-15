cat > backend/scripts/dev_api_smoke.sh <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8001}"

DEV_CLEANER_EMAIL="${DEV_CLEANER_EMAIL:-cleaner@test.com}"
DEV_CLEANER_PASSWORD="${DEV_CLEANER_PASSWORD:-Test1234!}"

DEV_MANAGER_EMAIL="${DEV_MANAGER_EMAIL:-manager@test.com}"
DEV_MANAGER_PASSWORD="${DEV_MANAGER_PASSWORD:-Test1234!}"

echo "Base URL: $BASE_URL"

echo ""
echo "== Cleaner login =="
CLEANER_JSON="$(curl -s -X POST "$BASE_URL/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DEV_CLEANER_EMAIL\",\"password\":\"$DEV_CLEANER_PASSWORD\"}")"
echo "$CLEANER_JSON"

CLEANER_TOKEN="$(python3 - <<PY
import json
print(json.loads('''$CLEANER_JSON''').get('token',''))
PY
)"
if [ -z "$CLEANER_TOKEN" ]; then
  echo "ERROR: cleaner token not found"
  exit 1
fi
echo "Cleaner token: OK"

echo ""
echo "== Cleaner today jobs =="
TODAY_JOBS="$(curl -s "$BASE_URL/api/jobs/today/" -H "Authorization: Token $CLEANER_TOKEN")"
echo "$TODAY_JOBS"

JOB_ID="$(python3 - <<PY
import json
data=json.loads('''$TODAY_JOBS''')
if isinstance(data, list) and data:
    print(data[0].get('id',''))
else:
    print('')
PY
)"
if [ -n "$JOB_ID" ]; then
  echo ""
  echo "== Cleaner job details (id=$JOB_ID) =="
  curl -s "$BASE_URL/api/jobs/$JOB_ID/" -H "Authorization: Token $CLEANER_TOKEN"
  echo ""
else
  echo ""
  echo "No jobs for cleaner today (ok for empty dev DB)."
fi

echo ""
echo "== Manager login =="
MANAGER_JSON="$(curl -s -X POST "$BASE_URL/api/manager/auth/login/" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DEV_MANAGER_EMAIL\",\"password\":\"$DEV_MANAGER_PASSWORD\"}")"
echo "$MANAGER_JSON"

MANAGER_TOKEN="$(python3 - <<PY
import json
print(json.loads('''$MANAGER_JSON''').get('token',''))
PY
)"
if [ -z "$MANAGER_TOKEN" ]; then
  echo "ERROR: manager token not found"
  exit 1
fi
echo "Manager token: OK"

echo ""
echo "== Manager today jobs =="
curl -s "$BASE_URL/api/manager/jobs/today/" -H "Authorization: Token $MANAGER_TOKEN"
echo ""
BASH
