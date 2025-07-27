import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSystemSetting } from '@/lib/settings';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const client = await getPool().connect();
    
    try {
      // Get current queue status
      const statusRes = await client.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM upload_queue 
        GROUP BY status 
        ORDER BY status
      `);
      
      // Get max concurrent setting
      let maxConcurrent = 5;
      try {
        const setting = await getSystemSetting('maxConcurrentProcessors');
        if (setting && !isNaN(Number(setting))) {
          maxConcurrent = Number(setting);
        }
      } catch (e) {
        // fallback to default
      }
      
      // Get detailed in-process jobs
      const inProcessRes = await client.query(`
        SELECT 
          id,
          file_name,
          upload_date,
          process_date,
          updated_at
        FROM upload_queue 
        WHERE status = 'inprocess'
        ORDER BY process_date ASC
      `);
      
      // Get recent activity
      const recentRes = await client.query(`
        SELECT 
          id,
          file_name,
          status,
          upload_date,
          process_date,
          completed_date,
          updated_at
        FROM upload_queue 
        ORDER BY updated_at DESC
        LIMIT 10
      `);
      
      const statusCounts = statusRes.rows.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {});
      
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        maxConcurrent,
        currentInProcess: statusCounts.inprocess || 0,
        statusCounts,
        inProcessJobs: inProcessRes.rows,
        recentActivity: recentRes.rows,
        isOverLimit: (statusCounts.inprocess || 0) > maxConcurrent
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error getting upload queue status:', error);
    return NextResponse.json(
      { error: 'Failed to get upload queue status' },
      { status: 500 }
    );
  }
} 