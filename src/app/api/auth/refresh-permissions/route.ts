import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMergedUserPermissions } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    // Fetch fresh permissions
    const freshPermissions = await getMergedUserPermissions(session.user.id);
    
    return NextResponse.json({
      success: true,
      permissions: freshPermissions,
      message: 'Permissions refreshed successfully'
    });

  } catch (error) {
    console.error('Error refreshing permissions:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to refresh permissions' 
    }, { status: 500 });
  }
}
