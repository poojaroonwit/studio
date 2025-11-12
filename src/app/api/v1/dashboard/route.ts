import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';

/**
 * @openapi
 * /api/v1/dashboard:
 *   get:
 *     summary: Get dashboard statistics (V1 API)
 *     description: Returns dashboard statistics and metrics. Requires Bearer token authentication.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     candidates:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         new:
 *                           type: integer
 *                         inProgress:
 *                           type: integer
 *                         hired:
 *                           type: integer
 *                         rejected:
 *                           type: integer
 *                     positions:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         open:
 *                           type: integer
 *                         closed:
 *                           type: integer
 *                     applications:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         thisMonth:
 *                           type: integer
 *                         lastMonth:
 *                           type: integer
 *                     recruiters:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           type:
 *                             type: string
 *                           message:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           userId:
 *                             type: string
 *                             format: uuid
 *                           userName:
 *                             type: string
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
 *                     candidates:
 *                       total: 150
 *                       new: 25
 *                       inProgress: 45
 *                       hired: 15
 *                       rejected: 65
 *                     positions:
 *                       total: 25
 *                       open: 18
 *                       closed: 7
 *                     applications:
 *                       total: 300
 *                       thisMonth: 45
 *                       lastMonth: 38
 *                     recruiters:
 *                       total: 8
 *                       active: 6
 *                     recentActivity:
 *                       - id: "123e4567-e89b-12d3-a456-426614174000"
 *                         type: "candidate_created"
 *                         message: "New candidate Sample Candidate added"
 *                         timestamp: "2024-01-01T00:00:00.000Z"
 *                         userId: "123e4567-e89b-12d3-a456-426614174001"
 *                         userName: "Jane Smith"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *                   path: "/api/v1/dashboard"
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
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = token ? await verifyApiToken(token) : null;
    
    if (!user) {
      return handleApiError(req, createUnauthorizedError('Authentication required'));
    }

    const client = await getPool().connect();
    try {
      // Get candidate statistics
      const candidateStats = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'new' THEN 1 END) as new,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as inProgress,
          COUNT(CASE WHEN status = 'hired' THEN 1 END) as hired,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
        FROM "Candidate"
      `);

      // Get position statistics
      const positionStats = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "isOpen" = true THEN 1 END) as open,
          COUNT(CASE WHEN "isOpen" = false THEN 1 END) as closed
        FROM "Position"
      `);

      // Get application statistics
      const applicationStats = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "applicationDate" >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as thisMonth,
          COUNT(CASE WHEN "applicationDate" >= CURRENT_DATE - INTERVAL '60 days' AND "applicationDate" < CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as lastMonth
        FROM "Candidate"
      `);

      // Get recruiter statistics
      const recruiterStats = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "isActive" = true THEN 1 END) as active
        FROM "User"
        WHERE role = 'Recruiter'
      `);

      // Get recent activity (last 10 activities)
      const recentActivity = await client.query(`
        SELECT 
          id,
          action_type as type,
          message,
          created_at as timestamp,
          user_id as "userId",
          user_name as "userName"
        FROM "AuditLog"
        ORDER BY created_at DESC
        LIMIT 10
      `);

      const dashboardData = {
        candidates: {
          total: parseInt(candidateStats.rows[0]?.total || '0', 10),
          new: parseInt(candidateStats.rows[0]?.new || '0', 10),
          inProgress: parseInt(candidateStats.rows[0]?.inProgress || '0', 10),
          hired: parseInt(candidateStats.rows[0]?.hired || '0', 10),
          rejected: parseInt(candidateStats.rows[0]?.rejected || '0', 10)
        },
        positions: {
          total: parseInt(positionStats.rows[0]?.total || '0', 10),
          open: parseInt(positionStats.rows[0]?.open || '0', 10),
          closed: parseInt(positionStats.rows[0]?.closed || '0', 10)
        },
        applications: {
          total: parseInt(applicationStats.rows[0]?.total || '0', 10),
          thisMonth: parseInt(applicationStats.rows[0]?.thisMonth || '0', 10),
          lastMonth: parseInt(applicationStats.rows[0]?.lastMonth || '0', 10)
        },
        recruiters: {
          total: parseInt(recruiterStats.rows[0]?.total || '0', 10),
          active: parseInt(recruiterStats.rows[0]?.active || '0', 10)
        },
        recentActivity: recentActivity.rows.map((row: any) => ({
          id: row.id,
          type: row.type,
          message: row.message,
          timestamp: row.timestamp,
          userId: row.userId,
          userName: row.userName
        }))
      };

      return createSuccessResponse(req, dashboardData, 200);
    } finally {
      client.release();
    }

  } catch (error) {
    return handleApiError(req, createInternalServerError('Failed to fetch dashboard data', { 
      originalError: (error as Error).message 
    }));
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
}
