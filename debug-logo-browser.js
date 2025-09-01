// Browser-based logo debugging script
// Run this in the browser console on the login page

async function debugLogoInBrowser() {
  console.log('🔍 Checking logo settings via API...');
  
  try {
    // Fetch system settings
    const response = await fetch('/api/settings/system-settings');
    const data = await response.json();
    
    console.log('📋 System settings response:', data);
    
    let settings = {};
    if (data.settings && Array.isArray(data.settings)) {
      settings = Object.fromEntries(data.settings.map(setting => [setting.key, setting.value]));
    } else {
      settings = data;
    }
    
    console.log('🔧 Parsed settings:', settings);
    
    // Check logo settings
    const logoUrl = settings.appLogoDataUrl;
    console.log('🎨 Logo URL:', logoUrl);
    
    if (logoUrl) {
      console.log('🔗 Testing logo URL...');
      
      // Test image loading
      const img = new Image();
      img.onload = () => {
        console.log('✅ Logo image loads successfully');
        console.log('📏 Image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
      };
      img.onerror = () => {
        console.log('❌ Logo image fails to load');
      };
      img.src = logoUrl;
      
      // Test fetch
      try {
        const imgResponse = await fetch(logoUrl);
        console.log('🌐 Fetch status:', imgResponse.status);
        console.log('🌐 Fetch OK:', imgResponse.ok);
        if (!imgResponse.ok) {
          console.log('❌ Logo URL is not accessible via fetch');
        }
      } catch (error) {
        console.log('❌ Fetch error:', error.message);
      }
    } else {
      console.log('❌ No logo URL found in settings');
    }
    
    // Check other relevant settings
    console.log('📝 App name:', settings.appName);
    console.log('🎨 Theme preference:', settings.appThemePreference);
    console.log('📏 Login page logo size:', settings.loginPageLogoSize);
    
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
  }
}

// Run the debug function
debugLogoInBrowser();
