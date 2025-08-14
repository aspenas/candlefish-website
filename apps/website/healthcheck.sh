#!/bin/sh
# Health check script for Docker container

# Check if nginx is running
if ! pgrep nginx > /dev/null; then
    echo "nginx is not running"
    exit 1
fi

# Check if the health endpoint responds
if ! curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "Health endpoint not responding"
    exit 1
fi

# Check if main page loads
if ! curl -f http://localhost:8080/ > /dev/null 2>&1; then
    echo "Main page not responding"
    exit 1
fi

echo "Health check passed"
exit 0
