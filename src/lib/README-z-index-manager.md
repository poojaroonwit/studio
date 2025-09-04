# Dynamic Z-Index Management System

This system provides dynamic z-index management for modals, drawers, and overlays to ensure proper layering based on the sequence they are opened.

## Problem Solved

Previously, the application had inconsistent modal layering:
- Position page: `page -> overlay -> drawer -> overlay -> modal`
- Candidate page: `page -> overlay -> modal -> overlay -> modal`
- My tasks: `overlay -> candidate detail modal -> overlay -> position drawer`

This caused z-index conflicts and inconsistent user experience.

## Solution

The dynamic z-index manager tracks the opening sequence of modals and assigns appropriate z-index values, ensuring the most recently opened modal always appears on top.

## How It Works

### 1. Z-Index Manager (`src/lib/z-index-manager.ts`)

The `ZIndexManager` singleton class:
- Tracks all open modals in a stack
- Assigns z-index values based on opening order
- Automatically cleans up when modals close
- Provides utilities for focus management

### 2. Updated UI Components

All modal components now support dynamic z-index:
- `Dialog` - `src/components/ui/dialog.tsx`
- `Sheet` - `src/components/ui/sheet.tsx` 
- `AlertDialog` - `src/components/ui/alert-dialog.tsx`

### 3. Custom Modal Support

The `CandidateDetailModal` has been updated to use the system.

## Usage

### Basic Usage

```tsx
import { Dialog, DialogContent } from '@/components/ui/dialog';

function MyComponent() {
  return (
    <Dialog>
      <DialogContent modalId="my-unique-modal">
        {/* Modal content */}
      </DialogContent>
    </Dialog>
  );
}
```

### With Dynamic Modal Wrapper

```tsx
import { DynamicModalWrapper } from '@/components/ui/dynamic-modal-wrapper';

function MyComponent() {
  return (
    <DynamicModalWrapper 
      modalType="custom-modal" 
      modalId="my-modal" 
      isOpen={isOpen}
    >
      <MyCustomModal />
    </DynamicModalWrapper>
  );
}
```

### Using the Hook

```tsx
import { useDynamicZIndex } from '@/components/ui/dynamic-modal-wrapper';

function MyCustomModal({ isOpen }) {
  const zIndex = useDynamicZIndex('custom-modal', isOpen, 'my-modal-id');
  
  return (
    <div style={{ zIndex: zIndex.overlay }}>
      <div style={{ zIndex: zIndex.content }}>
        {/* Modal content */}
      </div>
    </div>
  );
}
```

## Z-Index Values

- Base z-index: `10000`
- Increment per modal: `100`
- Overlay z-index: `base + (stack_position * 100)`
- Content z-index: `overlay_z_index + 1`

Examples:
- First modal: overlay `10000`, content `10001`
- Second modal: overlay `10100`, content `10101`
- Third modal: overlay `10200`, content `10201`

## Modal Types

Supported modal types:
- `dialog` - Standard dialog modals
- `sheet` - Drawer/sheet components
- `alert-dialog` - Alert dialogs
- `custom-modal` - Custom modal implementations

## Key Features

### 1. Automatic Stack Management
- Modals are automatically added to the stack when opened
- Removed when closed
- Z-index values recalculated as needed

### 2. Unique Modal IDs
- Each modal should have a unique ID
- Auto-generated if not provided
- Format: `{type}-{timestamp}-{random}`

### 3. Focus Management
- `bringToFront()` method moves modal to top of stack
- Useful for focus management and user interaction

### 4. Cleanup
- Automatic cleanup on component unmount
- `clearAll()` method for emergency cleanup
- Prevents memory leaks and z-index conflicts

## Integration Examples

### Position Detail Drawer

```tsx
<PositionDetailDrawer
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  positionId={positionId}
  modalId="dashboard-position-drawer" // Unique ID
/>
```

### Alert Dialogs

```tsx
<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
  <AlertDialogContent modalId="delete-confirmation">
    {/* Content */}
  </AlertDialogContent>
</AlertDialog>
```

## Debugging

The system includes comprehensive logging:
- Modal registration/unregistration
- Z-index assignments
- Stack state changes

Check browser console for debug information.

## Demo Component

Use `src/components/ui/z-index-demo.tsx` to test the system:
- Open multiple modals in different orders
- View the current modal stack
- Test nested modal scenarios

## Migration Guide

### For Existing Modals

1. Add `modalId` prop to modal components
2. Ensure unique IDs across your application
3. Test modal layering scenarios

### For Custom Modals

1. Use `useDynamicZIndex` hook
2. Or wrap with `DynamicModalWrapper`
3. Or manually integrate with `zIndexManager`

## Best Practices

1. **Always provide unique modal IDs** - Prevents conflicts
2. **Use descriptive IDs** - Easier debugging
3. **Test nested scenarios** - Ensure proper layering
4. **Clean up on unmount** - Prevent memory leaks
5. **Monitor console logs** - Debug z-index issues

## Troubleshooting

### Modal Not Appearing on Top
- Check if modal ID is unique
- Verify modal is properly registered
- Check console for z-index values

### Z-Index Conflicts
- Use `clearAll()` to reset stack
- Ensure proper cleanup on unmount
- Check for duplicate modal IDs

### Performance Issues
- Modals are automatically cleaned up
- Stack size is typically small (< 10 items)
- Z-index calculations are lightweight

## Future Enhancements

Potential improvements:
- Animation support for z-index changes
- Modal grouping (e.g., all dialogs vs sheets)
- Priority-based z-index assignment
- Visual debugging tools
