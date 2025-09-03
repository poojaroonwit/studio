// src/app/api/settings/user-teams/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const userTeamUpdateSchema = z.object({
  name: z.string().min(1, 'Team name cannot be empty.'),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * @openapi
 * /api/settings/user-teams/{id}:
 *   get:
 *     summary: Get a specific user team
 *     description: Returns a specific user team by ID. Requires authentication.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User team details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Team not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update a user team
 *     description: Updates a user team. Requires Admin or USERS_MANAGE permission.
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User team updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: "Forbidden: Insufficient permissions"
 *       404:
 *         description: Team not found
 *   delete:
 *     summary: Delete a user team
 *     description: Deletes a user team. Requires Admin or USERS_MANAGE permission.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User team deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: "Forbidden: Insufficient permissions"
 *       404:
 *         description: Team not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;
  const client = await getPool().connect();
  try {
    // Get user count for this team using direct foreign key
    const result = await client.query(`
      SELECT 
        ut.id,
        ut.name,
        ut.description,
        ut.color,
        ut."isActive",
        ut."createdAt",
        ut."updatedAt",
        COUNT(u.id) as user_count
      FROM "UserTeam" ut
      LEFT JOIN "User" u ON ut.id = u."userTeamId"
      WHERE ut.id = $1
      GROUP BY ut.id, ut.name, ut.description, ut.color, ut."isActive", ut."createdAt", ut."updatedAt"
    `, [id]);

    if (result.rows.length === 0) {
      return new NextResponse('Team not found', { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Failed to fetch user team:", error);
    return NextResponse.json({ message: "Error fetching user team", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  if (!actingUserId) return new NextResponse('Unauthorized', { status: 401 });

  // Check permissions
  if (session?.user?.role !== 'Admin' &&  !session?.user?.modulePermissions?.includes('USERS_MANAGE')) {
    return new NextResponse('Forbidden: Insufficient permissions', { status: 403 });
  }

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = userTeamUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, description, color, isActive } = validation.data;
  const client = await getPool().connect();
  
  try {
    // Check if team exists
    const existingTeam = await client.query('SELECT name FROM "UserTeam" WHERE id = $1', [id]);
    if (existingTeam.rows.length === 0) {
      return new NextResponse('Team not found', { status: 404 });
    }

    const result = await client.query(
      'UPDATE "UserTeam" SET name = $1, description = $2, color = $3, "is_active" = $4, "updatedAt" = NOW() WHERE id = $5 RETURNING *',
      [name, description, color, isActive, id]
    );

    await logAudit('AUDIT', `User team '${name}' updated.`, 'API:UserTeams:Update', actingUserId, { teamId: id });
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Failed to update user team:", error);
    await logAudit('ERROR', `Failed to update team '${name}'. Error: ${error.message}`, 'API:UserTeams:Update', actingUserId, { teamId: id, input: body });
    return NextResponse.json({ message: "Error updating user team", error: error.message }, { status: 500 });
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
  if (session?.user?.role !== 'Admin' &&  !session?.user?.modulePermissions?.includes('USERS_MANAGE')) {
    return new NextResponse('Forbidden: Insufficient permissions', { status: 403 });
  }

  const { id } = await params;
  const client = await getPool().connect();
  try {
    // Check if team exists and get its name
    const existingTeam = await client.query('SELECT name FROM "UserTeam" WHERE id = $1', [id]);
    if (existingTeam.rows.length === 0) {
      return new NextResponse('Team not found', { status: 404 });
    }

    const teamName = existingTeam.rows[0].name;

    // Delete team (cascade will handle User_UserTeam relationships)
    await client.query('DELETE FROM "UserTeam" WHERE id = $1', [id]);

    await logAudit('AUDIT', `User team '${teamName}' deleted.`, 'API:UserTeams:Delete', actingUserId, { teamId: id });
    return new NextResponse('Team deleted successfully', { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete user team:", error);
    await logAudit('ERROR', `Failed to delete team. Error: ${error.message}`, 'API:UserTeams:Delete', actingUserId, { teamId: id });
    return NextResponse.json({ message: "Error deleting user team", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
