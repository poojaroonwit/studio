import { NextRequest, NextResponse } from 'next/server';
import { hasAnyPermission } from '@/lib/permissions';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
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

    // Check if user has any of the requested permissions using the new permission system
    const hasAnyPermissionResult = hasAnyPermission(session.user, permissions);

    return NextResponse.json({
      hasPermission: hasAnyPermissionResult,
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
