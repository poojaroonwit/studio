// src/app/api/settings/user-teams/[id]/members/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

/**
 * @openapi
 * /api/settings/user-teams/{id}/members:
 *   get:
 *     summary: Get team members
 *     description: Returns all users that belong to the specified user team. Requires Admin or USERS_MANAGE permission.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of team members
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
 *   post:
 *     summary: Add user to team
 *     description: Adds a user to the specified user team. Requires Admin or USERS_MANAGE permission.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User added to team
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: "Forbidden: Insufficient permissions"
 *       404:
 *         description: Team or user not found
 *       409:
 *         description: User already in team
 *   delete:
 *     summary: Remove user from team
 *     description: Removes a user from the specified user team. Requires Admin or USERS_MANAGE permission.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: userId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User removed from team
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: "Forbidden: Insufficient permissions"
 *       404:
 *         description: Team or user not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

  // Check permissions
  if (!hasPermission(session.user, 'USERS_MANAGE')) {
    return new NextResponse('Forbidden: Insufficient permissions', { status: 403 });
  }

  const { id } = await params;
  const client = await getPool().connect();
  try {
    // Check if team exists
    const teamExists = await client.query('SELECT id FROM "UserTeam" WHERE id = $1', [id]);
    if (teamExists.rows.length === 0) {
      return new NextResponse('Team not found', { status: 404 });
    }

    const result = await client.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u."createdAt"
      FROM "User" u
      WHERE u."userTeamId" = $1
      ORDER BY u.name ASC
    `, [id]);

    return NextResponse.json({ users: result.rows });
  } catch (error: any) {
    console.error("Failed to fetch team members:", error);
    return NextResponse.json({ message: "Error fetching team members", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  if (!actingUserId) return new NextResponse('Unauthorized', { status: 401 });

  // Check permissions
  if (!hasPermission(session.user, 'USERS_MANAGE')) {
    return new NextResponse('Forbidden: Insufficient permissions', { status: 403 });
  }

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = addMemberSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { userId } = validation.data;
  const client = await getPool().connect();

  try {
    // Check if team exists
    const teamExists = await client.query('SELECT name FROM "UserTeam" WHERE id = $1', [id]);
    if (teamExists.rows.length === 0) {
      return new NextResponse('Team not found', { status: 404 });
    }

    // Check if user exists
    const userExists = await client.query('SELECT name FROM "User" WHERE id = $1', [userId]);
    if (userExists.rows.length === 0) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Check if user is already in the team
    const existingMembership = await client.query(
      'SELECT 1 FROM "User" WHERE id = $1 AND "userTeamId" = $2',
      [userId, id]
    );
    if (existingMembership.rows.length > 0) {
      return new NextResponse('User is already a member of this team', { status: 409 });
    }

    // Add user to team using direct foreign key
    await client.query(
      'UPDATE "User" SET "userTeamId" = $1 WHERE id = $2',
      [id, userId]
    );

    const teamName = teamExists.rows[0].name;
    const userName = userExists.rows[0].name;
    await logAudit('AUDIT', `User '${userName}' added to team '${teamName}'.`, 'API:UserTeams:AddMember', actingUserId, { teamId: id, userId });
    
    return NextResponse.json({ message: 'User added to team successfully' });
  } catch (error: any) {
    console.error("Failed to add user to team:", error);
    await logAudit('ERROR', `Failed to add user to team. Error: ${error.message}`, 'API:UserTeams:AddMember', actingUserId, { teamId: id, userId });
    return NextResponse.json({ message: "Error adding user to team", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  if (!actingUserId) return new NextResponse('Unauthorized', { status: 401 });

  // Check permissions
  if (!hasPermission(session.user, 'USERS_MANAGE')) {
    return new NextResponse('Forbidden: Insufficient permissions', { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new NextResponse('User ID is required', { status: 400 });
  }

  const client = await getPool().connect();
  try {
    // Check if team exists
    const teamExists = await client.query('SELECT name FROM "UserTeam" WHERE id = $1', [id]);
    if (teamExists.rows.length === 0) {
      return new NextResponse('Team not found', { status: 404 });
    }

    // Check if user exists
    const userExists = await client.query('SELECT name FROM "User" WHERE id = $1', [userId]);
    if (userExists.rows.length === 0) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Check if user is in the team
    const existingMembership = await client.query(
      'SELECT 1 FROM "User" WHERE id = $1 AND "userTeamId" = $2',
      [userId, id]
    );
    if (existingMembership.rows.length === 0) {
      return new NextResponse('User is not a member of this team', { status: 404 });
    }

    // Remove user from team using direct foreign key
    await client.query(
      'UPDATE "User" SET "userTeamId" = NULL WHERE id = $1',
      [userId]
    );

    const teamName = teamExists.rows[0].name;
    const userName = userExists.rows[0].name;
    await logAudit('AUDIT', `User '${userName}' removed from team '${teamName}'.`, 'API:UserTeams:RemoveMember', actingUserId, { teamId: id, userId });
    
    return NextResponse.json({ message: 'User removed from team successfully' });
  } catch (error: any) {
    console.error("Failed to remove user from team:", error);
    await logAudit('ERROR', `Failed to remove user from team. Error: ${error.message}`, 'API:UserTeams:RemoveMember', actingUserId, { teamId: id, userId });
    return NextResponse.json({ message: "Error removing user from team", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
