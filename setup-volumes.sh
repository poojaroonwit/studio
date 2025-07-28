#!/bin/bash

# Setup script for Docker volumes at /var/dockers/8021
# This script creates the necessary directories and sets proper permissions

set -e

echo "🔧 Setting up Docker volumes at /var/dockers/8021..."

# Base directory
BASE_DIR="/var/dockers/8021"

# Create base directory if it doesn't exist
if [ ! -d "$BASE_DIR" ]; then
    echo "📁 Creating base directory: $BASE_DIR"
    sudo mkdir -p "$BASE_DIR"
else
    echo "✅ Base directory already exists: $BASE_DIR"
fi

# Create subdirectories for each service
declare -a DIRS=(
    "postgres_data"
    "minio_data"
    "n8n_data"
)

for dir in "${DIRS[@]}"; do
    FULL_PATH="$BASE_DIR/$dir"
    if [ ! -d "$FULL_PATH" ]; then
        echo "📁 Creating directory: $FULL_PATH"
        sudo mkdir -p "$FULL_PATH"
    else
        echo "✅ Directory already exists: $FULL_PATH"
    fi
done

# Set proper ownership and permissions
echo "🔐 Setting permissions..."

# For PostgreSQL data directory
if [ -d "$BASE_DIR/postgres_data" ]; then
    echo "🔐 Setting PostgreSQL data permissions..."
    sudo chown -R 999:999 "$BASE_DIR/postgres_data"  # PostgreSQL runs as user 999
    sudo chmod -R 750 "$BASE_DIR/postgres_data"
fi

# For MinIO data directory
if [ -d "$BASE_DIR/minio_data" ]; then
    echo "🔐 Setting MinIO data permissions..."
    sudo chown -R 1000:1000 "$BASE_DIR/minio_data"  # MinIO runs as user 1000
    sudo chmod -R 755 "$BASE_DIR/minio_data"
fi

# For N8N data directory
if [ -d "$BASE_DIR/n8n_data" ]; then
    echo "🔐 Setting N8N data permissions..."
    sudo chown -R 1000:1000 "$BASE_DIR/n8n_data"  # N8N runs as user 1000
    sudo chmod -R 755 "$BASE_DIR/n8n_data"
fi

# Set base directory permissions
echo "🔐 Setting base directory permissions..."
sudo chown root:root "$BASE_DIR"
sudo chmod 755 "$BASE_DIR"

echo "✅ Volume setup completed!"
echo ""
echo "📋 Created directories:"
echo "   - $BASE_DIR/postgres_data (PostgreSQL data)"
echo "   - $BASE_DIR/minio_data (MinIO data)"
echo "   - $BASE_DIR/n8n_data (N8N data)"
echo ""
echo "🚀 You can now start your Docker services:"
echo "   docker-compose up -d"
echo ""
echo "📝 Note: If you're on Windows, you may need to:"
echo "   1. Create these directories manually in WSL or use Windows paths"
echo "   2. Adjust the paths in docker-compose.yml for Windows compatibility" 