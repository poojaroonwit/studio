require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createRecruiterUser() {
  const client = await pool.connect();
  
  try {
    console.log('👤 Creating Recruiter User...\n');
    
    // Check if recruiter user already exists
    const existingUser = await client.query(`
      SELECT id, name, email, role 
      FROM "User" 
      WHERE email = 'recruiter@ncc.com'
    `);
    
    if (existingUser.rows.length > 0) {
      console.log('   ⚠️  Recruiter user already exists:');
      console.log(`      Name: ${existingUser.rows[0].name}`);
      console.log(`      Email: ${existingUser.rows[0].email}`);
      console.log(`      Role: ${existingUser.rows[0].role}`);
      return;
    }
    
    // Hash password (password: recruiter123)
    const hashedPassword = await bcrypt.hash('recruiter123', 10);
    
    // Create recruiter user
    const newUser = await client.query(`
      INSERT INTO "User" (id, name, email, password, role, "authentication_method", "force_password_change", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        'Test Recruiter',
        'recruiter@ncc.com',
        $1,
        'Recruiter',
        'basic',
        false,
        NOW(),
        NOW()
      )
      RETURNING id, name, email, role
    `, [hashedPassword]);
    
    const user = newUser.rows[0];
    console.log('   ✅ Recruiter user created successfully:');
    console.log(`      ID: ${user.id}`);
    console.log(`      Name: ${user.name}`);
    console.log(`      Email: ${user.email}`);
    console.log(`      Role: ${user.role}`);
    console.log('');
    
    // Assign user to Recruiter group
    const recruiterGroupId = '00000000-0000-0000-0000-000000000002';
    
    await client.query(`
      INSERT INTO "User_UserGroup" ("userId", "groupId")
      VALUES ($1, $2)
      ON CONFLICT ("userId", "groupId") DO NOTHING
    `, [user.id, recruiterGroupId]);
    
    console.log('   ✅ User assigned to Recruiter group');
    console.log('');
    
    // Verify the assignment
    const groupAssignment = await client.query(`
      SELECT ug.name as group_name, ug.permissions as group_permissions
      FROM "User_UserGroup" uug
      JOIN "UserGroup" ug ON uug."groupId" = ug.id
      WHERE uug."userId" = $1
    `, [user.id]);
    
    if (groupAssignment.rows.length > 0) {
      console.log('   ✅ Group assignment verified:');
      groupAssignment.rows.forEach(group => {
        console.log(`      Group: ${group.group_name}`);
        console.log(`      Permissions: ${JSON.stringify(group.group_permissions)}`);
      });
    } else {
      console.log('   ❌ Group assignment failed');
    }
    
    console.log('\n📝 Login Credentials:');
    console.log('   Email: recruiter@ncc.com');
    console.log('   Password: recruiter123');
    
  } catch (error) {
    console.error('❌ Error creating recruiter user:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createRecruiterUser().catch(console.error);
