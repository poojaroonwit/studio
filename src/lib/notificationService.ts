import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';
import { broadcastUserNotification } from '@/lib/candidateSse';
import { validate as validateUuid } from 'uuid';

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export class NotificationService {
  /**
   * Create a notification for a specific user
   */
  static async createNotification(
    userId: string,
    notification: NotificationData,
    actingUserId?: string
  ) {
    try {
      // Validate UUIDs before proceeding
      if (!validateUuid(userId)) {
        console.error('❌ Invalid userId UUID in createNotification:', userId);
        throw new Error('Invalid user ID format');
      }

      if (actingUserId && !validateUuid(actingUserId)) {
        console.error('❌ Invalid actingUserId UUID in createNotification:', actingUserId);
        throw new Error('Invalid acting user ID format');
      }

      // Prevent self-notifications: don't notify users about their own actions
      if (actingUserId && userId === actingUserId) {
        await logAudit('AUDIT', `Self-notification prevented for user ${userId}`, 'NotificationService:Create', actingUserId, {
          targetUserId: userId,
          notificationType: notification.type,
          title: notification.title
        });
        return null; // Return null to indicate no notification was created
      }

      const newNotification = await prisma.notification.create({
        data: {
          userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
        }
      });

      // Broadcast real-time notification
      broadcastUserNotification(userId, {
        id: newNotification.id,
        type: newNotification.type,
        title: newNotification.title,
        message: newNotification.message,
        data: newNotification.data,
        isRead: newNotification.isRead,
        createdAt: newNotification.createdAt,
      });

      if (actingUserId) {
        await logAudit('AUDIT', `Notification '${notification.title}' created for user ${userId}`, 'NotificationService:Create', actingUserId, {
          targetUserId: userId,
          notificationType: notification.type,
          title: notification.title
        });
      }

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create a notification when a recruiter is assigned to a position
   */
  static async notifyRecruiterAssigned(
    positionId: string,
    positionTitle: string,
    recruiterId: string,
    assignedByUserId: string
  ) {
    const notification: NotificationData = {
      type: 'recruiter_assigned',
      title: 'Position Assignment',
      message: `You have been assigned as the recruiter for the position "${positionTitle}"`,
      data: {
        positionId,
        positionTitle,
        assignedBy: assignedByUserId
      }
    };

    return this.createNotification(recruiterId, notification, assignedByUserId);
  }

  /**
   * Create a notification when a candidate is added
   */
  static async notifyCandidateAdded(
    candidateId: string,
    candidateName: string,
    positionId: string,
    positionTitle: string,
    recruiterId: string,
    addedByUserId: string
  ) {
    const notification: NotificationData = {
      type: 'candidate_added',
      title: 'New Candidate Added',
      message: `A new candidate "${candidateName}" has been added to position "${positionTitle}"`,
      data: {
        candidateId,
        candidateName,
        positionId,
        positionTitle,
        addedBy: addedByUserId
      }
    };

    return this.createNotification(recruiterId, notification, addedByUserId);
  }

  /**
   * Create a notification when a candidate status changes
   */
  static async notifyCandidateStatusChange(
    candidateId: string,
    candidateName: string,
    oldStatus: string,
    newStatus: string,
    positionId: string,
    positionTitle: string,
    recruiterId: string,
    changedByUserId: string
  ) {
    const notification: NotificationData = {
      type: 'candidate_status_change',
      title: 'Candidate Status Updated',
      message: `Candidate "${candidateName}" status changed from "${oldStatus}" to "${newStatus}" for position "${positionTitle}"`,
      data: {
        candidateId,
        candidateName,
        oldStatus,
        newStatus,
        positionId,
        positionTitle,
        changedBy: changedByUserId
      }
    };

    return this.createNotification(recruiterId, notification, changedByUserId);
  }

  /**
   * Get notifications for a user with pagination and filtering
   */
  static async getNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    isRead?: boolean
  ) {
    try {
      // Validate UUID before proceeding
      if (!validateUuid(userId)) {
        console.error('❌ Invalid userId UUID in getNotifications:', userId);
        throw new Error('Invalid user ID format');
      }

      const whereClause: any = { userId };
      if (isRead !== undefined) {
        whereClause.isRead = isRead;
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.notification.count({
          where: whereClause,
        })
      ]);

      return {
        notifications,
        total,
        limit,
        offset
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      // Validate UUID before proceeding
      if (!validateUuid(userId)) {
        console.error('❌ Invalid userId UUID in getUnreadCount:', userId);
        return 0;
      }

      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    try {
      // Validate UUID before proceeding
      if (!validateUuid(userId)) {
        console.error('❌ Invalid userId UUID in markAllAsRead:', userId);
        throw new Error('Invalid user ID format');
      }

      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
}
