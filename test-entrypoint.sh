#!/bin/sh
set -e

echo "🔍 Testing Entrypoint Script"
echo "============================"

# Test if the script can be executed
if [ -x "./entrypoint.sh" ]; then
  echo "✅ entrypoint.sh is executable"
else
  echo "❌ entrypoint.sh is not executable"
  echo "Making it executable..."
  chmod +x ./entrypoint.sh
fi

# Test if the script has proper line endings
if file ./entrypoint.sh | grep -q "CRLF"; then
  echo "⚠️  entrypoint.sh has Windows line endings (CRLF)"
  echo "Converting to Unix line endings..."
  dos2unix ./entrypoint.sh 2>/dev/null || {
    echo "dos2unix not available, trying sed..."
    sed -i 's/\r$//' ./entrypoint.sh
  }
else
  echo "✅ entrypoint.sh has Unix line endings"
fi

# Test if the script can be parsed
if sh -n ./entrypoint.sh; then
  echo "✅ entrypoint.sh syntax is valid"
else
  echo "❌ entrypoint.sh has syntax errors"
fi

echo "✅ Entrypoint script test completed!" 