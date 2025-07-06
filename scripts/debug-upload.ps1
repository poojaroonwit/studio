# Debug File Upload and WebSocket Issues Script
# This script helps diagnose file upload and WebSocket connectivity problems

Write-Host "=== File Upload & WebSocket Debug Script ===" -ForegroundColor Green
Write-Host ""

# Check if we can connect to the health endpoint
Write-Host "1. Testing application health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:9846/api/health" -Method GET -TimeoutSec 10
    Write-Host "   ✓ Application is responding" -ForegroundColor Green
    Write-Host "   Overall Status: $($healthResponse.status)" -ForegroundColor Cyan
    Write-Host "   Database Status: $($healthResponse.components.database.status)" -ForegroundColor Cyan
    Write-Host "   MinIO Status: $($healthResponse.components.minio.status)" -ForegroundColor Cyan
    Write-Host "   Redis Status: $($healthResponse.components.redis.status)" -ForegroundColor Cyan
} catch {
    Write-Host "   ✗ Application health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check MinIO connectivity specifically
Write-Host "2. Testing MinIO connectivity..." -ForegroundColor Yellow
try {
    $minioResponse = Invoke-RestMethod -Uri "http://localhost:9846/api/setup/check-minio-bucket" -Method GET -TimeoutSec 10
    Write-Host "   ✓ MinIO bucket check successful" -ForegroundColor Green
    Write-Host "   Status: $($minioResponse.status)" -ForegroundColor Cyan
    Write-Host "   Message: $($minioResponse.message)" -ForegroundColor Cyan
    Write-Host "   Bucket: $($minioResponse.bucket)" -ForegroundColor Cyan
    if ($minioResponse.error) {
        Write-Host "   Error: $($minioResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ MinIO bucket check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test file upload endpoint
Write-Host "3. Testing file upload endpoint..." -ForegroundColor Yellow
try {
    # Create a test file
    $testContent = "This is a test file for upload debugging"
    $testFile = [System.IO.Path]::GetTempFileName()
    $testContent | Out-File -FilePath $testFile -Encoding UTF8
    
    $form = @{
        files = Get-Item $testFile
    }
    
    $uploadResponse = Invoke-RestMethod -Uri "http://localhost:9846/api/upload-queue/upload-file" -Method POST -Form $form -TimeoutSec 30
    Write-Host "   ✓ File upload test successful" -ForegroundColor Green
    Write-Host "   Results: $($uploadResponse.results | ConvertTo-Json -Compress)" -ForegroundColor Cyan
    if ($uploadResponse.summary) {
        Write-Host "   Summary: $($uploadResponse.summary | ConvertTo-Json -Compress)" -ForegroundColor Cyan
    }
    
    # Clean up test file
    Remove-Item $testFile -Force
} catch {
    Write-Host "   ✗ File upload test failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Error details: $errorBody" -ForegroundColor Red
    }
}

Write-Host ""

# Test WebSocket connectivity
Write-Host "4. Testing WebSocket connectivity..." -ForegroundColor Yellow
try {
    # Note: PowerShell doesn't have native WebSocket support, so we'll test the endpoint
    $wsResponse = Invoke-WebRequest -Uri "http://localhost:9846/api/upload-queue/ws" -Method GET -TimeoutSec 10
    Write-Host "   ✓ WebSocket endpoint is accessible (Status: $($wsResponse.StatusCode))" -ForegroundColor Green
    if ($wsResponse.StatusCode -eq 426) {
        Write-Host "   Expected: WebSocket upgrade required" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ WebSocket endpoint test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check environment variables
Write-Host "5. Checking MinIO environment configuration..." -ForegroundColor Yellow
$minioEnvVars = @(
    "MINIO_ENDPOINT",
    "MINIO_PORT", 
    "MINIO_ACCESS_KEY",
    "MINIO_SECRET_KEY",
    "MINIO_BUCKET_NAME",
    "MINIO_USE_SSL"
)

foreach ($var in $minioEnvVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        Write-Host "   ✓ $var is set" -ForegroundColor Green
        if ($var -eq "MINIO_SECRET_KEY") {
            Write-Host "   Value: $($value.Substring(0, [Math]::Min(10, $value.Length)))..." -ForegroundColor Cyan
        } else {
            Write-Host "   Value: $value" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ✗ $var is not set" -ForegroundColor Red
    }
}

Write-Host ""

# Check Redis configuration
Write-Host "6. Checking Redis environment configuration..." -ForegroundColor Yellow
$redisEnvVars = @(
    "REDIS_URL",
    "REDIS_PORT"
)

foreach ($var in $redisEnvVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        Write-Host "   ✓ $var is set" -ForegroundColor Green
        Write-Host "   Value: $value" -ForegroundColor Cyan
    } else {
        Write-Host "   ✗ $var is not set" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Debug Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "If you're still experiencing upload issues:" -ForegroundColor Yellow
Write-Host "1. Check the application logs for '[UPLOAD]' messages" -ForegroundColor White
Write-Host "2. Verify MinIO service is running and accessible" -ForegroundColor White
Write-Host "3. Check MinIO credentials and bucket configuration" -ForegroundColor White
Write-Host "4. Ensure Redis is running for WebSocket functionality" -ForegroundColor White
Write-Host "5. Check network connectivity between services" -ForegroundColor White 