import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMergedUserPermissions } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    // Get fresh permissions from database
    const freshPermissions = await getMergedUserPermissions(session.user.id);
    
    return NextResponse.json({
      success: true,
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          modulePermissions: session.user.modulePermissions || [],
        }
      },
      freshPermissions,
      permissionsMatch: JSON.stringify(session.user.modulePermissions || []) === JSON.stringify(freshPermissions),
      hasPermissions: (session.user.modulePermissions || []).length > 0,
      hasFreshPermissions: freshPermissions.length > 0,
    });

  } catch (error) {
    console.error('Error debugging session:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to debug session' 
    }, { status: 500 });
  }
}
