#!/usr/bin/env node

/**
 * Migration script to convert from single API key to multi-key fallback system
 * 
 * This script will:
 * 1. Check for existing geminiApiKey setting
 * 2. Convert it to geminiApiKey_1 (priority 1)
 * 3. Preserve the original key as backup
 * 4. Update the system to use the new format
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateApiKeys() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Starting API key migration...');
    
    // Check if migration is needed
    const existingKeysResult = await client.query(`
      SELECT key, value FROM "SystemSetting" 
      WHERE key LIKE 'geminiApiKey%' 
      ORDER BY key
    `);
    
    const existingKeys = existingKeysResult.rows;
    console.log(`📊 Found ${existingKeys.length} existing API key settings`);
    
    // Check if we already have the new format
    const hasNewFormat = existingKeys.some(key => key.key.startsWith('geminiApiKey_'));
    const hasOldFormat = existingKeys.some(key => key.key === 'geminiApiKey');
    
    if (hasNewFormat) {
      console.log('✅ New API key format already exists. Migration not needed.');
      return;
    }
    
    if (!hasOldFormat) {
      console.log('⚠️  No existing API key found. Nothing to migrate.');
      return;
    }
    
    // Get the old API key
    const oldKeyResult = await client.query(`
      SELECT value FROM "SystemSetting" WHERE key = 'geminiApiKey'
    `);
    
    if (oldKeyResult.rows.length === 0) {
      console.log('⚠️  No API key found to migrate.');
      return;
    }
    
    const oldApiKey = oldKeyResult.rows[0].value;
    
    if (!oldApiKey || oldApiKey.trim() === '') {
      console.log('⚠️  Existing API key is empty. Nothing to migrate.');
      return;
    }
    
    console.log('🔄 Migrating API key to new format...');
    
    // Start transaction
    await client.query('BEGIN');
    
    try {
      // Insert the new format (priority 1)
      await client.query(`
        INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          "updatedAt" = NOW()
      `, ['geminiApiKey_1', oldApiKey]);
      
      // Backup the old key (rename to _backup)
      await client.query(`
        UPDATE "SystemSetting" 
        SET key = 'geminiApiKey_backup', "updatedAt" = NOW()
        WHERE key = 'geminiApiKey'
      `);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('✅ Migration completed successfully!');
      console.log('📝 Changes made:');
      console.log('   - Old key "geminiApiKey" → "geminiApiKey_backup" (preserved)');
      console.log('   - New key "geminiApiKey_1" created with priority 1');
      console.log('');
      console.log('🎯 Next steps:');
      console.log('   1. Go to System Settings > AI API Keys');
      console.log('   2. Add additional API keys with different priorities if needed');
      console.log('   3. Test the fallback system');
      console.log('   4. Remove the backup key once you confirm everything works');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

async function checkApiKeyStatus() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking API key status...');
    
    const result = await client.query(`
      SELECT key, value, "updatedAt" 
      FROM "SystemSetting" 
      WHERE key LIKE 'geminiApiKey%' 
      ORDER BY key
    `);
    
    console.log('📊 Current API key configuration:');
    
    if (result.rows.length === 0) {
      console.log('   ❌ No API keys configured');
      console.log('   💡 Add your first API key in System Settings > AI API Keys');
    } else {
      result.rows.forEach(row => {
        const maskedValue = row.value ? 
          `${row.value.substring(0, 8)}...${row.value.substring(row.value.length - 4)}` : 
          'empty';
        console.log(`   ${row.key}: ${maskedValue} (updated: ${new Date(row.updatedAt).toLocaleDateString()})`);
      });
    }
    
    // Check environment variable
    if (process.env.GOOGLE_API_KEY) {
      const envKey = process.env.GOOGLE_API_KEY;
      const maskedEnvKey = `${envKey.substring(0, 8)}...${envKey.substring(envKey.length - 4)}`;
      console.log(`   Environment GOOGLE_API_KEY: ${maskedEnvKey} (available as fallback)`);
    } else {
      console.log('   Environment GOOGLE_API_KEY: not set');
    }
    
  } catch (error) {
    console.error('❌ Error checking API key status:', error.message);
  } finally {
    client.release();
  }
}

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      await migrateApiKeys();
      break;
    case 'status':
      await checkApiKeyStatus();
      break;
    default:
      console.log('🔧 API Key Migration Tool');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/migrate-api-keys.cjs migrate  - Migrate from old to new format');
      console.log('  node scripts/migrate-api-keys.cjs status  - Check current API key status');
      console.log('');
      console.log('This tool helps migrate from the old single API key format to the new');
      console.log('multi-key fallback system with priority-based key selection.');
      break;
  }
  
  await pool.end();
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
