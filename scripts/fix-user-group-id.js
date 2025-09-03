#!/usr/bin/env node

/**
 * Fix User Group ID Column Script
 * 
 * This script manually adds the missing userGroupId column to the User table
 * to resolve the schema mismatch between the code and database.
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function fixUserGroupId() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing User Group ID column...\n');
    
    // Check if the column already exists
    const checkColumnResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'userGroupId'
    `);
    
    if (checkColumnResult.rows.length > 0) {
      console.log('✅ userGroupId column already exists');
      return;
    }
    
    console.log('📝 Adding userGroupId column to User table...');
    
    // Add the userGroupId column
    await client.query(`
      ALTER TABLE "User" ADD COLUMN "userGroupId" UUID
    `);
    
    console.log('✅ userGroupId column added successfully');
    
    // Check if User_UserGroup junction table exists and migrate data
    const checkJunctionResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'User_UserGroup'
      )
    `);
    
    if (checkJunctionResult.rows[0].exists) {
      console.log('📊 Migrating data from junction table...');
      
      // Migrate existing data from junction table
      await client.query(`
        UPDATE "User" 
        SET "userGroupId" = (
          SELECT "groupId" 
          FROM "User_UserGroup" 
          WHERE "User_UserGroup"."userId" = "User".id 
          LIMIT 1
        )
      `);
      
      console.log('✅ Data migration completed');
    }
    
    // Add foreign key constraint
    console.log('🔗 Adding foreign key constraint...');
    await client.query(`
      ALTER TABLE "User" ADD CONSTRAINT "User_userGroupId_fkey" 
      FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"(id) ON DELETE SET NULL
    `);
    
    console.log('✅ Foreign key constraint added');
    
    // Add index for performance
    console.log('📈 Adding index...');
    await client.query(`
      CREATE INDEX "User_userGroupId_idx" ON "User"("userGroupId")
    `);
    
    console.log('✅ Index created');
    
    console.log('\n🎉 User Group ID column fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing User Group ID column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixUserGroupId().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
