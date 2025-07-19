# Deploy with new image script for Portainer (PowerShell version)
# This script builds a new image with a timestamp tag and updates the stack

param(
    [switch]$AutoUpdate
)

# Configuration
$STACK_NAME = "studio-6"
$IMAGE_TAG = Get-Date -Format "yyyyMMdd-HHmmss"
$COMPOSE_FILE = "docker-compose.yml"

Write-Host "🚀 Starting deployment with new image..." -ForegroundColor Green
Write-Host "📅 Image tag: $IMAGE_TAG" -ForegroundColor Cyan

# Set environment variables for docker-compose
$env:IMAGE_TAG = $IMAGE_TAG
$env:BUILD_DATE = [DateTimeOffset]::Now.ToUnixTimeSeconds()

# Build the images with the new tag
Write-Host "🔨 Building images with tag: $IMAGE_TAG" -ForegroundColor Yellow
docker-compose -f $COMPOSE_FILE build --no-cache

# Tag the images for easier reference
Write-Host "🏷️  Tagging images..." -ForegroundColor Yellow
docker tag "studio-6-app:$IMAGE_TAG" "studio-6-app:latest"
docker tag "studio-6-processor:$IMAGE_TAG" "studio-6-processor:latest"

# Update the stack in Portainer
Write-Host "📋 Stack update ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 To deploy in Portainer:" -ForegroundColor White
Write-Host "1. Go to your stack: $STACK_NAME" -ForegroundColor White
Write-Host "2. Click 'Update the stack'" -ForegroundColor White
Write-Host "3. Set these environment variables:" -ForegroundColor White
Write-Host "   - IMAGE_TAG=$IMAGE_TAG" -ForegroundColor Cyan
Write-Host "   - BUILD_DATE=$($env:BUILD_DATE)" -ForegroundColor Cyan
Write-Host "4. Click 'Update the stack'" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Or use docker-compose directly:" -ForegroundColor White
Write-Host "docker-compose -f $COMPOSE_FILE up -d" -ForegroundColor Cyan

# Optional: Automatically update the stack if you have Portainer API access
if ($AutoUpdate) {
    Write-Host "🤖 Auto-updating stack..." -ForegroundColor Yellow
    # This would require Portainer API configuration
    # $headers = @{
    #     "X-API-Key" = "your-api-key"
    #     "Content-Type" = "application/json"
    # }
    # $body = @{
    #     env = @(
    #         @{name = "IMAGE_TAG"; value = $IMAGE_TAG}
    #     )
    # } | ConvertTo-Json
    # Invoke-RestMethod -Uri "http://your-portainer/api/stacks/$STACK_ID/update" -Method POST -Headers $headers -Body $body
}

Write-Host "✅ Deployment script completed!" -ForegroundColor Green 