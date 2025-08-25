import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        hasPermission: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ 
        hasPermission: false, 
        error: 'Invalid permissions format' 
      }, { status: 400 });
    }

    const userRole = session.user.role || 'Recruiter';
    const userModulePermissions = session.user.modulePermissions || [];

    // Check if user has any of the requested permissions
    const hasAnyPermission = permissions.some(permission => {
      // Admin role has all permissions
      if (userRole === 'Admin') return true;
      
      // Check specific module permissions
      return userModulePermissions.includes(permission);
    });

    return NextResponse.json({
      hasPermission: hasAnyPermission,
      userRole,
      userModulePermissions,
      requestedPermissions: permissions
    });

  } catch (error) {
    console.error('Permission check failed:', error);
    return NextResponse.json({ 
      hasPermission: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
