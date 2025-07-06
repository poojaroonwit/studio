#!/bin/bash

# Application startup script with proper initialization

set -e  # Exit on any error

echo "🚀 Starting HR AI Screening Application..."

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service_name to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            echo "✅ $service_name is ready on port $port"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Check if we're in a Docker environment
if [ -f /.dockerenv ]; then
    echo "🐳 Running in Docker container"
    
    # Wait for database
    check_service "PostgreSQL" 5432 || exit 1
    
    # Wait for MinIO
    check_service "MinIO" 9000 || exit 1
    
    # Wait for Redis
    check_service "Redis" 6379 || exit 1
    
    echo "✅ All services are ready"
else
    echo "🖥️ Running in local environment"
    echo "⚠️ Make sure PostgreSQL, MinIO, and Redis are running locally"
fi

# Run database migrations
echo "🗄️ Running database migrations..."
npm run db:migrate || {
    echo "❌ Database migration failed"
    exit 1
}

# Initialize application
echo "🔧 Initializing application..."
node -e "
const { initializeApplication } = require('./src/lib/startup');
initializeApplication().then(result => {
    console.log('Initialization result:', JSON.stringify(result, null, 2));
    if (result.overall === 'failed') {
        console.error('❌ Application initialization failed');
        process.exit(1);
    } else if (result.overall === 'partial') {
        console.warn('⚠️ Application initialized with warnings');
    } else {
        console.log('✅ Application initialized successfully');
    }
}).catch(error => {
    console.error('❌ Initialization error:', error);
    process.exit(1);
});
" || {
    echo "❌ Application initialization failed"
    exit 1
}

# Start the application
echo "🌐 Starting main application..."
exec npm start
