# Portainer Deployment - Method 1: Force Rebuild and Redeploy

This method allows you to redeploy with a new image in Portainer without removing the previous image.

## How It Works

The `docker-compose.yml` is configured with:
- **Image tags**: `studio-6-app:${IMAGE_TAG:-latest}` and `studio-6-processor:${IMAGE_TAG:-latest}`
- **Build args**: `BUILD_DATE: ${BUILD_DATE:-$(date +%s)}` to force rebuilds
- **Environment variables**: `IMAGE_TAG` and `BUILD_DATE` control which image version to use

## Step-by-Step Deployment Process

### Option A: Manual Deployment in Portainer UI

1. **Go to your Portainer dashboard**
2. **Navigate to your stack** (should be named `studio-6`)
3. **Click "Update the stack"**
4. **Set environment variables**:
   ```
   IMAGE_TAG=20241201-143022  # Use current timestamp
   BUILD_DATE=1701445822       # Current Unix timestamp
   ```
5. **Click "Update the stack"**

### Option B: Using the Deployment Script

Run the PowerShell script to automate the process:

```powershell
# Generate new image and get deployment values
.\scripts\deploy-with-new-image.ps1
```

The script will:
- Build new images with timestamp tags
- Show you the exact environment variables to set in Portainer
- Optionally update the stack automatically (if configured)

### Option C: Direct Docker Compose

```bash
# Set environment variables
$env:IMAGE_TAG = "20241201-143022"
$env:BUILD_DATE = [DateTimeOffset]::Now.ToUnixTimeSeconds()

# Build and deploy
docker-compose build --no-cache
docker-compose up -d
```

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `IMAGE_TAG` | Controls which image version to use | `20241201-143022` |
| `BUILD_DATE` | Forces Docker to rebuild the image | `1701445822` |

## Benefits of This Method

✅ **No image removal required** - Previous images are preserved  
✅ **Rollback capability** - Can easily switch back to previous versions  
✅ **Version tracking** - Each deployment has a unique timestamp  
✅ **Clean deployment** - Forces fresh build with latest code  
✅ **Portainer friendly** - Works seamlessly with Portainer's update mechanism  

## Troubleshooting

### Issue: Portainer still uses old image
**Solution**: Make sure you're setting both `IMAGE_TAG` and `BUILD_DATE` environment variables

### Issue: Build fails
**Solution**: Check that your code changes are committed and the Dockerfile is valid

### Issue: Container won't start
**Solution**: Check logs in Portainer and verify all environment variables are set correctly

## Quick Deployment Commands

```powershell
# Quick deployment with current timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$env:IMAGE_TAG = $timestamp
$env:BUILD_DATE = [DateTimeOffset]::Now.ToUnixTimeSeconds()
docker-compose build --no-cache
docker-compose up -d
```

## Rollback to Previous Version

If you need to rollback:

1. **Find the previous IMAGE_TAG** from your deployment history
2. **Set the environment variables** in Portainer:
   ```
   IMAGE_TAG=20241201-120000  # Previous timestamp
   BUILD_DATE=1701439200       # Previous build date
   ```
3. **Update the stack** in Portainer

The previous image will still be available and can be used immediately. 