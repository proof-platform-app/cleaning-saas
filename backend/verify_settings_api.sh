#!/bin/bash
# Verification script for Settings API (MVP v1.1)
# Usage: ./verify_settings_api.sh

set -e

echo "=================================================="
echo "Settings API Verification Script (MVP v1.1)"
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

# Get auth token
echo ""
echo "[2] Getting auth token..."
TOKEN_RESPONSE=$(curl -s -X POST http://127.0.0.1:8001/api/manager/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"email":"owner@test.com","password":"testpass123!"}')

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "✗ Failed to get auth token"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "✓ Token received: ${TOKEN:0:20}..."

# Test endpoints
echo ""
echo "[3] Testing Account endpoints..."

echo ""
echo "  → GET /api/me (current user)"
RESPONSE=$(curl -s -X GET http://127.0.0.1:8001/api/me/ \
    -H "Authorization: Token $TOKEN")
echo "  Response: $RESPONSE" | head -c 200
echo ""

if echo "$RESPONSE" | grep -q "full_name"; then
    echo "  ✓ GET /api/me works"
else
    echo "  ✗ GET /api/me failed"
fi

echo ""
echo "  → PATCH /api/me (update profile)"
RESPONSE=$(curl -s -X PATCH http://127.0.0.1:8001/api/me/ \
    -H "Authorization: Token $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"full_name":"Updated Owner","phone":"+971 50 123 4567"}')
echo "  Response: $RESPONSE" | head -c 200
echo ""

if echo "$RESPONSE" | grep -q "Updated Owner"; then
    echo "  ✓ PATCH /api/me works"
else
    echo "  ✗ PATCH /api/me failed"
fi

echo ""
echo "  → POST /api/me/change-password (change password)"
RESPONSE=$(curl -s -X POST http://127.0.0.1:8001/api/me/change-password/ \
    -H "Authorization: Token $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"current_password":"testpass123!","new_password":"NewPass456@"}')
echo "  Response: $RESPONSE" | head -c 200
echo ""

if echo "$RESPONSE" | grep -q "successfully"; then
    echo "  ✓ POST /api/me/change-password works"
else
    echo "  ✗ POST /api/me/change-password failed"
fi

echo ""
echo "[4] Testing Notifications endpoints..."

echo ""
echo "  → GET /api/me/notification-preferences"
RESPONSE=$(curl -s -X GET http://127.0.0.1:8001/api/me/notification-preferences/ \
    -H "Authorization: Token $TOKEN")
echo "  Response: $RESPONSE" | head -c 200
echo ""

if echo "$RESPONSE" | grep -q "email_notifications"; then
    echo "  ✓ GET /api/me/notification-preferences works"
else
    echo "  ✗ GET /api/me/notification-preferences failed"
fi

echo ""
echo "  → PATCH /api/me/notification-preferences"
RESPONSE=$(curl -s -X PATCH http://127.0.0.1:8001/api/me/notification-preferences/ \
    -H "Authorization: Token $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"email_notifications":false}')
echo "  Response: $RESPONSE" | head -c 200
echo ""

if echo "$RESPONSE" | grep -q "email_notifications"; then
    echo "  ✓ PATCH /api/me/notification-preferences works"
else
    echo "  ✗ PATCH /api/me/notification-preferences failed"
fi

echo ""
echo "[5] Testing Billing endpoints..."

echo ""
echo "  → GET /api/settings/billing (Owner - should work)"
RESPONSE=$(curl -s -X GET http://127.0.0.1:8001/api/settings/billing/ \
    -H "Authorization: Token $TOKEN")
echo "  Response: $RESPONSE" | head -c 300
echo ""

if echo "$RESPONSE" | grep -q "can_manage"; then
    echo "  ✓ GET /api/settings/billing works"
else
    echo "  ✗ GET /api/settings/billing failed"
fi

echo ""
echo "  → GET /api/settings/billing/invoices/123/download (should return 501)"
RESPONSE=$(curl -s -w "%{http_code}" -X GET http://127.0.0.1:8001/api/settings/billing/invoices/123/download/ \
    -H "Authorization: Token $TOKEN")
echo "  HTTP Status: ${RESPONSE:(-3)}"

if [ "${RESPONSE:(-3)}" = "501" ]; then
    echo "  ✓ GET /api/settings/billing/invoices/:id/download returns 501 (as expected)"
else
    echo "  ✗ GET /api/settings/billing/invoices/:id/download failed"
fi

echo ""
echo "=================================================="
echo "Verification Complete"
echo "=================================================="
