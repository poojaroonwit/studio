const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUserRoleAssignments() {
  console.log('🔧 Starting user role assignment fix...\n');

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
      }
    });

    console.log(`📊 Found ${users.length} users to check\n`);

    // Define role to group ID mappings
    const roleToGroupId = {
      'Admin': '00000000-0000-0000-0000-000000000001',
      'Recruiter': '00000000-0000-0000-0000-000000000002',
      'Hiring Manager': '00000000-0000-0000-0000-000000000003'
    };

    let fixedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      const expectedGroupId = roleToGroupId[user.role];
      
      if (!expectedGroupId) {
        console.log(`⚠️  User ${user.name} (${user.email}) has unknown role: ${user.role}`);
        skippedCount++;
        continue;
      }

      // Check if user is already assigned to the correct group
      const isAssigned = user.userGroups.some(ug => ug.group.id === expectedGroupId);
      
      if (!isAssigned) {
        console.log(`🔧 Fixing user ${user.name} (${user.email}):`);
        console.log(`   Role: ${user.role} -> Group: ${user.userGroups.map(ug => ug.group.name).join(', ') || 'None'}`);
        
        try {
          // Assign user to the correct group
          await prisma.user_UserGroup.create({
            data: {
              userId: user.id,
              groupId: expectedGroupId
            }
          });
          
          console.log(`   ✅ Assigned to ${user.role} group`);
          fixedCount++;
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`   ⚠️  Already assigned (duplicate key error)`);
            skippedCount++;
          } else {
            console.log(`   ❌ Error: ${error.message}`);
            skippedCount++;
          }
        }
      } else {
        console.log(`✅ User ${user.name} (${user.email}) already correctly assigned to ${user.role} group`);
        skippedCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Fixed: ${fixedCount} users`);
    console.log(`   Skipped: ${skippedCount} users`);
    console.log(`   Total: ${users.length} users`);

    // Verify the fix by checking user counts
    console.log(`\n🔍 Verifying user group counts...`);
    
    const groups = await prisma.userGroup.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    for (const group of groups) {
      console.log(`   ${group.name}: ${group._count.users} users`);
    }

  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixUserRoleAssignments()
  .then(() => {
    console.log('\n✅ User role assignment fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

