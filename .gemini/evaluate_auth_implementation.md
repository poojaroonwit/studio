# Authentication Redirect Implementation for QR Code Evaluate Page

## Summary

Successfully implemented authentication check and redirect flow for the `/evaluate` page (QR code evaluation page).

## Changes Made

### File: `src/app/evaluate/page.tsx`

#### 1. Added Authentication Import
- Added `import { useSession } from 'next-auth/react'` to enable authentication checking

#### 2. Added Session State Management
- Added `const { data: session, status: sessionStatus } = useSession()` to track authentication status

#### 3. Implemented Authentication Check with Redirect
- Added a `useEffect` hook that:
  - Waits for session status to load
  - If user is `unauthenticated`, redirects to `/auth/signin` with `callbackUrl=/evaluate`
  - This ensures unauthenticated users are redirected to login before accessing the page

#### 4. Updated Data Fetching Logic
- Modified the data fetching `useEffect` to only fetch when `sessionStatus === 'authenticated'`
- Prevents unnecessary API calls before authentication check completes

#### 5. Enhanced Loading States
- Updated loading check to show loading screen when:
  - Session status is still loading
  - Page data is loading
- Added separate loading screen for unauthenticated state to prevent flash of content before redirect

## How It Works

### User Flow - Not Authenticated:
1. User scans QR code or navigates to `/evaluate`
2. Page component loads and checks authentication status
3. If `sessionStatus === 'unauthenticated'`:
   - Redirects to `/auth/signin?callbackUrl=%2Fevaluate`
4. User logs in
5. Login page reads `callbackUrl` parameter
6. After successful login, user is redirected back to `/evaluate`
7. Now authenticated, user can access the page and see evaluation links

### User Flow - Already Authenticated:
1. User navigates to `/evaluate`
2. Page checks authentication status
3. If `sessionStatus === 'authenticated'`:
   - Loads normally
   - Fetches applicants with evaluation links
   - Displays the page content

## Security Features

### Callback URL Validation (Already in signin page)
The signin page validates the callback URL to prevent open redirect attacks:
```typescript
// From SignInClient.tsx lines 88-92
const rawCallbackUrl = nextSearchParams.get('callbackUrl');
// Only allow relative URLs starting with / (not // or absolute URLs)
const callbackUrl = rawCallbackUrl && rawCallbackUrl.startsWith('/') && !rawCallbackUrl.startsWith('//') 
  ? rawCallbackUrl 
  : '/';
```

### Middleware Protection
The middleware (lines 88-94 in `src/middleware.ts`) already allows evaluation pages with tokens, but our client-side check provides additional protection for the `/evaluate` management page.

## Testing Instructions

1. **Test Unauthenticated Access:**
   - Log out of the application
   - Navigate to http://localhost:3000/evaluate
   - Should redirect to http://localhost:3000/auth/signin?callbackUrl=%2Fevaluate
   - After login, should redirect back to /evaluate

2. **Test Authenticated Access:**
   - Log in to the application
   - Navigate to http://localhost:3000/evaluate
   - Should load normally without redirect
   - Should display list of applicants with active evaluation links

3. **Test QR Code Scan Flow:**
   - Log out
   - Scan QR code that links to `/evaluate`
   - Should redirect to login page
   - After login, should return to `/evaluate` page
   - Can view/generate QR codes for evaluations

## Benefits

1. ✅ **Security**: Prevents unauthenticated users from accessing the evaluate page
2. ✅ **User Experience**: Smooth redirect flow - users are returned to their intended page after login
3. ✅ **No Flash of Content**: Loading states prevent showing unauthorized content
4. ✅ **Seamless Integration**: Works with existing authentication infrastructure
5. ✅ **Mobile Compatible**: Works on all devices (mobile/desktop)

## Related Files

- `/src/app/evaluate/page.tsx` - Main evaluate page with authentication check
- `/src/app/auth/signin/SignInClient.tsx` - Login page that handles callbackUrl
- `/src/middleware.ts` - Middleware for server-side protection
- `/src/auth.ts` - NextAuth configuration

## Notes

- The implementation uses NextAuth v5 session management
- Works with both Azure AD and credentials authentication
- Maintains backward compatibility with existing evaluation link system
- Does not affect individual evaluation pages with tokens (e.g., `/applicants/[id]/evaluate?token=...`)
