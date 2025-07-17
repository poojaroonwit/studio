// Test script to verify sidebar colors are properly applied
const fetch = require('node-fetch');

async function testSidebarColors() {
  try {
    console.log('Testing sidebar colors application...');
    
    // Test the system settings API
    const response = await fetch('http://localhost:3000/api/settings/system-settings');
    const data = await response.json();
    
    console.log('API Response structure:', {
      hasSettings: !!data.settings,
      isSettingsArray: Array.isArray(data.settings),
      settingsCount: data.settings ? data.settings.length : 0,
      hasSidebarColors: data.settings ? data.settings.some(s => s.key.startsWith('sidebar')) : false
    });
    
    // Check for sidebar color keys
    if (data.settings && Array.isArray(data.settings)) {
      const sidebarKeys = data.settings.filter(s => s.key.startsWith('sidebar'));
      console.log('Found sidebar color keys:', sidebarKeys.map(s => s.key));
      
      // Convert to object format like the frontend does
      const settingsObj = Object.fromEntries(data.settings.map(s => [s.key, s.value]));
      const sidebarColors = {};
      
      const sidebarColorKeys = [
        'sidebarBgStartL', 'sidebarBgEndL', 'sidebarTextL', 'sidebarActiveBgStartL', 'sidebarActiveBgEndL', 'sidebarActiveTextL',
        'sidebarHoverBgL', 'sidebarHoverTextL', 'sidebarBorderL', 'sidebarBgStartD', 'sidebarBgEndD', 'sidebarTextD',
        'sidebarActiveBgStartD', 'sidebarActiveBgEndD', 'sidebarActiveTextD', 'sidebarHoverBgD', 'sidebarHoverTextD', 'sidebarBorderD'
      ];
      
      sidebarColorKeys.forEach(key => {
        if (settingsObj[key]) {
          sidebarColors[key] = settingsObj[key];
        }
      });
      
      console.log('Extracted sidebar colors:', sidebarColors);
      console.log('Sidebar colors count:', Object.keys(sidebarColors).length);
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testSidebarColors(); 