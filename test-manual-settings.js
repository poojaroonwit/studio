// Test script for manual link settings
const testManualSettings = async () => {
  const testSettings = [
    { key: 'manualLink', value: 'https://example.com/manual' },
    { key: 'manualType', value: 'external' }
  ];

  try {
    console.log('Testing manual link settings save...');
    
    const response = await fetch('http://localhost:3000/api/settings/system-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSettings),
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Success! Settings saved:', result);
    } else {
      const error = await response.json();
      console.error('Error saving settings:', error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
};

// Test GET request
const testGetSettings = async () => {
  try {
    console.log('Testing manual link settings retrieval...');
    
    const response = await fetch('http://localhost:3000/api/settings/system-settings');
    
    if (response.ok) {
      const settings = await response.json();
      console.log('Current settings:', {
        manualLink: settings.manualLink,
        manualType: settings.manualType
      });
    } else {
      console.error('Failed to get settings');
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
};

// Run tests
testGetSettings().then(() => {
  setTimeout(testManualSettings, 1000);
}); 