# Debug Session Issues Script
# This script helps diagnose session-related problems

Write-Host "=== Application Debug Script ===" -ForegroundColor Green
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
    Write-Host "   User Count: $($healthResponse.components.database.userCount)" -ForegroundColor Cyan
} catch {
    Write-Host "   ✗ Application health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check if we can access the signin page
Write-Host "2. Testing signin page accessibility..." -ForegroundColor Yellow
try {
    $signinResponse = Invoke-WebRequest -Uri "http://localhost:9846/auth/signin" -Method GET -TimeoutSec 10
    Write-Host "   ✓ Signin page is accessible (Status: $($signinResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Signin page access failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check if we can access the validate-session endpoint
Write-Host "3. Testing session validation endpoint..." -ForegroundColor Yellow
try {
    $validateResponse = Invoke-WebRequest -Uri "http://localhost:9846/api/auth/validate-session" -Method GET -TimeoutSec 10
    Write-Host "   ✓ Session validation endpoint is accessible (Status: $($validateResponse.StatusCode))" -ForegroundColor Green
    $validateContent = $validateResponse.Content | ConvertFrom-Json
    Write-Host "   Response: $($validateContent | ConvertTo-Json -Compress)" -ForegroundColor Cyan
} catch {
    Write-Host "   ✗ Session validation endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check MinIO connectivity
Write-Host "4. Testing MinIO connectivity..." -ForegroundColor Yellow
try {
    $minioResponse = Invoke-WebRequest -Uri "http://localhost:9847/minio/health/live" -Method GET -TimeoutSec 10
    Write-Host "   ✓ MinIO is accessible (Status: $($minioResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ✗ MinIO access failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check Redis connectivity (if possible)
Write-Host "5. Testing Redis connectivity..." -ForegroundColor Yellow
try {
    # Note: This is a basic test - Redis might not expose HTTP endpoints
    Write-Host "   ℹ️ Redis connectivity test skipped (requires direct connection)" -ForegroundColor Yellow
} catch {
    Write-Host "   ✗ Redis test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check environment variables (if running locally)
Write-Host "6. Checking environment configuration..." -ForegroundColor Yellow
$envVars = @(
    "DATABASE_URL",
    "NEXTAUTH_SECRET", 
    "NEXTAUTH_URL",
    "MINIO_ENDPOINT",
    "MINIO_PORT",
    "MINIO_ACCESS_KEY",
    "MINIO_BUCKET_NAME",
    "REDIS_URL"
)

foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        Write-Host "   ✓ $var is set" -ForegroundColor Green
        if ($var -eq "DATABASE_URL") {
            # Mask the password in the URL
            $maskedUrl = $value -replace "://[^:]+:[^@]+@", "://***:***@"
            Write-Host "   Value: $maskedUrl" -ForegroundColor Cyan
        } elseif ($var -eq "NEXTAUTH_SECRET") {
            Write-Host "   Value: $($value.Substring(0, [Math]::Min(20, $value.Length)))..." -ForegroundColor Cyan
        } else {
            Write-Host "   Value: $value" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ✗ $var is not set" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Debug Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "If you're still experiencing issues:" -ForegroundColor Yellow
Write-Host "1. Check the application logs for detailed error messages" -ForegroundColor White
Write-Host "2. Verify all environment variables are properly set" -ForegroundColor White
Write-Host "3. Ensure MinIO and Redis services are running" -ForegroundColor White
Write-Host "4. Check database connectivity and schema" -ForegroundColor White
Write-Host "5. Verify NEXTAUTH_SECRET is consistent across deployments" -ForegroundColor White 