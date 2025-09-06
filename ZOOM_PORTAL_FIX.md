# Zoom Portal Fix

## Problem
When the application uses CSS `zoom` property on `document.documentElement` to control the overall zoom level, dropdowns and other portal-rendered components (using Radix UI portals like `PopoverPrimitive.Portal`, `DropdownMenuPrimitive.Portal`, etc.) don't inherit the zoom transformation because they render outside the document element.

This causes dropdowns to appear at the wrong scale and position when the page is zoomed in or out.

## Solution
Created a `ZoomAwarePortal` component that:

1. **Listens to zoom changes**: Monitors the `zoomChanged` custom event and localStorage for zoom level changes
2. **Applies consistent scaling**: Uses CSS `transform: scale()` to apply the same zoom level to portal content
3. **Maintains positioning**: Uses `transformOrigin: 'top left'` to ensure proper positioning

## Implementation

### New Component: `src/components/ui/zoom-aware-portal.tsx`
- Wraps portal content with zoom-aware scaling
- Automatically syncs with the application's zoom system
- Handles SSR safely with proper mounting checks

### Updated Components
All portal-based UI components have been updated to use `ZoomAwarePortal`:

- **DropdownMenu** (`src/components/ui/dropdown-menu.tsx`)
  - `DropdownMenuContent`
  - `DropdownMenuSubContent`

- **Popover** (`src/components/ui/popover.tsx`)
  - `PopoverContent`

- **Select** (`src/components/ui/select.tsx`)
  - `SelectContent`

- **Dialog** (`src/components/ui/dialog.tsx`)
  - `DialogContent`

- **AlertDialog** (`src/components/ui/alert-dialog.tsx`)
  - `AlertDialogContent`

- **Sheet** (`src/components/ui/sheet.tsx`)
  - `SheetContent`

- **Menubar** (`src/components/ui/menubar.tsx`)
  - `MenubarContent`
  - `MenubarSubContent`

## How It Works

1. The `ZoomAwarePortal` component listens for zoom changes via the `zoomChanged` event
2. When zoom level changes, it applies `transform: scale(${zoomLevel})` to the portal content
3. This ensures portal-rendered components scale consistently with the rest of the application
4. The `transformOrigin: 'top left'` ensures proper positioning relative to the trigger element

## Benefits

- ✅ Dropdowns now scale correctly with page zoom
- ✅ All portal-based components maintain consistent appearance
- ✅ No breaking changes to existing component APIs
- ✅ Automatic synchronization with the zoom control system
- ✅ SSR-safe implementation

## Testing

To test the fix:

1. Open the application
2. Use the zoom control to change the zoom level (50% - 150%)
3. Open any dropdown, popover, select, dialog, sheet, or menubar
4. Verify that the portal content scales correctly with the page zoom
5. Check that positioning remains accurate relative to trigger elements

The fix ensures that all dropdown and modal components now properly inherit the document's zoom level, providing a consistent user experience across all zoom levels.
