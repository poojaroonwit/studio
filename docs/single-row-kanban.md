# Single Row Kanban View

## Overview

The Single Row Kanban View is a new feature in the My Task Board that automatically activates **within each row** when there's only 1 column or no columns configured. Instead of showing multiple candidate cards in a row, it displays candidates as a single row with navigation controls within each row.

## When It Activates

The SingleRowCandidateView automatically activates within each row when:
- No column field is configured (`columnField` is `'none'` or not set)
- Only 1 column value is visible (`visibleColumnValues.length <= 1`)

## Features

### Navigation Controls (within each row)
- **Previous/Next Buttons**: Navigate between candidates within the row with arrow buttons
- **Progress Indicator**: Shows current position (e.g., "1 of 5") within the row
- **Dot Navigation**: Click on dots to jump to specific candidates within the row

### Candidate Display (within each row)
- **Compact Layout**: Horizontal layout showing candidate avatar, details, and actions
- **Detailed Information**: Shows name, position, status, contact info, and fit score
- **Action Buttons**: View and Edit buttons for quick actions
- **Status Badge**: Color-coded status indicator

### Responsive Design
- **Mobile Friendly**: Adapts to different screen sizes
- **Touch Optimized**: Large touch targets for mobile devices
- **Accessible**: Proper ARIA labels and keyboard navigation

## Implementation Details

### Component Location
```typescript
src/components/candidates/CandidateKanbanView.tsx
```

### Key Functions
- `SingleRowCandidateView`: Component for single row display within each row
- `FlexibleKanbanView`: Automatically switches to SingleRowCandidateView within rows when appropriate

### Props for SingleRowCandidateView
```typescript
interface SingleRowCandidateViewProps {
  candidates: Candidate[];
  onCardClick?: (candidate: Candidate) => void;
  onMoveCandidate?: (candidate: Candidate, newValue: string) => void;
}
```

## Usage Example

The SingleRowCandidateView is automatically used by the FlexibleKanbanView within each row when the conditions are met:

```typescript
// In FlexibleKanbanView - row rendering logic
{effectiveRowValues.map(rowValue => (
  <div key={rowValue} className="...">
    {/* Row header */}
    <div className="w-40 flex-shrink-0">
      <span>{rowValue}</span>
      <Badge>{candidatesByPosition[rowValue]?.['default']?.length || 0} candidates</Badge>
    </div>
    
    {/* Row content */}
    <div className="flex-1">
      {candidatesByPosition[rowValue]?.['default']?.length > 0 ? (
        shouldUseSingleRow ? (
          <SingleRowCandidateView
            candidates={candidatesByPosition[rowValue]['default']}
            onCardClick={handleCardClick}
            onMoveCandidate={onMoveCandidate}
          />
        ) : (
          // Traditional multi-card layout
          <div className="flex flex-row flex-wrap gap-3">
            {/* Multiple candidate cards */}
          </div>
        )
      ) : (
        // Empty state
        <div>No candidates</div>
      )}
    </div>
  </div>
))}
```

## Visual Layout

### Traditional Multi-Card Layout (when multiple columns)
```
┌─────────────────────────────────────────────────────────────┐
│ Applied (3 candidates)                                      │
├─────────────────────────────────────────────────────────────┤
│ [Card 1] [Card 2] [Card 3]                                 │
└─────────────────────────────────────────────────────────────┘
```

### Single Row Layout (when 1 column or no columns)
```
┌─────────────────────────────────────────────────────────────┐
│ Applied (3 candidates)                                      │
├─────────────────────────────────────────────────────────────┤
│ [←] 1 of 3 [→] [Candidate Card with details] [View] [Edit] │
│     [●] [○] [○]                                            │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### To Force Single Row View
Set the column field to 'none' in the board customization:

```typescript
// In CustomizeBoardModal
setColumnField('none');
setVisibleColumnValues([]);
```

### To Use Traditional Multi-Card Layout
Ensure multiple column values are configured:

```typescript
setColumnField('recruiterId');
setVisibleColumnValues(['recruiter1', 'recruiter2', 'recruiter3']);
```

## Benefits

1. **Better UX for Single Column**: When there's only one column, the traditional multi-card layout doesn't make sense
2. **Focused View**: Users can focus on one candidate at a time within each row
3. **Efficient Navigation**: Quick navigation between candidates without scrolling
4. **Space Efficient**: Better use of horizontal space when there are few candidates
5. **Consistent Interface**: Maintains the same functionality as the traditional kanban view
6. **Row-Based Organization**: Keeps the row structure while optimizing candidate display

## Future Enhancements

Potential improvements could include:
- Keyboard shortcuts for navigation (arrow keys)
- Swipe gestures for mobile
- Bulk actions for multiple candidates
- Filtering within the single row view
- Customizable card layout
- Drag and drop between rows
- Auto-advance after actions 