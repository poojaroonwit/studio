import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyApiToken } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { handleCors } from '@/lib/cors';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createForbiddenError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';

/**
 * @openapi
 * /api/v1/logs:
 *   get:
 *     summary: Get system logs (V1 API)
 *     description: Returns a paginated list of system logs. Requires Bearer token authentication and Admin role or LOGS_VIEW permission.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [info, warning, error]
 *         description: Filter logs by level
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs until this date (YYYY-MM-DD)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter logs by user ID
 *     responses:
 *       200:
 *         description: Paginated logs
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
 *                       level:
 *                         type: string
 *                         enum: [info, warning, error]
 *                       message:
 *                         type: string
 *                       details:
 *                         type: object
 *                       userId:
 *                         type: string
 *                         format: uuid
 *                       userName:
 *                         type: string
 *                       actionType:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
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
 *                       level: "info"
 *                       message: "User logged in successfully"
 *                       details: { ip: "192.168.1.1" }
 *                       userId: "123e4567-e89b-12d3-a456-426614174001"
 *                       userName: "Sample User"
 *                       actionType: "LOGIN"
 *                       createdAt: "2024-01-01T00:00:00.000Z"
 *                   pagination:
 *                     page: 1
 *                     limit: 20
 *                     total: 100
 *                     totalPages: 5
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *                   path: "/api/v1/logs"
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
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden - Insufficient permissions to view logs"
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = token ? await verifyApiToken(token) : null;
    
    if (!user) {
      return handleApiError(req, createUnauthorizedError('Authentication required'));
    }

    // Check permissions
    if (!hasPermission(user, 'LOGS_VIEW')) {
      return handleApiError(req, createForbiddenError('Insufficient permissions to view logs'));
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const level = searchParams.get('level');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const offset = (page - 1) * limit;

    const client = await getPool().connect();
    try {
      // Build WHERE clause
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (level) {
        whereConditions.push(`level = $${paramIndex++}`);
        queryParams.push(level);
      }

      if (startDate) {
        whereConditions.push(`created_at >= $${paramIndex++}`);
        queryParams.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`created_at <= $${paramIndex++}`);
        queryParams.push(endDate + ' 23:59:59');
      }

      if (userId) {
        whereConditions.push(`user_id = $${paramIndex++}`);
        queryParams.push(userId);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM "AuditLog" ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Get logs
      const logsQuery = `
        SELECT 
          id,
          level,
          message,
          details,
          user_id as "userId",
          user_name as "userName",
          action_type as "actionType",
          created_at as "createdAt"
        FROM "AuditLog"
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      queryParams.push(limit, offset);
      const logsResult = await client.query(logsQuery, queryParams);

      const logs = logsResult.rows.map((row: any) => ({
        id: row.id,
        level: row.level,
        message: row.message,
        details: row.details,
        userId: row.userId,
        userName: row.userName,
        actionType: row.actionType,
        createdAt: row.createdAt
      }));

      const response = {
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      return createSuccessResponse(req, response, 200);
    } finally {
      client.release();
    }

  } catch (error) {
    return handleApiError(req, createInternalServerError('Failed to fetch logs', { 
      originalError: (error as Error).message 
    }));
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
}
