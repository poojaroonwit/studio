// Test script for user profile image functionality
const BASE_URL = 'http://localhost:8021';

async function testProfileImageAPI() {
  console.log('🧪 Testing User Profile Image API...\n');

  try {
    // Test 1: Upload image (should return 401 if not authenticated)
    console.log('1. Testing POST /api/upload-image (unauthenticated)...');
    const formData = new FormData();
    formData.append('image', new Blob(['test'], { type: 'image/png' }), 'test.png');
    
    const uploadResponse = await fetch(`${BASE_URL}/api/upload-image`, {
      method: 'POST',
      body: formData,
    });
    console.log(`   Status: ${uploadResponse.status}`);
    if (uploadResponse.status === 401) {
      console.log('   ✅ Image upload endpoint requires authentication (as expected)');
    } else if (uploadResponse.status === 200) {
      console.log('   ⚠️  Image upload endpoint is accessible without authentication');
    } else {
      console.log('   ❌ Image upload endpoint returned:', uploadResponse.status);
    }

    // Test 2: Check MinIO configuration
    console.log('\n2. Checking MinIO configuration...');
    const fs = require('fs');
    const path = require('path');
    
    // Check if .env file has MinIO configuration
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const minioConfig = {
        endpoint: envContent.includes('MINIO_ENDPOINT'),
        bucket: envContent.includes('MINIO_BUCKET'),
        publicUrl: envContent.includes('MINIO_PUBLIC_BASE_URL')
      };
      
      console.log('   ✅ .env.local file found');
      console.log(`   📋 MinIO Endpoint configured: ${minioConfig.endpoint ? '✅' : '❌'}`);
      console.log(`   📋 MinIO Bucket configured: ${minioConfig.bucket ? '✅' : '❌'}`);
      console.log(`   📋 MinIO Public URL configured: ${minioConfig.publicUrl ? '✅' : '❌'}`);
    } else {
      console.log('   ❌ .env.local file not found');
    }

    // Test 3: Check database schema for user avatar fields
    console.log('\n3. Checking database schema...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      // Check if User model has avatarUrl and image fields
      const userCount = await prisma.user.count();
      console.log(`   ✅ Database connection successful (${userCount} users found)`);
      
      // Try to query a user with avatar fields
      const sampleUser = await prisma.user.findFirst({
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          image: true
        }
      });
      
      if (sampleUser) {
        console.log('   ✅ User model has avatarUrl and image fields');
        console.log(`   👤 Sample user: ${sampleUser.name} (avatarUrl: ${sampleUser.avatarUrl || 'none'}, image: ${sampleUser.image || 'none'})`);
        
        // Check if avatar URL is a MinIO URL
        if (sampleUser.avatarUrl) {
          const isMinioUrl = sampleUser.avatarUrl.includes('localhost:8621') || 
                           sampleUser.avatarUrl.includes('minio') ||
                           sampleUser.avatarUrl.includes('uploads');
          console.log(`   🔗 Avatar URL type: ${isMinioUrl ? 'MinIO URL' : 'Other URL'}`);
        }
      }
    } catch (error) {
      console.log('   ❌ Database error:', error.message);
    } finally {
      await prisma.$disconnect();
    }

    // Test 4: Check MinIO client configuration
    console.log('\n4. Checking MinIO client configuration...');
    try {
      const { minioClient, MINIO_BUCKET } = require('../src/lib/minio');
      console.log(`   ✅ MinIO client configured`);
      console.log(`   📦 Bucket name: ${MINIO_BUCKET}`);
      
      // Test bucket connection (this might fail if MinIO is not running)
      try {
        const exists = await minioClient.bucketExists(MINIO_BUCKET);
        console.log(`   🔗 MinIO bucket connection: ${exists ? '✅ Connected' : '❌ Bucket not found'}`);
      } catch (minioError) {
        console.log(`   ⚠️  MinIO connection failed (MinIO might not be running): ${minioError.message}`);
      }
    } catch (error) {
      console.log('   ❌ MinIO client configuration error:', error.message);
    }

    console.log('\n✅ Profile image functionality test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Ensure MinIO is running on localhost:9000');
    console.log('   2. Start the development server: npm run dev');
    console.log('   3. Sign in to the application');
    console.log('   4. Go to Settings > Users');
    console.log('   5. Edit a user and test the profile image upload');
    console.log('   6. Verify the image appears in the user list and header');
    console.log('\n🔧 MinIO Setup:');
    console.log('   - Install MinIO: https://min.io/download');
    console.log('   - Start MinIO: minio server /data --console-address :9001');
    console.log('   - Access console: http://localhost:9001 (minioadmin/minioadmin)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testProfileImageAPI();
