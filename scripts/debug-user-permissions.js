const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugUserPermissions() {
  console.log('🔍 Debugging user permissions...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      include: {
        userGroup: true
      }
    });

    console.log('👥 Users found:');
    users.forEach(user => {
      console.log(`  • ${user.name} (${user.email}) - Role: ${user.role}`);
      console.log(`    Group: ${user.userGroup?.name || 'None'}`);
      console.log(`    Module Permissions: ${user.module_permissions.join(', ')}`);
      console.log(`    Has SYSTEM_SETTINGS_VIEW: ${user.module_permissions.includes('SYSTEM_SETTINGS_VIEW')}`);
      console.log('');
    });

    // Check if there are any evaluation-related data
    console.log('📊 Evaluation data check:');
    
    const expertiseGroups = await prisma.expertiseGroup.count();
    const expertiseSkills = await prisma.expertiseSkill.count();
    const personalityGroups = await prisma.personalityGroup.count();
    const personalityTraits = await prisma.personalityTrait.count();
    
    console.log(`  • Expertise Groups: ${expertiseGroups}`);
    console.log(`  • Expertise Skills: ${expertiseSkills}`);
    console.log(`  • Personality Groups: ${personalityGroups}`);
    console.log(`  • Personality Traits: ${personalityTraits}`);

    // Check positions with evaluation assignments
    const positionsWithEvaluations = await prisma.position.findMany({
      include: {
        expertiseSkills: true,
        personalityTraits: true
      }
    });

    console.log(`\n📋 Positions with evaluation assignments:`);
    positionsWithEvaluations.forEach(position => {
      console.log(`  • ${position.title}: ${position.expertiseSkills.length} expertise skills, ${position.personalityTraits.length} personality traits`);
    });

  } catch (error) {
    console.error('❌ Error debugging permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserPermissions();
