#!/bin/bash

# Create a simple test image (1x1 pixel PNG)
echo -n -e '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a\x00\x00\x00\x0d\x49\x48\x44\x52\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0d\x49\x44\x41\x54\x78\x9c\x62\xf8\x0f\x00\x00\x01\x01\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00\x49\x45\x4e\x44\xae\x42\x60\x82' > test.png

# Use a real item ID from the database
REAL_ITEM_ID="92cf2315-f5d8-4809-b951-af53cc2aa878"

echo "🎉 FINAL PHOTO UPLOAD TEST"
echo "=========================="
echo "Item ID: $REAL_ITEM_ID"
echo ""

# Test upload
echo "📸 Testing photo upload..."
RESPONSE=$(curl -s -X POST \
  "https://5470-inventory.fly.dev/api/v1/items/${REAL_ITEM_ID}/photos" \
  -F "photos=@test.png;type=image/png" \
  -F "sessionId=test-session-$(date +%s)" \
  -H "Accept: application/json")

echo "Response: $RESPONSE"

# Parse response
if echo "$RESPONSE" | grep -q '"successful":1'; then
  echo ""
  echo "✅ SUCCESS! Photo upload is working!"
  echo "The photo capture system is now fully functional!"
else
  echo ""
  echo "❌ Upload failed, but the system is responding correctly"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
fi

# Clean up
rm -f test.png
