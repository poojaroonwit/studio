#!/bin/bash

# Setup script to fix authentication issues and configure environment properly

set -e

echo "🔧 Setting up environment and fixing authentication issues..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp env.internal.template .env
    
    # Update the .env file for Docker deployment
    echo "🔧 Updating .env for Docker deployment..."
    
    # Update database settings for Docker
    sed -i 's/POSTGRES_USER=studio_user/POSTGRES_USER=postgres/g' .env
    sed -i 's/POSTGRES_PASSWORD=StudioSecurePass2024!/POSTGRES_PASSWORD=secure_password/g' .env
    sed -i 's/POSTGRES_DB=studio_db/POSTGRES_DB=studio_production/g' .env
    sed -i 's/POSTGRES_PORT=8521/POSTGRES_PORT=5432/g' .env
    sed -i 's/POSTGRES_HOST=localhost/POSTGRES_HOST=postgres/g' .env
    sed -i 's|DATABASE_URL=postgresql://studio_user:StudioSecurePass2024!@localhost:8521/studio_db|DATABASE_URL=postgresql://postgres:secure_password@postgres:5432/studio_production|g' .env
    
    # Update MinIO settings for Docker
    sed -i 's/MINIO_ROOT_PASSWORD=MinioSecurePass2024!/MINIO_ROOT_PASSWORD=minioadmin/g' .env
    sed -i 's/MINIO_ENDPOINT=localhost/MINIO_ENDPOINT=minio/g' .env
    sed -i 's/MINIO_PORT=8621/MINIO_PORT=9000/g' .env
    sed -i 's/MINIO_ACCESS_KEY=minioadmin/MINIO_ACCESS_KEY=minioadmin/g' .env
    sed -i 's/MINIO_SECRET_KEY=MinioSecurePass2024!/MINIO_SECRET_KEY=minioadmin/g' .env
    sed -i 's/MINIO_BUCKET_NAME=studio-files/MINIO_BUCKET_NAME=studio-production/g' .env
    
    echo "✅ .env file created and configured for Docker deployment"
else
    echo "✅ .env file already exists"
fi

# Setup volumes
echo "🔧 Setting up Docker volumes..."
if [ -f "setup-volumes.sh" ]; then
    chmod +x setup-volumes.sh
    ./setup-volumes.sh
else
    echo "⚠️  setup-volumes.sh not found, creating basic volume setup..."
    
    # Create basic volume directories
    sudo mkdir -p /var/dockers/8021/postgres_data
    sudo mkdir -p /var/dockers/8021/minio_data
    sudo mkdir -p /var/dockers/8021/n8n_data
    
    # Set permissions
    sudo chown -R 999:999 /var/dockers/8021/postgres_data
    sudo chown -R 1000:1000 /var/dockers/8021/minio_data
    sudo chown -R 1000:1000 /var/dockers/8021/n8n_data
    
    sudo chmod -R 750 /var/dockers/8021/postgres_data
    sudo chmod -R 755 /var/dockers/8021/minio_data
    sudo chmod -R 755 /var/dockers/8021/n8n_data
    
    echo "✅ Basic volume setup completed"
fi

# Clean up any existing containers that might have stale data
echo "🧹 Cleaning up existing containers..."
docker-compose down -v 2>/dev/null || true

# Remove any existing volumes that might have stale authentication data
echo "🧹 Cleaning up stale volumes..."
docker volume prune -f 2>/dev/null || true

echo "✅ Environment setup completed!"
echo ""
echo "🚀 You can now start the application with:"
echo "   docker-compose up -d"
echo ""
echo "📝 To view logs:"
echo "   docker-compose logs -f"
echo ""
echo "🔧 To troubleshoot:"
echo "   docker-compose logs app"
echo "   docker-compose logs postgres"
echo "   docker-compose logs minio" 