// Test script to verify logout functionality
// Run this in the browser console to test the logout flow

console.log('Testing logout functionality...');

// Test 1: Check if we're on the signin page with signout parameter
function testSignoutParameter() {
  const isOnSigninPage = window.location.pathname === '/auth/signin';
  const hasSignoutParam = window.location.search.includes('signout=true');
  
  console.log('Test 1 - Signout parameter check:');
  console.log('  On signin page:', isOnSigninPage);
  console.log('  Has signout parameter:', hasSignoutParam);
  console.log('  Current URL:', window.location.href);
  
  return { isOnSigninPage, hasSignoutParam };
}

// Test 2: Check session status
function testSessionStatus() {
  // This would need to be run in a component context
  console.log('Test 2 - Session status check:');
  console.log('  Note: This test requires access to useSession hook');
  console.log('  Run this in a React component context');
}

// Test 3: Simulate logout flow
function testLogoutFlow() {
  console.log('Test 3 - Logout flow simulation:');
  
  // Check current state
  const currentUrl = window.location.href;
  console.log('  Current URL:', currentUrl);
  
  // Simulate the logout redirect
  const signoutUrl = '/auth/signin?signout=true';
  console.log('  Would redirect to:', signoutUrl);
  
  // Check if we're already on the target page
  if (currentUrl.includes('/auth/signin') && currentUrl.includes('signout=true')) {
    console.log('  Already on signout page - no redirect needed');
  } else {
    console.log('  Would perform redirect');
  }
}

// Run tests
console.log('=== Logout Functionality Tests ===');
testSignoutParameter();
testSessionStatus();
testLogoutFlow();
console.log('=== End Tests ===');

// Helper function to check for redirect loops
function checkForRedirectLoops() {
  const url = window.location.href;
  const isOnSigninPage = url.includes('/auth/signin');
  const hasSignoutParam = url.includes('signout=true');
  
  console.log('Redirect loop check:');
  console.log('  URL:', url);
  console.log('  On signin page:', isOnSigninPage);
  console.log('  Has signout param:', hasSignoutParam);
  
  if (isOnSigninPage && hasSignoutParam) {
    console.log('  ✅ Properly redirected to signin with signout parameter');
  } else if (isOnSigninPage && !hasSignoutParam) {
    console.log('  ⚠️ On signin page but no signout parameter');
  } else {
    console.log('  ❌ Not on signin page');
  }
}

// Export for use in browser console
window.testLogout = {
  testSignoutParameter,
  testSessionStatus,
  testLogoutFlow,
  checkForRedirectLoops
};

console.log('Logout test functions available as window.testLogout');
