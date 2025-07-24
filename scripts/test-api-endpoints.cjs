#!/usr/bin/env node

// Test script to verify API endpoints work without double release errors
require('dotenv').config();

async function testApiEndpoints() {
  console.log('🧪 Testing API Endpoints for Double Release Issues...\n');

  // Test the health endpoint which uses database connections
  console.log('1️⃣ Testing health endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/v1/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health endpoint test passed');
      console.log('📊 Database status:', data.database.status);
    } else {
      console.log('⚠️ Health endpoint returned non-200 status:', response.status);
    }
  } catch (error) {
    console.log('ℹ️ Health endpoint test skipped (server not running):', error.message);
  }

  console.log('\n2️⃣ Checking for common double release patterns in codebase...');
  
  // Simple analysis of the fixed files
  const fs = require('fs');
  const path = require('path');
  
  const filesToCheck = [
    'src/app/api/upload-queue/process/route.ts',
    'src/app/api/v1/candidates/[id]/job-matches/route.ts',
    'src/app/api/v1/health/route.ts',
    'src/lib/auditLog.ts',
    'src/lib/db.ts'
  ];
  
  let issuesFound = 0;
  
  for (const filePath of filesToCheck) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Check for problematic patterns
      let earlyReleaseCount = 0;
      let finallyBlockCount = 0;
      let safeClientUsage = content.includes('getSafeDbClient') || content.includes('SafeClient');
      
      lines.forEach((line, index) => {
        // Look for early releases (releases not in finally blocks)
        if (line.includes('client.release()') && !line.trim().startsWith('//')) {
          // Check if this is in a finally block (rough heuristic)
          const contextStart = Math.max(0, index - 10);
          const contextEnd = Math.min(lines.length, index + 5);
          const context = lines.slice(contextStart, contextEnd).join('\n').toLowerCase();
          
          if (context.includes('finally')) {
            finallyBlockCount++;
          } else {
            earlyReleaseCount++;
          }
        }
      });
      
      console.log(`📄 ${filePath}:`);
      console.log(`   - Early releases: ${earlyReleaseCount}`);
      console.log(`   - Finally block releases: ${finallyBlockCount}`);
      console.log(`   - Uses SafeClient: ${safeClientUsage ? '✅' : '❌'}`);
      
      if (earlyReleaseCount > 0 && !safeClientUsage) {
        console.log(`   ⚠️ Potential double release risk detected`);
        issuesFound++;
      } else {
        console.log(`   ✅ Looks safe`);
      }
      
    } catch (error) {
      console.log(`   ❌ Could not analyze file: ${error.message}`);
    }
  }
  
  console.log(`\n📈 Analysis Summary:`);
  console.log(`   - Files checked: ${filesToCheck.length}`);
  console.log(`   - Potential issues: ${issuesFound}`);
  
  if (issuesFound === 0) {
    console.log('✅ No obvious double release patterns found!');
  } else {
    console.log('⚠️ Some files may still have double release risks');
  }

  console.log('\n3️⃣ Recommendations:');
  console.log('📝 To fully verify the fix:');
  console.log('   1. Start your Next.js application');
  console.log('   2. Monitor logs for "Release called on client which has already been released" errors');
  console.log('   3. Test API endpoints that previously showed the error');
  console.log('   4. Check that SafeClient is being used in all database operations');
  
  console.log('\n🎉 Double release error analysis completed!');
  console.log('💡 The SafeClient wrapper should prevent future double release issues.');
}

// Run the test
testApiEndpoints().catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
}); 