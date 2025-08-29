import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMergedUserPermissions } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch fresh permissions
    const freshPermissions = await getMergedUserPermissions(session.user.id);
    
    // Removed user logging to reduce container logs
    // Removed permissions logging to reduce container logs
    
    return NextResponse.json({
      success: true,
      permissions: freshPermissions,
      previousPermissions: session.user.modulePermissions || [],
      permissionsChanged: JSON.stringify(session.user.modulePermissions || []) !== JSON.stringify(freshPermissions),
      message: 'Permissions refreshed successfully. You may need to sign out and sign back in for changes to take effect.',
    });

  } catch (error) {
    console.error('Error refreshing permissions:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to refresh permissions' 
    }, { status: 500 });
  }
}
