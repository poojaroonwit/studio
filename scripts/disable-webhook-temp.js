#!/usr/bin/env node

/**
 * Temporarily Disable Webhook - Quick Fix
 * 
 * This script clears the webhook URL to allow jobs to process
 * without external service dependency while the webhook is down.
 */

const { Pool } = require('pg');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Configuration - use DATABASE_URL from environment
const config = {
  connectionString: process.env.DATABASE_URL,
};

async function disableWebhook() {
  const pool = new Pool(config);
  
  try {
    console.log('🔧 Temporarily Disable Webhook');
    console.log('=============================\n');

    // 1. Check current webhook settings
    console.log('📊 Current Webhook Settings:');
    const settingsQuery = `
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('resumeProcessingWebhookUrl', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `;
    const settingsResult = await pool.query(settingsQuery);
    
    settingsResult.rows.forEach(row => {
      console.log(`  ${row.key}: ${row.value}`);
    });
    console.log('');

    // 2. Clear the webhook URL
    console.log('🔄 Clearing webhook URL...');
    const clearWebhookQuery = `
      UPDATE "SystemSetting" 
      SET value = '', "updatedAt" = NOW()
      WHERE key = 'resumeProcessingWebhookUrl'
    `;
    
    const clearResult = await pool.query(clearWebhookQuery);
    
    if (clearResult.rowCount > 0) {
      console.log('✅ Webhook URL cleared successfully');
    } else {
      // Insert if doesn't exist
      const insertQuery = `
        INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
        VALUES ('resumeProcessingWebhookUrl', '', NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = '',
          "updatedAt" = NOW()
      `;
      await pool.query(insertQuery);
      console.log('✅ Webhook URL set to empty (inserted)');
    }

    // 3. Verify the change
    console.log('\n📊 Updated Webhook Settings:');
    const verifyResult = await pool.query(settingsQuery);
    
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.key}: ${row.value || '(empty)'}`);
    });

    console.log('\n✅ Webhook temporarily disabled!');
    console.log('📝 Jobs will now process without external webhook calls');
    console.log('⚠️  Remember to re-enable the webhook when the external service is back online');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the script
disableWebhook().catch(console.error);
