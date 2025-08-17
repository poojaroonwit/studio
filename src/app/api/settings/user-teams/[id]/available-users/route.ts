// src/app/api/settings/user-teams/[id]/available-users/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * @openapi
 * /api/settings/user-teams/{id}/available-users:
 *   get:
 *     summary: Get available users for team
 *     description: Returns all users that are not currently members of the specified user team. Requires Admin or USERS_MANAGE permission.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: search
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Search term for filtering users by name or email
 *     responses:
 *       200:
 *         description: List of available users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: "Forbidden: Insufficient permissions"
 *       404:
 *         description: Team not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

  // Check permissions
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE')) {
    return new NextResponse('Forbidden: Insufficient permissions', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  const client = await getPool().connect();
  try {
    // Check if team exists
    const teamExists = await client.query('SELECT id FROM "UserTeam" WHERE id = $1', [params.id]);
    if (teamExists.rows.length === 0) {
      return new NextResponse('Team not found', { status: 404 });
    }

    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u."createdAt"
      FROM "User" u
      WHERE u.id NOT IN (
        SELECT uut."userId" 
        FROM "User_UserTeam" uut 
        WHERE uut."teamId" = $1
      )
    `;
    let queryParams = [params.id];

    if (search) {
      query += ` AND (u.name ILIKE $2 OR u.email ILIKE $2)`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY u.name ASC`;

    const result = await client.query(query, queryParams);

    return NextResponse.json({ users: result.rows });
  } catch (error: any) {
    console.error("Failed to fetch available users:", error);
    return NextResponse.json({ message: "Error fetching available users", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
