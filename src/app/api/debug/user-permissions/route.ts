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
      // Get user data directly from database using the User_UserGroup junction table
      const userResult = await client.query(`
        SELECT 
          u.id, u.name, u.email, u.role,
          array_agg(DISTINCT ug.name) as "groupNames",
          array_agg(DISTINCT unnest(ug.permissions)) as "allPermissions"
        FROM "User" u
        JOIN "User_UserGroup" uug ON u.id = uug."userId"
        JOIN "UserGroup" ug ON uug."groupId" = ug.id
        WHERE u.id = $1
        GROUP BY u.id, u.name, u.email, u.role
      `, [session.user.id]);

      if (userResult.rows.length === 0) {
        return NextResponse.json({ 
          error: 'User not found in database',
          userId: session.user.id
        }, { status: 404 });
      }

      const dbUser = userResult.rows[0];
      
      return NextResponse.json({
        sessionUser: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          modulePermissions: session.user.modulePermissions || []
        },
        databaseUser: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          groupNames: dbUser.groupNames || [],
          allPermissions: dbUser.allPermissions || []
        },
        comparison: {
          rolesMatch: session.user.role === dbUser.role,
          permissionsMatch: JSON.stringify(session.user.modulePermissions || []) === JSON.stringify(dbUser.allPermissions || []),
          sessionPermissionsLength: session.user.modulePermissions?.length || 0,
          dbPermissionsLength: dbUser.allPermissions?.length || 0
        }
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
