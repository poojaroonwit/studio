// src/app/api/users/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions, clearUserValidationCache } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasAnyPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';


const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("A valid email is required").optional(),
  role: z.enum(['Admin', 'Recruiter', 'Hiring Manager']).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  authenticationMethod: z.enum(['basic', 'azure']).optional(),
  forcePasswordChange: z.boolean().optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional().or(z.literal("")),
  // modulePermissions removed - permissions come from UserGroup based on role
  userTeamIds: z.array(z.string().uuid()).optional(),
  userGroupIds: z.array(z.string().uuid()).optional(),
  avatarUrl: z.string().optional(),
  personalColor: z.string().optional(),
});

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/users\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
export async function GET(request: NextRequest) {
    const id = extractIdFromUrl(request);
    if (!id) {
        return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }
    
    // SECURITY: Validate UUID format to prevent injection attacks
    const { validateUuid } = await import('@/lib/security');
    if (!validateUuid(id)) {
        console.error('[SECURITY] Invalid UUID format in users GET request:', id);
        return NextResponse.json({ message: "Invalid user ID format" }, { status: 400 });
    }
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                personalColor: true,
                authenticationMethod: true,
                forcePasswordChange: true,
                createdAt: true,
                updatedAt: true,
                userGroupId: true,
                userTeamId: true,
            }
        });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Fetch user groups and teams using direct foreign keys
        const userGroup = user.userGroupId ? await prisma.userGroup.findUnique({
          where: { id: user.userGroupId },
          select: { id: true, name: true, permissions: true }
        }) : null;
        
        const userTeam = user.userTeamId ? await prisma.userTeam.findUnique({
          where: { id: user.userTeamId },
          select: { id: true, name: true, color: true }
        }) : null;

        const userToReturn = {
          ...user,
          teams: userTeam ? [userTeam] : [],
          modulePermissions: userGroup?.permissions || [],
        };

        return NextResponse.json(userToReturn, { status: 200 });
    } catch (error: any) {
        console.error(`Failed to fetch user ${id}:`, error);
        // SECURITY: Never expose detailed error messages in production
        const isDevelopment = process.env.NODE_ENV === 'development';
        return NextResponse.json({ 
            message: "Error fetching user", 
            ...(isDevelopment && { error: error.message })
        }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     summary: Update a user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
export async function PUT(request: NextRequest) {
    const id = extractIdFromUrl(request);
    if (!id) {
        return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }
    
    // SECURITY: Validate UUID format to prevent injection attacks
    const { validateUuid } = await import('@/lib/security');
    if (!validateUuid(id)) {
        console.error('[SECURITY] Invalid UUID format in users PUT request:', id);
        return NextResponse.json({ message: "Invalid user ID format" }, { status: 400 });
    }
    
    const session = await getServerSession(authOptions);
    const actingUserId = session?.user?.id;
    if (!actingUserId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Check if the acting user has permission to modify the target user
    const hasUsersEditPermission = hasAnyPermission(session.user, ['USERS_EDIT']);
    const hasUsersPermissionsManage = hasAnyPermission(session.user, ['USERS_PERMISSIONS_MANAGE']);
    const isModifyingSelf = actingUserId === id;
    
    // Allow access if:
    // 1. User has USERS_EDIT permission, OR  
    // 2. User is modifying their own profile (for basic fields)
    if (!hasUsersEditPermission && !isModifyingSelf) {
        await logAudit('WARN', `Forbidden attempt to update user ${id} by ${session?.user?.email || 'Unknown'} (ID: ${actingUserId}). Required: USERS_EDIT permission.`, 'API:Users:Update', actingUserId);
        return NextResponse.json({ message: "Forbidden: You don't have permission to modify this user." }, { status: 403 });
    }

    // SECURITY: Check request body size to prevent DoS attacks
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
        const { securityConfig } = await import('@/lib/securityConfig');
        const maxSize = securityConfig.requestBody?.maxJsonSize || 10 * 1024 * 1024; // 10MB
        const size = parseInt(contentLength, 10);
        if (size > maxSize) {
            return NextResponse.json({ 
                message: `Request body too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
            }, { status: 413 });
        }
    }

    let body;
    try {
        body = await request.json();
    } catch (error: any) {
        return NextResponse.json({ message: "Error parsing request body", error: error.message }, { status: 400 });
    }

    // console.log('User update request body:', JSON.stringify(body, null, 2));
    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
        // console.log('Validation errors:', JSON.stringify(validationResult.error.flatten().fieldErrors, null, 2));
        return NextResponse.json({ message: "Invalid input", errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { password, newPassword, userTeamIds, userGroupIds, role, ...fieldsToUpdate } = validationResult.data;

    if (Object.keys(fieldsToUpdate).length === 0 && !password && (!newPassword || newPassword.trim() === "") && !userTeamIds && !userGroupIds && role === undefined) {
        return NextResponse.json({ message: "No fields to update." }, { status: 400 });
    }

    // Prevent users without proper permission from modifying role
    if (!hasUsersPermissionsManage && role !== undefined) {
        await logAudit('WARN', `User ${session?.user?.email} attempted to modify role without permission`, 'API:Users:Update', actingUserId);
        return NextResponse.json({ message: "Forbidden: insufficient permissions to modify roles." }, { status: 403 });
    }
    
    try {
        const updateData: any = { 
            ...fieldsToUpdate,
            // Remove module_permissions - permissions come from UserGroup
            ...(role !== undefined && { role })
        };
        
        // Handle password updates
        if (password) {
            const saltRounds = 10;
            updateData.password = await bcrypt.hash(password, saltRounds);
        }
        
        if (newPassword && newPassword.trim() !== "") {
            const saltRounds = 10;
            updateData.password = await bcrypt.hash(newPassword, saltRounds);
        }

        // Handle user group assignment based on userGroupIds or role
        let targetUserGroupId = null;
        if (userGroupIds !== undefined && userGroupIds.length > 0) {
            // Use the first selected user group
            targetUserGroupId = userGroupIds[0];
        } else if (role !== undefined) {
            // Fall back to role-based mapping for backward compatibility
            const roleToGroupId = {
                'Admin': '00000000-0000-0000-0000-000000000001',
                'Recruiter': '00000000-0000-0000-0000-000000000002',
                'Hiring Manager': '00000000-0000-0000-0000-000000000003'
            };
            targetUserGroupId = roleToGroupId[role] || null;
        }

        // Handle user group assignment using direct foreign key
        // Only update if explicitly provided to prevent setting to null
        if (userGroupIds !== undefined || role !== undefined) {
            updateData.userGroupId = targetUserGroupId;
        }

        // Handle user team assignment using direct foreign key (only one team per user)
        if (userTeamIds !== undefined) {
            updateData.userTeamId = userTeamIds && userTeamIds.length > 0 ? userTeamIds[0] : null;
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData
        });

        // Clear user validation cache for the updated user
        clearUserValidationCache(id);

        // Fetch updated user data with groups and teams using direct foreign keys
        const userGroup = updatedUser.userGroupId ? await prisma.userGroup.findUnique({
            where: { id: updatedUser.userGroupId },
            select: { id: true, name: true, permissions: true }
        }) : null;
        
        const userTeam = updatedUser.userTeamId ? await prisma.userTeam.findUnique({
            where: { id: updatedUser.userTeamId },
            select: { id: true, name: true, color: true }
        }) : null;

        const userToReturn = {
            ...updatedUser,
            teams: userTeam ? [userTeam] : [],
            modulePermissions: userGroup?.permissions || [],
        };

        await logAudit('AUDIT', `User '${updatedUser.name}' (ID: ${id}) was updated.`, 'API:Users:Update', actingUserId, { targetUserId: id, changes: validationResult.data });
        return NextResponse.json(userToReturn, { status: 200 });

    } catch (error: any) {
        console.error(`Failed to update user ${id}:`, error);
        await logAudit('ERROR', `Failed to update user (ID: ${id}). Error: ${error.message}`, 'API:Users:Update', actingUserId, { targetUserId: id, input: body });
        
        if (error.code === 'P2025') {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }
        
        return NextResponse.json({ message: "Error updating user", error: error.message }, { status: 500 });
    }
}

/**
 * Invalidates sessions for a deleted user by clearing their presence data
 * @param userId - The ID of the user whose sessions should be invalidated
 */
async function invalidateUserSessions(userId: string): Promise<void> {
  try {
    // Remove user presence from Redis
    // This function is no longer needed as removeUserPresence is removed.
    // If presence tracking is required, it should be implemented client-side or via SSE.
    

  } catch (error) {
    console.error(`Failed to cleanup sessions for user ${userId}:`, error);
  }
}

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
export async function DELETE(request: NextRequest) {
    const id = extractIdFromUrl(request);
    if (!id) {
        return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }
    
    // SECURITY: Validate UUID format to prevent injection attacks
    const { validateUuid } = await import('@/lib/security');
    if (!validateUuid(id)) {
        console.error('[SECURITY] Invalid UUID format in users DELETE request:', id);
        return NextResponse.json({ message: "Invalid user ID format" }, { status: 400 });
    }
    
    const session = await getServerSession(authOptions);
    const actingUserId = session?.user?.id;
    if (!actingUserId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // SECURITY: Check if user has permission to delete users
    const hasUsersDeletePermission = hasAnyPermission(session.user, ['USERS_DELETE']);
    if (!hasUsersDeletePermission && session.user.role !== 'Admin') {
        await logAudit('WARN', `Forbidden attempt to delete user ${id} by ${session?.user?.email || 'Unknown'} (ID: ${actingUserId}). Required: USERS_DELETE permission.`, 'API:Users:Delete', actingUserId, { targetUserId: id });
        return NextResponse.json({ message: "Forbidden: You don't have permission to delete users." }, { status: 403 });
    }

    // SECURITY: Prevent users from deleting themselves
    if (actingUserId === id) {
        await logAudit('WARN', `User ${session?.user?.email || 'Unknown'} (ID: ${actingUserId}) attempted to delete themselves.`, 'API:Users:Delete', actingUserId, { targetUserId: id });
        return NextResponse.json({ message: "Forbidden: You cannot delete your own account." }, { status: 403 });
    }

    try {
        const deletedUser = await prisma.user.delete({
            where: { id },
            select: {
                id: true,
                name: true
            }
        });

        // Clear user validation cache for the deleted user
        clearUserValidationCache(id);

        // Cleanup sessions for the deleted user
        await invalidateUserSessions(id);

        await logAudit('AUDIT', `User '${deletedUser.name}' (ID: ${id}) was deleted.`, 'API:Users:Delete', actingUserId, { targetUserId: id });
        return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
    } catch (error: any) {
        console.error(`Failed to delete user ${id}:`, error);
        await logAudit('ERROR', `Failed to delete user (ID: ${id}). Error: ${error.message}`, 'API:Users:Delete', actingUserId, { targetUserId: id });
        
        if (error.code === 'P2025') {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }
        
        return NextResponse.json({ message: "Error deleting user", error: error.message }, { status: 500 });
    }
}
