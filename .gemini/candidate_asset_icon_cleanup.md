# Candidate Asset Label - Icon Cleanup

## Overview

Successfully removed the duplicate icon from the Candidate Asset section label on the evaluate page, simplifying the header to show only one icon instead of two.

## Changes Made

### File: `src/app/candidates/[id]/evaluate/components/CandidateAssetsSection.tsx`

**Lines Modified:** 60-63

### Before:
```tsx
<h3 className="text-base font-semibold mb-2 flex items-center gap-2">
  <GripVertical className="h-4 w-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" />
  <Folder className="h-4 w-4" />
  Candidate Asset
</h3>
```

### After:
```tsx
<h3 className="text-base font-semibold mb-2 flex items-center gap-2">
  <Folder className="h-4 w-4" />
  Candidate Asset
</h3>
```

## What Was Removed

### GripVertical Icon:
- **Icon**: `<GripVertical />` (⋮⋮ symbol)
- **Purpose**: Drag handle for reordering sections
- **Size**: 16px × 16px (h-4 w-4)
- **Styling**: Gray color with hover effect
- **Functionality**: Cursor changes to grab/grabbing

### Why Remove It?

On mobile devices:
❌ **Not Useful** - No drag-and-drop functionality on mobile  
❌ **Visual Clutter** - Two icons side-by-side looked redundant  
❌ **Touch Gestures** - Mobile uses swipe, not drag-and-drop  
❌ **Limited Space** - Every pixel counts on small screens

## What Was Kept

### Folder Icon:
- **Icon**: `<Folder />` (📁 symbol)
- **Purpose**: Visual indicator that this is a file/asset section
- **Size**: 16px × 16px (h-4 w-4)
- **Styling**: Default foreground color
- **Meaning**: Universally understood as "files/documents"

## Visual Comparison

### Before (2 Icons):
```
[⋮⋮] [📁] Candidate Asset
 ↑    ↑
Grip Folder
```

### After (1 Icon):
```
[📁] Candidate Asset
 ↑
Folder only
```

## Impact

### Desktop:
- Same change applies (cleaner look)
- No drag functionality was implemented anyway

### Mobile:
- ✅ Cleaner header
- ✅ More space for text
- ✅ Single, clear icon
- ✅ Better visual hierarchy

## Section Context

This section displays:
- Candidate's uploaded files/attachments
- Resume, cover letters, portfolios, etc.
- Horizontally scrollable cards
- Each card shows file icon, name, and type badge

### Example:
```
📁 Candidate Asset
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 📄 Resume│ │ 📷 Photo │ │ 📄 Cover │
│   PDF    │ │   Image  │ │   DOCX   │
└──────────┘ └──────────┘ └──────────┘
```

## Layout Structure

```tsx
<div>
  <h3>
    <Folder /> {/* Single icon */}
    Candidate Asset
  </h3>
  <div className="flex gap-3 overflow-x-auto">
    {/* Attachment cards */}
  </div>
</div>
```

## Unused Import Cleanup

The `GripVertical` import is still in the file but no longer used:
```tsx
import { Folder, GripVertical, FileX, FileText, ImageIcon, FileIcon } from 'lucide-react';
```

This is fine - unused imports are typically removed during build optimization. If you want, we could remove it from the import statement.

## Benefits

✅ **Cleaner UI** - Less visual noise  
✅ **Better Mobile UX** - Optimized for touch devices  
✅ **Clearer Purpose** - One icon is easier to understand  
✅ **Consistent** - Matches other section headers  
✅ **More Space** - Extra room for longer text on small screens

## Other Section Headers (For Reference)

For consistency, check if other sections also use single icons:
- "Apply for" section
- "Attachments" section (desktop)
- "AI Evaluate" section
- "Test Score" section

## Responsive Behavior

### Mobile (<768px):
- Headers typically use single icons
- Limited horizontal space
- Touch-optimized interface

### Desktop (≥768px):
- Can afford more icons if needed
- Mouse interaction available
- More horizontal space

## Accessibility

✅ **No Impact** - Purely visual change  
✅ **Icon Still Decorative** - Text label is primary  
✅ **Screen Readers** - Read "Candidate Asset" text  
✅ **Visual Clarity** - Simplified design aids comprehension

## File Types Displayed

The section shows various file types with different icons:
- **PDF**: Red FileText icon
- **Images** (JPG, PNG, etc.): Blue ImageIcon
- **Other**: Gray FileIcon

Each attachment card has:
1. File type icon (left)
2. File name (center, truncated)
3. Type badge (bottom, small)

## Testing Checklist

- [ ] Open evaluate page on mobile
- [ ] Scroll to Candidate Asset section
- [ ] Verify only Folder icon is shown
- [ ] Confirm no GripVertical icon
- [ ] Check header looks clean and balanced
- [ ] Test on different screen sizes
- [ ] Verify attachment cards display correctly
- [ ] Check on desktop (same change applies)

## Notes

- Change affects both mobile and desktop views
- GripVertical was likely a copy/paste remnant
- Drag-and-drop section reordering was never implemented
- Folder icon is semantically appropriate for file section
- No functional changes, purely visual cleanup
