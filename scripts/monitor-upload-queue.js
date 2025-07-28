#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function monitorUploadQueue() {
  console.log('📊 Upload Queue Monitoring Report\n');

  try {
    // 1. Overall statistics
    const totalCount = await prisma.uploadQueue.count();
    console.log(`📈 Total files in queue: ${totalCount}`);

    // 2. Status breakdown
    const statusCounts = await prisma.uploadQueue.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    console.log('\n📋 Status Breakdown:');
    statusCounts.forEach(item => {
      const percentage = ((item._count.status / totalCount) * 100).toFixed(1);
      console.log(`  ${item.status}: ${item._count.status} (${percentage}%)`);
    });

    // 3. Recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await prisma.uploadQueue.count({
      where: {
        created_at: {
          gte: oneDayAgo
        }
      }
    });

    console.log(`\n⏰ Files added in last 24 hours: ${recentCount}`);

    // 4. Processing performance
    const processingStats = await prisma.uploadQueue.groupBy({
      by: ['status'],
      where: {
        created_at: {
          gte: oneDayAgo
        }
      },
      _count: {
        status: true
      }
    });

    console.log('\n⚡ Processing Performance (24h):');
    processingStats.forEach(item => {
      console.log(`  ${item.status}: ${item._count.status}`);
    });

    // 5. Average processing time
    const completedJobs = await prisma.uploadQueue.findMany({
      where: {
        status: 'completed',
        created_at: {
          gte: oneDayAgo
        }
      },
      select: {
        created_at: true,
        updated_at: true
      }
    });

    if (completedJobs.length > 0) {
      const avgProcessingTime = completedJobs.reduce((sum, job) => {
        const processingTime = job.updated_at.getTime() - job.created_at.getTime();
        return sum + processingTime;
      }, 0) / completedJobs.length;

      console.log(`\n⏱️  Average processing time: ${(avgProcessingTime / 1000).toFixed(1)} seconds`);
    }

    // 6. Failed jobs analysis
    const failedJobs = await prisma.uploadQueue.findMany({
      where: {
        status: 'failed',
        created_at: {
          gte: oneDayAgo
        }
      },
      select: {
        file_name: true,
        error_message: true,
        created_at: true
      },
      take: 10
    });

    if (failedJobs.length > 0) {
      console.log(`\n❌ Recent Failed Jobs (showing up to 10):`);
      failedJobs.forEach(job => {
        console.log(`  ${job.file_name}: ${job.error_message || 'No error message'}`);
      });
    }

    // 7. Batch analysis
    const batchStats = await prisma.uploadQueue.groupBy({
      by: ['upload_id'],
      where: {
        upload_id: {
          not: null
        },
        created_at: {
          gte: oneDayAgo
        }
      },
      _count: {
        upload_id: true
      },
      orderBy: {
        _count: {
          upload_id: 'desc'
        }
      },
      take: 5
    });

    if (batchStats.length > 0) {
      console.log('\n📦 Largest Batches (24h):');
      batchStats.forEach(batch => {
        console.log(`  Batch ${batch.upload_id}: ${batch._count.upload_id} files`);
      });
    }

    // 8. File size analysis
    const sizeStats = await prisma.uploadQueue.aggregate({
      where: {
        created_at: {
          gte: oneDayAgo
        }
      },
      _avg: {
        file_size: true
      },
      _min: {
        file_size: true
      },
      _max: {
        file_size: true
      }
    });

    if (sizeStats._avg.file_size) {
      console.log('\n📏 File Size Statistics (24h):');
      console.log(`  Average: ${(sizeStats._avg.file_size / 1024).toFixed(1)} KB`);
      console.log(`  Min: ${(sizeStats._min.file_size / 1024).toFixed(1)} KB`);
      console.log(`  Max: ${(sizeStats._max.file_size / 1024).toFixed(1)} KB`);
    }

    // 9. Queue health indicators
    const queuedCount = statusCounts.find(s => s.status === 'queued')?._count.status || 0;
    const processingCount = statusCounts.find(s => s.status === 'inprocess')?._count.status || 0;
    const failedCount = statusCounts.find(s => s.status === 'failed')?._count.status || 0;

    console.log('\n🏥 Queue Health:');
    
    if (queuedCount > 100) {
      console.log(`  ⚠️  High queue backlog: ${queuedCount} files waiting`);
    } else if (queuedCount > 50) {
      console.log(`  📊 Moderate queue: ${queuedCount} files waiting`);
    } else {
      console.log(`  ✅ Healthy queue: ${queuedCount} files waiting`);
    }

    if (processingCount > 10) {
      console.log(`  ⚠️  High processing load: ${processingCount} files being processed`);
    } else {
      console.log(`  ✅ Normal processing load: ${processingCount} files being processed`);
    }

    if (failedCount > 10) {
      console.log(`  ❌ High failure rate: ${failedCount} failed files`);
    } else if (failedCount > 5) {
      console.log(`  ⚠️  Moderate failure rate: ${failedCount} failed files`);
    } else {
      console.log(`  ✅ Low failure rate: ${failedCount} failed files`);
    }

    // 10. Recommendations
    console.log('\n💡 Recommendations:');
    
    if (queuedCount > 100) {
      console.log('  • Consider increasing processor capacity');
      console.log('  • Check for processing bottlenecks');
    }
    
    if (failedCount > 10) {
      console.log('  • Investigate failed jobs for patterns');
      console.log('  • Check webhook endpoint availability');
      console.log('  • Review error logs for common issues');
    }
    
    if (processingCount === 0 && queuedCount > 0) {
      console.log('  • No files are being processed - check processor service');
    }

  } catch (error) {
    console.error('❌ Error monitoring upload queue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the monitoring
monitorUploadQueue().catch(console.error); 