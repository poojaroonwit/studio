# Quick Fix Guide

## Issues Fixed:
1. ✅ Font 404 errors - Removed hardcoded font preload paths
2. ✅ PWA access issues - Updated service worker version to force cleanup

## To Apply Fixes:

### Option 1: Use the Clear and Restart Script (Recommended)
```powershell
.\scripts\clear-and-restart.ps1
```

### Option 2: Manual Steps

1. **Stop the development server** (Ctrl+C)

2. **Clear Next.js cache:**
```powershell
Remove-Item -Recurse -Force .next
```

3. **Stop all Node processes:**
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

4. **Restart the development server:**
```powershell
npm run dev
```

### Option 3: For Mobile PWA Issues

If you're still having PWA access issues on mobile:

1. **Visit the clear page on your mobile device:**
   ```
   https://your-domain/clear-sw.html
   ```

2. **Click "Clear Everything"**

3. **Close and reopen the app**

## What Was Changed:

### 1. FontPreloader Component
- Removed hardcoded font preload links that were causing 404 errors
- Next.js now handles font optimization automatically
- Fonts will load without errors

### 2. Service Worker
- Updated version from 2.0.0 to 2.1.0
- This forces automatic cleanup of old service workers
- PWA will work correctly after restart

### 3. Font Configuration
- Reduced from 6 fonts to 2 (Inter + IBM Plex Sans Thai)
- Using `display: 'optional'` for Inter (non-blocking)
- Using `display: 'swap'` for Thai font
- System fonts as fallbacks

## Expected Results:

✅ No more font 404 errors  
✅ Fonts load correctly  
✅ PWA works on mobile  
✅ Faster page load times  
✅ No render blocking  

## Verification:

After restarting, check the browser console:
- ❌ Should NOT see: "Failed to load resource: 404" for fonts
- ✅ Should see: "Service Worker: Installation complete"
- ✅ Should see: "Fonts loaded successfully"

## Still Having Issues?

1. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete → Clear cached images and files
   - Mobile: Settings → Clear site data

2. **Check service worker:**
   - Chrome DevTools → Application → Service Workers
   - Click "Unregister" if you see old workers
   - Refresh the page

3. **Force reload:**
   - Desktop: Ctrl+Shift+R (hard refresh)
   - Mobile: Close app completely and reopen

## Need More Help?

The automatic recovery system should fix most issues:
- Service worker auto-cleanup on version change
- Automatic recovery after 3 failed requests
- Shows "Fixing Connection..." overlay when recovering
