#!/bin/bash
# ============================================================
# verify_roles.sh — RBAC Smoke Test (Regression Guard)
# ============================================================
#
# Purpose: Quick verification that RBAC and key restrictions
#          are not broken. Runs in 30-60 seconds.
#
# Requirements:
#   - Django server running (or script will start one)
#   - Python venv at ./venv
#   - jq installed (for JSON parsing)
#   - Test users created (script will attempt to create them)
#
# Environment variables (optional):
#   API_BASE_URL  - Base URL (default: http://127.0.0.1:8000)
#   API_PORT      - Port number (default: 8000)
#
# Usage:
#   cd backend
#   ./verify_roles.sh
#
# Expected output:
#   - Clear PASS/FAIL lines for each test
#   - "ALL PASSED" or "FAILED" at the end
#   - Exit code 0 if all pass, non-zero otherwise
#
# Test credentials:
#   Owner:   owner@test.com / testpass123!
#   Manager: manager@test.com / testpass123!
#   Staff:   staff@test.com / testpass123!
#   Cleaner: +971500000001 / PIN 1234
#
# ============================================================

# Disable history expansion to prevent ! escaping issues
set +H 2>/dev/null || true

# Exit on undefined variables (but not on command failures - we handle those)
set -u

# Configuration
PORT="${API_PORT:-8000}"
BASE_URL="${API_BASE_URL:-http://127.0.0.1:$PORT}"
VENV_PYTHON="./venv/bin/python"
TEST_PASSWORD='testpass123!'

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# State flags
SERVER_STARTED=false
SERVER_PID=""
TRIAL_MODIFIED=false

# ============================================================
# Helper functions
# ============================================================

log_header() {
    echo ""
    echo "============================================================"
    echo "$1"
    echo "============================================================"
}

pass() {
    echo -e "  ${GREEN}PASS${NC} $1"
    PASSED=$((PASSED + 1))
    TOTAL=$((TOTAL + 1))
}

fail() {
    echo -e "  ${RED}FAIL${NC} $1"
    FAILED=$((FAILED + 1))
    TOTAL=$((TOTAL + 1))
}

skip() {
    echo -e "  ${YELLOW}SKIP${NC} $1"
}

# Check if jq is available
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo "Error: jq is required but not installed."
        echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
        exit 1
    fi
}

# Get token via email/password login (uses Python to avoid shell escaping issues)
get_token() {
    local email=$1
    local password=$2
    $VENV_PYTHON -c "
import urllib.request
import json
import sys

data = json.dumps({'email': '$email', 'password': '$password'}).encode()
req = urllib.request.Request(
    '$BASE_URL/api/manager/auth/login/',
    data=data,
    headers={'Content-Type': 'application/json'}
)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        result = json.loads(resp.read().decode())
        print(result.get('token', ''))
except Exception as e:
    print('', file=sys.stderr)
" 2>/dev/null || echo ""
}

# Get cleaner token via phone/PIN login
get_cleaner_token() {
    local phone=$1
    local pin=$2
    $VENV_PYTHON -c "
import urllib.request
import json
import sys

data = json.dumps({'phone': '$phone', 'pin': '$pin'}).encode()
req = urllib.request.Request(
    '$BASE_URL/api/auth/cleaner-login/',
    data=data,
    headers={'Content-Type': 'application/json'}
)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        result = json.loads(resp.read().decode())
        print(result.get('token', ''))
except:
    print('')
" 2>/dev/null || echo ""
}

# Make authenticated GET request and return JSON
auth_get() {
    local token=$1
    local path=$2
    curl -s -X GET "${BASE_URL}${path}" \
        -H "Authorization: Token $token" \
        -H "Content-Type: application/json" \
        2>/dev/null || echo "{}"
}

# Make authenticated GET request and return HTTP status code
auth_get_status() {
    local token=$1
    local path=$2
    curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}${path}" \
        -H "Authorization: Token $token" \
        2>/dev/null || echo "000"
}

# Make authenticated POST request and return JSON
auth_post() {
    local token=$1
    local path=$2
    local data=$3
    curl -s -X POST "${BASE_URL}${path}" \
        -H "Authorization: Token $token" \
        -H "Content-Type: application/json" \
        -d "$data" \
        2>/dev/null || echo "{}"
}

# Make authenticated POST request and return HTTP status code
auth_post_status() {
    local token=$1
    local path=$2
    local data=$3
    curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}${path}" \
        -H "Authorization: Token $token" \
        -H "Content-Type: application/json" \
        -d "$data" \
        2>/dev/null || echo "000"
}

# Extract JSON field value
json_get() {
    local json=$1
    local field=$2
    echo "$json" | jq -r ".$field // empty" 2>/dev/null || echo ""
}

# Check if JSON has field with expected value
json_has() {
    local json=$1
    local field=$2
    local expected=$3
    local actual
    # Use jq to get value, handling booleans correctly (don't use // empty for booleans)
    actual=$(echo "$json" | jq -r "if has(\"$field\") then .$field else \"__MISSING__\" end" 2>/dev/null | tr '[:upper:]' '[:lower:]')
    [[ "$actual" == "$expected" ]]
}

# Check if JSON has specific code field
json_has_code() {
    local json=$1
    local expected_code=$2
    local actual
    actual=$(echo "$json" | jq -r ".code // empty" 2>/dev/null)
    [[ "$actual" == "$expected_code" ]]
}

# Cleanup function
cleanup() {
    if [ "$SERVER_STARTED" = true ] && [ -n "$SERVER_PID" ]; then
        echo ""
        echo "[Cleanup] Stopping server (PID: $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi

    if [ "$TRIAL_MODIFIED" = true ]; then
        echo "[Cleanup] Restoring trial expiry..."
        $VENV_PYTHON -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.accounts.models import Company
from django.utils import timezone
from datetime import timedelta
c = Company.objects.filter(name='Test Company').first()
if c:
    c.plan = 'active'
    c.trial_expires_at = timezone.now() + timedelta(days=7)
    c.save()
" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# ============================================================
# Main script
# ============================================================

echo ""
echo "============================================================"
echo "RBAC SMOKE TEST — verify_roles.sh"
echo "============================================================"
echo "Base URL: $BASE_URL"
echo ""

# Check dependencies
check_jq

# ============================================================
# Step 1: Setup test users
# ============================================================
log_header "[1/7] Setting up test users"

if [ -f "setup_test_users.py" ]; then
    if $VENV_PYTHON setup_test_users.py > /dev/null 2>&1; then
        echo "  OK: Test users created/updated"
    else
        echo "  WARN: setup_test_users.py failed, continuing..."
    fi
else
    echo "  WARN: setup_test_users.py not found, assuming users exist"
fi

# ============================================================
# Step 2: Check/start server
# ============================================================
log_header "[2/7] Checking server"

# Check if server is already running
SERVER_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/manager/auth/login/" \
    -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")

if [ "$SERVER_CHECK" != "000" ]; then
    echo "  OK: Server already running at $BASE_URL"
else
    echo "  Starting Django server on port $PORT..."
    $VENV_PYTHON manage.py runserver "$PORT" > /dev/null 2>&1 &
    SERVER_PID=$!
    SERVER_STARTED=true
    sleep 3

    # Verify server started
    SERVER_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/manager/auth/login/" \
        -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")

    if [ "$SERVER_CHECK" != "000" ]; then
        echo "  OK: Server started (PID: $SERVER_PID)"
    else
        echo "  ERROR: Failed to start server"
        exit 1
    fi
fi

# ============================================================
# Step 3: Get auth tokens
# ============================================================
log_header "[3/7] Getting auth tokens"

OWNER_TOKEN=$(get_token "owner@test.com" "$TEST_PASSWORD")
if [ -z "$OWNER_TOKEN" ]; then
    echo "  ERROR: Failed to get Owner token"
    echo "  Make sure owner@test.com exists with password: $TEST_PASSWORD"
    exit 1
fi
echo "  OK: Owner token acquired"

MANAGER_TOKEN=$(get_token "manager@test.com" "$TEST_PASSWORD")
if [ -z "$MANAGER_TOKEN" ]; then
    echo "  ERROR: Failed to get Manager token"
    exit 1
fi
echo "  OK: Manager token acquired"

STAFF_TOKEN=$(get_token "staff@test.com" "$TEST_PASSWORD")
if [ -z "$STAFF_TOKEN" ]; then
    echo "  ERROR: Failed to get Staff token"
    exit 1
fi
echo "  OK: Staff token acquired"

CLEANER_TOKEN=$(get_cleaner_token "+971500000001" "1234")
if [ -z "$CLEANER_TOKEN" ]; then
    echo "  WARN: Cleaner token not acquired (cleaner may not exist)"
fi
if [ -n "$CLEANER_TOKEN" ]; then
    echo "  OK: Cleaner token acquired"
fi

# ============================================================
# Step 4: Auth/Me endpoint tests
# ============================================================
log_header "[4/7] Testing Auth/Me endpoints"

echo ""
echo "--- GET /api/me/ (should return user info) ---"

RESPONSE=$(auth_get "$OWNER_TOKEN" "/api/me/")
if json_has "$RESPONSE" "role" "owner"; then
    pass "Owner can access /api/me/"
else
    fail "Owner /api/me/ - expected role=owner, got: $RESPONSE"
fi

RESPONSE=$(auth_get "$MANAGER_TOKEN" "/api/me/")
if json_has "$RESPONSE" "role" "manager"; then
    pass "Manager can access /api/me/"
else
    fail "Manager /api/me/ - expected role=manager, got: $RESPONSE"
fi

RESPONSE=$(auth_get "$STAFF_TOKEN" "/api/me/")
if json_has "$RESPONSE" "role" "staff"; then
    pass "Staff can access /api/me/"
else
    fail "Staff /api/me/ - expected role=staff, got: $RESPONSE"
fi

if [ -n "$CLEANER_TOKEN" ]; then
    RESPONSE=$(auth_get "$CLEANER_TOKEN" "/api/me/")
    if json_has "$RESPONSE" "role" "cleaner"; then
        pass "Cleaner can access /api/me/"
    else
        fail "Cleaner /api/me/ - expected role=cleaner, got: $RESPONSE"
    fi
fi

# ============================================================
# Step 5: Settings/Billing endpoint tests
# ============================================================
log_header "[5/7] Testing Settings/Billing endpoints"

echo ""
echo "--- GET /api/settings/billing/ ---"

RESPONSE=$(auth_get "$OWNER_TOKEN" "/api/settings/billing/")
if json_has "$RESPONSE" "can_manage" "true"; then
    pass "Owner can access billing (can_manage=true)"
else
    fail "Owner billing - expected can_manage=true, got: $RESPONSE"
fi

RESPONSE=$(auth_get "$MANAGER_TOKEN" "/api/settings/billing/")
if json_has "$RESPONSE" "can_manage" "false"; then
    pass "Manager can access billing (can_manage=false, read-only)"
else
    fail "Manager billing - expected can_manage=false, got: $RESPONSE"
fi

RESPONSE=$(auth_get "$STAFF_TOKEN" "/api/settings/billing/")
STATUS=$(auth_get_status "$STAFF_TOKEN" "/api/settings/billing/")
if [ "$STATUS" = "403" ]; then
    pass "Staff blocked from billing (403)"
else
    fail "Staff billing - expected 403, got $STATUS: $RESPONSE"
fi

if [ -n "$CLEANER_TOKEN" ]; then
    STATUS=$(auth_get_status "$CLEANER_TOKEN" "/api/settings/billing/")
    if [ "$STATUS" = "403" ]; then
        pass "Cleaner blocked from billing (403)"
    else
        fail "Cleaner billing - expected 403, got $STATUS"
    fi
fi

echo ""
echo "--- GET /api/settings/billing/invoices/999/download/ ---"

STATUS=$(auth_get_status "$OWNER_TOKEN" "/api/settings/billing/invoices/999/download/")
if [ "$STATUS" = "501" ]; then
    pass "Owner invoice download returns 501 (not implemented)"
else
    fail "Owner invoice download - expected 501, got $STATUS"
fi

STATUS=$(auth_get_status "$MANAGER_TOKEN" "/api/settings/billing/invoices/999/download/")
if [ "$STATUS" = "403" ]; then
    pass "Manager blocked from invoice download (403)"
else
    fail "Manager invoice download - expected 403, got $STATUS"
fi

STATUS=$(auth_get_status "$STAFF_TOKEN" "/api/settings/billing/invoices/999/download/")
if [ "$STATUS" = "403" ]; then
    pass "Staff blocked from invoice download (403)"
else
    fail "Staff invoice download - expected 403, got $STATUS"
fi

# ============================================================
# Step 6: Company/Team endpoint tests
# ============================================================
log_header "[6/7] Testing Company/Team endpoints"

echo ""
echo "--- GET /api/company/ ---"

STATUS=$(auth_get_status "$OWNER_TOKEN" "/api/company/")
if [ "$STATUS" = "200" ]; then
    pass "Owner can access company profile (200)"
else
    fail "Owner company - expected 200, got $STATUS"
fi

STATUS=$(auth_get_status "$MANAGER_TOKEN" "/api/company/")
if [ "$STATUS" = "200" ]; then
    pass "Manager can access company profile (200)"
else
    fail "Manager company - expected 200, got $STATUS"
fi

STATUS=$(auth_get_status "$STAFF_TOKEN" "/api/company/")
if [ "$STATUS" = "403" ]; then
    pass "Staff blocked from company profile (403)"
else
    fail "Staff company - expected 403, got $STATUS"
fi

echo ""
echo "--- GET /api/company/cleaners/ ---"

STATUS=$(auth_get_status "$OWNER_TOKEN" "/api/company/cleaners/")
if [ "$STATUS" = "200" ]; then
    pass "Owner can access cleaners list (200)"
else
    fail "Owner cleaners - expected 200, got $STATUS"
fi

STATUS=$(auth_get_status "$MANAGER_TOKEN" "/api/company/cleaners/")
if [ "$STATUS" = "200" ]; then
    pass "Manager can access cleaners list (200)"
else
    fail "Manager cleaners - expected 200, got $STATUS"
fi

# ============================================================
# Step 7: Trial enforcement test
# ============================================================
log_header "[7/8] Testing Trial enforcement"

echo ""
echo "--- POST /api/manager/jobs/ with expired trial ---"

# Temporarily set trial to expired
TRIAL_TEST_RESULT=$($VENV_PYTHON -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.accounts.models import Company
from django.utils import timezone
from datetime import timedelta

c = Company.objects.filter(name='Test Company').first()
if not c:
    print('NO_COMPANY')
else:
    c.plan = 'trial'
    c.trial_expires_at = timezone.now() - timedelta(days=1)
    c.save()
    print('OK')
" 2>/dev/null || echo "ERROR")

if [ "$TRIAL_TEST_RESULT" = "OK" ]; then
    TRIAL_MODIFIED=true

    # Get test IDs for job creation
    TEST_IDS=$($VENV_PYTHON -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth import get_user_model
from apps.accounts.models import Company
from apps.locations.models import Location
User = get_user_model()
company = Company.objects.filter(name='Test Company').first()
if company:
    loc = Location.objects.filter(company=company).first()
    cleaner = User.objects.filter(role='cleaner', company=company).first()
    print(f'{loc.id if loc else 1},{cleaner.id if cleaner else 1}')
else:
    print('1,1')
" 2>/dev/null || echo "1,1")

    LOCATION_ID=$(echo "$TEST_IDS" | cut -d',' -f1)
    CLEANER_ID=$(echo "$TEST_IDS" | cut -d',' -f2)

    # Try to create job with expired trial
    RESPONSE=$(auth_post "$MANAGER_TOKEN" "/api/manager/jobs/" \
        "{\"scheduled_date\":\"2026-12-31\",\"location_id\":$LOCATION_ID,\"cleaner_id\":$CLEANER_ID}")
    STATUS=$(auth_post_status "$MANAGER_TOKEN" "/api/manager/jobs/" \
        "{\"scheduled_date\":\"2026-12-31\",\"location_id\":$LOCATION_ID,\"cleaner_id\":$CLEANER_ID}")

    if [ "$STATUS" = "403" ] && json_has_code "$RESPONSE" "trial_expired"; then
        pass "Job creation blocked with code=trial_expired (403)"
    elif [ "$STATUS" = "403" ]; then
        pass "Job creation blocked (403) - trial enforcement working"
    else
        fail "Job creation should be blocked - got $STATUS: $RESPONSE"
    fi

    # Restore trial
    $VENV_PYTHON -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.accounts.models import Company
from django.utils import timezone
from datetime import timedelta

c = Company.objects.filter(name='Test Company').first()
if c:
    c.plan = 'active'
    c.trial_expires_at = timezone.now() + timedelta(days=7)
    c.save()
" 2>/dev/null
    TRIAL_MODIFIED=false
    echo "  (Trial restored to active)"
else
    skip "Trial test - could not set up test company ($TRIAL_TEST_RESULT)"
fi

# ============================================================
# Step 8: Paid company test
# ============================================================
log_header "[8/8] Testing Paid company bypass"

echo ""
echo "--- POST /api/manager/jobs/ with paid plan (even if trial_expires_at is past) ---"

# Set company to paid (active) but with past trial_expires_at
PAID_TEST_RESULT=$($VENV_PYTHON -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.accounts.models import Company
from django.utils import timezone
from datetime import timedelta

c = Company.objects.filter(name='Test Company').first()
if not c:
    print('NO_COMPANY')
else:
    c.plan = 'active'  # PAID
    c.trial_expires_at = timezone.now() - timedelta(days=30)  # Past date
    c.save()
    print('OK')
" 2>/dev/null || echo "ERROR")

if [ "$PAID_TEST_RESULT" = "OK" ]; then
    TRIAL_MODIFIED=true

    # Get test IDs for job creation
    TEST_IDS=$($VENV_PYTHON -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth import get_user_model
from apps.accounts.models import Company
from apps.locations.models import Location
User = get_user_model()
company = Company.objects.filter(name='Test Company').first()
if company:
    loc = Location.objects.filter(company=company).first()
    cleaner = User.objects.filter(role='cleaner', company=company).first()
    print(f'{loc.id if loc else 1},{cleaner.id if cleaner else 1}')
else:
    print('1,1')
" 2>/dev/null || echo "1,1")

    LOCATION_ID=$(echo "$TEST_IDS" | cut -d',' -f1)
    CLEANER_ID=$(echo "$TEST_IDS" | cut -d',' -f2)

    # Try to create job with paid plan (should succeed)
    STATUS=$(auth_post_status "$MANAGER_TOKEN" "/api/manager/jobs/" \
        "{\"scheduled_date\":\"2026-12-31\",\"location_id\":$LOCATION_ID,\"cleaner_id\":$CLEANER_ID}")

    if [ "$STATUS" = "201" ]; then
        pass "Paid company can create jobs (201) - bypass working"
    elif [ "$STATUS" = "400" ]; then
        # 400 means validation error (not blocking), job creation is allowed
        pass "Paid company job creation not blocked (400 validation, not 403)"
    else
        fail "Paid company job creation - expected 201 or 400, got $STATUS"
    fi

    # Restore to active state
    $VENV_PYTHON -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.accounts.models import Company
from django.utils import timezone
from datetime import timedelta

c = Company.objects.filter(name='Test Company').first()
if c:
    c.plan = 'active'
    c.trial_expires_at = timezone.now() + timedelta(days=7)
    c.save()
" 2>/dev/null
    TRIAL_MODIFIED=false
    echo "  (Company restored to active state)"
else
    skip "Paid company test - could not set up test company ($PAID_TEST_RESULT)"
fi

# ============================================================
# Summary
# ============================================================
echo ""
echo "============================================================"
echo "SUMMARY"
echo "============================================================"
echo ""
echo "Total tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}ALL PASSED${NC}"
    echo -e "${GREEN}============================================================${NC}"
    exit 0
else
    echo -e "${RED}============================================================${NC}"
    echo -e "${RED}FAILED - $FAILED test(s) failed${NC}"
    echo -e "${RED}============================================================${NC}"
    exit 1
fi
