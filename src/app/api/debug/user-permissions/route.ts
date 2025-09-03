import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
    }

    const client = await getPool().connect();
    
    try {
      // Get user permissions using direct foreign key
      const result = await client.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u."userGroupId",
          ug.name as group_name,
          ug.permissions
        FROM "User" u
        LEFT JOIN "UserGroup" ug ON u."userGroupId" = ug.id
        WHERE u.id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = result.rows[0];
      
      return NextResponse.json({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userGroupId: user.userGroupId,
        groupName: user.group_name,
        permissions: user.permissions || [],
        message: `Permissions for user ${user.name} (${user.email})`
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in debug user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
