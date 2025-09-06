# Application Zoom Control

This document explains the zoom control functionality that has been added to reduce the overall screen size of the application.

## Features Added

### 1. Viewport Meta Tag
- Added to `src/app/layout.tsx`
- Sets initial zoom to 80% (`initial-scale=0.8`)
- Allows user scaling (`user-scalable=yes`)
- Maximum scale limited to 100% (`maximum-scale=1.0`)

### 2. Dynamic Zoom Control Component
- **File**: `src/components/ui/zoom-control.tsx`
- **Features**:
  - Floating zoom control panel (bottom-right corner)
  - Slider for precise zoom adjustment (50% - 150%)
  - Quick zoom buttons (75%, 90%, 100%, 110%, 125%)
  - Reset to 100% button
  - Remembers zoom level in localStorage
  - Smooth transitions

### 3. Settings Page Integration
- **File**: `src/components/settings/ZoomSettings.tsx`
- **Features**:
  - Comprehensive zoom settings panel
  - Auto-adjust zoom by device type
  - Mobile-specific zoom settings
  - Remember zoom level between sessions
  - Quick zoom presets
  - Real-time preview of current settings

### 4. CSS Zoom Utilities
- **File**: `src/app/globals.css`
- **Features**:
  - CSS classes for alternative zoom methods
  - Responsive zoom adjustments
  - Mobile-specific zoom limits

### 5. Keyboard Shortcuts
- **Files**: `src/components/ui/zoom-control.tsx`, `src/components/ui/zoom-control-compact.tsx`
- **Features**:
  - Keyboard shortcuts trigger existing zoom control buttons
  - Standard zoom shortcuts (Ctrl + Plus/Minus/0)
  - Cross-platform support (Windows/Linux/Mac)
  - Prevents default browser zoom behavior
  - Integrates with existing zoom system

## Usage

### For Users

1. **Quick Access**: Look for the zoom icon in the bottom-right corner of the application
2. **Settings**: Go to Settings page to access comprehensive zoom controls
3. **Keyboard Shortcuts**: 
   - **Ctrl + Plus** (or **Ctrl + =**): Triggers the zoom in button (+10%)
   - **Ctrl + Minus**: Triggers the zoom out button (-10%)
   - **Ctrl + 0**: Triggers the reset button (100%)
   - Works on both Windows/Linux (Ctrl) and Mac (Cmd)
   - Keyboard shortcuts activate the same functionality as clicking the zoom control buttons

### For Developers

#### Using the Zoom Hook
```tsx
import { useZoom } from '@/components/ui/zoom-control';

function MyComponent() {
  const { zoom, setZoom, resetZoom } = useZoom();
  
  return (
    <div>
      <p>Current zoom: {Math.round(zoom * 100)}%</p>
      <button onClick={() => setZoom(0.8)}>Set to 80%</button>
      <button onClick={resetZoom}>Reset to 100%</button>
    </div>
  );
}
```

#### Using CSS Zoom Classes
```tsx
<div className="app-zoom-80">This content is zoomed to 80%</div>
<div className="app-zoom-90">This content is zoomed to 90%</div>
```

## Configuration Options

### Viewport Meta Tag Options
- `initial-scale=0.8`: Sets initial zoom to 80%
- `maximum-scale=1.0`: Prevents zooming beyond 100%
- `user-scalable=yes`: Allows user to zoom in/out
- `width=device-width`: Ensures proper mobile rendering

### Zoom Control Settings
- **Min Zoom**: 50% (0.5)
- **Max Zoom**: 150% (1.5)
- **Default Zoom**: 100% (1.0)
- **Step Size**: 5% (0.05)

### Auto-Zoom Settings
- **Mobile (< 640px)**: Configurable (default 90%)
- **Tablet (640px - 1024px)**: 95%
- **Desktop (> 1024px)**: 100%

## Browser Compatibility

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Mobile browsers: Full support

## Storage

Zoom preferences are stored in localStorage:
- `app-zoom-level`: Current zoom level
- `auto-zoom-enabled`: Auto-zoom setting
- `remember-zoom-enabled`: Remember zoom setting
- `mobile-zoom-level`: Mobile-specific zoom level

## Performance Considerations

- Zoom is applied using CSS `zoom` property for optimal performance
- Smooth transitions prevent jarring visual changes
- localStorage caching reduces initialization time
- Responsive adjustments prevent layout breaking on small screens

## Troubleshooting

### Zoom Not Working
1. Check if viewport meta tag is present
2. Verify browser supports CSS zoom property
3. Clear localStorage and refresh page

### Layout Issues
1. Ensure responsive breakpoints are properly configured
2. Check for conflicting CSS transforms
3. Verify mobile zoom limits are appropriate

### Performance Issues
1. Reduce zoom transition duration
2. Disable auto-zoom for better performance
3. Use CSS zoom instead of transform for better performance

## Future Enhancements

- [ ] Per-page zoom settings
- [ ] Zoom level indicators in UI
- [x] Keyboard shortcuts for zoom control
- [ ] Zoom level presets for different use cases
- [ ] Accessibility improvements for zoom controls
