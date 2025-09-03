import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        session: null
      }, { status: 401 });
    }

    const client = await getPool().connect();
    try {
      // Get user's current permissions from database
      const permissionsResult = await client.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.role,
          u."userGroupId",
          ug.name as userGroupName,
          ug.permissions as userGroupPermissions
        FROM "User" u
        JOIN "UserGroup" ug ON u."userGroupId" = ug.id
        WHERE u.id = $1
      `, [session.user.id]);

      if (permissionsResult.rows.length === 0) {
        return NextResponse.json({
          error: 'User not found in database',
          userId: session.user.id
        }, { status: 404 });
      }

      const dbUser = permissionsResult.rows[0];
      const dbPermissions = dbUser.userGroupPermissions || [];

      // Check if specific permissions exist
      const hasPositionsView = dbPermissions.includes('POSITIONS_VIEW');
      const hasPositionsEditBasic = dbPermissions.includes('POSITIONS_EDIT_BASIC');
      const hasPositionsEditDetailed = dbPermissions.includes('POSITIONS_EDIT_DETAILED');

      return NextResponse.json({
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          modulePermissions: session.user.modulePermissions || []
        },
        database: {
          userId: dbUser.id,
          userName: dbUser.name,
          userEmail: dbUser.email,
          userRole: dbUser.role,
          userGroupId: dbUser.userGroupId,
          userGroupName: dbUser.userGroupName,
          userGroupPermissions: dbPermissions
        },
        permissionChecks: {
          hasPositionsView,
          hasPositionsEditBasic,
          hasPositionsEditDetailed,
          totalPermissions: dbPermissions.length
        },
        sessionExists: !!session,
        hasModulePermissions: Array.isArray(session.user.modulePermissions),
        modulePermissionsLength: session.user.modulePermissions?.length || 0,
        sessionPermissionsMatch: JSON.stringify(session.user.modulePermissions || []) === JSON.stringify(dbPermissions)
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Debug user permissions error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
