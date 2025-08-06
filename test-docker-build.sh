#!/bin/sh
set -e

echo "🔍 Testing Docker Build Process"
echo "=============================="

# Check if Docker is running
echo "1. Checking Docker status..."
if docker ps >/dev/null 2>&1; then
  echo "✅ Docker is running"
else
  echo "❌ Docker is not running or not accessible"
  exit 1
fi

# Test building the image
echo "2. Testing Docker build..."
if docker build -t studio-test .; then
  echo "✅ Docker build successful"
else
  echo "❌ Docker build failed"
  exit 1
fi

# Test running the container with just the entrypoint
echo "3. Testing entrypoint script..."
if docker run --rm --entrypoint /bin/sh studio-test -c "ls -la /app/entrypoint.sh"; then
  echo "✅ Entrypoint script exists and is accessible"
else
  echo "❌ Entrypoint script not found or not accessible"
fi

# Test script permissions
echo "4. Testing script permissions..."
if docker run --rm --entrypoint /bin/sh studio-test -c "ls -la /app/entrypoint.sh | grep -E '^-r-xr-xr-x'"; then
  echo "✅ Entrypoint script has correct permissions"
else
  echo "❌ Entrypoint script has incorrect permissions"
fi

# Test script syntax
echo "5. Testing script syntax..."
if docker run --rm --entrypoint /bin/sh studio-test -c "sh -n /app/entrypoint.sh"; then
  echo "✅ Entrypoint script syntax is valid"
else
  echo "❌ Entrypoint script has syntax errors"
fi

echo "✅ Docker build test completed!" 