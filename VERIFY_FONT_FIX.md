# How to Verify the Font Fix

## Quick Verification Steps

### 1. Clear and Rebuild
```powershell
# Clear Next.js cache
Remove-Item -Recurse -Force .next

# Restart development server
npm run dev
```

### 2. Check Browser DevTools

#### A. Verify CSS Variables are Set
1. Open your app in the browser
2. Open DevTools (F12)
3. Go to Console tab
4. Run these commands:

```javascript
// Check if CSS variables are defined
getComputedStyle(document.documentElement).getPropertyValue('--font-inter')
// Should return something like: "__Inter_abc123", "system-ui", ...

getComputedStyle(document.documentElement).getPropertyValue('--font-ibm-plex-sans-thai')
// Should return something like: "__IBM_Plex_Sans_Thai_xyz789", "system-ui", ...
```

#### B. Verify Font Files Load
1. Open DevTools → Network tab
2. Filter by "Font" or search for `.woff2`
3. Refresh the page
4. You should see font files loading from `/_next/static/media/`
5. All should return status 200 (not 404)

#### C. Check Computed Styles
1. Open DevTools → Elements tab
2. Select the `<body>` element
3. Look at Computed styles
4. Find `font-family`
5. Should show the optimized font stack with Next.js class names

### 3. Use the Font Test Page

Visit: `http://localhost:3000/font-test.html`

1. The page should load with different font samples
2. Click "Check Fonts" button
   - Should show ✅ Font Loading API is supported
   - Should list loaded fonts
3. Click "Check CSS Variables" button
   - Should show ✅ for both `--font-inter` and `--font-ibm-plex-sans-thai`
   - Should display the CSS variable values

### 4. Visual Verification

#### English Text
- Should display in Inter font
- Clean, modern sans-serif appearance
- Good readability

#### Thai Text (สวัสดีครับ)
- Should display in IBM Plex Sans Thai font
- Proper Thai character rendering
- No broken or missing glyphs

### 5. Run Tests

```powershell
# Run all font-related tests
npm test -- --run src/app/__tests__/font-configuration.test.ts src/components/ui/__tests__/FontLoader.test.ts src/components/ui/__tests__/FontPreloader.test.tsx
```

All tests should pass ✅

## What Was Fixed

### The Problem
CSS was using direct font family names like `'Inter'` instead of CSS variables like `var(--font-inter)` that Next.js creates.

### The Solution
Updated all font-family declarations to use CSS variables:
- ✅ `src/app/globals.css` - All font-family rules
- ✅ `tailwind.config.ts` - Tailwind font family config
- ✅ `src/lib/fontUtils.ts` - Font utility functions
- ✅ `public/font-test.html` - Test page
- ✅ Tests updated to match current config

## Expected Results

✅ **No 404 errors** for font files  
✅ **Fonts load correctly** from Next.js optimization  
✅ **CSS variables properly set** on HTML element  
✅ **Text displays correctly** in both Inter and IBM Plex Sans Thai  
✅ **All tests pass** (22 tests total)  
✅ **Better performance** with self-hosted, optimized fonts  

## Troubleshooting

### If fonts still don't work:

1. **Hard refresh the browser**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Clear browser cache**
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cached images and files"

3. **Check for service worker issues**
   - DevTools → Application → Service Workers
   - Click "Unregister" if you see old workers
   - Refresh the page

4. **Verify build is fresh**
   ```powershell
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

5. **Check console for errors**
   - Open DevTools → Console
   - Look for any font-related errors
   - Should NOT see "Failed to load resource" for fonts

## Still Having Issues?

If fonts still don't work after following these steps:

1. Check that you're viewing the app through Next.js dev server (not opening HTML files directly)
2. Verify the HTML element has the font variable classes applied
3. Check that `.next/static/media/` contains `.woff2` files
4. Review browser console for any JavaScript errors
5. Try a different browser to rule out browser-specific issues
