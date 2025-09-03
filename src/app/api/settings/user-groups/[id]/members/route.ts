// src/app/api/settings/user-groups/[id]/members/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';

const addUserToGroupSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

const removeUserFromGroupSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

function extractGroupIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/user-groups\/([^/]+)\/members/);
  return match ? match[1] : null;
}

/**
 * @openapi
 * /api/settings/user-groups/{id}/members:
 *   get:
 *     summary: Get users in a specific group
 *     description: Returns all users that belong to the specified user group. Requires Admin or USER_GROUPS_MANAGE permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user group
 *     responses:
 *       200:
 *         description: List of users in the group
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Group not found
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  const groupId = extractGroupIdFromUrl(request);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, 'USER_GROUPS_VIEW')) {
    await logAudit('WARN', `Forbidden attempt to GET group members (Group ID: ${groupId}) by user ${session.user.email}.`, 'API:UserGroups:GetMembers', session.user.id, { targetGroupId: groupId });
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  if (!groupId) {
    return NextResponse.json({ message: "Invalid group ID" }, { status: 400 });
  }

  const client = await getPool().connect();
  try {
    // First check if the group exists
    const groupCheck = await client.query('SELECT id, name FROM "UserGroup" WHERE id = $1', [groupId]);
    if (groupCheck.rows.length === 0) {
      return NextResponse.json({ message: "User group not found" }, { status: 404 });
    }

    // Get members of this group using direct foreign key
    const result = await client.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u."avatar_url",
        u."personal_color",
        u."created_at"
      FROM "User" u
      WHERE u."userGroupId" = $1
      ORDER BY u.name ASC
    `, [groupId]);

    return NextResponse.json({ 
      users: result.rows,
      group: {
        id: groupCheck.rows[0].id,
        name: groupCheck.rows[0].name
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error(`Failed to fetch group members for group ${groupId}:`, error);
    await logAudit('ERROR', `Failed to fetch group members (Group ID: ${groupId}) by ${session.user.name}. Error: ${error.message}`, 'API:UserGroups:GetMembers', session.user.id, { targetGroupId: groupId });
    return NextResponse.json({ message: "Error fetching group members", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * @openapi
 * /api/settings/user-groups/{id}/members:
 *   post:
 *     summary: Add a user to a group
 *     description: Adds a user to the specified user group. Requires Admin or USER_GROUPS_MANAGE permission.
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
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: User added to group successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Group or user not found
 *       409:
 *         description: User already in group
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  const groupId = extractGroupIdFromUrl(request);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, 'USER_GROUPS_EDIT')) {
    await logAudit('WARN', `Forbidden attempt to add user to group (Group ID: ${groupId}) by user ${session.user.email}.`, 'API:UserGroups:AddMember', session.user.id, { targetGroupId: groupId });
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  if (!groupId) {
    return NextResponse.json({ message: "Invalid group ID" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = addUserToGroupSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { userId } = validation.data;
  const client = await getPool().connect();

  try {
    // Check if group exists
    const groupCheck = await client.query('SELECT id, name FROM "UserGroup" WHERE id = $1', [groupId]);
    if (groupCheck.rows.length === 0) {
      return NextResponse.json({ message: "User group not found" }, { status: 404 });
    }

    // Check if user exists
    const userCheck = await client.query('SELECT id, name FROM "User" WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if user is already in the group using direct foreign key
    const existingMembership = await client.query(
      'SELECT id FROM "User" WHERE id = $1 AND "userGroupId" = $2',
      [userId, groupId]
    );

    if (existingMembership.rows.length > 0) {
      return NextResponse.json({ message: "User is already a member of this group" }, { status: 409 });
    }

    // Add user to group using direct foreign key
    await client.query(
      'UPDATE "User" SET "userGroupId" = $1 WHERE id = $2',
      [groupId, userId]
    );

    await logAudit('AUDIT', `User '${userCheck.rows[0].name}' added to group '${groupCheck.rows[0].name}' by ${session.user.name}.`, 'API:UserGroups:AddMember', session.user.id, { targetGroupId: groupId, targetUserId: userId });

    return NextResponse.json({ 
      message: "User added to group successfully",
      user: {
        id: userCheck.rows[0].id,
        name: userCheck.rows[0].name
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error(`Failed to add user ${userId} to group ${groupId}:`, error);
    await logAudit('ERROR', `Failed to add user to group (Group ID: ${groupId}, User ID: ${userId}) by ${session.user.name}. Error: ${error.message}`, 'API:UserGroups:AddMember', session.user.id, { targetGroupId: groupId, targetUserId: userId });
    return NextResponse.json({ message: "Error adding user to group", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * @openapi
 * /api/settings/user-groups/{id}/members:
 *   delete:
 *     summary: Remove a user from a group
 *     description: Removes a user from the specified user group. Requires Admin or USER_GROUPS_MANAGE permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user group
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the user to remove
 *     responses:
 *       200:
 *         description: User removed from group successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Group or user not found
 *       500:
 *         description: Server error
 */
export async function DELETE(request: NextRequest) {
  const groupId = extractGroupIdFromUrl(request);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, 'USER_GROUPS_EDIT')) {
    await logAudit('WARN', `Forbidden attempt to remove user from group (Group ID: ${groupId}) by user ${session.user.email}.`, 'API:UserGroups:RemoveMember', session.user.id, { targetGroupId: groupId, targetUserId: userId });
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  if (!groupId || !userId) {
    return NextResponse.json({ message: "Invalid group ID or user ID" }, { status: 400 });
  }

  const client = await getPool().connect();

  try {
    // Check if group exists
    const groupCheck = await client.query('SELECT id, name FROM "UserGroup" WHERE id = $1', [groupId]);
    if (groupCheck.rows.length === 0) {
      return NextResponse.json({ message: "User group not found" }, { status: 404 });
    }

    // Check if user exists
    const userCheck = await client.query('SELECT id, name FROM "User" WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if user is in the group using direct foreign key
    const existingMembership = await client.query(
      'SELECT id FROM "User" WHERE id = $1 AND "userGroupId" = $2',
      [userId, groupId]
    );

    if (existingMembership.rows.length === 0) {
      return NextResponse.json({ message: "User is not a member of this group" }, { status: 404 });
    }

    // Remove user from group using direct foreign key
    await client.query(
      'UPDATE "User" SET "userGroupId" = NULL WHERE id = $1',
      [userId]
    );

    await logAudit('AUDIT', `User '${userCheck.rows[0].name}' removed from group '${groupCheck.rows[0].name}' by ${session.user.name}.`, 'API:UserGroups:RemoveMember', session.user.id, { targetGroupId: groupId, targetUserId: userId });

    return NextResponse.json({ 
      message: "User removed from group successfully",
      user: {
        id: userCheck.rows[0].id,
        name: userCheck.rows[0].name
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error(`Failed to remove user ${userId} from group ${groupId}:`, error);
    await logAudit('ERROR', `Failed to remove user from group (Group ID: ${groupId}, User ID: ${userId}) by ${session.user.name}. Error: ${error.message}`, 'API:UserGroups:RemoveMember', session.user.id, { targetGroupId: groupId, targetUserId: userId });
    return NextResponse.json({ message: "Error removing user from group", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
