#!/bin/bash
# Verification script for Company API (Org-scope, Owner/Manager)
# Usage: ./verify_company_api.sh

set -e

echo "=================================================="
echo "Company API Verification Script"
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

# Get auth token for Owner
echo ""
echo "[2] Getting auth token for Owner..."
TOKEN_RESPONSE=$(curl -s -X POST http://127.0.0.1:8001/api/manager/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"email":"owner@test.com","password":"testpass123!"}')

OWNER_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$OWNER_TOKEN" ]; then
    echo "✗ Failed to get Owner auth token"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "✓ Owner token received: ${OWNER_TOKEN:0:20}..."

# Get auth token for Manager
echo ""
echo "[3] Getting auth token for Manager..."
MANAGER_TOKEN_RESPONSE=$(curl -s -X POST http://127.0.0.1:8001/api/manager/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"email":"manager@test.com","password":"Test1234!"}')

MANAGER_TOKEN=$(echo $MANAGER_TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$MANAGER_TOKEN" ]; then
    echo "✗ Failed to get Manager auth token"
    echo "Response: $MANAGER_TOKEN_RESPONSE"
    exit 1
fi

echo "✓ Manager token received: ${MANAGER_TOKEN:0:20}..."

# Test endpoints
echo ""
echo "[4] Testing Company Profile endpoints..."

echo ""
echo "  → GET /api/company/ (Owner)"
RESPONSE=$(curl -s -X GET http://127.0.0.1:8001/api/company/ \
    -H "Authorization: Token $OWNER_TOKEN")
echo "  Response: $RESPONSE" | head -c 200
echo ""

if echo "$RESPONSE" | grep -q "name"; then
    echo "  ✓ GET /api/company/ works for Owner"
else
    echo "  ✗ GET /api/company/ failed for Owner"
fi

echo ""
echo "  → GET /api/company/ (Manager)"
RESPONSE=$(curl -s -X GET http://127.0.0.1:8001/api/company/ \
    -H "Authorization: Token $MANAGER_TOKEN")
echo "  Response: $RESPONSE" | head -c 200
echo ""

if echo "$RESPONSE" | grep -q "name"; then
    echo "  ✓ GET /api/company/ works for Manager"
else
    echo "  ✗ GET /api/company/ failed for Manager"
fi

echo ""
echo "  → PATCH /api/company/ (Owner - update company)"
RESPONSE=$(curl -s -X PATCH http://127.0.0.1:8001/api/company/ \
    -H "Authorization: Token $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Updated Company Name","contact_email":"ops@company.com"}')
echo "  Response: $RESPONSE" | head -c 200
echo ""

if echo "$RESPONSE" | grep -q "Updated Company Name"; then
    echo "  ✓ PATCH /api/company/ works"
else
    echo "  ✗ PATCH /api/company/ failed"
fi

echo ""
echo "[5] Testing Company Cleaners endpoints..."

echo ""
echo "  → GET /api/company/cleaners/ (Owner)"
RESPONSE=$(curl -s -X GET http://127.0.0.1:8001/api/company/cleaners/ \
    -H "Authorization: Token $OWNER_TOKEN")
echo "  Response: $RESPONSE" | head -c 300
echo ""

if echo "$RESPONSE" | grep -q "full_name"; then
    echo "  ✓ GET /api/company/cleaners/ works for Owner"
else
    echo "  ✗ GET /api/company/cleaners/ failed for Owner"
fi

echo ""
echo "  → GET /api/company/cleaners/ (Manager)"
RESPONSE=$(curl -s -X GET http://127.0.0.1:8001/api/company/cleaners/ \
    -H "Authorization: Token $MANAGER_TOKEN")
echo "  Response: $RESPONSE" | head -c 300
echo ""

if echo "$RESPONSE" | grep -q "full_name"; then
    echo "  ✓ GET /api/company/cleaners/ works for Manager"
else
    echo "  ✗ GET /api/company/cleaners/ failed for Manager"
fi

echo ""
echo "  → POST /api/company/cleaners/ (Owner - create cleaner)"
RESPONSE=$(curl -s -X POST http://127.0.0.1:8001/api/company/cleaners/ \
    -H "Authorization: Token $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"full_name":"Test Cleaner","phone":"+971 50 999 8888","pin":"1234","is_active":true}')
echo "  Response: $RESPONSE" | head -c 200
echo ""

if echo "$RESPONSE" | grep -q "Test Cleaner"; then
    echo "  ✓ POST /api/company/cleaners/ works"
else
    echo "  ✗ POST /api/company/cleaners/ failed"
    echo "  Full Response: $RESPONSE"
fi

echo ""
echo "[6] Testing RBAC (Staff/Cleaner should get 403)..."

# Try to get cleaner token
echo ""
echo "  → Getting Cleaner token..."
CLEANER_TOKEN_RESPONSE=$(curl -s -X POST http://127.0.0.1:8001/auth/cleaner-login/ \
    -H "Content-Type: application/json" \
    -d '{"phone":"+971500000001","pin":"1234"}')

CLEANER_TOKEN=$(echo $CLEANER_TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$CLEANER_TOKEN" ]; then
    echo "  ⚠ Could not get Cleaner token (might not exist in test data)"
else
    echo "  ✓ Cleaner token received: ${CLEANER_TOKEN:0:20}..."

    echo ""
    echo "  → GET /api/company/ (Cleaner - should return 403)"
    RESPONSE=$(curl -s -w "%{http_code}" -X GET http://127.0.0.1:8001/api/company/ \
        -H "Authorization: Token $CLEANER_TOKEN")
    HTTP_CODE="${RESPONSE:(-3)}"
    echo "  HTTP Status: $HTTP_CODE"

    if [ "$HTTP_CODE" = "403" ]; then
        echo "  ✓ Cleaner correctly blocked from GET /api/company/"
    else
        echo "  ✗ Cleaner should get 403 for GET /api/company/"
    fi
fi

echo ""
echo "[7] Testing Error Format..."

echo ""
echo "  → PATCH /api/company/ (empty name - validation error)"
RESPONSE=$(curl -s -X PATCH http://127.0.0.1:8001/api/company/ \
    -H "Authorization: Token $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":""}')
echo "  Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "code"; then
    echo "  ✓ Error format includes 'code' field"
else
    echo "  ✗ Error format missing 'code' field"
fi

if echo "$RESPONSE" | grep -q "message"; then
    echo "  ✓ Error format includes 'message' field"
else
    echo "  ✗ Error format missing 'message' field"
fi

echo ""
echo "=================================================="
echo "Verification Complete"
echo "=================================================="
