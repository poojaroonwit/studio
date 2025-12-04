# Desktop Evaluate Page Layout

## Overview
Created a separate desktop version of the evaluate page with a 2-column layout for screens >= 1280px wide. The current layout is preserved for tablet and mobile devices.

## Implementation

### New Component
- **File**: `src/app/candidates/[id]/evaluate/DesktopEvaluatePage.tsx`
- **Purpose**: Desktop-specific layout for candidate evaluation

### Layout Structure

#### Left Column - Candidate Details
Full-height scrollable section with accordion-based organization:
- **Candidate Info Header**
  - Avatar (large, 20x20)
  - Name, email, phone
  - Position badge
  
- **Accordion Sections** (all expanded by default)
  - Experience: Timeline-style display with company, title, dates, description
  - Education: Institution, degree, field of study, dates
  - Skills: Badge-based display

#### Right Column - Evaluation Details
Scrollable section with multiple cards:

1. **Attachments**
   - Auto-responsive grid layout:
     - 1 item: 1 column
     - 2 items: 2 columns
     - 3 items: 3 columns
     - 4 items: 2x2 grid
     - 5+ items: 3 columns
   - Click to open in new tab
   - Shows file count in header

2. **Testing Results**
   - Smaller circular progress indicators (16x16)
   - 3-column grid layout
   - Shows score/maxScore in center
   - Label below each circle

3. **Interviewers** (Floating Left)
   - Vertical list of fully-rounded buttons
   - Avatar on left side
   - Selected state with primary variant
   - Stacked layout for better space usage

4. **Average Score**
   - Large display of averaged score from all interviewers
   - Shows score out of 10
   - Only visible when evaluations exist

5. **Evaluation Results**
   - Shows selected interviewer's evaluation
   - Personality traits with scores and notes
   - Comments section at bottom
   - Card-based layout for each trait

## Responsive Behavior

### Desktop (>= 1280px)
- Uses `DesktopEvaluatePage` component
- 2-column grid layout
- Full-height scrollable columns

### Tablet/Mobile (< 1280px)
- Uses existing layout
- Single column with stacked sections
- Mobile-optimized components

## Key Features

1. **Shared Components**: Reuses UI components from candidate detail modal
2. **No Tabs**: All information displayed in accordion format for better overview
3. **Responsive Grid**: Attachments automatically adjust grid based on count
4. **Compact Testing**: Smaller circles save space while maintaining readability
5. **Vertical Interviewers**: Better use of vertical space with stacked buttons
6. **Real-time Updates**: Syncs with existing evaluation state management

## Files Modified

1. `src/app/candidates/[id]/evaluate/page.tsx`
   - Added desktop detection logic
   - Imported `DesktopEvaluatePage` component
   - Added conditional rendering based on screen size

2. `src/app/candidates/[id]/evaluate/DesktopEvaluatePage.tsx` (NEW)
   - Complete desktop layout implementation
   - 2-column grid structure
   - All evaluation components

## Usage

The desktop layout automatically activates when:
- Screen width >= 1280px
- User is on the evaluate page (not in form mode)

The layout seamlessly switches between desktop and tablet/mobile views on window resize.
