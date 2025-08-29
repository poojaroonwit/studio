import { NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { logAudit } from '@/lib/auditLog';
import { NotificationService } from '@/lib/notificationService';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createForbiddenError, 
  createValidationError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';

export const dynamic = 'force-dynamic';

const createNotificationSchema = z.object({
  type: z.string().min(1, 'Notification type is required'),
  title: z.string().min(1, 'Notification title is required'),
  message: z.string().min(1, 'Notification message is required'),
  targetUserId: z.string().uuid().optional(),
  data: z.record(z.any()).optional(),
}).strict();

const bulkNotificationSchema = z.object({
  notifications: z.array(z.object({
    type: z.string().min(1, 'Notification type is required'),
    title: z.string().min(1, 'Notification title is required'),
    message: z.string().min(1, 'Notification message is required'),
    targetUserId: z.string().uuid(),
    data: z.record(z.any()).optional(),
  })).min(1, 'At least one notification is required').max(100, 'Maximum 100 notifications per request'),
}).strict();

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(request, createUnauthorizedError('Authentication required'));
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_VIEW')) {
    return handleApiError(request, createForbiddenError('Insufficient permissions to send notifications'));
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return handleApiError(request, createValidationError('Invalid JSON body'));
  }

  // Check if it's a bulk notification request
  const isBulkRequest = body.notifications && Array.isArray(body.notifications);
  
  if (isBulkRequest) {
    // Handle bulk notifications
    const validationResult = bulkNotificationSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(request, createValidationError('Invalid input', validationResult.error.flatten().fieldErrors));
    }

    const { notifications } = validationResult.data;
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const notification of notifications) {
      try {
        await NotificationService.createNotification(
          notification.targetUserId,
          {
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data || {}
          },
          user.id
        );
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to send notification to ${notification.targetUserId}: ${(error as Error).message}`);
      }
    }

    await logAudit('AUDIT', `Bulk notifications sent by ${user.name}. Sent: ${results.sent}, Failed: ${results.failed}`, 'API:V1:Notifications:Bulk', user.id, { 
      totalNotifications: notifications.length,
      results 
    });

    return createSuccessResponse(request, {
      message: 'Bulk notifications processed',
      results
    });

  } else {
    // Handle single notification
    const validationResult = createNotificationSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(request, createValidationError('Invalid input', validationResult.error.flatten().fieldErrors));
    }

    const { type, title, message, targetUserId, data } = validationResult.data;
    const targetUser = targetUserId || user.id; // Default to current user if no target specified

    // Prevent self-notifications: don't notify users about their own actions
    if (targetUser === user.id) {
      await logAudit('AUDIT', `Self-notification prevented for ${user.name}`, 'API:V1:Notifications:Create', user.id, {
        notificationType: type,
        title,
        targetUserId: targetUser,
        hasData: !!data
      });
      return createSuccessResponse(request, {
        message: 'Self-notification prevented',
        notification: null
      });
    }

    try {
      const notification = await NotificationService.createNotification(
        targetUser,
        {
          type,
          title,
          message,
          data: data || {}
        },
        user.id
      );

      await logAudit('AUDIT', `Notification '${title}' sent by ${user.name} to ${targetUser}`, 'API:V1:Notifications:Create', user.id, {
        notificationType: type,
        title,
        targetUserId: targetUser,
        hasData: !!data
      });

      return createSuccessResponse(request, {
        message: 'Notification sent successfully',
        notification
      });

    } catch (error) {
      await logAudit('ERROR', `Failed to send notification by ${user.name}. Error: ${(error as Error).message}`, 'API:V1:Notifications:Create', user.id, { 
        error: (error as Error).message,
        notificationData: { type, title, message, targetUserId }
      });
      
      return handleApiError(request, createInternalServerError('Error sending notification', {
        originalError: (error as Error).message
      }));
    }
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(request, createUnauthorizedError('Authentication required'));
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const isRead = searchParams.get('isRead');

  try {
    // Get notifications for the authenticated user
    const notifications = await NotificationService.getNotifications(
      user.id,
      limit,
      offset,
      isRead ? isRead === 'true' : undefined
    );

    const unreadCount = await NotificationService.getUnreadCount(user.id);

    return createSuccessResponse(request, {
      notifications: notifications.notifications,
      total: notifications.total,
      unreadCount
    });

  } catch (error) {
    return handleApiError(request, createInternalServerError('Error fetching notifications', {
      originalError: (error as Error).message
    }));
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  return new Response(null, { status: 200, headers });
}
