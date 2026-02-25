import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { auth } from '@/auth';
import { 
  setUserPresence, 
  getAllUserPresence, 
  markUserOffline, 
  cleanupOfflineUsers,
  type UserPresence 
} from '@/lib/presence-store';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/realtime/presence:
 *   get:
 *     summary: Get presence information for all users
 *     responses:
 *       200:
 *         description: Presence data for all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       userName:
 *                         type: string
 *                       userRole:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                       personalColor:
 *                         type: string
 *                       currentPage:
 *                         type: string
 *                       lastSeen:
 *                         type: string
 *                       isOnline:
 *                         type: boolean
 *   post:
 *     summary: Update presence information for current user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               userName:
 *                 type: string
 *               userRole:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *               personalColor:
 *                 type: string
 *               currentPage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Presence updated
 *   delete:
 *     summary: Remove presence information for current user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Presence removed
 */

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to update presence
  // Users should be able to update their own presence if they can view Applicants (basic access)
  if (!hasPermission(session.user, 'applicantS_VIEW')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to update presence' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, userName, userRole, avatarUrl, personalColor, currentPage } = body;

    if (!userId || !userName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update user presence
    const presence: UserPresence = {
      userId,
      userName,
      userRole: userRole || session.user.role || 'User',
      avatarUrl: avatarUrl || session.user.avatarUrl || null,
      personalColor: personalColor || session.user.personalColor || null,
      currentPage: currentPage || '/',
      lastSeen: new Date(),
      isOnline: true
    };

    setUserPresence(userId, presence);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to update presence',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to remove presence
  // Users should be able to remove their own presence if they can view Applicants (basic access)
  if (!hasPermission(session.user, 'applicantS_VIEW')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to remove presence' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Mark user as offline but keep their presence for 6 hours
    markUserOffline(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to remove presence',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to view presence data
  // Users should be able to view presence if they can view Applicants (basic access)
  if (!hasPermission(session.user, 'applicantS_VIEW')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view presence data' }, { status: 403 });
  }

  try {
    // Clean up offline users before returning data
    cleanupOfflineUsers();

    // Return all users (both online and recently offline)
    const users = getAllUserPresence().map(presence => ({
      userId: presence.userId,
      userName: presence.userName,
      userRole: presence.userRole,
      avatarUrl: presence.avatarUrl,
      personalColor: presence.personalColor,
      currentPage: presence.currentPage,
      lastSeen: presence.lastSeen.toISOString(),
      isOnline: presence.isOnline
    }));

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to get online users',
      details: (error as Error).message 
    }, { status: 500 });
  }
} 

