# Quick Deploy Script for Method 1
# Generates deployment values for Portainer

Write-Host "Quick Deploy - Method 1" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green

# Generate deployment values
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$buildDate = [DateTimeOffset]::Now.ToUnixTimeSeconds()

Write-Host ""
Write-Host "Generated Deployment Values:" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host "IMAGE_TAG=$timestamp" -ForegroundColor Yellow
Write-Host "BUILD_DATE=$buildDate" -ForegroundColor Yellow
Write-Host ""

Write-Host "To deploy in Portainer:" -ForegroundColor White
Write-Host "1. Go to your stack in Portainer" -ForegroundColor White
Write-Host "2. Click 'Update the stack'" -ForegroundColor White
Write-Host "3. Set these environment variables:" -ForegroundColor White
Write-Host "   IMAGE_TAG=$timestamp" -ForegroundColor Cyan
Write-Host "   BUILD_DATE=$buildDate" -ForegroundColor Cyan
Write-Host "4. Click 'Update the stack'" -ForegroundColor White
Write-Host ""

Write-Host "Or use these commands:" -ForegroundColor White
Write-Host "`$env:IMAGE_TAG = '$timestamp'" -ForegroundColor Cyan
Write-Host "`$env:BUILD_DATE = $buildDate" -ForegroundColor Cyan
Write-Host "docker-compose build --no-cache" -ForegroundColor Cyan
Write-Host "docker-compose up -d" -ForegroundColor Cyan
Write-Host ""

Write-Host "Ready to deploy!" -ForegroundColor Green 