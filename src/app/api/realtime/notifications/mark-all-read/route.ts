import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import prisma from '@/lib/prisma';

/**
 * @openapi
 * /api/realtime/notifications/mark-all-read:
 *   post:
 *     summary: Mark all notifications as read
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 updatedCount:
 *                   type: number
 */

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });       
  }

  const actingUserId = session.user.id;
  const actingUserName = session.user.name || session.user.email || 'System';   

  try {
    // Update all unread notifications for the user
    const result = await prisma.notification.updateMany({
      where: {
        userId: actingUserId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    await logAudit('AUDIT', `All notifications marked as read by ${actingUserName}. Updated ${result.count} notifications.`, 'API:Realtime:Notifications:MarkAllRead', actingUserId, {
      updatedCount: result.count
    });

    return NextResponse.json({ 
      success: true, 
      updatedCount: result.count 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    await logAudit('ERROR', `Failed to mark all notifications as read for ${actingUserName}. Error: ${(error as Error).message}`, 'API:Realtime:Notifications:MarkAllRead', actingUserId, {
      error: (error as Error).message
    });
    return NextResponse.json({
      error: 'Failed to mark all notifications as read',
      details: (error as Error).message
    }, { status: 500 });
  }
}
