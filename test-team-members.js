const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testTeamMembers() {
  const client = await pool.connect();
  try {
    console.log('🔍 Testing Team Membership Query...\n');
    
    // Test the exact query from the API
    const result = await client.query(`
      SELECT 
        ut.id,
        ut.name,
        ut.description,
        ut.color,
        ut."is_active" as "isActive",
        ut."createdAt",
        ut."updatedAt",
        COUNT(u.id) as member_count
      FROM "UserTeam" ut
      LEFT JOIN "User" u ON ut.id = u."userTeamId"
      GROUP BY ut.id, ut.name, ut.description, ut.color, ut."is_active", ut."createdAt", ut."updatedAt"
      ORDER BY ut.name
    `);
    
    console.log(`📊 Found ${result.rows.length} teams:`);
    result.rows.forEach(team => {
      console.log(`  - ${team.name}: ${team.member_count} members`);
    });
    
    // Check if there are any users at all
    const userResult = await client.query('SELECT COUNT(*) as total_users FROM "User"');
    console.log(`\n👥 Total users in system: ${userResult.rows[0].total_users}`);
    
    // Check if any users have team assignments
    const teamUserResult = await client.query('SELECT COUNT(*) as users_with_teams FROM "User" WHERE "userTeamId" IS NOT NULL');
    console.log(`👥 Users assigned to teams: ${teamUserResult.rows[0].users_with_teams}`);
    
    // Show some sample users and their team assignments
    const sampleUsers = await client.query(`
      SELECT u.id, u.name, u.email, u."userTeamId", ut.name as team_name
      FROM "User" u
      LEFT JOIN "UserTeam" ut ON u."userTeamId" = ut.id
      LIMIT 10
    `);
    
    console.log('\n📋 Sample users and their team assignments:');
    sampleUsers.rows.forEach(user => {
      const teamInfo = user.team_name ? `Team: ${user.team_name}` : 'No team assigned';
      console.log(`  - ${user.name} (${user.email}): ${teamInfo}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testTeamMembers();
