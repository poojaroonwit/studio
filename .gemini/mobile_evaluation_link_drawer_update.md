# Mobile Evaluation Link Drawer UI Update

## Overview

Successfully redesigned the mobile evaluation link drawer/sheet to improve user experience by emphasizing the primary action (Go to Link) and hiding unnecessary link text on mobile devices.

## Changes Made

### File: `src/app/evaluate/page.tsx`

**Section Modified:** `renderQrCodeContent` function (lines 702-753)

## What Changed

### 1. Button Styling Reversed (lines 703-732)

#### **"Download QR Code" Button** (Now Secondary)
**Before:**
```tsx
<Button
  className="w-full"
  onClick={...}
>
  <Download className="mr-2 h-4 w-4" />
  Download QR Code
</Button>
```

**After:**
```tsx
<Button
  variant="outline"  // ← Added outline variant
  className="w-full"
  onClick={...}
>
  <Download className="mr-2 h-4 w-4" />
  Download QR Code
</Button>
```

#### **"Go to Link" Button** (Now Primary)
**Before:**
```tsx
<Button
  variant="outline"  // ← Was outline
  className="flex-1"
  onClick={...}
>
  <ExternalLink className="mr-2 h-4 w-4" />
  Go to Link
</Button>
```

**After:**
```tsx
<Button
  className="flex-1"  // ← Removed outline variant (now primary)
  onClick={...}
>
  <ExternalLink className="mr-2 h-4 w-4" />
  Go to Link
</Button>
```

### 2. Hidden Link Text on Mobile (lines 746-753)

**Before:**
```tsx
{/* Link text */}
<div className="w-full px-8 text-center">
  <p className="text-xs text-muted-foreground break-all bg-muted p-2 rounded">
    {qrData.url}
  </p>
</div>
```

**After:**
```tsx
{/* Link text - hidden on mobile */}
{!isMobile && (
  <div className="w-full px-8 text-center">
    <p className="text-xs text-muted-foreground break-all bg-muted p-2 rounded">
      {qrData.url}
    </p>
  </div>
)}
```

## Visual Comparison

### Before (Old Mobile Drawer):
```
┌─────────────────────────────┐
│  Evaluation Link QR Code    │
├─────────────────────────────┤
│                             │
│      [QR CODE IMAGE]        │
│                             │
│     John Doe                │
│  Expires in 7 days          │
│                             │
│ ┌─────────────────────────┐ │
│ │ Download QR Code        │ │ ← Primary (filled)
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │   Go to Link      [📋]  │ │ ← Secondary (outline)
│ └─────────────────────────┘ │
│                             │
│  https://eval.app/abc123... │ ← Link text shown
│                             │
└─────────────────────────────┘
```

### After (New Mobile Drawer):
```
┌─────────────────────────────┐
│  Evaluation Link QR Code    │
├─────────────────────────────┤
│                             │
│      [QR CODE IMAGE]        │
│                             │
│     John Doe                │
│  Expires in 7 days          │
│                             │
│ ┌─────────────────────────┐ │
│ │ Download QR Code        │ │ ← Secondary (outline)
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │   Go to Link      [📋]  │ │ ← Primary (filled)
│ └─────────────────────────┘ │
│                             │
│  (Link text hidden)         │ ← Hidden on mobile
│                             │
└─────────────────────────────┘
```

## Desktop Behavior (Unchanged)

On desktop, the link text remains visible:
- "Download QR Code" - Secondary (outline)
- "Go to Link" - Primary (filled)
- Link text - **Visible** (helps with desktop workflows)

## Button Hierarchy

### Primary Action (Go to Link):
- **Style**: Default primary button (filled with theme color)
- **Purpose**: Most common action - navigate to evaluation page
- **Visual Weight**: High prominence
- **Position**: Bottom row, left side

### Secondary Action (Download QR Code):
- **Style**: Outline button
- **Purpose**: Less frequent action - save QR for later
- **Visual Weight**: Lower prominence
- **Position**: Top row, full width

### Tertiary Action (Copy Link):
- **Style**: Outline icon button
- **Purpose**: Quick copy for manual sharing
- **Visual Weight**: Minimal
- **Position**: Bottom row, right side

## Benefits

✅ **Clearer Hierarchy** - Primary action is visually prominent  
✅ **Better Mobile UX** - Link text removed to reduce clutter  
✅ **Faster Navigation** - "Go to Link" is now the obvious choice  
✅ **Cleaner Design** - Less visual noise on small screens  
✅ **Desktop Preserved** - Link text still available where space allows

## User Flow Impact

### Common User Journey:
1. ✅ Opens evaluation link drawer/sheet
2. ✅ Sees QR code (for scanning)
3. ✅ **Clicks "Go to Link"** (primary action - now emphasized)
4. ✅ Opens evaluation page in new tab

### Alternative Flow:
1. Opens drawer
2. Scans QR code with phone
3. **OR** clicks "Download QR Code" (secondary action)
4. Shares QR image later

## Responsive Behavior

### Mobile (<768px):
- Shows as bottom Sheet drawer
- "Go to Link" - Primary button
- "Download QR Code" - Outline button
- **Link text hidden**

### Desktop (≥768px):
- Shows as centered Dialog modal
- Same button styling
- **Link text visible**

## Implementation Details

### isMobile Detection:
```tsx
const isMobile = useIsMobile();
```

Uses the `useIsMobile` hook to detect mobile devices and conditionally render the link text.

### Button Variants:
- **Primary** (default): No variant prop → Uses theme primary color
- **Secondary** (outline): `variant="outline"` → Border with transparent background

## Testing Checklist

- [ ] Open evaluate page on mobile
- [ ] Click candidate to view QR modal/drawer
- [ ] Verify "Go to Link" button is filled (primary)
- [ ] Verify "Download QR Code" button is outlined
- [ ] Confirm link text is **not shown**
- [ ] Test "Go to Link" opens in new tab
- [ ] Test "Download QR Code" downloads PNG
- [ ] Test copy button copies link
- [ ] Switch to desktop view
- [ ] Verify link text **is shown** on desktop
- [ ] Verify button styles same on desktop

## Accessibility

✅ **Clear Labeling** - Both buttons have descriptive text  
✅ **Icon + Text** - Visual and textual indicators  
✅ **Touch Targets** - Adequate size for mobile tapping  
✅ **Visual Hierarchy** - Primary action clearly distinguished  
✅ **Keyboard Accessible** - All buttons focusable

## Notes

- The copy button remains outline style (tertiary action)
- QR code size and logo remain unchanged
- Expiration date display unchanged
- Modal/sheet titles unchanged
- Changes apply to both mobile sheet and desktop dialog
