# Task Board Horizontal Layout

## Overview

The task board now supports a horizontal layout that displays recruitment stages as columns with horizontal scrolling and navigation controls. This provides a more intuitive view of the recruitment pipeline.

## Features

### Default Configuration
- **Row Field**: `none` (no rows)
- **Column Field**: `status` (recruitment stages as columns)
- **Layout**: Horizontal scrolling with navigation controls

### Horizontal Scrolling
- **Automatic Navigation**: When there are more than 2 stages, navigation buttons appear
- **Previous/Next Buttons**: Located at the top and sides of the board
- **Smooth Scrolling**: Animated scrolling between stages
- **Progress Indicators**: Dots at the bottom show current scroll position

### Navigation Controls
- **Top Navigation**: Previous/Next buttons with stage count and candidate count
- **Side Navigation**: Floating buttons that appear when scrolling is possible
- **Progress Dots**: Visual indicators showing which stages are currently visible

### Drag and Drop
- **Stage Transitions**: Drag candidates between recruitment stages
- **Visual Feedback**: Highlighted drop zones when dragging
- **Status Updates**: Automatic status updates when candidates are moved

### Responsive Design
- **Mobile Friendly**: Touch-friendly scrolling on mobile devices
- **Adaptive Layout**: Automatically adjusts based on screen size
- **Flexible Width**: Stages adapt to available space

## Usage

### Default View
When you first visit the task board, it will show:
- Recruitment stages as horizontal columns
- Candidates grouped by their current stage
- Navigation controls if there are more than 2 stages

### Customization
You can customize the board through the "Customize Board" button:
- Change row and column fields
- Select which fields to display on candidate cards
- Choose which stages to show/hide

### Navigation
- **Mouse/Trackpad**: Scroll horizontally to see more stages
- **Navigation Buttons**: Click Previous/Next to move between stages
- **Keyboard**: Use arrow keys when focused on navigation buttons

## Technical Implementation

### Components
- `HorizontalStageKanbanView`: Main component for horizontal layout
- `EnhancedCandidateCard`: Reusable candidate card component
- Navigation controls with smooth scrolling

### State Management
- Scroll position tracking
- Drag and drop state
- Stage visibility preferences

### Performance
- Efficient rendering with React.memo
- Smooth animations with CSS transitions
- Optimized scroll handling

## Configuration

### Board Preferences
The board automatically saves your preferences:
- Row/column field selections
- Visible fields on candidate cards
- Stage visibility settings

### Default Settings
```javascript
{
  rowField: 'none',
  columnField: 'status',
  visibleFields: ['name', 'email', 'status', 'fitScore'],
  visibleRowValues: [],
  visibleColumnValues: [] // Will be populated with all stages
}
```

## Benefits

1. **Better Pipeline View**: See the entire recruitment pipeline at a glance
2. **Intuitive Navigation**: Easy to move between stages with visual feedback
3. **Mobile Friendly**: Works well on touch devices
4. **Customizable**: Flexible configuration options
5. **Performance**: Smooth scrolling and efficient rendering 