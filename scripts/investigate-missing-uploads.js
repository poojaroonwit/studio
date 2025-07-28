#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { Client } from 'pg';

const prisma = new PrismaClient();

async function investigateMissingUploads() {
  console.log('🔍 Investigating missing upload queue files...\n');

  try {
    // 1. Check total count in database
    const totalCount = await prisma.uploadQueue.count();
    console.log(`📊 Total files in upload_queue table: ${totalCount}`);

    // 2. Check count by status
    const statusCounts = await prisma.uploadQueue.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    console.log('\n📈 Files by status:');
    statusCounts.forEach(item => {
      console.log(`  ${item.status}: ${item._count.status}`);
    });

    // 3. Check recent uploads (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentCount = await prisma.uploadQueue.count({
      where: {
        uploadDate: {
          gte: yesterday
        }
      }
    });

    console.log(`\n📅 Files uploaded in last 24 hours: ${recentCount}`);

    // 4. Check by source
    const sourceCounts = await prisma.uploadQueue.groupBy({
      by: ['source'],
      _count: {
        source: true
      }
    });

    console.log('\n📁 Files by source:');
    sourceCounts.forEach(item => {
      console.log(`  ${item.source || 'null'}: ${item._count.source}`);
    });

    // 5. Check for files with errors
    const errorCount = await prisma.uploadQueue.count({
      where: {
        OR: [
          { status: 'error' },
          { status: 'fail' },
          { error: { not: null } }
        ]
      }
    });

    console.log(`\n❌ Files with errors: ${errorCount}`);

    // 6. Check for duplicate file names
    const duplicateFiles = await prisma.$queryRaw`
      SELECT file_name, COUNT(*) as count
      FROM upload_queue 
      GROUP BY file_name 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `;

    if (duplicateFiles.length > 0) {
      console.log('\n🔄 Duplicate file names:');
      duplicateFiles.forEach(item => {
        console.log(`  ${item.file_name}: ${item.count} times`);
      });
    } else {
      console.log('\n✅ No duplicate file names found');
    }

    // 7. Check for files with missing file_path
    const missingPathCount = await prisma.uploadQueue.count({
      where: {
        OR: [
          { filePath: null },
          { filePath: '' }
        ]
      }
    });

    console.log(`\n🚫 Files with missing file_path: ${missingPathCount}`);

    // 8. Check upload batches
    const batchCounts = await prisma.uploadQueue.groupBy({
      by: ['uploadId'],
      _count: {
        uploadId: true
      },
      where: {
        uploadId: {
          not: null
        }
      },
      orderBy: {
        _count: {
          uploadId: 'desc'
        }
      },
      take: 5
    });

    console.log('\n📦 Recent upload batches:');
    batchCounts.forEach(item => {
      console.log(`  Batch ${item.uploadId}: ${item._count.uploadId} files`);
    });

    // 9. Check for files that might have failed to insert
    console.log('\n🔍 Checking for potential insertion failures...');
    
    // Look for files uploaded to MinIO but not in database
    // This would require checking MinIO storage, but we can check for orphaned records
    
    const orphanedCount = await prisma.uploadQueue.count({
      where: {
        AND: [
          { filePath: { not: null } },
          { filePath: { not: '' } },
          {
            OR: [
              { status: 'queued' },
              { status: 'inprocess' }
            ]
          }
        ]
      }
    });

    console.log(`📋 Files with valid paths but not completed: ${orphanedCount}`);

    // 10. Summary and recommendations
    console.log('\n📋 INVESTIGATION SUMMARY:');
    console.log(`   • Total files in database: ${totalCount}`);
    console.log(`   • Files with errors: ${errorCount}`);
    console.log(`   • Files with missing paths: ${missingPathCount}`);
    console.log(`   • Recent uploads (24h): ${recentCount}`);
    
    if (totalCount < 129) {
      console.log(`\n⚠️  ISSUE DETECTED: Only ${totalCount} files found, expected 129`);
      console.log('   Possible causes:');
      console.log('   1. Some files failed to upload to MinIO');
      console.log('   2. Some files failed to be inserted into database');
      console.log('   3. Permission issues during queue insertion');
      console.log('   4. Network timeouts during bulk upload');
      console.log('\n   Recommendations:');
      console.log('   1. Check server logs for upload errors');
      console.log('   2. Check browser console for network errors');
      console.log('   3. Verify MinIO storage for uploaded files');
      console.log('   4. Check user permissions for UPLOAD_QUEUE_MANAGE');
    } else {
      console.log('\n✅ All 129 files appear to be in the database');
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the investigation
investigateMissingUploads().catch(console.error); 