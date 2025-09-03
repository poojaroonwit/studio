#!/usr/bin/env node

/**
 * Script to fix the default role issue where multiple user groups are set as default
 * This ensures only the Recruiter group is set as default
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDefaultRoleIssue() {
  console.log('🔧 Fixing default role issue...');
  
  try {
    // Step 1: Check current state
    console.log('\n📊 Current state:');
    const allGroups = await prisma.userGroup.findMany({
      select: {
        id: true,
        name: true,
        isDefault: true,
        isSystemRole: true,
        _count: {
          select: { users: true }
        }
      }
    });
    
    allGroups.forEach(group => {
      console.log(`  - ${group.name}: isDefault=${group.isDefault}, isSystemRole=${group.isSystemRole}, users=${group._count.users}`);
    });
    
    const defaultGroups = allGroups.filter(g => g.isDefault);
    console.log(`\n⚠️  Found ${defaultGroups.length} groups marked as default: ${defaultGroups.map(g => g.name).join(', ')}`);
    
    if (defaultGroups.length === 1 && defaultGroups[0].name === 'Recruiter') {
      console.log('✅ Database is already in correct state - only Recruiter group is default');
      return;
    }
    
    // Step 2: Reset all groups to not be default
    console.log('\n🔄 Resetting all groups to not be default...');
    await prisma.userGroup.updateMany({
      data: { isDefault: false },
      where: { isDefault: true }
    });
    
    // Step 3: Set only Recruiter group as default
    console.log('🎯 Setting Recruiter group as the only default...');
    const recruiterGroup = await prisma.userGroup.findFirst({
      where: { name: 'Recruiter' }
    });
    
    if (!recruiterGroup) {
      console.log('❌ Recruiter group not found, creating it...');
      await prisma.userGroup.create({
        data: {
          name: 'Recruiter',
          description: 'Standard recruiter access',
          permissions: [
            'CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC', 
            'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 
            'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'DASHBOARD_VIEW', 
            'USER_PREFERENCES_MANAGE_OWN'
          ],
          isDefault: true,
          isSystemRole: true
        }
      });
    } else {
      await prisma.userGroup.update({
        where: { id: recruiterGroup.id },
        data: { isDefault: true }
      });
    }
    
    // Step 4: Verify the fix
    console.log('\n✅ Verification:');
    const finalGroups = await prisma.userGroup.findMany({
      select: {
        id: true,
        name: true,
        isDefault: true,
        isSystemRole: true
      }
    });
    
    finalGroups.forEach(group => {
      console.log(`  - ${group.name}: isDefault=${group.isDefault}, isSystemRole=${group.isSystemRole}`);
    });
    
    const finalDefaultCount = finalGroups.filter(g => g.isDefault).length;
    if (finalDefaultCount === 1) {
      console.log(`\n🎉 Success! Exactly ${finalDefaultCount} group is now set as default`);
    } else {
      console.log(`\n❌ Error: Expected 1 default group, but found ${finalDefaultCount}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error fixing default role issue:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  fixDefaultRoleIssue()
    .then(() => {
      console.log('\n✨ Default role issue fixed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed to fix default role issue:', error);
      process.exit(1);
    });
}

module.exports = { fixDefaultRoleIssue };
