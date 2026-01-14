import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
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
      // Use parameterized queries with NULL-coalescing pattern to avoid SQL injection
      // All filter values are passed as parameters - when a parameter is NULL, the condition is bypassed
      const values: (string | number | null)[] = [];
      let paramIdx = 1;

      // Build parameter indices
      const fileNameIdx = paramIdx++;
      const statusIdx = paramIdx++;  // For single status or first status in array
      const dateStartIdx = paramIdx++;
      const dateEndIdx = paramIdx++;
      const positionIdx = paramIdx++;

      // Handle status - split if comma-separated, but limit to prevent abuse
      const statusCodes = status ? status.split(',').map(s => s.trim()).slice(0, 10) : [];

      // Validate pagination parameters (no upper limit on records)
      const safeLimit = Math.max(limit, 1); // Minimum 1, no maximum limit
      const safeOffset = Math.max(offset, 0);

      // For query with pagination
      const limitIdx = paramIdx++;
      const offsetIdx = paramIdx++;

      // Build values array - use NULL for missing filter parameters
      values.push(fileName ? `%${fileName}%` : null);  // fileNameIdx
      values.push(statusCodes.length > 0 ? statusCodes[0] : null);  // statusIdx (first status)
      values.push(dateStart || null);  // dateStartIdx
      values.push(dateEnd || null);  // dateEndIdx
      values.push(positionId || null);  // positionIdx
      values.push(safeLimit);  // limitIdx
      values.push(safeOffset);  // offsetIdx

      // Fixed WHERE clause using NULL-coalescing pattern
      // When parameter is NULL, the condition (param IS NULL OR ...) evaluates to TRUE, effectively skipping that filter
      const whereClause = `WHERE 
        ($${fileNameIdx} IS NULL OR uq.file_name ILIKE $${fileNameIdx})
        AND ($${statusIdx} IS NULL OR uq.status = $${statusIdx}${statusCodes.length > 1 ? ` OR uq.status = ANY($${paramIdx})` : ''})
        AND ($${dateStartIdx} IS NULL OR uq.upload_date >= $${dateStartIdx})
        AND ($${dateEndIdx} IS NULL OR uq.upload_date <= $${dateEndIdx})
        AND ($${positionIdx} IS NULL OR uq.position_id = $${positionIdx})`;

      // If we have multiple status codes, add them as an array parameter
      const queryValues = statusCodes.length > 1 ? [...values, statusCodes] : values;
      const countValues = statusCodes.length > 1
        ? [...values.slice(0, -2), statusCodes]
        : values.slice(0, -2);

      // Get upload queue data - fixed query structure, no string interpolation from user input
      const res = await client.query(
        `SELECT uq.*, p.title as position_title 
         FROM upload_queue uq 
         LEFT JOIN "Position" p ON uq.position_id = p.id 
         ${whereClause} ORDER BY uq.upload_date DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        queryValues
      );

      // Get count
      const countRes = await client.query(
        `SELECT COUNT(*) 
         FROM upload_queue uq 
         LEFT JOIN "Position" p ON uq.position_id = p.id 
         ${whereClause}`,
        countValues
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
        ${whereClause}`,
        countValues
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
