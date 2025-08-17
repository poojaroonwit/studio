import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NotificationService } from '@/lib/notificationService';

/**
 * @openapi
 * /api/test-notification:
 *   post:
 *     summary: Test notification system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [recruiter_assigned, candidate_added, candidate_status_change]
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test notification sent
 */

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only allow admins to test notifications
  if (session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden: Only admins can test notifications' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { type, message } = body;

    if (!type || !message) {
      return NextResponse.json({ error: 'Missing type or message' }, { status: 400 });
    }

    let notification;
    switch (type) {
      case 'recruiter_assigned':
        notification = await NotificationService.notifyRecruiterAssigned(
          'test-position-id',
          'Test Position',
          session.user.id,
          session.user.id
        );
        break;
      case 'candidate_added':
        notification = await NotificationService.notifyCandidateAdded(
          'test-candidate-id',
          'Test Candidate',
          'test-position-id',
          'Test Position',
          session.user.id,
          session.user.id
        );
        break;
      case 'candidate_status_change':
        notification = await NotificationService.notifyCandidateStatusChange(
          'test-candidate-id',
          'Test Candidate',
          'Applied',
          'Interview',
          'test-position-id',
          'Test Position',
          session.user.id,
          session.user.id
        );
        break;
      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test notification sent',
      notification 
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json({
      error: 'Failed to send test notification',
      details: (error as Error).message
    }, { status: 500 });
  }
}
