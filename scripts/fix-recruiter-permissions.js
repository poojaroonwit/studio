const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixRecruiterPermissions() {
  console.log('🔧 Starting recruiter permissions fix...\n');

  try {
    // Get all recruiter users
    const recruiterUsers = await prisma.user.findMany({
      where: {
        role: 'Recruiter'
      },
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

    console.log(`📊 Found ${recruiterUsers.length} recruiter users to check\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const user of recruiterUsers) {
      console.log(`🔍 Checking user: ${user.name} (${user.email})`);
      
      // Check if user is assigned to Recruiter group
      const recruiterGroup = user.userGroups.find(ug => ug.group.name === 'Recruiter');
      
      if (!recruiterGroup) {
        console.log(`   ❌ User not assigned to Recruiter group`);
        console.log(`   🔧 Assigning user to Recruiter group...`);
        
        try {
          await prisma.user_UserGroup.create({
            data: {
              userId: user.id,
              groupId: '00000000-0000-0000-0000-000000000002' // Recruiter group ID
            }
          });
          console.log(`   ✅ Assigned to Recruiter group`);
          fixedCount++;
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`   ⚠️  Already assigned (duplicate key error)`);
          } else {
            console.log(`   ❌ Error: ${error.message}`);
          }
          skippedCount++;
        }
      } else {
        console.log(`   ✅ User assigned to Recruiter group`);
        
        // Check if Recruiter group has required permissions
        const groupPermissions = recruiterGroup.group.permissions || [];
        const requiredPermissions = ['TASK_BOARD_VIEW', 'DASHBOARD_VIEW'];
        const missingPermissions = requiredPermissions.filter(perm => !groupPermissions.includes(perm));
        
        if (missingPermissions.length > 0) {
          console.log(`   ❌ Recruiter group missing permissions: ${missingPermissions.join(', ')}`);
          console.log(`   🔧 Updating Recruiter group permissions...`);
          
          try {
            const updatedPermissions = [...groupPermissions, ...missingPermissions];
            await prisma.userGroup.update({
              where: { id: recruiterGroup.group.id },
              data: { permissions: updatedPermissions }
            });
            console.log(`   ✅ Updated Recruiter group permissions`);
            fixedCount++;
          } catch (error) {
            console.log(`   ❌ Error updating group permissions: ${error.message}`);
            skippedCount++;
          }
        } else {
          console.log(`   ✅ Recruiter group has all required permissions`);
        }
      }
      
      // Check individual user permissions (these should be empty for group-based permissions)
      const userPermissions = user.module_permissions || [];
      if (userPermissions.length > 0) {
        console.log(`   ⚠️  User has individual permissions: ${userPermissions.join(', ')}`);
        console.log(`   ℹ️  Individual permissions override group permissions`);
      } else {
        console.log(`   ✅ User has no individual permissions (uses group permissions)`);
      }
      
      console.log('');
    }

    console.log(`📈 Summary:`);
    console.log(`   Fixed: ${fixedCount} issues`);
    console.log(`   Skipped: ${skippedCount} users`);
    console.log(`   Total: ${recruiterUsers.length} recruiter users`);

    // Verify the fix by checking user counts and permissions
    console.log(`\n🔍 Verifying recruiter group...`);
    
    const recruiterGroup = await prisma.userGroup.findUnique({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      select: {
        id: true,
        name: true,
        permissions: true,
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (recruiterGroup) {
      console.log(`✅ Recruiter group found:`);
      console.log(`   Name: ${recruiterGroup.name}`);
      console.log(`   Users: ${recruiterGroup._count.users}`);
      console.log(`   Permissions: ${recruiterGroup.permissions.join(', ')}`);
      
      const hasTaskBoard = recruiterGroup.permissions.includes('TASK_BOARD_VIEW');
      const hasDashboard = recruiterGroup.permissions.includes('DASHBOARD_VIEW');
      
      console.log(`   TASK_BOARD_VIEW: ${hasTaskBoard ? '✅' : '❌'}`);
      console.log(`   DASHBOARD_VIEW: ${hasDashboard ? '✅' : '❌'}`);
    } else {
      console.log(`❌ Recruiter group not found`);
    }

    console.log(`\n✅ Recruiter permissions fix completed`);

  } catch (error) {
    console.error('❌ Error during recruiter permissions fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixRecruiterPermissions()
  .then(() => {
    console.log('Recruiter permissions fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Recruiter permissions fix failed:', error);
    process.exit(1);
  });
