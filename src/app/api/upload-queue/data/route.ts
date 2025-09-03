import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    
    // Get query parameters
    const fileName = url.searchParams.get('file_name') || url.searchParams.get('filter') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const dateStart = url.searchParams.get('date_start') || url.searchParams.get('dateRangeStart') || undefined;
    const dateEnd = url.searchParams.get('date_end') || url.searchParams.get('dateRangeEnd') || undefined;
    const positionId = url.searchParams.get('position_id') || url.searchParams.get('positionId') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || url.searchParams.get('pageSize') || '20', 10);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const offset = parseInt(url.searchParams.get('offset') || String((page - 1) * limit), 10);

    // Use connection pool efficiently
    const pool = getPool();
    const client = await pool.connect();

    try {
      // Build WHERE clause
      const whereClauses = [];
      const values = [];
      let paramIdx = 1;
      
      if (fileName) {
        whereClauses.push(`uq.file_name ILIKE $${paramIdx++}`);
        values.push(`%${fileName}%`);
      }
      if (status) {
        const statusCodes = status.split(',').map((s: string) => s.trim());
        if (statusCodes.length === 1) {
          whereClauses.push(`uq.status = $${paramIdx++}`);
          values.push(status);
        } else {
          const placeholders = statusCodes.map(() => `$${paramIdx++}`).join(', ');
          whereClauses.push(`uq.status IN (${placeholders})`);
          values.push(...statusCodes);
        }
      }
      if (dateStart) {
        whereClauses.push(`uq.upload_date >= $${paramIdx++}`);
        values.push(dateStart);
      }
      if (dateEnd) {
        whereClauses.push(`uq.upload_date <= $${paramIdx++}`);
        values.push(dateEnd);
      }
      if (positionId) {
        whereClauses.push(`uq.position_id = $${paramIdx++}`);
        values.push(positionId);
      }
      
      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      
      // Validate pagination parameters (no upper limit on records)
      const safeLimit = Math.max(limit, 1); // Minimum 1, no maximum limit
      const safeOffset = Math.max(offset, 0);
      
      values.push(safeLimit, safeOffset);
      
      // Get upload queue data
      const res = await client.query(
        `SELECT uq.*, p.title as position_title 
         FROM upload_queue uq 
         LEFT JOIN "Position" p ON uq.position_id = p.id 
         ${whereSQL} ORDER BY uq.upload_date DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );
      
      // Get count
      const countRes = await client.query(
        `SELECT COUNT(*) 
         FROM upload_queue uq 
         LEFT JOIN "Position" p ON uq.position_id = p.id 
         ${whereSQL}`,
        values.slice(0, values.length - 2)
      );
      
      // Get summary
      const summaryRes = await client.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE uq.status = 'queued') as queued,
          COUNT(*) FILTER (WHERE uq.status = 'inprocess') as inprocess,
          COUNT(*) FILTER (WHERE uq.status = 'success') as success,
          COUNT(*) FILTER (WHERE uq.status = 'failed') as error
        FROM upload_queue uq 
        LEFT JOIN "Position" p ON uq.position_id = p.id 
        ${whereSQL}`,
        values.slice(0, values.length - 2)
      );
      
      const summary = summaryRes.rows[0];
      const safeSummary = {
        total: Number(summary.total) || 0,
        queued: Number(summary.queued) || 0,
        inprocess: Number(summary.inprocess) || 0,
        success: Number(summary.success) || 0,
        error: Number(summary.error) || 0,
      };
      
      const total = Number(countRes.rows[0]?.count) || 0;
      
      return NextResponse.json({
        jobs: res.rows,
        total,
        summary: safeSummary,
        statusSummary: safeSummary,
        pagination: {
          page: Math.floor(safeOffset / safeLimit) + 1,
          limit: safeLimit,
          offset: safeOffset,
          totalPages: Math.ceil(total / safeLimit),
          hasNextPage: safeOffset + safeLimit < total,
          hasPrevPage: safeOffset > 0
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('[UPLOAD QUEUE DATA] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upload queue data' },
      { status: 500 }
    );
  }
}
