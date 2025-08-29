const fetch = require('node-fetch');

async function testApiExport() {
  try {
    console.log('Testing API export endpoint...');
    
    // Test the export API endpoint
    const response = await fetch('http://localhost:3000/api/candidates/export?format=excel', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const blob = await response.blob();
    console.log('Blob size:', blob.size, 'bytes');
    console.log('Blob type:', blob.type);
    
    if (blob.size === 0) {
      console.error('❌ Export returned empty file');
    } else {
      console.log('✅ Export successful');
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testApiExport();
