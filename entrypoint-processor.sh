#!/bin/bash

# Minimal entrypoint for upload queue processor
# This only runs the processor without database setup

set -e

echo "🔧 Starting in PROCESSOR MODE..."

# Set default environment variables if not provided
export NODE_ENV=${NODE_ENV:-production}

echo "🚀 Starting upload queue processor..."
npm run processor 