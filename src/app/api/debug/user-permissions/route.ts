import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/authUtils';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get fresh permissions from database
    const freshPermissions = await getUserPermissions(session.user.id);
    
    const debugInfo = {
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      userRole: session.user.role,
      sessionModulePermissions: session.user.modulePermissions,
      freshPermissions,
      hasCandidatesView: hasPermission(session.user, 'CANDIDATES_VIEW'),
      hasSystemSettingsView: hasPermission(session.user, 'SYSTEM_SETTINGS_VIEW'),
      isAdmin: session.user.role === 'Admin'
    };

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error: any) {
    console.error("Failed to get user permissions debug info:", error);
    return NextResponse.json({ message: "Error getting debug info", error: error.message }, { status: 500 });
  }
}
