#!/bin/bash

# Deploy script for claude.candlefish.ai
SITE_ID="9650bb87-e619-4fdf-9b9b-7ff2eae31ba6"
DIST_DIR="./dist"

echo "Deploying to claude.candlefish.ai..."

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo "Error: dist directory not found!"
    exit 1
fi

# Deploy using Netlify CLI without build step
cd "$(dirname "$0")"
netlify api createSiteDeploy --data "{\"site_id\":\"$SITE_ID\"}" | jq -r '.required' > files_to_upload.json

if [ -s files_to_upload.json ]; then
    echo "Uploading files..."
    for file in $(find dist -type f); do
        relative_path=${file#dist/}
        if grep -q "\"/$relative_path\"" files_to_upload.json; then
            echo "Uploading $relative_path..."
            curl -s -X PUT \
                -H "Content-Type: application/octet-stream" \
                --data-binary "@$file" \
                "https://api.netlify.com/api/v1/deploys/$SITE_ID/files/$relative_path"
        fi
    done
fi

echo "Deployment complete!"
echo "Visit: https://claude.candlefish.ai"
