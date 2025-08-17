const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkSystemConfiguration() {
  console.log('🔍 Checking System Configuration Loading...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    
    // Get all system settings
    const settingsResult = await client.query('SELECT key, value FROM "SystemSetting" ORDER BY key');
    console.log('📋 Current System Settings in Database:');
    settingsResult.rows.forEach(row => {
      console.log(`  ✅ ${row.key}: ${row.value}`);
    });
    
    // Check for commonly expected settings that might be missing
    const expectedSettings = [
      'appName',
      'appLogoDataUrl', 
      'appFaviconDataUrl',
      'loginPageLogoLightMode',
      'loginPageLogoDarkMode',
      'sidebarLogoCollapsedLightMode',
      'sidebarLogoExpandedLightMode',
      'sidebarLogoCollapsedDarkMode',
      'sidebarLogoExpandedDarkMode',
      'themePreference',
      'primaryGradientStart',
      'primaryGradientEnd',
      'loginPageLayoutType',
      'loginBackgroundType',
      'loginBackgroundImage',
      'loginBackgroundGradientStart',
      'loginBackgroundGradientEnd'
    ];
    
    console.log('\n🔍 Checking for Expected Settings:');
    const existingKeys = settingsResult.rows.map(row => row.key);
    
    expectedSettings.forEach(expectedKey => {
      if (existingKeys.includes(expectedKey)) {
        console.log(`  ✅ ${expectedKey}: Found`);
      } else {
        console.log(`  ❌ ${expectedKey}: Missing`);
      }
    });
    
    // Check if there are any settings with null or empty values
    console.log('\n⚠️  Settings with Empty/Null Values:');
    settingsResult.rows.forEach(row => {
      if (!row.value || row.value.trim() === '') {
        console.log(`  ⚠️  ${row.key}: Empty or null`);
      }
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Error checking system configuration:', error.message);
  } finally {
    await pool.end();
  }
}

checkSystemConfiguration();
