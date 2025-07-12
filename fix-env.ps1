# PowerShell script to fix the DATABASE_URL in .env file
$envFile = ".env"
$backupFile = ".env.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Create backup
if (Test-Path $envFile) {
    Copy-Item $envFile $backupFile
    Write-Host "Created backup: $backupFile"
}

# Read the current .env file
$content = Get-Content $envFile -Raw

# Replace the incorrect DATABASE_URL
$oldUrl = "DATABASE_URL=postgresql://postgres:secure_password@postgres:5432/studio5_production"
$newUrl = "DATABASE_URL=postgresql://postgres:secure_password@localhost:8521/studio5_production"

$content = $content -replace [regex]::Escape($oldUrl), $newUrl

# Write the updated content back
$content | Set-Content $envFile -NoNewline

Write-Host "Fixed DATABASE_URL in .env file"
Write-Host "Old: $oldUrl"
Write-Host "New: $newUrl"
Write-Host ""
Write-Host "Please restart your Next.js development server now." 