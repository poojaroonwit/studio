// src/app/api/settings/user-groups/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import type { UserGroup, PlatformModuleId } from '@/lib/types';
import { PLATFORM_MODULES } from '@/lib/types';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '../../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

const userGroupSchema = z.object({
  name: z.string().min(1, 'Group name cannot be empty.'),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional(),
});

/**
 * @openapi
 * /api/settings/user-groups:
 *   get:
 *     summary: Get all user groups
 *     description: Returns all user groups. Requires authentication.
 *     responses:
 *       200:
 *         description: List of user groups
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
 *     summary: Create a new user group
 *     description: Creates a new user group. Requires authentication and Admin or USER_GROUPS_MANAGE permission.
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
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *           examples:
 *             example:
 *               summary: Example request
 *               value:
 *                 name: "Recruiters"
 *                 description: "Group for all recruiters"
 *                 permissions: ["CANDIDATES_VIEW", "CANDIDATES_MANAGE"]
 *     responses:
 *       201:
 *         description: User group created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   id: "uuid"
 *                   name: "Recruiters"
 *                   description: "Group for all recruiters"
 *                   permissions: ["CANDIDATES_VIEW", "CANDIDATES_MANAGE"]
 *                   is_default: false
 *                   is_system_role: false
 *                   user_count: 1
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: "Forbidden: Insufficient permissions"
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'Admin' && !session?.user?.modulePermissions?.includes('USER_GROUPS_MANAGE')) {
    await logAudit('WARN', `Forbidden attempt to GET user groups by user ${session?.user?.email || 'Unknown'}.`, 'API:UserGroups:GetAll', session?.user?.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    const result = await getPool().query(`
      SELECT 
        ug.id, 
        ug.name, 
        ug.description, 
        ug.permissions,
        ug."is_default", 
        ug."is_system_role",
        ug."createdAt", 
        ug."updatedAt",
        COUNT(uug."userId")::int as user_count
      FROM "UserGroup" ug
      LEFT JOIN "User_UserGroup" uug ON ug.id = uug."groupId"
      GROUP BY ug.id, ug.name, ug.description, ug.permissions, ug."is_default", ug."is_system_role", ug."createdAt", ug."updatedAt"
      ORDER BY ug."is_system_role" DESC, ug.name ASC
    `);

    const groups: UserGroup[] = result.rows;
    
    // Log all permissions found in the database
    const allDbPermissions = new Set<string>();
    groups.forEach(group => {
      if (group.permissions) {
        group.permissions.forEach(permission => allDbPermissions.add(permission));
      }
    });
    console.log('All permissions found in database:', Array.from(allDbPermissions));
    
    // Check for any permissions in DB that are not in PLATFORM_MODULES
    const platformModuleIds = PLATFORM_MODULES.map(m => m.id);
    const missingPermissions = Array.from(allDbPermissions).filter(permission => !platformModuleIds.includes(permission as PlatformModuleId));
    if (missingPermissions.length > 0) {
      console.warn('Permissions in database not found in PLATFORM_MODULES:', missingPermissions);
    }

    return NextResponse.json(groups, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch user groups:', error);
    await logAudit('ERROR', `Failed to fetch user groups by ${session?.user?.name}. Error: ${(error as Error).message}`, 'API:UserGroups:GetAll', session?.user?.id);
    return NextResponse.json({ message: "Error fetching user groups", error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const actingUserId = session?.user?.id;
    if (!actingUserId) return new NextResponse('Unauthorized', { status: 401 });

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    
    const validation = userGroupSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, description, permissions } = validation.data;
    const newId = uuidv4();
    
    const client = await getPool().connect();
    try {
        // Check if a group with this name already exists
        const existingGroup = await client.query(
            'SELECT id, name FROM "UserGroup" WHERE name = $1',
            [name]
        );
        
        if (existingGroup.rows.length > 0) {
            return NextResponse.json({ 
                message: "A user group with this name already exists", 
                error: "DUPLICATE_NAME",
                existingGroupId: existingGroup.rows[0].id 
            }, { status: 409 });
        }

        const result = await client.query(
            'INSERT INTO "UserGroup" (id, name, description, permissions) VALUES ($1, $2, $3, $4) RETURNING *',
            [newId, name, description, permissions ?? []]
        );
        await logAudit('AUDIT', `User group '${name}' created.`, 'API:UserGroups:Create', actingUserId, { groupId: newId });
        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error: any) {
        console.error("Failed to create user group:", error);
        
        // Handle specific database errors
        let errorMessage = "Error creating user group";
        let statusCode = 500;
        
        if (error.code === '23505' && error.constraint === 'UserGroup_name_key') {
            errorMessage = "A user group with this name already exists";
            statusCode = 409;
        } else if (error.code === '23502') {
            errorMessage = "Required field is missing";
            statusCode = 400;
        } else if (error.code === '23514') {
            errorMessage = "Data validation failed";
            statusCode = 400;
        }
        
        await logAudit('ERROR', `Failed to create group '${name}'. Error: ${error.message}`, 'API:UserGroups:Create', actingUserId, { input: body });
        return NextResponse.json({ 
            message: errorMessage, 
            error: error.message,
            details: error.detail || null
        }, { status: statusCode });
    } finally {
        client.release();
    }
}
