import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// In-memory storage for user presence (in production, use Redis)
interface UserPresence {
  userId: string;
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  personalColor?: string | null;
  currentPage: string;
  lastSeen: Date;
  isOnline: boolean;
}

const userPresenceStore = new Map<string, UserPresence>();

// Clean up offline users (older than 6 hours)
const OFFLINE_THRESHOLD = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

function cleanupOfflineUsers() {
  const now = new Date();
  for (const [userId, presence] of userPresenceStore.entries()) {
    const timeSinceLastSeen = now.getTime() - presence.lastSeen.getTime();
    if (timeSinceLastSeen > OFFLINE_THRESHOLD) {
      userPresenceStore.delete(userId);
    }
  }
}

// Clean up every 5 minutes (guard against dev hot-reloads)
const __presenceGlobal = globalThis as unknown as { __presenceCleanupInterval?: NodeJS.Timeout };
if (!__presenceGlobal.__presenceCleanupInterval) {
  __presenceGlobal.__presenceCleanupInterval = setInterval(cleanupOfflineUsers, 5 * 60 * 1000);
}

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
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    userPresenceStore.set(userId, presence);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating presence:', error);
    return NextResponse.json({ 
      error: 'Failed to update presence',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Mark user as offline but keep their presence for 6 hours
    const existingPresence = userPresenceStore.get(userId);
    if (existingPresence) {
      existingPresence.isOnline = false;
      existingPresence.lastSeen = new Date();
      userPresenceStore.set(userId, existingPresence);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing presence:', error);
    return NextResponse.json({ 
      error: 'Failed to remove presence',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Clean up offline users before returning data
    cleanupOfflineUsers();

    // Return all users (both online and recently offline)
    const users = Array.from(userPresenceStore.values()).map(presence => ({
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
    console.error('Error getting online users:', error);
    return NextResponse.json({ 
      error: 'Failed to get online users',
      details: (error as Error).message 
    }, { status: 500 });
  }
} 