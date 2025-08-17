import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import prisma from '@/lib/prisma';

/**
 * @openapi
 * /api/realtime/notifications/{id}/read:
 *   post:
 *     summary: Mark a notification as read
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 notification:
 *                   type: object
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });       
  }

  const actingUserId = session.user.id;
  const actingUserName = session.user.name || session.user.email || 'System';   
  const notificationId = params.id;

  try {
    // Update the notification to mark it as read
    const updatedNotification = await prisma.notification.update({
      where: {
        id: notificationId,
        userId: actingUserId // Ensure user can only mark their own notifications as read
      },
      data: {
        isRead: true
      }
    });

    await logAudit('AUDIT', `Notification '${updatedNotification.title}' marked as read by ${actingUserName}`, 'API:Realtime:Notifications:MarkRead', actingUserId, {
      notificationId,
      notificationTitle: updatedNotification.title
    });

    return NextResponse.json({ 
      success: true, 
      notification: updatedNotification 
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    await logAudit('ERROR', `Failed to mark notification as read for ${actingUserName}. Error: ${(error as Error).message}`, 'API:Realtime:Notifications:MarkRead', actingUserId, {
      notificationId,
      error: (error as Error).message
    });
    return NextResponse.json({
      error: 'Failed to mark notification as read',
      details: (error as Error).message
    }, { status: 500 });
  }
} 