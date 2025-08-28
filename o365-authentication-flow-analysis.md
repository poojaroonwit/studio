# O365 Authentication Flow Analysis

## Overview
This document analyzes the complete O365 (Azure AD) authentication flow in the codebase, including all console logs and debugging information.

## Authentication Flow Components

### 1. Azure AD Sign-In Button (`src/components/auth/AzureAdSignInButton.tsx`)

**Console Logs:**
```typescript
console.log('[AZURE AD BUTTON] Starting Azure AD sign-in...');
console.log('[AZURE AD BUTTON] Sign-in result:', result);
console.log('[AZURE AD BUTTON] Sign-in successful, redirecting to:', result.url || "/");
console.log('[AZURE AD BUTTON] Sign-in in progress...');
```

**Flow:**
1. User clicks "Sign in with Microsoft" button
2. Calls `signIn("azure-ad", { callbackUrl: "/", redirect: false })`
3. Handles three possible outcomes:
   - **Error**: Shows alert and logs error
   - **Success**: Redirects to `result.url` or "/"
   - **In Progress**: Lets NextAuth handle redirect

### 2. NextAuth Configuration (`src/lib/auth.ts`)

**Azure AD Provider Setup:**
```typescript
AzureADProvider({
  clientId: process.env.AZURE_AD_CLIENT_ID!,
  clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
  tenantId: process.env.AZURE_AD_TENANT_ID!,
})
```

**JWT Callback Console Logs:**
```typescript
console.log('[JWT CALLBACK] Looking up user for Azure AD:', { oid, email: profile?.email });
console.log('[JWT CALLBACK] Found user with UUID:', dbUser.id);
console.error('[JWT CALLBACK] No user found for oid:', oid, 'email:', profile?.email);
console.error('[JWT CALLBACK] Error fetching user UUID for Azure AD:', e);
```

**Session Callback Console Logs:**
```typescript
console.log('[SESSION CALLBACK] Set session permissions:', session.user.modulePermissions);
console.log('[SESSION CALLBACK] Session established for user:', {
  id: session.user.id,
  email: session.user.email,
  role: session.user.role,
  hasPermissions: session.user.modulePermissions && session.user.modulePermissions.length > 0
});
```

**SignIn Callback:**
- Creates new Azure AD users in database
- Assigns users to Recruiter group by default
- Creates Account entries for OAuth provider

### 3. Sign-In Page Client (`src/app/auth/signin/SignInClient.tsx`)

**Console Logs:**
```typescript
console.log('[SIGNIN CLIENT] Auth status changed:', { status, hasSession: !!session, signoutParam: nextSearchParams.get('signout') });
console.log('[SIGNIN CLIENT] Signout redirect detected, not redirecting back');
console.log('[SIGNIN CLIENT] Authenticated user on signin page, redirecting to:', redirectUrl);
```

**Redirect Logic:**
1. **Primary Redirect**: When `status === "authenticated"` and `session` exists
2. **Fallback Redirect**: Fetches `/api/auth/session` to check server-side session
3. **Signout Handling**: Prevents redirect loops during signout

### 4. Middleware (`src/middleware.ts`)

**Cookie Detection:**
```typescript
const hasSessionToken = allCookies.some(c => {
  const n = c.name;
  return n === 'next-auth.session-token' ||
         n.startsWith('next-auth.session-token.') ||
         n === '__Secure-next-auth.session-token' ||
         n.startsWith('__Secure-next-auth.session-token.');
});
```

**Protection Logic:**
- Skips middleware for static files and API routes
- Redirects unauthenticated users to `/auth/signin`
- Handles split cookies in production

### 5. Dashboard Page Client (`src/components/dashboard/DashboardPageClient.tsx`)

**Console Logs:**
```typescript
console.log('[DASHBOARD] Non-admin user without dashboard permissions, redirecting to my-tasks');
```

**Authentication Checks:**
1. **Loading State**: Shows loading while `status === 'loading'`
2. **Unauthenticated**: Redirects to sign-in page
3. **Permission Check**: Redirects non-admin users without permissions to `/my-tasks`

### 6. Header Component (`src/components/layout/Header.tsx`)

**Console Logs:**
```typescript
console.log('[HEADER] Already on signin page with signout parameter, skipping logout');
console.log('[HEADER] Starting signout process...');
console.log('[HEADER] Current URL:', window.location.href);
console.log('[HEADER] Session status:', status);
console.log('[HEADER] Clearing user cache for:', session.user.id);
console.log('[HEADER] Performing signout with redirect to /auth/signin?signout=true');
console.log('[HEADER] SignOut result:', signOutResult);
console.log('[HEADER] Manually redirecting to /auth/signin?signout=true');
console.log('[HEADER] Using fallback redirect to /auth/signin?signout=true');
```

## Complete O365 Authentication Flow

### Step 1: User Initiates Login
1. User clicks "Sign in with Microsoft" button
2. `[AZURE AD BUTTON] Starting Azure AD sign-in...` is logged
3. NextAuth redirects to Azure AD login page

### Step 2: Azure AD Authentication
1. User authenticates with Microsoft
2. Azure AD redirects back to `/api/auth/callback/azure-ad`
3. NextAuth processes the authorization code

### Step 3: JWT Callback Processing
1. `[JWT CALLBACK] Looking up user for Azure AD:` logs user lookup
2. If user exists: `[JWT CALLBACK] Found user with UUID:` logs the UUID
3. If user doesn't exist: Creates new user in database
4. Fetches user permissions and stores in token

### Step 4: Session Callback Processing
1. `[SESSION CALLBACK] Set session permissions:` logs permissions
2. `[SESSION CALLBACK] Session established for user:` logs session details
3. Session is stored in cookies

### Step 5: Redirect to Application
1. User is redirected to the application
2. Middleware checks for session cookies
3. If authenticated, user proceeds to intended page

### Step 6: Sign-In Page Processing
1. `[SIGNIN CLIENT] Auth status changed:` logs authentication status
2. If authenticated: `[SIGNIN CLIENT] Authenticated user on signin page, redirecting to:` logs redirect
3. User is redirected to dashboard or intended page

### Step 7: Dashboard Access
1. Dashboard checks user permissions
2. If user lacks permissions: `[DASHBOARD] Non-admin user without dashboard permissions, redirecting to my-tasks`
3. User is redirected to appropriate page based on permissions

## Common Issues and Debugging

### Issue 1: User Stuck at Sign-In Page
**Symptoms:**
- User sees sign-in page even after O365 authentication
- `[SIGNIN CLIENT] Authenticated user on signin page, redirecting to:` is logged but no redirect

**Possible Causes:**
1. Middleware not detecting session cookies (split cookies in production)
2. Client-side race condition between NextAuth status and server session
3. Router navigation issues

**Debugging:**
- Check browser console for redirect errors
- Verify session cookies are present
- Check if `/api/auth/session` returns valid user

### Issue 2: Azure AD User Not Found
**Symptoms:**
- `[JWT CALLBACK] No user found for oid:` is logged
- Authentication fails after Azure AD login

**Possible Causes:**
1. User doesn't exist in database
2. Azure OID mismatch between Azure AD and database
3. Database connection issues

**Debugging:**
- Check if user exists in database
- Verify Azure AD configuration
- Check database connection

### Issue 3: Permission Issues
**Symptoms:**
- User authenticated but can't access dashboard
- `[DASHBOARD] Non-admin user without dashboard permissions, redirecting to my-tasks` is logged

**Possible Causes:**
1. User not assigned to user groups
2. User groups don't have required permissions
3. Permission refresh needed

**Debugging:**
- Check user's group assignments
- Verify group permissions
- Use permission refresh API

### Issue 4: Redirect Loops
**Symptoms:**
- Page keeps refreshing or redirecting
- User stuck in authentication loop

**Possible Causes:**
1. Middleware redirecting authenticated users
2. Client-side redirect logic conflicts
3. Session validation issues

**Debugging:**
- Check middleware logic
- Verify redirect conditions
- Check session validation

## Environment Variables Required

```bash
# Azure AD Configuration
AZURE_AD_CLIENT_ID=your_azure_ad_application_client_id
AZURE_AD_CLIENT_SECRET=your_azure_ad_client_secret_value
AZURE_AD_TENANT_ID=your_azure_ad_directory_tenant_id
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your_azure_ad_application_client_id
NEXT_PUBLIC_AZURE_AD_TENANT_ID=your_azure_ad_directory_tenant_id

# NextAuth Configuration
NEXTAUTH_SECRET=your_secure_secret_here
NEXTAUTH_URL=http://localhost:8021

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

## Debugging Commands

### Check Azure AD Configuration
```bash
node debug-o365-auth.js
```

### Check JWT Issues
```bash
node debug-jwt-issues.js
```

### Check Complete Flow
```bash
node debug-o365-complete-flow.js
```

### Check Users in Database
```bash
node check-users.js
```

## Recommendations

1. **Enable Debug Mode**: Set `debug: true` in NextAuth options for development
2. **Check Console Logs**: Monitor all console logs during authentication flow
3. **Verify Environment Variables**: Ensure all Azure AD variables are properly configured
4. **Test in Incognito**: Use incognito/private window to avoid cookie conflicts
5. **Check Network Tab**: Monitor network requests during authentication
6. **Verify Database**: Ensure user exists and has proper permissions
7. **Check Azure AD App Registration**: Verify redirect URIs and permissions
