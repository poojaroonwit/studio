const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedUploadQueue() {
  try {
    console.log('🌱 Seeding upload queue with sample data...');
    
    // Check if we already have data
    const existingCount = await prisma.uploadQueue.count();
    if (existingCount > 0) {
      console.log(`📊 Upload queue already has ${existingCount} records. Skipping seed.`);
      return;
    }
    
    // Sample data for different statuses
    const sampleJobs = [
      {
        fileName: 'john_doe_resume.pdf',
        fileSize: BigInt(1024000), // 1MB
        status: 'queued',
        source: 'bulk',
        filePath: 'uploads/john_doe_resume.pdf',
        uploadDate: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      },
      {
        fileName: 'jane_smith_cv.pdf',
        fileSize: BigInt(2048000), // 2MB
        status: 'inprocess',
        source: 'manual',
        filePath: 'uploads/jane_smith_cv.pdf',
        uploadDate: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        processDate: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
      },
      {
        fileName: 'mike_johnson_resume.pdf',
        fileSize: BigInt(1536000), // 1.5MB
        status: 'success',
        source: 'bulk',
        filePath: 'uploads/mike_johnson_resume.pdf',
        uploadDate: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        processDate: new Date(Date.now() - 1000 * 60 * 55), // 55 minutes ago
        completedDate: new Date(Date.now() - 1000 * 60 * 50), // 50 minutes ago
      },
      {
        fileName: 'sarah_wilson_cv.pdf',
        fileSize: BigInt(3072000), // 3MB
        status: 'error',
        source: 'manual',
        filePath: 'uploads/sarah_wilson_cv.pdf',
        uploadDate: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
        processDate: new Date(Date.now() - 1000 * 60 * 40), // 40 minutes ago
        completedDate: new Date(Date.now() - 1000 * 60 * 35), // 35 minutes ago
        error: 'Failed to parse PDF content',
        errorDetails: 'The PDF file appears to be corrupted or password protected.',
      },
      {
        fileName: 'david_brown_resume.pdf',
        fileSize: BigInt(512000), // 0.5MB
        status: 'queued',
        source: 'bulk',
        filePath: 'uploads/david_brown_resume.pdf',
        uploadDate: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      },
    ];
    
    console.log(`📝 Creating ${sampleJobs.length} sample jobs...`);
    
    for (const job of sampleJobs) {
      await prisma.uploadQueue.create({
        data: job
      });
    }
    
    console.log('✅ Upload queue seeded successfully!');
    
    // Verify the data
    const finalCount = await prisma.uploadQueue.count();
    console.log(`📊 Total records in upload queue: ${finalCount}`);
    
    // Show status breakdown
    const statusBreakdown = await prisma.uploadQueue.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    
    console.log('\n📋 Status breakdown:');
    statusBreakdown.forEach(item => {
      console.log(`  ${item.status}: ${item._count.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding upload queue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedUploadQueue();
