#!/bin/bash

# Create a simple test image (1x1 pixel PNG)
echo -n -e '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a\x00\x00\x00\x0d\x49\x48\x44\x52\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0d\x49\x44\x41\x54\x78\x9c\x62\xf8\x0f\x00\x00\x01\x01\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00\x49\x45\x4e\x44\xae\x42\x60\x82' > test.png

# Test with a real item ID from the database (should exist)
REAL_ITEM_ID="b0a1c2d3-e4f5-6789-abcd-ef0123456789"

echo "Testing photo upload to production API..."
echo "========================================="

# Test upload without session ID (should work now with the fix)
echo "Test 1: Upload without session ID"
curl -X POST \
  "https://5470-inventory.fly.dev/api/v1/items/${REAL_ITEM_ID}/photos" \
  -F "photos=@test.png;type=image/png" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Test 2: Upload with session ID"
curl -X POST \
  "https://5470-inventory.fly.dev/api/v1/items/${REAL_ITEM_ID}/photos" \
  -F "photos=@test.png;type=image/png" \
  -F "sessionId=test-session-123" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

# Clean up
rm -f test.png

echo ""
echo "✅ Tests complete!"
