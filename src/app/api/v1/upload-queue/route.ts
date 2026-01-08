import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyApiToken } from '@/lib/auth';
import { MINIO_PUBLIC_BASE_URL, MINIO_BUCKET } from '@/lib/minio-constants';

export const dynamic = 'force-dynamic';


/**
 * @openapi
 * /api/v1/upload-queue:
 *   get:
 *     summary: Get paginated upload queue (V1 API)
 *     description: Returns a paginated list of upload queue jobs. Requires Bearer token authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page (max 1000)
 *         example: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *         example: 0
 *       - in: query
 *         name: file_name
 *         schema:
 *           type: string
 *         description: Filter by filename (partial match)
 *         example: "resume.pdf"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (queued, inprocess, success, failed)
 *         example: "queued"
 *       - in: query
 *         name: date_start
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: date_end
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *         example: "2024-12-31"
 *       - in: query
 *         name: position_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by position ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Paginated upload queue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       file_name:
 *                         type: string
 *                       file_size:
 *                         type: integer
 *                       status:
 *                         type: string
 *                         enum: [queued, inprocess, success, error, fail]
 *                       source:
 *                         type: string
 *                       upload_id:
 *                         type: string
 *                         format: uuid
 *                       created_by:
 *                         type: string
 *                         format: uuid
 *                       file_path:
 *                         type: string
 *                       url:
 *                         type: string
 *                       position_title:
 *                         type: string
 *                       upload_date:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                   description: Total number of items
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     queued:
 *                       type: integer
 *                     inprocess:
 *                       type: integer
 *                     success:
 *                       type: integer
 *                     error:
 *                       type: integer
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 path:
 *                   type: string
 *                 method:
 *                   type: string
 *                 statusCode:
 *                   type: integer
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: "123e4567-e89b-12d3-a456-426614174000"
 *                       file_name: "resume.pdf"
 *                       file_size: 123456
 *                       status: "queued"
 *                       source: "bulk"
 *                       upload_id: "123e4567-e89b-12d3-a456-426614174001"
 *                       created_by: "123e4567-e89b-12d3-a456-426614174002"
 *                       file_path: "uploads/resume.pdf"
 *                       url: "http://localhost:8621/studio-production/uploads/resume.pdf"
 *                       position_title: "Software Engineer"
 *                       upload_date: "2024-01-01T00:00:00.000Z"
 *                   total: 1
 *                   summary:
 *                     total: 1
 *                     queued: 1
 *                     inprocess: 0
 *                     success: 0
 *                     error: 0
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *                   path: "/api/v1/upload-queue"
 *                   method: "GET"
 *                   statusCode: 200
 *       401:
 *         description: Unauthorized - Invalid or missing Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized - Invalid or expired token"
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify Bearer token authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Unauthorized - Bearer token required' 
      }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = await verifyApiToken(token);
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid or expired token' 
      }, { status: 401 });
    }

    // console.log(`V1 Upload queue accessed by ${user.email}`);

    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const fileName = url.searchParams.get('file_name');
    const status = url.searchParams.get('status');
    const dateStart = url.searchParams.get('date_start');
    const dateEnd = url.searchParams.get('date_end');
    const positionId = url.searchParams.get('position_id');

    // Build dynamic WHERE clause
    const whereClauses = [];
    const values = [];
    let paramIdx = 1;

    if (fileName) {
      whereClauses.push(`file_name ILIKE $${paramIdx++}`);
      values.push(`%${fileName}%`);
    }

    if (status) {
      // Handle status filter (now simplified since we only have 'failed' instead of 'error,fail')
      whereClauses.push(`status = $${paramIdx++}`);
      values.push(status);
    }

    if (dateStart) {
      whereClauses.push(`upload_date >= $${paramIdx++}`);
      values.push(dateStart);
    }

    if (dateEnd) {
      whereClauses.push(`upload_date <= $${paramIdx++}`);
      values.push(dateEnd);
    }

    if (positionId) {
      whereClauses.push(`position_id = $${paramIdx++}`);
      values.push(positionId);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Validate and cap limit to prevent performance issues
    const safeLimit = Math.max(limit, 1); // Minimum 1, no maximum limit
    const safeOffset = Math.max(offset, 0);

    // Add pagination
    values.push(safeLimit);
    values.push(safeOffset);

    const client = await getPool().connect();
    
    try {
      // Get paginated data
      const dataRes = await client.query(
        `SELECT uq.*, p.title as position_title 
         FROM upload_queue uq 
         LEFT JOIN "Position" p ON uq.position_id = p.id 
         ${whereSQL} ORDER BY uq.upload_date DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      // Get total count
      const countRes = await client.query(
        `SELECT COUNT(*) 
         FROM upload_queue uq 
         LEFT JOIN "Position" p ON uq.position_id = p.id 
         ${whereSQL}`,
        values.slice(0, values.length - 2)
      );

      // Get summary counts by status
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

      // Add url field to each job
        const { buildServerFileUrl } = await import('@/lib/fileUrls');
        const jobsWithUrl = await Promise.all(
          dataRes.rows.map(async (job: any) => ({
            ...job,
            url: job.file_path ? await buildServerFileUrl(job.file_path, { strategy: 'stream' }) : null,
          }))
        );

      return NextResponse.json({ 
        data: jobsWithUrl, 
        total, 
        summary: safeSummary,
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
    console.error('V1 Upload queue error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  // SECURITY: Use proper CORS validation instead of wildcard
  const { getAllowedOrigin } = await import('@/lib/cors');
  const allowedOrigin = getAllowedOrigin(request);
  
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  
  return new Response(null, { status: 200, headers });
}
