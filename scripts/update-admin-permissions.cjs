const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateAdminPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('Updating Admin user permissions...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Get the Admin user
    const adminUser = await client.query(`
      SELECT id, name, email, role, "module_permissions"
      FROM "User"
      WHERE role = 'Admin'
      LIMIT 1
    `);
    
    if (adminUser.rows.length === 0) {
      console.log('❌ No Admin user found');
      return;
    }
    
    const user = adminUser.rows[0];
    console.log(`Found Admin user: ${user.name} (${user.email})`);
    console.log(`Current permissions: ${user.module_permissions ? user.module_permissions.join(', ') : 'None'}`);
    
    // Add CUSTOM_FIELDS_MANAGE permission if not already present
    const currentPermissions = user.module_permissions || [];
    if (!currentPermissions.includes('CUSTOM_FIELDS_MANAGE')) {
      const updatedPermissions = [...currentPermissions, 'CUSTOM_FIELDS_MANAGE'];
      
      await client.query(`
        UPDATE "User"
        SET "module_permissions" = $1, "updatedAt" = NOW()
        WHERE id = $2
      `, [updatedPermissions, user.id]);
      
      console.log('✅ Added CUSTOM_FIELDS_MANAGE permission to Admin user');
      console.log(`Updated permissions: ${updatedPermissions.join(', ')}`);
    } else {
      console.log('✅ Admin user already has CUSTOM_FIELDS_MANAGE permission');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating admin permissions:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the update
updateAdminPermissions()
  .then(() => {
    console.log('Admin permissions update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Admin permissions update failed:', error);
    process.exit(1);
  });
