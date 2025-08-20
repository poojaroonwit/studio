const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserRoleAssignments() {
  console.log('🔍 Checking user role assignments...\n');

  try {
    // Get all users with their current role and group assignments
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userGroups: {
          select: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`📊 Found ${users.length} users\n`);

    // Define role to group ID mappings
    const roleToGroupId = {
      'Admin': '00000000-0000-0000-0000-000000000001',
      'Recruiter': '00000000-0000-0000-0000-000000000002',
      'Hiring Manager': '00000000-0000-0000-0000-000000000003'
    };

    let mismatchedUsers = [];
    let correctlyAssignedUsers = [];
    let unknownRoleUsers = [];

    for (const user of users) {
      const expectedGroupId = roleToGroupId[user.role];
      
      if (!expectedGroupId) {
        unknownRoleUsers.push(user);
        continue;
      }

      // Check if user is assigned to the correct group
      const isAssigned = user.userGroups.some(ug => ug.group.id === expectedGroupId);
      
      if (!isAssigned) {
        mismatchedUsers.push(user);
      } else {
        correctlyAssignedUsers.push(user);
      }
    }

    // Display results
    console.log('✅ Correctly assigned users:');
    for (const user of correctlyAssignedUsers) {
      console.log(`   ${user.name} (${user.email}) - Role: ${user.role}`);
    }

    console.log(`\n❌ Mismatched users (${mismatchedUsers.length}):`);
    for (const user of mismatchedUsers) {
      const expectedGroupId = roleToGroupId[user.role];
      const currentGroups = user.userGroups.map(ug => ug.group.name).join(', ') || 'None';
      console.log(`   ${user.name} (${user.email})`);
      console.log(`      Role field: ${user.role}`);
      console.log(`      Assigned groups: ${currentGroups}`);
      console.log(`      Expected group: ${user.role}`);
      console.log('');
    }

    if (unknownRoleUsers.length > 0) {
      console.log(`⚠️  Users with unknown roles (${unknownRoleUsers.length}):`);
      for (const user of unknownRoleUsers) {
        console.log(`   ${user.name} (${user.email}) - Role: ${user.role}`);
      }
    }

    // Check user group counts
    console.log(`\n📈 User group counts:`);
    const groups = await prisma.userGroup.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    for (const group of groups) {
      console.log(`   ${group.name}: ${group._count.users} users`);
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total users: ${users.length}`);
    console.log(`   Correctly assigned: ${correctlyAssignedUsers.length}`);
    console.log(`   Mismatched: ${mismatchedUsers.length}`);
    console.log(`   Unknown roles: ${unknownRoleUsers.length}`);

    if (mismatchedUsers.length > 0) {
      console.log(`\n💡 Run 'node scripts/fix-user-role-assignments.js' to fix the mismatched users.`);
    }

  } catch (error) {
    console.error('❌ Error during check:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkUserRoleAssignments()
  .then(() => {
    console.log('\n✅ User role assignment check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

