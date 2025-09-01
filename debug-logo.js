const { PrismaClient } = require('@prisma/client');

async function debugLogo() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking logo settings in database...');
    
    // Check if appLogoDataUrl exists
    const logoSetting = await prisma.systemSetting.findUnique({
      where: { key: 'appLogoDataUrl' }
    });
    
    if (logoSetting) {
      console.log('✅ Logo setting found:');
      console.log('Key:', logoSetting.key);
      console.log('Value:', logoSetting.value);
      console.log('Updated:', logoSetting.updatedAt);
      
      // Test if the URL is accessible
      if (logoSetting.value && logoSetting.value.startsWith('http')) {
        console.log('🔗 Testing logo URL accessibility...');
        try {
          const response = await fetch(logoSetting.value);
          console.log('URL Status:', response.status);
          console.log('URL OK:', response.ok);
          if (!response.ok) {
            console.log('❌ Logo URL is not accessible');
          } else {
            console.log('✅ Logo URL is accessible');
          }
        } catch (error) {
          console.log('❌ Error accessing logo URL:', error.message);
        }
      } else {
        console.log('⚠️ Logo value is not a valid HTTP URL');
      }
    } else {
      console.log('❌ No logo setting found in database');
    }
    
    // Check all system settings
    console.log('\n📋 All system settings:');
    const allSettings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' }
    });
    
    allSettings.forEach(setting => {
      console.log(`${setting.key}: ${setting.value ? 'SET' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLogo();
