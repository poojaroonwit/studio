// src/app/api/settings/user-teams/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const userTeamSchema = z.object({
  name: z.string().min(1, 'Team name cannot be empty.'),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

/**
 * @openapi
 * /api/settings/user-teams:
 *   get:
 *     summary: Get all user teams
 *     description: Returns all user teams. Requires authentication.
 *     responses:
 *       200:
 *         description: List of user teams
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new user team
 *     description: Creates a new user team. Requires authentication and Admin or USERS_MANAGE permission.
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
 *           examples:
 *             example:
 *               summary: Example request
 *               value:
 *                 name: "Engineering Team"
 *                 description: "Software engineering team"
 *                 color: "#3B82F6"
 *                 isActive: true
 *     responses:
 *       201:
 *         description: User team created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   id: "uuid"
 *                   name: "Engineering Team"
 *                   description: "Software engineering team"
 *                   color: "#3B82F6"
 *                   isActive: true
 *                   member_count: 0
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: "Forbidden: Insufficient permissions"
 */
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

    const client = await getPool().connect();
    try {
        // Get user count for each team using direct foreign key
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
          GROUP BY ut.id, ut.name, ut.description, ut.color, ut."isActive", ut."createdAt", ut."updatedAt"
          ORDER BY ut.name
        `);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error("Failed to fetch user teams:", error);
        return NextResponse.json({ message: "Error fetching user teams", error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const actingUserId = session?.user?.id;
    if (!actingUserId) return new NextResponse('Unauthorized', { status: 401 });

    // Check permissions
    if (session?.user?.role !== 'Admin' &&  !session?.user?.modulePermissions?.includes('USERS_MANAGE')) {
        return new NextResponse('Forbidden: Insufficient permissions', { status: 403 });
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    
    const validation = userTeamSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, description, color, isActive } = validation.data;
    const newId = uuidv4();
    
    const client = await getPool().connect();
    try {
        const result = await client.query(
            'INSERT INTO "UserTeam" (id, name, description, color, "is_active") VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [newId, name, description, color, isActive]
        );
        await logAudit('AUDIT', `User team '${name}' created.`, 'API:UserTeams:Create', actingUserId, { teamId: newId });
        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error: any) {
        console.error("Failed to create user team:", error);
        await logAudit('ERROR', `Failed to create team '${name}'. Error: ${error.message}`, 'API:UserTeams:Create', actingUserId, { input: body });
        return NextResponse.json({ message: "Error creating user team", error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
