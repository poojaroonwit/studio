require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Initializing Database...\n');
    
    // 1. Check if database is empty
    console.log('1. Checking database state...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tables.rows.length > 0) {
      console.log(`   ⚠️  Database already has ${tables.rows.length} tables`);
      console.log('   Tables found:');
      tables.rows.forEach(table => {
        console.log(`      - ${table.table_name}`);
      });
      console.log('');
      
      const response = await new Promise((resolve) => {
        process.stdout.write('   Do you want to continue anyway? (y/N): ');
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim().toLowerCase());
        });
      });
      
      if (response !== 'y' && response !== 'yes') {
        console.log('   ❌ Database initialization cancelled');
        return;
      }
    } else {
      console.log('   ✅ Database is empty, proceeding with initialization');
    }
    console.log('');

    // 2. Create schema using Prisma
    console.log('2. Creating database schema...');
    try {
      const { execSync } = require('child_process');
      execSync('npx prisma db push --accept-data-loss', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('   ✅ Schema created successfully');
    } catch (error) {
      console.log('   ❌ Failed to create schema with Prisma');
      console.log('   Error:', error.message);
      return;
    }
    console.log('');

    // 3. Run initialization SQL
    console.log('3. Running initialization SQL...');
    const initSqlPath = path.join(__dirname, '..', 'prisma', 'init-db.sql');
    
    if (!fs.existsSync(initSqlPath)) {
      console.log('   ❌ init-db.sql file not found');
      return;
    }
    
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    
    try {
      await client.query(initSql);
      console.log('   ✅ Initialization SQL executed successfully');
    } catch (error) {
      console.log('   ❌ Failed to execute initialization SQL');
      console.log('   Error:', error.message);
      return;
    }
    console.log('');

    // 4. Verify initialization
    console.log('4. Verifying initialization...');
    
    // Check if admin user was created
    const adminUser = await client.query(`
      SELECT id, name, email, role 
      FROM "User" 
      WHERE email = 'admin@ncc.com'
    `);
    
    if (adminUser.rows.length > 0) {
      console.log('   ✅ Admin user created successfully');
      console.log(`      Name: ${adminUser.rows[0].name}`);
      console.log(`      Email: ${adminUser.rows[0].email}`);
      console.log(`      Role: ${adminUser.rows[0].role}`);
    } else {
      console.log('   ❌ Admin user not found');
    }
    
    // Check if user groups were created
    const userGroups = await client.query(`
      SELECT name, description, array_length(permissions, 1) as permission_count
      FROM "UserGroup"
      ORDER BY name
    `);
    
    if (userGroups.rows.length > 0) {
      console.log('   ✅ User groups created successfully');
      userGroups.rows.forEach(group => {
        console.log(`      - ${group.name}: ${group.description} (${group.permission_count} permissions)`);
      });
    } else {
      console.log('   ❌ User groups not found');
    }
    
    // Check if recruitment stages were created
    const stages = await client.query(`
      SELECT name, description 
      FROM "RecruitmentStage"
      ORDER BY "sortOrder"
    `);
    
    if (stages.rows.length > 0) {
      console.log('   ✅ Recruitment stages created successfully');
      console.log(`      ${stages.rows.length} stages created`);
    } else {
      console.log('   ❌ Recruitment stages not found');
    }
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the application: npm run dev');
    console.log('   2. Sign in with admin@ncc.com / nccadmin');
    console.log('   3. Create additional users as needed');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the initialization
initDatabase().catch(console.error);
