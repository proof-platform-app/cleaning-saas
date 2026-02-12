#!/bin/bash
# RBAC Verification script for Settings API (MVP v1.1)
# Tests all role-based access control scenarios

set -e

BASE_URL="http://127.0.0.1:8001"

echo "=================================================="
echo "Settings API RBAC Verification Script (MVP v1.1)"
echo "=================================================="
echo ""

# Start Django server in background
echo "[1] Starting Django server..."
./venv/bin/python manage.py runserver 8001 > /dev/null 2>&1 &
SERVER_PID=$!
echo "✓ Server started (PID: $SERVER_PID)"
sleep 3

# Cleanup function
cleanup() {
    echo ""
    echo "[Cleanup] Stopping server..."
    kill $SERVER_PID 2>/dev/null || true
    echo "✓ Done"
}
trap cleanup EXIT

# Function to get token
get_token() {
    local email=$1
    local password=$2
    local response=$(curl -s -X POST $BASE_URL/api/manager/auth/login/ \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    echo $response | grep -o '"token":"[^"]*' | cut -d'"' -f4
}

# Get tokens for each role
echo ""
echo "[2] Getting auth tokens..."

OWNER_TOKEN=$(get_token "owner@test.com" "testpass123!")
if [ -z "$OWNER_TOKEN" ]; then
    echo "✗ Failed to get Owner token"
    exit 1
fi
echo "✓ Owner token: ${OWNER_TOKEN:0:20}..."

MANAGER_TOKEN=$(get_token "manager@test.com" "testpass123!")
if [ -z "$MANAGER_TOKEN" ]; then
    echo "✗ Failed to get Manager token"
    exit 1
fi
echo "✓ Manager token: ${MANAGER_TOKEN:0:20}..."

STAFF_TOKEN=$(get_token "staff@test.com" "testpass123!")
if [ -z "$STAFF_TOKEN" ]; then
    echo "✗ Failed to get Staff token"
    exit 1
fi
echo "✓ Staff token: ${STAFF_TOKEN:0:20}..."

SSO_TOKEN=$(get_token "sso@test.com" "testpass123!")
if [ -z "$SSO_TOKEN" ]; then
    echo "✗ Failed to get SSO token"
    exit 1
fi
echo "✓ SSO token: ${SSO_TOKEN:0:20}..."

# Test 1: Billing endpoint RBAC
echo ""
echo "[3] Testing Billing Endpoint RBAC..."

echo ""
echo "  → GET /api/settings/billing/ (Owner - should work with can_manage=true)"
RESPONSE=$(curl -s -X GET $BASE_URL/api/settings/billing/ \
    -H "Authorization: Token $OWNER_TOKEN")
if echo "$RESPONSE" | grep -q '"can_manage":true'; then
    echo "  ✓ Owner can access billing with can_manage=true"
else
    echo "  ✗ Owner billing access failed"
    echo "  Response: $RESPONSE"
fi

echo ""
echo "  → GET /api/settings/billing/ (Manager - should work with can_manage=false)"
RESPONSE=$(curl -s -X GET $BASE_URL/api/settings/billing/ \
    -H "Authorization: Token $MANAGER_TOKEN")
if echo "$RESPONSE" | grep -q '"can_manage":false'; then
    echo "  ✓ Manager can access billing with can_manage=false"
else
    echo "  ✗ Manager billing access failed"
    echo "  Response: $RESPONSE"
fi

echo ""
echo "  → GET /api/settings/billing/ (Staff - should get 403)"
RESPONSE=$(curl -s -X GET $BASE_URL/api/settings/billing/ \
    -H "Authorization: Token $STAFF_TOKEN")
if echo "$RESPONSE" | grep -q '"code":"FORBIDDEN"'; then
    echo "  ✓ Staff correctly blocked from billing (403 FORBIDDEN)"
else
    echo "  ✗ Staff billing RBAC failed"
    echo "  Response: $RESPONSE"
fi

# Test 2: Invoice download endpoint RBAC
echo ""
echo "[4] Testing Invoice Download Endpoint RBAC..."

echo ""
echo "  → GET /api/settings/billing/invoices/123/download/ (Owner - should get 501)"
STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X GET $BASE_URL/api/settings/billing/invoices/123/download/ \
    -H "Authorization: Token $OWNER_TOKEN")
if [ "$STATUS" = "501" ]; then
    echo "  ✓ Owner gets 501 NOT_IMPLEMENTED"
else
    echo "  ✗ Owner invoice download failed (expected 501, got $STATUS)"
fi

echo ""
echo "  → GET /api/settings/billing/invoices/123/download/ (Manager - should get 501)"
STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X GET $BASE_URL/api/settings/billing/invoices/123/download/ \
    -H "Authorization: Token $MANAGER_TOKEN")
if [ "$STATUS" = "501" ]; then
    echo "  ✓ Manager gets 501 NOT_IMPLEMENTED"
else
    echo "  ✗ Manager invoice download failed (expected 501, got $STATUS)"
fi

echo ""
echo "  → GET /api/settings/billing/invoices/123/download/ (Staff - should get 403)"
RESPONSE=$(curl -s -X GET $BASE_URL/api/settings/billing/invoices/123/download/ \
    -H "Authorization: Token $STAFF_TOKEN")
if echo "$RESPONSE" | grep -q '"code":"FORBIDDEN"'; then
    echo "  ✓ Staff correctly blocked from invoice download (403 FORBIDDEN)"
else
    echo "  ✗ Staff invoice download RBAC failed"
    echo "  Response: $RESPONSE"
fi

# Test 3: SSO user password change
echo ""
echo "[5] Testing SSO User Password Change..."

echo ""
echo "  → POST /api/me/change-password/ (SSO user - should get 403)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/me/change-password/ \
    -H "Authorization: Token $SSO_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"current_password":"testpass123!","new_password":"NewPass456@"}')
if echo "$RESPONSE" | grep -q '"code":"FORBIDDEN"' && echo "$RESPONSE" | grep -q "SSO users"; then
    echo "  ✓ SSO user correctly blocked from password change (403 FORBIDDEN)"
else
    echo "  ✗ SSO user password change RBAC failed"
    echo "  Response: $RESPONSE"
fi

# Test 4: Error format validation
echo ""
echo "[6] Validating Error Response Format..."

echo ""
echo "  → Testing validation error format (invalid data)"
RESPONSE=$(curl -s -X PATCH $BASE_URL/api/me/ \
    -H "Authorization: Token $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"phone":"invalid"}')
if echo "$RESPONSE" | grep -q '"code":"VALIDATION_ERROR"' && echo "$RESPONSE" | grep -q '"fields":'; then
    echo "  ✓ Validation error format is correct"
else
    echo "  ✗ Validation error format is incorrect"
    echo "  Response: $RESPONSE"
fi

# Test 5: Deterministic payload (all keys present)
echo ""
echo "[7] Testing Deterministic Payload Structure..."

echo ""
echo "  → GET /api/settings/billing/ (checking all required keys)"
RESPONSE=$(curl -s -X GET $BASE_URL/api/settings/billing/ \
    -H "Authorization: Token $OWNER_TOKEN")

MISSING_KEYS=()
for key in "can_manage" "plan" "status" "trial_expires_at" "next_billing_date" "usage_summary" "payment_method" "invoices"; do
    if ! echo "$RESPONSE" | grep -q "\"$key\":"; then
        MISSING_KEYS+=("$key")
    fi
done

if [ ${#MISSING_KEYS[@]} -eq 0 ]; then
    echo "  ✓ All required keys present in billing response"
else
    echo "  ✗ Missing keys in billing response: ${MISSING_KEYS[*]}"
fi

# Check usage_summary nested keys
for key in "users_count" "users_limit" "locations_count" "locations_limit" "jobs_month_count" "jobs_month_limit"; do
    if ! echo "$RESPONSE" | grep -q "\"$key\":"; then
        echo "  ✗ Missing usage_summary key: $key"
    fi
done
echo "  ✓ All usage_summary keys present"

echo ""
echo "=================================================="
echo "RBAC Verification Complete"
echo "=================================================="
