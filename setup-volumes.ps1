# Setup script for Docker volumes at /var/dockers/8021 (Windows PowerShell)
# This script creates the necessary directories for Docker volumes

Write-Host "🔧 Setting up Docker volumes at /var/dockers/8021..." -ForegroundColor Green

# Base directory
$BASE_DIR = "/var/dockers/8021"

# Create base directory if it doesn't exist
if (-not (Test-Path $BASE_DIR)) {
    Write-Host "📁 Creating base directory: $BASE_DIR" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $BASE_DIR -Force | Out-Null
} else {
    Write-Host "✅ Base directory already exists: $BASE_DIR" -ForegroundColor Green
}

# Create subdirectories for each service
$DIRS = @(
    "postgres_data",
    "minio_data", 
    "n8n_data"
)

foreach ($dir in $DIRS) {
    $FULL_PATH = "$BASE_DIR/$dir"
    if (-not (Test-Path $FULL_PATH)) {
        Write-Host "📁 Creating directory: $FULL_PATH" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $FULL_PATH -Force | Out-Null
    } else {
        Write-Host "✅ Directory already exists: $FULL_PATH" -ForegroundColor Green
    }
}

Write-Host "✅ Volume setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Created directories:" -ForegroundColor Cyan
Write-Host "   - $BASE_DIR/postgres_data (PostgreSQL data)" -ForegroundColor White
Write-Host "   - $BASE_DIR/minio_data (MinIO data)" -ForegroundColor White
Write-Host "   - $BASE_DIR/n8n_data (N8N data)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 You can now start your Docker services:" -ForegroundColor Cyan
Write-Host "   docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "📝 Note: If you're using WSL2, you may need to:" -ForegroundColor Yellow
Write-Host "   1. Access these directories from WSL2: /mnt/c/var/dockers/8021" -ForegroundColor White
Write-Host "   2. Or use WSL2 paths directly in docker-compose.yml" -ForegroundColor White
Write-Host "   3. Ensure Docker Desktop has access to the WSL2 filesystem" -ForegroundColor White 