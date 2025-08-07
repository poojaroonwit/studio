# Recently Visited URLs Feature

## Overview

The recently visited URLs feature automatically tracks the pages you visit in the application and displays them in the left sidebar for quick access.

## Features

- **Automatic Tracking**: Automatically tracks page visits and stores them in localStorage
- **Smart Filtering**: Excludes certain paths like API routes, static assets, and the dashboard
- **Time Display**: Shows relative time (e.g., "2h ago", "3d ago") for each visited URL
- **Clear Function**: Allows users to clear the recent URLs history
- **Responsive Design**: Works in both expanded and collapsed sidebar modes

## How It Works

### Tracking
- Uses a custom React hook (`useRecentUrls`) to track page navigation
- Stores up to 10 recent URLs in localStorage
- Automatically updates when the user navigates to different pages
- Excludes certain paths that shouldn't be tracked (dashboard, API routes, etc.)

### Display
- Shows in the sidebar as a "Recently Visited" section
- Displays up to 5 URLs in expanded mode, 3 in collapsed mode
- Each URL shows the page name and relative time
- Current page is highlighted when active

### User Controls
- Clear button (X icon) to remove all recent URLs
- Tooltips show full page name and time in collapsed mode

## Technical Implementation

### Files Modified
- `src/hooks/use-recent-urls.ts` - Custom hook for tracking URLs
- `src/components/layout/SidebarNav.tsx` - Updated to include recent URLs section

### Key Components
1. **useRecentUrls Hook**: Manages URL tracking and localStorage persistence
2. **formatRelativeTime Function**: Converts timestamps to human-readable time
3. **SidebarNav Component**: Renders the recent URLs in both expanded and collapsed modes

### Data Structure
```typescript
interface RecentUrl {
  path: string;      // The URL path
  label: string;     // Display name for the page
  timestamp: number; // When the page was visited
}
```

## Configuration

### Path Labels
The feature includes a mapping of common paths to display names:
- `/candidates` → "Candidates"
- `/positions` → "Positions"
- `/settings` → "Settings"
- etc.

### Dynamic Labels
For paths not in the predefined map, the system generates labels:
- `/candidates/123` → "Candidate Details"
- `/positions/456` → "Position Details"
- `/settings/users` → "Users"

## Browser Compatibility

- Uses localStorage for persistence
- Gracefully handles localStorage errors
- Works in all modern browsers

## Future Enhancements

Potential improvements could include:
- Maximum age for URLs (auto-remove old entries)
- Category-based grouping
- Search/filter functionality
- Export/import of recent URLs
- Integration with browser history
