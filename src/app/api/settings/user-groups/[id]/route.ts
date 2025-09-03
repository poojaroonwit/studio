// src/app/api/settings/user-groups/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import type { UserGroup, PlatformModuleId } from '@/lib/types';
import { PLATFORM_MODULES } from '@/lib/types';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '../../../../../lib/db';

const platformModuleIds = PLATFORM_MODULES.map(m => m.id);

// Test specific permissions from the error message
const errorPermissions = [
  'CANDIDATES_VIEW', 'CANDIDATES_VIEW_DETAILED', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC', 
  'CANDIDATES_EDIT_SENSITIVE', 'CANDIDATES_DELETE', 'CANDIDATES_RESUMES_UPLOAD', 'CANDIDATES_RESUMES_DELETE',
  'REPORTS_GENERATE', 'WEBHOOK_ANALYTICS_VIEW', 'LOGS_VIEW', 'LOGS_EXPORT', 'APP_PERFORMANCE_VIEW',
  'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'TASK_BOARD_MANAGE_ALL', 'JOB_MATCH_VIEW', 
  'JOB_MATCH_MANAGE', 'WARNING_CONFIGURATIONS_VIEW', 'WARNING_CONFIGURATIONS_MANAGE',
  'USER_PREFERENCES_MANAGE_OWN', 'USER_PREFERENCES_MANAGE_ALL'
];

const missingFromError = errorPermissions.filter(perm => !platformModuleIds.includes(perm));

const updateGroupFormSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional(),
  is_default: z.boolean().optional(),
});

const userGroupUpdateSchema = z.object({
  name: z.string().min(1, 'Group name cannot be empty.').optional(),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional(),
  is_default: z.boolean().optional(),
});

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/user-groups\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * @openapi
 * /api/settings/user-groups/{id}:
 *   get:
 *     summary: Get a user group by ID
 *     description: Returns a single user group. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user group
 *     responses:
 *       200:
 *         description: User group found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  const id = extractIdFromUrl(request);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, 'USER_GROUPS_VIEW')) {
    await logAudit('WARN', `Forbidden attempt to GET user group (ID: ${id}) by user ${session?.user?.email || 'Unknown'}.`, 'API:UserGroups:GetById', session?.user?.id, { targetGroupId: id });
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    const groupResult = await getPool().query(`
      SELECT 
        ug.id, 
        ug.name, 
        ug.description, 
        ug.permissions,
        ug."is_default" as "isDefault", 
        ug."is_system_role" as "isSystemRole",
        ug."createdAt", 
        ug."updatedAt",
        COUNT(u.id)::int as user_count
      FROM "UserGroup" ug
      LEFT JOIN "User" u ON ug.id = u."userGroupId"
      WHERE ug.id = $1
      GROUP BY ug.id, ug.name, ug.description, ug.permissions, ug."is_default", ug."is_system_role", ug."createdAt", ug."updatedAt"
    `, [id]);

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ message: "User group (role) not found" }, { status: 404 });
    }
    const group: UserGroup = groupResult.rows[0];
    


    return NextResponse.json(group, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch user group (role) ${id}:`, error);
    await logAudit('ERROR', `Failed to fetch user group (role) (ID: ${id}) by ${session?.user?.name}. Error: ${(error as Error).message}`, 'API:UserGroups:GetById', session?.user?.id, { targetGroupId: id });
    return NextResponse.json({ message: "Error fetching user group (role)", error: (error as Error).message }, { status: 500 });
  }
}

/**
 * @openapi
 * /api/settings/user-groups/{id}:
 *   put:
 *     summary: Update a user group by ID
 *     description: Updates a user group. Requires Admin or USER_GROUPS_MANAGE permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user group
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: User group updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
export async function PUT(request: NextRequest) {
    const id = extractIdFromUrl(request);
    const session = await getServerSession(authOptions);
    const actingUserId = session?.user?.id;
    if (!actingUserId) return new NextResponse('Unauthorized', { status: 401 });

    // Check permissions - only Admin or users with USER_GROUPS_EDIT can update user groups
    if (!hasPermission(session.user, 'USER_GROUPS_EDIT')) {
        await logAudit('WARN', `Forbidden attempt to UPDATE user group (ID: ${id}) by user ${session?.user?.email || 'Unknown'}.`, 'API:UserGroups:Update', session?.user?.id, { targetGroupId: id });
        return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    let body;
    try {
        body = await request.json();
        console.log('PUT /api/settings/user-groups/[id] - Received body:', JSON.stringify(body, null, 2));
    } catch (e) {
        console.error('PUT /api/settings/user-groups/[id] - JSON parse error:', e);
        return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    

    
    const validation = userGroupUpdateSchema.safeParse(body);
    if (!validation.success) {
        console.error('PUT /api/settings/user-groups/[id] - Validation error:', validation.error.flatten().fieldErrors);
        return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const fields = validation.data;
    
    // Validate permissions if provided
    if (fields.permissions && Array.isArray(fields.permissions)) {
        console.log('PUT /api/settings/user-groups/[id] - Validating permissions:', {
            receivedPermissions: fields.permissions.length > 20 ? `${fields.permissions.slice(0, 20).join(', ')}... (${fields.permissions.length} total)` : fields.permissions,
            totalReceived: fields.permissions.length,
            permissionsType: typeof fields.permissions,
            isArray: Array.isArray(fields.permissions),
            samplePermission: fields.permissions[0],
            samplePermissionType: typeof fields.permissions[0]
        });
        
        const invalidPermissions = fields.permissions.filter(permission => !platformModuleIds.includes(permission));
        console.log('PUT /api/settings/user-groups/[id] - Invalid permissions found:', invalidPermissions);
        
        if (invalidPermissions.length > 0) {
            console.error('PUT /api/settings/user-groups/[id] - Invalid permissions:', invalidPermissions);
            console.error('PUT /api/settings/user-groups/[id] - Valid permissions available:', platformModuleIds.slice(0, 20));
            return NextResponse.json({ 
                message: 'Invalid permissions provided', 
                errors: { permissions: [`Invalid permissions: ${invalidPermissions.join(', ')}`] } 
            }, { status: 400 });
        }
    }

    
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ message: "No fields to update provided." }, { status: 400 });
    }

    const client = await getPool().connect();
    try {
        // If setting this role as default, first reset all other roles' is_default to false
        if (fields.is_default === true) {
            console.log('PUT /api/settings/user-groups/[id] - Setting role as default, resetting other roles...');
            await client.query('UPDATE "UserGroup" SET "is_default" = false, "updatedAt" = NOW() WHERE id != $1', [id]);
        }

        const setClauses = Object.keys(fields).map((key, index) => `"${key}" = $${index + 1}`);
        const queryParams = Object.values(fields);
        
        const query = `
            UPDATE "UserGroup" 
            SET ${setClauses.join(', ')}, "updatedAt" = NOW() 
            WHERE id = $${queryParams.length + 1}
            RETURNING *;
        `;
        const result = await client.query(query, [...queryParams, id]);

        if (result.rowCount === 0) {
            return NextResponse.json({ message: "User group not found" }, { status: 404 });
        }
        
        await logAudit('AUDIT', `User group '${result.rows[0].name}' updated.`, 'API:UserGroups:Update', actingUserId, { groupId: id, changes: fields });
        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        console.error(`Failed to update user group ${id}:`, error);
        await logAudit('ERROR', `Failed to update user group (ID: ${id}). Error: ${error.message}`, 'API:UserGroups:Update', actingUserId, { groupId: id, input: body });
        return NextResponse.json({ message: "Error updating user group", error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}

/**
 * @openapi
 * /api/settings/user-groups/{id}:
 *   delete:
 *     summary: Delete a user group by ID
 *     description: Deletes a user group. Requires Admin or USER_GROUPS_DELETE permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user group
 *     responses:
 *       200:
 *         description: User group deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
export async function DELETE(request: NextRequest) {
    const id = extractIdFromUrl(request);
    const session = await getServerSession(authOptions);
    const actingUserId = session?.user?.id;
    if (!actingUserId) return new NextResponse('Unauthorized', { status: 401 });
    
    // Check permissions - only Admin or users with USER_GROUPS_DELETE can delete user groups
    if (!hasPermission(session.user, 'USER_GROUPS_DELETE')) {
        await logAudit('WARN', `Forbidden attempt to DELETE user group (ID: ${id}) by user ${session?.user?.email || 'Unknown'}.`, 'API:UserGroups:Delete', session?.user?.id, { targetGroupId: id });
        return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
    }
    
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        // Remove users from this group by setting userGroupId to NULL
        await client.query('UPDATE "User" SET "userGroupId" = NULL WHERE "userGroupId" = $1', [id]);
        const result = await client.query('DELETE FROM "UserGroup" WHERE id = $1 RETURNING name', [id]);
        
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ message: "User group not found" }, { status: 404 });
        }
        
        await client.query('COMMIT');
        
        await logAudit('AUDIT', `User group '${result.rows[0].name}' deleted.`, 'API:UserGroups:Delete', actingUserId, { groupId: id });
        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`Failed to delete user group ${id}:`, error);
        await logAudit('ERROR', `Failed to delete user group (ID: ${id}). Error: ${error.message}`, 'API:UserGroups:Delete', actingUserId, { groupId: id });
        return NextResponse.json({ message: "Error deleting user group", error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
