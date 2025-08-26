const fetch = require('node-fetch');

async function testFrontendAPI() {
  console.log('🧪 Testing Frontend API Call...\n');
  
  try {
    // Test the exact API endpoint the frontend is calling
    const response = await fetch('http://localhost:8021/api/upload-queue?limit=20&offset=0', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without authentication, but let's see what happens
      }
    });
    
    console.log('📊 API Response Status:', response.status);
    console.log('📊 API Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n📤 API Response Data:');
      console.log(JSON.stringify(data, null, 2));
      
      // Test frontend parsing logic
      console.log('\n🔍 Frontend Parsing Test:');
      const frontendSummary = {
        total: parseInt(data.summary?.total) || 0,
        queued: parseInt(data.summary?.queued) || 0,
        inprocess: parseInt(data.summary?.inprocess) || 0,
        success: parseInt(data.summary?.success) || 0,
        error: parseInt(data.summary?.error) || 0
      };
      
      console.log('  Frontend Summary:');
      console.log(`    Total: ${frontendSummary.total}`);
      console.log(`    Queued: ${frontendSummary.queued}`);
      console.log(`    In Process: ${frontendSummary.inprocess}`);
      console.log(`    Success: ${frontendSummary.success}`);
      console.log(`    Error: ${frontendSummary.error}`);
      
      console.log('\n📄 Queue Items:');
      console.log(`  Count: ${data.data?.length || 0}`);
      if (data.data && data.data.length > 0) {
        data.data.slice(0, 3).forEach((item, index) => {
          console.log(`    ${index + 1}. ${item.file_name} - ${item.status}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API Error Response:');
      console.log(errorText);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testFrontendAPI();
