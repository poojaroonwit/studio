#!/usr/bin/env node

/**
 * Debug script to check team membership status
 * This script helps diagnose why User Teams show 0 members
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTeamMembers() {
  console.log('🔍 Debugging Team Membership Status...\n');

  try {
    // Check if teams exist
    const teams = await prisma.userTeam.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    console.log(`📊 Found ${teams.length} active teams:`);
    teams.forEach(team => {
      console.log(`  - ${team.name} (${team.id})`);
    });

    if (teams.length === 0) {
      console.log('\n❌ No teams found. Create some teams first.');
      return;
    }

    // Check if users exist
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        userTeamId: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`\n👥 Found ${users.length} users:`);
    users.forEach(user => {
      const teamInfo = user.userTeamId ? `Team: ${user.userTeamId}` : 'No team assigned';
      console.log(`  - ${user.name} (${user.email}) - ${teamInfo}`);
    });

    if (users.length === 0) {
      console.log('\n❌ No users found. Create some users first.');
      return;
    }

    // Check team membership counts
    console.log('\n📈 Team Membership Summary:');
    for (const team of teams) {
      const memberCount = await prisma.user.count({
        where: { userTeamId: team.id }
      });
      
      console.log(`  - ${team.name}: ${memberCount} members`);
      
      if (memberCount === 0) {
        console.log(`    ⚠️  No members assigned to this team`);
      }
    }

    // Check for users without team assignments
    const usersWithoutTeam = users.filter(user => !user.userTeamId);
    if (usersWithoutTeam.length > 0) {
      console.log(`\n⚠️  ${usersWithoutTeam.length} users are not assigned to any team:`);
      usersWithoutTeam.forEach(user => {
        console.log(`  - ${user.name} (${user.email})`);
      });
    }

    // Suggest solutions
    console.log('\n💡 Solutions:');
    console.log('1. Assign users to teams through the User Management interface');
    console.log('2. Use the Team Details view to add members directly');
    console.log('3. Check if the team assignment UI is working properly');
    console.log('4. Verify that users have the correct permissions to manage teams');

    // Optional: Auto-assign users to teams (uncomment if needed)
    /*
    if (usersWithoutTeam.length > 0 && teams.length > 0) {
      console.log('\n🔄 Auto-assigning users to teams...');
      
      for (let i = 0; i < usersWithoutTeam.length; i++) {
        const user = usersWithoutTeam[i];
        const teamIndex = i % teams.length;
        const team = teams[teamIndex];
        
        await prisma.user.update({
          where: { id: user.id },
          data: { userTeamId: team.id }
        });
        
        console.log(`  ✅ Assigned ${user.name} to ${team.name}`);
      }
      
      console.log('\n✅ Auto-assignment completed!');
    }
    */

  } catch (error) {
    console.error('❌ Error debugging team members:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debugTeamMembers()
  .catch(console.error)
  .finally(() => process.exit(0));
