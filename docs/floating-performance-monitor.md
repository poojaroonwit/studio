# Floating Performance Monitor

## Overview

The performance monitors in the application have been enhanced with floating capabilities and drag-and-drop functionality. This allows users to move the performance monitors to any position on the screen and minimize them when not needed.

## Features

### 1. **Floating Position**
- Performance monitors are no longer fixed to the bottom-right corner
- Can be positioned anywhere on the screen
- Position is automatically saved to localStorage and restored on page reload

### 2. **Drag and Drop**
- Click and drag the monitor header (with the move icon) to reposition
- Smooth dragging with visual feedback
- Constrained to viewport bounds to prevent monitors from going off-screen
- Cursor changes to indicate draggable areas

### 3. **Minimize/Maximize**
- Click the X button to minimize the monitor to a floating button
- Click the floating button to restore the full monitor
- Minimized state shows performance status indicators

### 4. **Visual Enhancements**
- Smooth animations and transitions
- Hover effects with scale transforms
- Visual feedback during dragging
- Backdrop blur and shadow effects

## Components

### Main Performance Monitor
- **File**: `src/components/ui/performance-monitor.tsx`
- **Usage**: Automatically included in development mode
- **Features**: 
  - Memory usage tracking
  - Render performance monitoring
  - API call counting
  - Cache hit rate analysis
  - Navigation timing

### Candidate Performance Monitor
- **File**: `src/components/candidates/CandidatePerformanceMonitor.tsx`
- **Usage**: Used specifically for candidate-related performance tracking
- **Features**:
  - Filter response time tracking
  - API response time monitoring
  - Cache hit/miss analysis
  - Optimistic update detection

## Usage

### Basic Usage
The performance monitors are automatically enabled in development mode and will appear as floating elements on the screen.

### Manual Integration
```tsx
import { PerformanceMonitor } from '@/components/ui/performance-monitor';

function MyComponent() {
  return (
    <PerformanceMonitor 
      enabled={true}
      showDetails={true}
      threshold={{
        memory: 150,
        renderTime: 500,
        apiCalls: 15,
        cacheHitRate: 60,
        navigationTime: 1500
      }}
    />
  );
}
```

### Candidate Performance Tracking
```tsx
import { CandidatePerformanceMonitor, useCandidatePerformanceTracker } from '@/components/candidates/CandidatePerformanceMonitor';

function CandidatesPage() {
  const { trackFilterChange, trackApiRequest, trackApiResponse } = useCandidatePerformanceTracker();
  
  // Use tracking functions in your API calls
  const handleFilterChange = () => {
    trackFilterChange();
    // ... filter logic
  };
  
  return (
    <div>
      {/* Your candidates content */}
      <CandidatePerformanceMonitor showDetails={true} />
    </div>
  );
}
```

## CSS Classes

The following CSS classes are available for styling:

### `.floating-performance-monitor`
- Applied to the main container
- Handles cursor states and transitions
- Includes dragging state styles

### `.floating-performance-button`
- Applied to minimized button states
- Provides hover and active states
- Includes scale animations

### `.performance-drag-handle`
- Applied to draggable header areas
- Provides visual feedback for drag interactions

## Configuration

### Thresholds
You can configure performance thresholds to trigger warnings:

```tsx
const thresholds = {
  memory: 150,        // MB
  renderTime: 500,    // ms
  apiCalls: 15,       // count
  cacheHitRate: 60,   // percentage
  navigationTime: 1500 // ms
};
```

### Position Persistence
- Positions are automatically saved to localStorage
- Keys: `performance-monitor-position` and `candidate-performance-monitor-position`
- Positions are restored on page reload

## Browser Compatibility

The floating performance monitors use modern browser APIs:
- `localStorage` for position persistence
- CSS transforms and transitions
- Mouse event handling
- Performance API for metrics

## Troubleshooting

### Monitor Not Appearing
- Ensure you're in development mode (`NODE_ENV === 'development'`)
- Check browser console for any JavaScript errors
- Verify the component is properly imported and rendered

### Drag Not Working
- Ensure the monitor is not minimized
- Click on the header area with the move icon
- Check that no other elements are blocking the drag area

### Position Not Saving
- Check browser localStorage support
- Verify no storage quota exceeded errors
- Ensure the component is properly mounted

## Future Enhancements

Potential improvements for the floating performance monitors:
- Touch support for mobile devices
- Keyboard shortcuts for positioning
- Multiple monitor instances
- Customizable themes and colors
- Export performance data
- Integration with external monitoring services
