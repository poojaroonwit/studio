# Font Fix Applied - December 4, 2024

## Problem Identified
The fonts (Inter and IBM Plex Sans Thai) were not displaying correctly because the CSS was using direct font family names like `'Inter'` and `'IBM Plex Sans Thai'` instead of the CSS variables that Next.js font optimization creates.

## Root Cause
When using `next/font/google`, Next.js:
1. Downloads and self-hosts the fonts at build time
2. Generates optimized font files in `.next/static/media/`
3. Creates CSS variables (e.g., `--font-inter`, `--font-ibm-plex-sans-thai`) on the HTML element
4. These variables contain the complete optimized font family stack

The issue was that the CSS was trying to reference fonts by their family names directly, but Next.js doesn't expose them that way. You must use the CSS variables.

## Files Fixed

### 1. `src/app/globals.css`
**Changed:** All font-family declarations to use CSS variables

```css
/* Before */
body {
  font-family: 'IBM Plex Sans Thai', 'Inter', ...;
}

.font-inter {
  font-family: 'Inter', ...;
}

/* After */
body {
  font-family: var(--font-ibm-plex-sans-thai), var(--font-inter), ...;
}

.font-inter {
  font-family: var(--font-inter), ...;
}
```

### 2. `tailwind.config.ts`
**Changed:** Font family definitions in Tailwind config

```typescript
// Before
fontFamily: {
  'inter': ['Inter', ...],
  'ibm-plex-sans-thai': ['IBM Plex Sans Thai', 'Inter', ...],
}

// After
fontFamily: {
  'inter': ['var(--font-inter)', ...],
  'ibm-plex-sans-thai': ['var(--font-ibm-plex-sans-thai)', 'var(--font-inter)', ...],
}
```

### 3. `src/lib/fontUtils.ts`
**Changed:** Font utility functions to return CSS variable syntax

```typescript
// Before
export function getFontFamily(text: string): string {
  return containsThaiText(text) 
    ? "'IBM Plex Sans Thai', 'Inter', ..."
    : "'Inter', ...";
}

// After
export function getFontFamily(text: string): string {
  return containsThaiText(text) 
    ? "var(--font-ibm-plex-sans-thai), var(--font-inter), ..."
    : "var(--font-inter), ...";
}
```

### 4. `public/font-test.html`
**Changed:** Test page to use CSS variables and improved diagnostics

## How It Works Now

1. **In `src/app/layout.tsx`:**
   ```typescript
   const inter = Inter({ 
     variable: '--font-inter',
     // ... other options
   });
   
   <html className={`${inter.variable} ${ibmPlexSansThai.variable}`}>
   ```
   This sets CSS variables on the HTML element.

2. **In CSS files:**
   ```css
   body {
     font-family: var(--font-inter), fallbacks...;
   }
   ```
   This references the CSS variables.

3. **Next.js generates:**
   - Optimized font files in `.next/static/media/`
   - CSS that defines the variables with the optimized font stack
   - Proper fallbacks and font-display settings

## Verification Steps

1. **Clear Next.js cache:**
   ```powershell
   Remove-Item -Recurse -Force .next
   ```

2. **Restart dev server:**
   ```powershell
   npm run dev
   ```

3. **Check in browser:**
   - Open DevTools → Elements → `<html>` element
   - Should see classes like `__className_abc123`
   - Open DevTools → Console → Run:
     ```javascript
     getComputedStyle(document.documentElement).getPropertyValue('--font-inter')
     ```
   - Should return a font family stack

4. **Test page:**
   - Visit `/font-test.html`
   - Click "Check CSS Variables"
   - Should show ✅ for both font variables

## Expected Results

✅ Fonts load correctly from Next.js optimization  
✅ No 404 errors for font files  
✅ CSS variables are properly set  
✅ Text displays in Inter (English) and IBM Plex Sans Thai (Thai)  
✅ Proper fallbacks to system fonts  
✅ Better performance with self-hosted fonts  

## Notes

- Font files for Word document exports and HTML exports still use direct font names, which is correct for those contexts
- The CSS variables are only available within the Next.js app context
- System fonts will be used as fallbacks if the web fonts fail to load
