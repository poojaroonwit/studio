# Dynamic Z-Index Management System

## Overview

This system provides dynamic z-index management for modals, drawers, and overlays in the application. Instead of using static z-index values, the system automatically assigns z-index values based on the sequence of opening components, ensuring that the most recently opened component always appears on top.

## Problem Solved

Previously, the application had issues with modal/drawer layering where:
- Position page → Drawer → Candidate table → Modal created: `page -> overlay -> drawer -> overlay -> modal`
- Candidate page → Modal → Overlay → Modal created: `page -> overlay -> modal -> overlay -> modal`
- My task board → Overlay → Candidate detail modal → Overlay → Position drawer created inconsistent layering

The static z-index values didn't account for the opening sequence, causing components to appear in the wrong order.

## Solution

The dynamic z-index system:
1. **Tracks opening sequence**: Each component gets a unique ID and timestamp when opened
2. **Assigns incremental z-index**: Each new component gets a higher z-index than the previous one
3. **Automatically manages layering**: The most recently opened component always appears on top
4. **Handles cleanup**: Components are automatically unregistered when closed

## Architecture

### Core Components

1. **ZIndexContext** (`src/contexts/ZIndexContext.tsx`)
   - Manages the global z-index state
   - Provides registration/unregistration functions
   - Tracks component types (modal, drawer, overlay)

2. **useDynamicZIndex Hook**
   - Automatically registers components when mounted
   - Returns appropriate z-index values for overlay and content
   - Handles cleanup when component unmounts

3. **Updated UI Components**
   - `Sheet` (drawer): Uses dynamic z-index with unique IDs
   - `Dialog` (modal): Uses dynamic z-index with unique IDs
   - `AlertDialog`: Uses dynamic z-index with unique IDs

### Z-Index Values

- **Base values**: Starting from 10000
- **Increment**: Each new component gets +100 z-index
- **Overlay**: Always 1 less than content z-index
- **Content**: Gets the full z-index value

Example sequence:
1. First drawer: Overlay=10000, Content=10001
2. Modal from drawer: Overlay=10100, Content=10101
3. Alert from modal: Overlay=10200, Content=10201

## Usage

### Basic Usage

```tsx
import { useDynamicZIndex } from '@/contexts/ZIndexContext';

function MyComponent() {
  const { overlayZIndex, contentZIndex } = useDynamicZIndex('my-component-id', 'modal');
  
  return (
    <div style={{ zIndex: contentZIndex }}>
      <div style={{ zIndex: overlayZIndex }}>Overlay</div>
      Content
    </div>
  );
}
```

### With UI Components

```tsx
// Drawer with unique ID
<SheetContent sheetId="position-drawer-123">
  {/* Content */}
</SheetContent>

// Modal with unique ID
<DialogContent dialogId="candidate-modal-456">
  {/* Content */}
</DialogContent>

// Alert dialog with unique ID
<AlertDialogContent dialogId="confirmation-alert-789">
  {/* Content */}
</AlertDialogContent>
```

### Provider Setup

The system is automatically set up in `ClientProviders.tsx`:

```tsx
<ZIndexProvider>
  {/* Your app components */}
</ZIndexProvider>
```

## Implementation Details

### Component Registration

When a component mounts:
1. Generates unique ID (or uses provided ID)
2. Registers with ZIndexContext
3. Gets assigned next available z-index
4. Returns overlay and content z-index values

### Component Cleanup

When a component unmounts:
1. Automatically unregisters from ZIndexContext
2. Z-index values are freed up for reuse
3. No memory leaks or stale references

### Type Safety

The system supports three component types:
- `'modal'`: Standard modals and dialogs
- `'drawer'`: Side panels and drawers
- `'overlay'`: Background overlays

## Benefits

1. **Automatic layering**: No need to manually manage z-index values
2. **Sequence-aware**: Always respects opening order
3. **Type-safe**: TypeScript support with proper typing
4. **Memory efficient**: Automatic cleanup prevents leaks
5. **Flexible**: Works with any component that needs z-index management
6. **Consistent**: Same behavior across all modals/drawers

## Migration Guide

### Before (Static Z-Index)

```tsx
// Old way - static z-index
<div className="fixed inset-0 z-[10000]">Overlay</div>
<div className="fixed z-[10001]">Content</div>
```

### After (Dynamic Z-Index)

```tsx
// New way - dynamic z-index
const { overlayZIndex, contentZIndex } = useDynamicZIndex('my-id', 'modal');

<div style={{ zIndex: overlayZIndex }}>Overlay</div>
<div style={{ zIndex: contentZIndex }}>Content</div>
```

## Testing

The system can be tested using the example component:

```tsx
import { DynamicZIndexExample } from '@/components/examples/DynamicZIndexExample';

// Add to any page to test the system
<DynamicZIndexExample />
```

Test scenarios:
1. Open drawer → open modal from drawer → open alert from modal
2. Open modal → open drawer from modal → open alert from drawer
3. Open multiple components in different orders

## Troubleshooting

### Common Issues

1. **Component not appearing on top**: Ensure unique IDs are used
2. **Z-index conflicts**: Check that static z-index CSS is removed
3. **Memory leaks**: Components should unmount properly to trigger cleanup

### Debug Mode

To debug z-index issues, you can inspect the ZIndexContext state:

```tsx
const { getZIndex, getOverlayZIndex } = useZIndex();
console.log('Current z-index:', getZIndex('my-component-id'));
```

## Future Enhancements

1. **Animation support**: Smooth transitions between z-index changes
2. **Priority system**: Allow certain components to have higher priority
3. **Nested component support**: Better handling of deeply nested modals
4. **Performance monitoring**: Track z-index usage and performance impact
