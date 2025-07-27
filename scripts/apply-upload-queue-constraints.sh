#!/bin/bash

# Script to apply upload queue database constraints
# This ensures the concurrent limit is never exceeded

echo "🔧 Applying upload queue database constraints..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL before running this script"
    exit 1
fi

# Apply the constraint SQL
echo "📝 Applying concurrent limit constraint..."
psql "$DATABASE_URL" -f scripts/add-upload-queue-concurrent-constraint.sql

if [ $? -eq 0 ]; then
    echo "✅ Upload queue constraints applied successfully!"
    echo ""
    echo "The following constraints are now active:"
    echo "  - Database trigger prevents more than maxConcurrentProcessors jobs from being 'inprocess'"
    echo "  - Concurrent limit violations will be logged and prevented"
    echo ""
    echo "To monitor the queue, run:"
    echo "  node test-upload-queue-monitor.js"
    echo ""
    echo "To check for violations, visit:"
    echo "  http://localhost:3000/api/upload-queue/check-concurrent-limit"
else
    echo "❌ Failed to apply constraints"
    exit 1
fi 