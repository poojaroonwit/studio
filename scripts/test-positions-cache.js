const fetch = require('node-fetch');

async function testPositionsCache() {
  console.log('🧪 Testing Positions Cache Performance');
  console.log('=====================================\n');

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  try {
    // Test 1: First request (should be slow, no cache)
    console.log('📡 Test 1: First request (no cache)...');
    const start1 = Date.now();
    const response1 = await fetch(`${baseUrl}/api/positions/all`);
    const data1 = await response1.json();
    const time1 = Date.now() - start1;
    
    console.log(`✅ First request completed in ${time1}ms`);
    console.log(`   Positions returned: ${data1.data.length}`);
    console.log(`   Cached: ${data1.meta?.cached || false}\n`);

    // Test 2: Second request (should be fast, from cache)
    console.log('📡 Test 2: Second request (should use cache)...');
    const start2 = Date.now();
    const response2 = await fetch(`${baseUrl}/api/positions/all`);
    const data2 = await response2.json();
    const time2 = Date.now() - start2;
    
    console.log(`✅ Second request completed in ${time2}ms`);
    console.log(`   Positions returned: ${data2.data.length}`);
    console.log(`   Cached: ${data2.meta?.cached || false}\n`);

    // Test 3: Multiple concurrent requests (should all be fast)
    console.log('📡 Test 3: Multiple concurrent requests...');
    const concurrentStart = Date.now();
    const promises = Array(5).fill().map(() => 
      fetch(`${baseUrl}/api/positions/all`).then(r => r.json())
    );
    
    const results = await Promise.all(promises);
    const concurrentTime = Date.now() - concurrentStart;
    
    console.log(`✅ 5 concurrent requests completed in ${concurrentTime}ms`);
    console.log(`   Average time per request: ${concurrentTime / 5}ms`);
    console.log(`   All cached: ${results.every(r => r.meta?.cached || false)}\n`);

    // Performance summary
    console.log('📊 Performance Summary:');
    console.log(`   First request: ${time1}ms`);
    console.log(`   Cached request: ${time2}ms`);
    console.log(`   Speed improvement: ${Math.round((time1 - time2) / time1 * 100)}%`);
    console.log(`   Concurrent requests: ${concurrentTime}ms total`);

  } catch (error) {
    console.error('❌ Error testing positions cache:', error);
  }
}

testPositionsCache();
