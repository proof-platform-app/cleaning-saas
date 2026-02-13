#!/bin/bash
# ============================================================
# verify_roles.sh — RBAC Smoke Test (Regression Guard)
# ============================================================
#
# Purpose: Quick verification that RBAC and key restrictions
#          are not broken. Runs in 30-60 seconds.
#
# Usage:
#   cd backend
#   ./verify_roles.sh
#
# Expected output:
#   - Clear ✓/✗ lines for each test
#   - "ALL PASSED" or "FAILED" at the end
#   - Exit code 0 if all pass, non-zero otherwise
#
# DEV credentials (do not log tokens/passwords):
#   Owner:   owner@test.com / testpass123!
#   Manager: manager@test.com / testpass123!
#   Staff:   staff@test.com / testpass123!
#   Cleaner: +971500000001 / PIN 1234
#
# ============================================================

set -e

BASE_URL="${API_BASE_URL:-http://127.0.0.1:8001}"
VENV_PYTHON="./venv/bin/python"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# ============================================================
# Helper functions
# ============================================================

log_header() {
    echo ""
    echo "============================================================"
    echo "$1"
    echo "============================================================"
}

log_test() {
    echo -n "  → $1... "
}

pass() {
    echo -e "${GREEN}✓${NC} $1"
    PASSED=$((PASSED + 1))
    TOTAL=$((TOTAL + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    FAILED=$((FAILED + 1))
    TOTAL=$((TOTAL + 1))
}

# Get token via email/password login
get_token() {
    local email=$1
    local password=$2
    local response=$(curl -s -X POST "$BASE_URL/api/manager/auth/login/" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    echo "$response" | $VENV_PYTHON -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null || echo ""
}

# Get cleaner token via phone/PIN login
get_cleaner_token() {
    local phone=$1
    local pin=$2
    local response=$(curl -s -X POST "$BASE_URL/api/auth/cleaner-login/" \
        -H "Content-Type: application/json" \
        -d "{\"phone\":\"$phone\",\"pin\":\"$pin\"}")
    echo "$response" | $VENV_PYTHON -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null || echo ""
}

# Make authenticated GET request
auth_get() {
    local token=$1
    local url=$2
    curl -s -X GET "$BASE_URL$url" -H "Authorization: Token $token"
}

# Make authenticated GET request and return status code
auth_get_status() {
    local token=$1
    local url=$2
    curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL$url" -H "Authorization: Token $token"
}

# Make authenticated POST request
auth_post() {
    local token=$1
    local url=$2
    local data=$3
    curl -s -X POST "$BASE_URL$url" \
        -H "Authorization: Token $token" \
        -H "Content-Type: application/json" \
        -d "$data"
}

# Make authenticated POST request and return status code
auth_post_status() {
    local token=$1
    local url=$2
    local data=$3
    curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL$url" \
        -H "Authorization: Token $token" \
        -H "Content-Type: application/json" \
        -d "$data"
}

# Extract JSON field using Python (no jq dependency)
json_get() {
    local json=$1
    local field=$2
    echo "$json" | $VENV_PYTHON -c "import sys,json; d=json.load(sys.stdin); print(d.get('$field',''))" 2>/dev/null || echo ""
}

# Check if JSON contains a field with expected value
json_has() {
    local json=$1
    local field=$2
    local expected=$3
    local actual=$(echo "$json" | $VENV_PYTHON -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('$field','')).lower())" 2>/dev/null || echo "")
    [[ "$actual" == "$expected" ]]
}

# Check if JSON contains a code field
json_has_code() {
    local json=$1
    local expected_code=$2
    local actual=$(echo "$json" | $VENV_PYTHON -c "import sys,json; d=json.load(sys.stdin); print(d.get('code',''))" 2>/dev/null || echo "")
    [[ "$actual" == "$expected_code" ]]
}

# ============================================================
# Main script
# ============================================================

echo ""
echo "============================================================"
echo "RBAC SMOKE TEST — verify_roles.sh"
echo "============================================================"
echo "Base URL: $BASE_URL"
echo ""

# ============================================================
# Step 1: Setup test users
# ============================================================
log_header "[1/7] Setting up test users"

if [ -f "setup_test_users.py" ]; then
    $VENV_PYTHON setup_test_users.py > /dev/null 2>&1
    echo "  ✓ Test users created/updated"
else
    echo "  ! Warning: setup_test_users.py not found"
fi

# ============================================================
# Step 2: Start Django server (if not running)
# ============================================================
log_header "[2/7] Checking server"

# Check if server is already running by trying the login endpoint
SERVER_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/manager/auth/login/" -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
if [ "$SERVER_CHECK" != "000" ]; then
    echo "  ✓ Server already running"
    SERVER_STARTED=false
else
    echo "  Starting Django server..."
    $VENV_PYTHON manage.py runserver 8001 > /dev/null 2>&1 &
    SERVER_PID=$!
    SERVER_STARTED=true
    sleep 3

    SERVER_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/manager/auth/login/" -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
    if [ "$SERVER_CHECK" != "000" ]; then
        echo "  ✓ Server started (PID: $SERVER_PID)"
    else
        echo "  ✗ Failed to start server"
        exit 1
    fi
fi

# Cleanup function
cleanup() {
    if [ "$SERVER_STARTED" = true ] && [ -n "$SERVER_PID" ]; then
        echo ""
        echo "[Cleanup] Stopping server..."
        kill $SERVER_PID 2>/dev/null || true
        echo "  ✓ Done"
    fi

    # Restore trial expiry if modified
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
if c and c.plan == 'trial':
    c.trial_expires_at = timezone.now() + timedelta(days=7)
    c.save()
    print('  ✓ Trial expiry restored')
" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# ============================================================
# Step 3: Get auth tokens
# ============================================================
log_header "[3/7] Getting auth tokens"

OWNER_TOKEN=$(get_token "owner@test.com" "testpass123!")
if [ -z "$OWNER_TOKEN" ]; then
    echo "  ✗ Failed to get Owner token"
    exit 1
fi
echo "  ✓ Owner token acquired"

MANAGER_TOKEN=$(get_token "manager@test.com" "testpass123!")
if [ -z "$MANAGER_TOKEN" ]; then
    echo "  ✗ Failed to get Manager token"
    exit 1
fi
echo "  ✓ Manager token acquired"

STAFF_TOKEN=$(get_token "staff@test.com" "testpass123!")
if [ -z "$STAFF_TOKEN" ]; then
    echo "  ✗ Failed to get Staff token"
    exit 1
fi
echo "  ✓ Staff token acquired"

CLEANER_TOKEN=$(get_cleaner_token "+971500000001" "1234")
if [ -z "$CLEANER_TOKEN" ]; then
    echo "  ! Warning: Failed to get Cleaner token (cleaner may not exist)"
    echo "  ! Some cleaner tests will be skipped"
    CLEANER_TOKEN=""
fi
if [ -n "$CLEANER_TOKEN" ]; then
    echo "  ✓ Cleaner token acquired"
fi

# ============================================================
# Step 4: Auth/Me endpoint tests
# ============================================================
log_header "[4/7] Testing Auth/Me endpoints"

echo ""
echo "--- GET /api/me (200 for all authenticated) ---"

log_test "Owner GET /api/me"
RESPONSE=$(auth_get "$OWNER_TOKEN" "/api/me/")
if json_has "$RESPONSE" "role" "owner"; then
    pass "Owner can access /api/me"
else
    fail "Owner /api/me failed: $RESPONSE"
fi

log_test "Manager GET /api/me"
RESPONSE=$(auth_get "$MANAGER_TOKEN" "/api/me/")
if json_has "$RESPONSE" "role" "manager"; then
    pass "Manager can access /api/me"
else
    fail "Manager /api/me failed: $RESPONSE"
fi

log_test "Staff GET /api/me"
RESPONSE=$(auth_get "$STAFF_TOKEN" "/api/me/")
if json_has "$RESPONSE" "role" "staff"; then
    pass "Staff can access /api/me"
else
    fail "Staff /api/me failed: $RESPONSE"
fi

if [ -n "$CLEANER_TOKEN" ]; then
    log_test "Cleaner GET /api/me"
    RESPONSE=$(auth_get "$CLEANER_TOKEN" "/api/me/")
    if json_has "$RESPONSE" "role" "cleaner"; then
        pass "Cleaner can access /api/me"
    else
        fail "Cleaner /api/me failed: $RESPONSE"
    fi
fi

echo ""
echo "--- POST /api/me/change-password (403 for SSO) ---"

# Get SSO token
SSO_TOKEN=$(get_token "sso@test.com" "testpass123!")
if [ -n "$SSO_TOKEN" ]; then
    log_test "SSO user POST /api/me/change-password"
    RESPONSE=$(auth_post "$SSO_TOKEN" "/api/me/change-password/" '{"current_password":"testpass123!","new_password":"NewPass456@"}')
    if json_has_code "$RESPONSE" "FORBIDDEN"; then
        pass "SSO user blocked from password change (403 FORBIDDEN)"
    else
        fail "SSO password change should be blocked: $RESPONSE"
    fi
else
    echo "  ! Skipping SSO test (no SSO user)"
fi

# ============================================================
# Step 5: Settings/Billing endpoint tests
# ============================================================
log_header "[5/7] Testing Settings/Billing endpoints"

echo ""
echo "--- GET /api/settings/billing ---"

log_test "Owner GET /api/settings/billing"
RESPONSE=$(auth_get "$OWNER_TOKEN" "/api/settings/billing/")
if json_has "$RESPONSE" "can_manage" "true"; then
    pass "Owner can access billing (can_manage=true)"
else
    fail "Owner billing access failed: $RESPONSE"
fi

log_test "Manager GET /api/settings/billing"
RESPONSE=$(auth_get "$MANAGER_TOKEN" "/api/settings/billing/")
if json_has "$RESPONSE" "can_manage" "false"; then
    pass "Manager can access billing (can_manage=false)"
else
    fail "Manager billing access failed: $RESPONSE"
fi

log_test "Staff GET /api/settings/billing"
RESPONSE=$(auth_get "$STAFF_TOKEN" "/api/settings/billing/")
if json_has_code "$RESPONSE" "FORBIDDEN"; then
    pass "Staff blocked from billing (403 FORBIDDEN)"
else
    fail "Staff should be blocked from billing: $RESPONSE"
fi

if [ -n "$CLEANER_TOKEN" ]; then
    log_test "Cleaner GET /api/settings/billing"
    RESPONSE=$(auth_get "$CLEANER_TOKEN" "/api/settings/billing/")
    if json_has_code "$RESPONSE" "FORBIDDEN"; then
        pass "Cleaner blocked from billing (403 FORBIDDEN)"
    else
        fail "Cleaner should be blocked from billing: $RESPONSE"
    fi
fi

echo ""
echo "--- GET /api/settings/billing/invoices/123/download ---"

log_test "Owner GET /api/settings/billing/invoices/123/download"
STATUS=$(auth_get_status "$OWNER_TOKEN" "/api/settings/billing/invoices/123/download/")
if [ "$STATUS" = "501" ]; then
    pass "Owner gets 501 NOT_IMPLEMENTED"
else
    fail "Owner invoice download expected 501, got $STATUS"
fi

log_test "Manager GET /api/settings/billing/invoices/123/download"
RESPONSE=$(auth_get "$MANAGER_TOKEN" "/api/settings/billing/invoices/123/download/")
if json_has_code "$RESPONSE" "FORBIDDEN"; then
    pass "Manager blocked from invoice download (403 FORBIDDEN)"
else
    fail "Manager should be blocked from invoice download: $RESPONSE"
fi

log_test "Staff GET /api/settings/billing/invoices/123/download"
RESPONSE=$(auth_get "$STAFF_TOKEN" "/api/settings/billing/invoices/123/download/")
if json_has_code "$RESPONSE" "FORBIDDEN"; then
    pass "Staff blocked from invoice download (403 FORBIDDEN)"
else
    fail "Staff should be blocked from invoice download: $RESPONSE"
fi

# ============================================================
# Step 6: Company/Team endpoint tests
# ============================================================
log_header "[6/7] Testing Company/Team endpoints"

echo ""
echo "--- GET /api/company/ ---"

log_test "Owner GET /api/company"
STATUS=$(auth_get_status "$OWNER_TOKEN" "/api/company/")
if [ "$STATUS" = "200" ]; then
    pass "Owner can access company profile (200)"
else
    fail "Owner company access failed (status: $STATUS)"
fi

log_test "Manager GET /api/company"
STATUS=$(auth_get_status "$MANAGER_TOKEN" "/api/company/")
if [ "$STATUS" = "200" ]; then
    pass "Manager can access company profile (200)"
else
    fail "Manager company access failed (status: $STATUS)"
fi

log_test "Staff GET /api/company"
STATUS=$(auth_get_status "$STAFF_TOKEN" "/api/company/")
if [ "$STATUS" = "403" ]; then
    pass "Staff blocked from company profile (403)"
else
    fail "Staff should be blocked from company profile (status: $STATUS)"
fi

echo ""
echo "--- GET /api/company/cleaners ---"

log_test "Owner GET /api/company/cleaners"
STATUS=$(auth_get_status "$OWNER_TOKEN" "/api/company/cleaners/")
if [ "$STATUS" = "200" ]; then
    pass "Owner can access cleaners list (200)"
else
    fail "Owner cleaners access failed (status: $STATUS)"
fi

log_test "Manager GET /api/company/cleaners"
STATUS=$(auth_get_status "$MANAGER_TOKEN" "/api/company/cleaners/")
if [ "$STATUS" = "200" ]; then
    pass "Manager can access cleaners list (200)"
else
    fail "Manager cleaners access failed (status: $STATUS)"
fi

echo ""
echo "--- POST /api/company/cleaners/<id>/reset-access ---"

# First, get a cleaner ID from Test Company
CLEANER_ID=$($VENV_PYTHON -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth import get_user_model
from apps.accounts.models import Company
User = get_user_model()
company = Company.objects.filter(name='Test Company').first()
if company:
    c = User.objects.filter(role='cleaner', company=company).first()
    print(c.id if c else '')
else:
    print('')
" 2>/dev/null || echo "")

if [ -n "$CLEANER_ID" ]; then
    log_test "Owner POST /api/company/cleaners/$CLEANER_ID/reset-access"
    RESPONSE=$(auth_post "$OWNER_TOKEN" "/api/company/cleaners/$CLEANER_ID/reset-access/" '{}')
    if echo "$RESPONSE" | grep -q "temp_password"; then
        pass "Owner can reset cleaner access (200)"
    else
        fail "Owner reset access failed: $RESPONSE"
    fi

    log_test "Staff POST /api/company/cleaners/$CLEANER_ID/reset-access"
    RESPONSE=$(auth_post "$STAFF_TOKEN" "/api/company/cleaners/$CLEANER_ID/reset-access/" '{}')
    STATUS=$(auth_post_status "$STAFF_TOKEN" "/api/company/cleaners/$CLEANER_ID/reset-access/" '{}')
    if [ "$STATUS" = "403" ]; then
        pass "Staff blocked from reset access (403)"
    else
        fail "Staff should be blocked from reset access (status: $STATUS)"
    fi
else
    echo "  ! Skipping reset-access tests (no cleaner found)"
fi

# ============================================================
# Step 7: Trial enforcement test
# ============================================================
log_header "[7/7] Testing Trial enforcement"

echo ""
echo "--- POST /api/manager/jobs with expired trial ---"

TRIAL_MODIFIED=false

# Temporarily set trial_expires_at to past
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
    exit()

# Save original values
orig_plan = c.plan
orig_expires = c.trial_expires_at

# Set to expired trial
c.plan = 'trial'
c.trial_expires_at = timezone.now() - timedelta(days=1)
c.save()
print('TRIAL_EXPIRED_SET')
" 2>/dev/null || echo "ERROR")

if [ "$TRIAL_TEST_RESULT" = "TRIAL_EXPIRED_SET" ]; then
    TRIAL_MODIFIED=true

    # Get valid location and cleaner IDs from Test Company
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
    loc_id = loc.id if loc else 999
    clean_id = cleaner.id if cleaner else 999
    print(f'{loc_id},{clean_id}')
else:
    print('999,999')
" 2>/dev/null || echo "999,999")

    LOCATION_ID=$(echo "$TEST_IDS" | cut -d',' -f1)
    TEST_CLEANER_ID=$(echo "$TEST_IDS" | cut -d',' -f2)

    log_test "Manager POST /api/manager/jobs with expired trial"
    RESPONSE=$(auth_post "$MANAGER_TOKEN" "/api/manager/jobs/" "{\"scheduled_date\":\"2026-12-31\",\"location_id\":$LOCATION_ID,\"cleaner_id\":$TEST_CLEANER_ID}")
    if json_has_code "$RESPONSE" "trial_expired"; then
        pass "Job creation blocked with code trial_expired"
    elif echo "$RESPONSE" | grep -qi "trial"; then
        pass "Job creation blocked (trial-related error)"
    else
        fail "Job creation should return trial_expired: $RESPONSE"
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
    echo "  ✓ Trial expiry restored"
else
    echo "  ! Skipping trial test ($TRIAL_TEST_RESULT)"
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
    echo -e "${RED}FAILED${NC}"
    echo -e "${RED}============================================================${NC}"
    exit 1
fi
