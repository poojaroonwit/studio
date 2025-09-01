// Test script to verify session structure and prevent React error #185
// This can be run in the browser console to test the session object

function testSessionStructure() {
  console.log('Testing session structure...');
  
  // Mock session object for testing
  const mockSession = {
    user: {
      id: 'test-user-id',
      role: 'Admin',
      modulePermissions: ['CANDIDATES_VIEW', 'USERS_VIEW'],
      avatarUrl: null,
      personalColor: null
    }
  };
  
  // Test the canAccess function logic
  function canAccess(item, session) {
    // Defensive checks to prevent React error #185
    if (!session?.user) return false;
    
    // Ensure user has a valid role
    const userRole = session.user.role || 'Recruiter';
    
    // Admin has access to everything
    if (userRole === 'Admin') return true;

    // Check for adminOnly items
    if (item.adminOnly) return false;

    // Ensure modulePermissions is an array
    const modulePermissions = Array.isArray(session.user.modulePermissions) 
      ? session.user.modulePermissions 
      : [];

    // Check for adminOnlyOrPermission items
    if (item.adminOnlyOrPermission) {
      if (item.permissionId && modulePermissions.includes(item.permissionId)) {
        return true;
      }
      return false;
    }

    // Check for specific permission items
    if (item.permissionId && !modulePermissions.includes(item.permissionId)) {
      return false;
    }

    return true;
  }
  
  // Test items
  const testItems = [
    { 
      href: "/settings/system-settings", 
      label: "System Settings", 
      permissionId: 'SYSTEM_SETTINGS_VIEW', 
      adminOnlyOrPermission: true
    },
    { 
      href: "/settings/users", 
      label: "User Management", 
      permissionId: 'USERS_VIEW', 
      adminOnlyOrPermission: true
    }
  ];
  
  // Test with valid session
  console.log('Testing with valid session:');
  testItems.forEach(item => {
    const hasAccess = canAccess(item, mockSession);
    console.log(`${item.label}: ${hasAccess ? 'ACCESS' : 'DENIED'}`);
  });
  
  // Test with invalid session
  console.log('\nTesting with invalid session:');
  const invalidSession = {
    user: {
      id: 'test-user-id',
      role: null,
      modulePermissions: null,
      avatarUrl: null,
      personalColor: null
    }
  };
  
  testItems.forEach(item => {
    const hasAccess = canAccess(item, invalidSession);
    console.log(`${item.label}: ${hasAccess ? 'ACCESS' : 'DENIED'}`);
  });
  
  // Test with completely invalid session
  console.log('\nTesting with completely invalid session:');
  const completelyInvalidSession = null;
  
  testItems.forEach(item => {
    const hasAccess = canAccess(item, completelyInvalidSession);
    console.log(`${item.label}: ${hasAccess ? 'ACCESS' : 'DENIED'}`);
  });
  
  console.log('\nSession structure test completed!');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testSessionStructure = testSessionStructure;
}

export { testSessionStructure };
