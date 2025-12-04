# Expired Evaluation Link Feature

## Overview
Implemented a dedicated page that displays when an evaluation link has expired, with options to return home or reactivate the link (for authorized users only).

## Implementation

### New Component
- **File**: `src/app/candidates/[id]/evaluate/components/ExpiredLinkPage.tsx`
- **Purpose**: Display expired link message with appropriate actions

### Features

#### For All Users
- **Clear Message**: Displays a prominent "Link Expired" message with an alert icon
- **Explanation**: Informs users that the link is no longer valid
- **Back to Home Button**: Allows users to navigate back to the home page
- **Branded Header**: Shows candidate name and app logo with custom background styling

#### For Authorized Users Only
- **Reactivate Link Button**: Visible only to users with proper permissions
- **7-Day Extension**: Reactivates the link for an additional 7 days
- **Auto-redirect**: After reactivation, automatically redirects to the evaluation page with the new token
- **Permission Check**: Only users with evaluation link management permissions can see this option

### Link Expiration Check

The evaluate page now checks for link expiration in the `checkEvaluationLink` function:

1. **Token Detection**: Checks if a token parameter exists in the URL
2. **API Validation**: Fetches the evaluation link details from the API
3. **Expiration Check**: Compares the `expiresAt` date with the current time
4. **Permission Check**: Determines if the current user can reactivate the link
5. **State Management**: Sets `linkExpired` and `canReactivateLink` states

### User Experience Flow

#### Expired Link (No Permission)
1. User clicks on expired evaluation link
2. Page loads and detects expiration
3. Shows expired link page with:
   - Alert icon and "Link Expired" heading
   - Explanation message
   - "Back to Home" button only

#### Expired Link (With Permission)
1. User clicks on expired evaluation link
2. Page loads and detects expiration
3. Shows expired link page with:
   - Alert icon and "Link Expired" heading
   - Explanation message
   - "Reactivate Link" button (primary)
   - "Back to Home" button (secondary)
   - Helper text explaining reactivation capability

#### Reactivation Process
1. User clicks "Reactivate Link" button
2. Button shows loading state with spinner
3. API call creates new link with 7-day expiration
4. Success toast notification
5. Automatic redirect to evaluation page with new token
6. If error occurs, shows error toast and keeps user on expired page

### API Integration

**Endpoint**: `POST /api/v1/candidates/[id]/evaluation-link`

**Request Body**:
```json
{
  "days": 7,
  "force": true
}
```

**Response**:
```json
{
  "id": "link-id",
  "token": "new-token",
  "url": "full-evaluation-url",
  "expiresAt": "2024-12-11T...",
  "requireLogin": true,
  "createdBy": { ... }
}
```

### Styling

- Uses the same header background styling as the main evaluate page
- Responsive design for mobile and desktop
- Centered card layout with appropriate spacing
- Color-coded alert icon (destructive variant)
- Consistent button sizing and spacing

### Permission Logic

The reactivate button is shown when:
- User is authenticated (`session?.user` exists)
- User has evaluation link management permissions (checked by API)

The API enforces permissions through the `canManageEvaluationLink` function, which checks:
- Admin role
- Link creator
- Appropriate module permissions

## Files Modified

1. **src/app/candidates/[id]/evaluate/page.tsx**
   - Added `linkExpired` and `canReactivateLink` state
   - Updated `checkEvaluationLink` to detect expiration
   - Added conditional rendering for expired link page
   - Imported `ExpiredLinkPage` component

2. **src/app/candidates/[id]/evaluate/components/ExpiredLinkPage.tsx** (NEW)
   - Complete expired link page implementation
   - Reactivation functionality
   - Responsive design
   - Permission-based UI

## Usage

The expired link page automatically displays when:
- A token parameter exists in the URL
- The evaluation link has expired (expiresAt < now)
- The link is not found (404 from API)

Users with proper permissions will see the reactivate option, while others will only see the back to home button.
