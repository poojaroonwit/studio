import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';


const checkPermissionsSchema = z.object({
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        hasPermission: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    const body = await request.json();
    const validation = checkPermissionsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        hasPermission: false, 
        message: 'Invalid request body' 
      }, { status: 400 });
    }

    const { permissions } = validation.data;
    const userRole = session.user.role;
    const userModulePermissions = session.user.modulePermissions || [];

    // Check if user has admin role or specific permissions
    const hasPermission = userRole === 'Admin' || 
      permissions.some(permission => userModulePermissions.includes(permission));

    return NextResponse.json({
      hasPermission,
      userRole,
      userModulePermissions,
      requestedPermissions: permissions
    });

  } catch (error) {
    console.error('Error checking permissions:', error);
    return NextResponse.json({ 
      hasPermission: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
