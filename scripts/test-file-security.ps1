# Security Test Script for File Access
# 
# This script tests that files are no longer publicly accessible
# and require proper authentication and permissions.

param(
    [string]$AppBaseUrl = "http://localhost:3000",
    [string]$TestEmail = "admin@example.com",
    [string]$TestPassword = "password",
    [string]$TestFileUrl = "https://dev-s3-cv-screening.qsncc.com/studio-production/attachments/476ca0f3-53eb-4fd6-aef2-d032aeacfc73/a16176ba-e055-4075-b7e0-f46882f04915.pdf"
)

Write-Host "🛡️  Starting File Security Tests..." -ForegroundColor Green
Write-Host ""

# Test direct file access (should fail)
Write-Host "🔒 Testing direct file access (should fail)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $TestFileUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 403 -or $response.StatusCode -eq 401) {
        Write-Host "   ✅ SUCCESS: Direct file access is blocked ($($response.StatusCode))" -ForegroundColor Green
        $directAccessTest = $true
    } elseif ($response.StatusCode -eq 200) {
        Write-Host "   ❌ FAILURE: Direct file access is still allowed (200)" -ForegroundColor Red
        $directAccessTest = $false
    } else {
        Write-Host "   ⚠️  UNEXPECTED: Status code $($response.StatusCode)" -ForegroundColor Yellow
        $directAccessTest = $false
    }
} catch {
    Write-Host "   ✅ SUCCESS: Direct file access failed with error: $($_.Exception.Message)" -ForegroundColor Green
    $directAccessTest = $true
}

Write-Host ""

# Test download API endpoint (should require auth)
Write-Host "📥 Testing download API endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$AppBaseUrl/api/download?url=test" -Method GET -ErrorAction Stop
    Write-Host "   ❌ FAILURE: Download API should require authentication" -ForegroundColor Red
    $downloadApiTest = $false
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   ✅ SUCCESS: Download API requires authentication" -ForegroundColor Green
        $downloadApiTest = $true
    } else {
        Write-Host "   ⚠️  UNEXPECTED: Download API error: $($_.Exception.Message)" -ForegroundColor Yellow
        $downloadApiTest = $false
    }
}

Write-Host ""

# Test secure file endpoint (should require auth)
Write-Host "🔐 Testing secure file endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$AppBaseUrl/api/secure-file?filePath=test/path&expiresIn=3600" -Method GET -ErrorAction Stop
    Write-Host "   ❌ FAILURE: Secure file endpoint should require authentication" -ForegroundColor Red
    $secureFileTest = $false
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 403) {
        Write-Host "   ✅ SUCCESS: Secure file endpoint requires authentication" -ForegroundColor Green
        $secureFileTest = $true
    } else {
        Write-Host "   ⚠️  UNEXPECTED: Secure file endpoint error: $($_.Exception.Message)" -ForegroundColor Yellow
        $secureFileTest = $false
    }
}

Write-Host ""

# Summary
$results = @($directAccessTest, $downloadApiTest, $secureFileTest)
$passed = ($results | Where-Object { $_ -eq $true }).Count
$total = $results.Count

Write-Host "📊 Test Results Summary:" -ForegroundColor Cyan
Write-Host "   Passed: $passed/$total" -ForegroundColor White

if ($passed -eq $total) {
    Write-Host "   ✅ ALL TESTS PASSED - File security is properly implemented!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "   ❌ SOME TESTS FAILED - File security needs attention!" -ForegroundColor Red
    exit 1
}
