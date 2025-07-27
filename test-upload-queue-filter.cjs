#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUploadQueueFilter() {
  console.log('🧪 Testing upload queue filter...');
  
  try {
    // Get admin user for association
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@ncc.com' }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found. Please run the main seed first.');
      return;
    }

    // Create test data with correct status values
    console.log('Creating test upload queue data...');
    const testData = [
      {
        id: '50000000-0000-0000-0000-000000000001',
        fileName: 'test_queued.pdf',
        fileSize: BigInt(245760),
        status: 'queued',
        source: 'test',
        filePath: '/uploads/test/test_queued.pdf',
        createdBy: adminUser.id
      },
      {
        id: '50000000-0000-0000-0000-000000000002',
        fileName: 'test_inprocess.pdf',
        fileSize: BigInt(512000),
        status: 'inprocess',
        source: 'test',
        filePath: '/uploads/test/test_inprocess.pdf',
        createdBy: adminUser.id
      },
      {
        id: '50000000-0000-0000-0000-000000000003',
        fileName: 'test_success.pdf',
        fileSize: BigInt(102400),
        status: 'success',
        source: 'test',
        filePath: '/uploads/test/test_success.pdf',
        createdBy: adminUser.id
      },
      {
        id: '50000000-0000-0000-0000-000000000004',
        fileName: 'test_error.pdf',
        fileSize: BigInt(768000),
        status: 'error',
        error: 'Test error',
        source: 'test',
        filePath: '/uploads/test/test_error.pdf',
        createdBy: adminUser.id
      },
      {
        id: '50000000-0000-0000-0000-000000000005',
        fileName: 'test_fail.pdf',
        fileSize: BigInt(307200),
        status: 'fail',
        error: 'Test fail',
        source: 'test',
        filePath: '/uploads/test/test_fail.pdf',
        createdBy: adminUser.id
      }
    ];

    // Insert test data
    for (const item of testData) {
      await prisma.uploadQueue.upsert({
        where: { id: item.id },
        update: item,
        create: item
      });
    }

    console.log('✅ Test data created successfully!');
    console.log('\n📊 Test data summary:');
    console.log('- 1 queued job');
    console.log('- 1 inprocess job');
    console.log('- 1 success job');
    console.log('- 1 error job');
    console.log('- 1 fail job');
    console.log('\n🔍 You can now test the filter in the UI:');
    console.log('1. Go to the upload queue page');
    console.log('2. Try filtering by "Error" status - it should show both error and fail jobs');
    console.log('3. Try filtering by "Success" status - it should show only success jobs');
    console.log('4. Try filtering by "Queued" status - it should show only queued jobs');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUploadQueueFilter(); 