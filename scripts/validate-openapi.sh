#!/bin/bash

# Validate OpenAPI Specification
SPEC_PATH="/Users/patricksmith/candlefish-ai/docs/api/openapi-specification.yaml"

# Check if spectral is installed
if ! command -v spectral &> /dev/null; then
    echo "Spectral is not installed. Please install with: npm install -g @stoplight/spectral"
    exit 1
fi

# Validate the specification
spectral lint "$SPEC_PATH"

# Check exit status
if [ $? -eq 0 ]; then
    echo "OpenAPI Specification validation successful."
    exit 0
else
    echo "OpenAPI Specification validation failed."
    exit 1
fi