import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';

// Define permission levels
const ADMIN_PERMISSIONS = [
  'USERS_MANAGE', 'USER_GROUPS_MANAGE', 'SYSTEM_SETTINGS_VIEW', 
  'SYSTEM_SETTINGS_EDIT', 'LOGS_VIEW', 'UPLOAD_QUEUE_MANAGE'
];

const RECRUITER_PERMISSIONS = [
  'CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC',
  'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC',
  'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN'
];

const HIRING_MANAGER_PERMISSIONS = [
  'CANDIDATES_VIEW', 'POSITIONS_VIEW', 'TASK_BOARD_VIEW'
];

/**
 * @openapi
 * /api/settings/sync-user-roles:
 *   post:
 *     summary: Synchronize user roles with their group permissions
 *     description: Updates user roles to match their permission levels from user groups
 *     responses:
 *       200:
 *         description: Roles synchronized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 updated:
 *                   type: number
 *                 skipped:
 *                   type: number
 *                 total:
 *                   type: number
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to sync roles
    const canSyncRoles = session.user.role === 'Admin' || 
      session.user.modulePermissions?.includes('USERS_MANAGE') ||
      session.user.modulePermissions?.includes('USER_GROUPS_MANAGE');
    
    if (!canSyncRoles) {
      await logAudit('WARN', `Forbidden attempt to sync user roles by ${session.user.name || session.user.email}`, 'API:Settings:SyncUserRoles', session.user.id);
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to sync user roles' }, { status: 403 });
    }

    // Get all users with their group memberships
    const users = await prisma.user.findMany({
      include: {
        userGroup: true
      }
    });

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Get permissions from user group
      const userPermissions = user.userGroup?.permissions || [];

      // Determine the appropriate role based on permissions
      let newRole = user.role;

      // Check if user has admin-level permissions
      const hasAdminPermissions = ADMIN_PERMISSIONS.some(permission => 
        userPermissions.includes(permission)
      );

      if (hasAdminPermissions) {
        newRole = 'Admin';
      } else {
        // Check if user has recruiter-level permissions
        const hasRecruiterPermissions = RECRUITER_PERMISSIONS.some(permission => 
          userPermissions.includes(permission)
        );

        if (hasRecruiterPermissions) {
          newRole = 'Recruiter';
        } else {
          // Check if user has hiring manager permissions
          const hasHiringManagerPermissions = HIRING_MANAGER_PERMISSIONS.some(permission => 
            userPermissions.includes(permission)
          );

          if (hasHiringManagerPermissions) {
            newRole = 'Hiring Manager';
          } else {
            // Default to Recruiter if no specific permissions found
            newRole = 'Recruiter';
          }
        }
      }

      // Update role if it's different
      if (newRole !== user.role) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: newRole }
        });
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    await logAudit('INFO', `User roles synchronized by ${session.user.name || session.user.email}. Updated: ${updatedCount}, Skipped: ${skippedCount}`, 'API:Settings:SyncUserRoles', session.user.id);

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      skipped: skippedCount,
      total: users.length,
      message: `Roles synchronized successfully. ${updatedCount} users updated, ${skippedCount} users skipped.`
    });

  } catch (error) {
    console.error('Error synchronizing user roles:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to synchronize user roles' 
    }, { status: 500 });
  }
}
