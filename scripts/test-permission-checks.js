const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPermissionChecks() {
  console.log('🧪 Testing Permission Checks...\n');

  try {
    // Get the recruiter user
    const recruiterUser = await prisma.user.findFirst({
      where: { role: 'Recruiter' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        module_permissions: true,
        userGroups: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
                permissions: true
              }
            }
          }
        }
      }
    });

    if (!recruiterUser) {
      console.log('❌ No recruiter user found');
      return;
    }

    console.log(`👤 Testing permissions for: ${recruiterUser.name} (${recruiterUser.email})`);
    console.log(`   Role: ${recruiterUser.role}`);
    console.log(`   User Groups: ${recruiterUser.userGroups.map(ug => ug.group.name).join(', ')}`);

    // Calculate effective permissions
    const groupPermissions = recruiterUser.userGroups.flatMap(ug => ug.group.permissions || []);
    const individualPermissions = recruiterUser.module_permissions || [];
    const effectivePermissions = [...new Set([...groupPermissions, ...individualPermissions])];

    console.log(`\n📋 Effective Permissions (${effectivePermissions.length}):`);
    effectivePermissions.forEach(perm => {
      console.log(`   ✅ ${perm}`);
    });

    // Test the specific permission checks used in the code
    console.log(`\n🔍 Testing Permission Checks:`);

    // Test 1: Dashboard Access
    const canViewDashboard = recruiterUser.role === 'Admin' || 
      effectivePermissions.includes('DASHBOARD_VIEW');
    console.log(`   Dashboard Access: ${canViewDashboard ? '✅ ALLOWED' : '❌ DENIED'}`);

    // Test 2: Task Board Access
    const canAccessTaskBoard = recruiterUser.role === 'Admin' || 
      effectivePermissions.includes('TASK_BOARD_VIEW') || 
      effectivePermissions.includes('CANDIDATES_VIEW');
    console.log(`   Task Board Access: ${canAccessTaskBoard ? '✅ ALLOWED' : '❌ DENIED'}`);

    // Test 3: Candidates Access
    const canViewCandidates = recruiterUser.role === 'Admin' || 
      effectivePermissions.includes('CANDIDATES_VIEW');
    console.log(`   Candidates Access: ${canViewCandidates ? '✅ ALLOWED' : '❌ DENIED'}`);

    // Test 4: Positions Access
    const canViewPositions = recruiterUser.role === 'Admin' || 
      effectivePermissions.includes('POSITIONS_VIEW');
    console.log(`   Positions Access: ${canViewPositions ? '✅ ALLOWED' : '❌ DENIED'}`);

    // Test 5: Sidebar Menu Visibility
    const canSeeTaskBoardMenu = recruiterUser.role === 'Admin' || 
      effectivePermissions.includes('TASK_BOARD_VIEW') || 
      effectivePermissions.includes('CANDIDATES_VIEW');
    console.log(`   Task Board Menu Visible: ${canSeeTaskBoardMenu ? '✅ YES' : '❌ NO'}`);

    // Summary
    console.log(`\n📊 Test Summary:`);
    const allTestsPassed = canViewDashboard && canAccessTaskBoard && canViewCandidates && canViewPositions && canSeeTaskBoardMenu;
    
    if (allTestsPassed) {
      console.log(`   ✅ ALL PERMISSION CHECKS PASSED`);
      console.log(`   🎉 Recruiter user has full access to dashboard and task board`);
    } else {
      console.log(`   ❌ SOME PERMISSION CHECKS FAILED`);
      console.log(`   🔧 Review the failed checks above`);
    }

    // Verify expected permissions for Recruiter role
    console.log(`\n🎯 Expected Permissions for Recruiter Role:`);
    const expectedPermissions = ['DASHBOARD_VIEW', 'TASK_BOARD_VIEW', 'CANDIDATES_VIEW', 'POSITIONS_VIEW'];
    let allExpectedPresent = true;

    expectedPermissions.forEach(perm => {
      const hasPermission = effectivePermissions.includes(perm);
      console.log(`   ${perm}: ${hasPermission ? '✅' : '❌'}`);
      if (!hasPermission) allExpectedPresent = false;
    });

    if (allExpectedPresent) {
      console.log(`   ✅ All expected permissions are present`);
    } else {
      console.log(`   ❌ Some expected permissions are missing`);
    }

    console.log(`\n✅ Permission check test completed`);

  } catch (error) {
    console.error('❌ Error during permission check test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPermissionChecks()
  .then(() => {
    console.log('Permission check test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Permission check test failed:', error);
    process.exit(1);
  });
