# Horizontal Fit Score Filter Badges

## Overview

The candidate page now includes horizontal fit score filter badges that allow users to quickly filter candidates by their fit score ranges. These badges are displayed above the candidate table and provide an intuitive way to filter candidates based on their applied position fit scores and matching position fit scores.

## Features

### Visual Design
- **Color Gradient**: Badges use a dark blue to light blue gradient (A=darkest, E=lightest)
- **Interactive**: Click to select/deselect grade ranges
- **Count Display**: Shows the number of candidates in each grade range
- **Responsive**: Badges wrap to multiple lines on smaller screens

### Filter Types
1. **Applied Position Fit Score**: Filters candidates based on their fit score for the position they applied to
2. **Matching Position Fit Score**: Filters candidates based on their best matching fit score across all positions

### Grade Ranges
- **A Grade**: 81-100 (Dark Blue)
- **B Grade**: 61-80 (Medium Dark Blue)
- **C Grade**: 41-60 (Medium Blue)
- **D Grade**: 21-40 (Light Blue)
- **E Grade**: 0-20 (Very Light Blue)
- **No Score**: Candidates without fit scores (Gray)

## Usage

### Basic Filtering
1. Navigate to the Candidates page
2. Locate the horizontal fit score filter badges above the candidate table
3. Click on any grade badge to filter candidates by that score range
4. Multiple grades can be selected simultaneously
5. Click again to deselect a grade

### Integration with Existing Filters
- Horizontal fit score filters work independently of sidebar filters
- When other filters are applied, horizontal fit score filters are cleared to avoid conflicts
- The "Clear all filters" button also clears horizontal fit score selections

### Active Filter Display
- Selected fit score filters appear in the active filters bar
- Shows which grade ranges are currently selected
- Can be cleared individually or with the "Clear all" button

## Technical Implementation

### Components
- `FitScoreFilterBadges.tsx`: Main component for the horizontal filter badges
- Integrated into `CandidatesPageClient.tsx` above the candidate table

### State Management
- Separate state for horizontal fit score filters
- Automatic synchronization with main filter state
- Debounced API calls for smooth user experience

### API Integration
- Uses existing fit score filtering API endpoints
- Converts grade selections to min/max score ranges
- Maintains backward compatibility with existing filter system

## Benefits

1. **Quick Access**: No need to open sidebar filters for common fit score filtering
2. **Visual Clarity**: Color-coded badges make it easy to understand score ranges
3. **Efficient Workflow**: One-click filtering for frequently used score ranges
4. **Count Visibility**: See how many candidates are in each grade range
5. **Responsive Design**: Works well on different screen sizes

## Future Enhancements

- Add tooltips showing exact score ranges
- Include percentage indicators for each grade
- Add keyboard shortcuts for quick selection
- Consider adding "Select All" and "Clear All" buttons for each filter type
