#!/bin/bash

# Debug Docker build script
echo "=== Docker Build Debug Script ==="

# Check if we're in the right directory
echo "Current directory: $(pwd)"
echo "Package.json exists: $(test -f package.json && echo 'YES' || echo 'NO')"
echo "Dockerfile exists: $(test -f Dockerfile && echo 'YES' || echo 'NO')"

# Check Node.js version
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Check available memory
echo "Available memory:"
free -h || echo "free command not available"

# Check disk space
echo "Disk space:"
df -h . || echo "df command not available"

# Try to install dependencies locally first
echo "=== Testing npm install locally ==="
if [ -f package.json ]; then
    echo "Clearing npm cache..."
    npm cache clean --force
    
    echo "Attempting npm ci..."
    if npm ci --no-audit --no-fund --prefer-offline; then
        echo "✅ npm ci succeeded locally"
    else
        echo "❌ npm ci failed locally, trying npm install..."
        if npm install --no-audit --no-fund --legacy-peer-deps; then
            echo "✅ npm install succeeded locally"
        else
            echo "❌ npm install also failed locally"
        fi
    fi
else
    echo "❌ package.json not found"
fi

echo "=== Docker Build Debug Complete ==="
