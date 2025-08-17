import { useCallback } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { 
  createNotification, 
  createCandidateNotification, 
  createPositionNotification, 
  createUserNotification, 
  createSystemNotification, 
  createTaskBoardNotification,
  type CreateNotificationParams 
} from '@/lib/notificationUtils';

/**
 * Custom hook for managing notifications in components
 */
export function useNotificationManager() {
  const { addNotification } = useNotifications();

  const createLocalNotification = useCallback((params: CreateNotificationParams) => {
    // Add notification to local state immediately
    addNotification(params);
    
    // Also create it on the server
    createNotification(params);
  }, [addNotification]);

  const notifyCandidateUpdate = useCallback((
    candidateId: string,
    candidateName: string,
    action: 'created' | 'updated' | 'deleted' | 'moved' | 'commented',
    additionalData?: Record<string, any>
  ) => {
    const messages = {
      created: `New candidate ${candidateName} has been added`,
      updated: `Candidate ${candidateName} has been updated`,
      deleted: `Candidate ${candidateName} has been removed`,
      moved: `Candidate ${candidateName} has been moved to a new stage`,
      commented: `New comment added for candidate ${candidateName}`,
    };

    createLocalNotification({
      type: 'candidate_update',
      title: `Candidate ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: messages[action],
      data: {
        candidateId,
        candidateName,
        action,
        ...additionalData,
      },
    });
  }, [createLocalNotification]);

  const notifyPositionUpdate = useCallback((
    positionId: string,
    positionTitle: string,
    action: 'created' | 'updated' | 'deleted' | 'opened' | 'closed',
    additionalData?: Record<string, any>
  ) => {
    const messages = {
      created: `New position "${positionTitle}" has been created`,
      updated: `Position "${positionTitle}" has been updated`,
      deleted: `Position "${positionTitle}" has been removed`,
      opened: `Position "${positionTitle}" has been opened`,
      closed: `Position "${positionTitle}" has been closed`,
    };

    createLocalNotification({
      type: 'position_update',
      title: `Position ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: messages[action],
      data: {
        positionId,
        positionTitle,
        action,
        ...additionalData,
      },
    });
  }, [createLocalNotification]);

  const notifyUserAction = useCallback((
    userId: string,
    userName: string,
    action: 'logged_in' | 'logged_out' | 'profile_updated' | 'password_changed',
    additionalData?: Record<string, any>
  ) => {
    const messages = {
      logged_in: `${userName} has logged in`,
      logged_out: `${userName} has logged out`,
      profile_updated: `${userName} has updated their profile`,
      password_changed: `${userName} has changed their password`,
    };

    createLocalNotification({
      type: 'user_action',
      title: `User ${action.replace('_', ' ').charAt(0).toUpperCase() + action.replace('_', ' ').slice(1)}`,
      message: messages[action],
      data: {
        userId,
        userName,
        action,
        ...additionalData,
      },
    });
  }, [createLocalNotification]);

  const notifySystemEvent = useCallback((
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info',
    additionalData?: Record<string, any>
  ) => {
    createLocalNotification({
      type: `system_${type}`,
      title,
      message,
      data: {
        systemEvent: true,
        severity: type,
        ...additionalData,
      },
    });
  }, [createLocalNotification]);

  const notifyTaskUpdate = useCallback((
    taskId: string,
    taskTitle: string,
    action: 'created' | 'updated' | 'completed' | 'assigned',
    additionalData?: Record<string, any>
  ) => {
    const messages = {
      created: `New task "${taskTitle}" has been created`,
      updated: `Task "${taskTitle}" has been updated`,
      completed: `Task "${taskTitle}" has been completed`,
      assigned: `Task "${taskTitle}" has been assigned to you`,
    };

    createLocalNotification({
      type: 'task_update',
      title: `Task ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: messages[action],
      data: {
        taskId,
        taskTitle,
        action,
        ...additionalData,
      },
    });
  }, [createLocalNotification]);

  const notifyCustom = useCallback((
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ) => {
    createLocalNotification({
      type,
      title,
      message,
      data,
    });
  }, [createLocalNotification]);

  return {
    // Direct notification creation
    createNotification: createLocalNotification,
    
    // Predefined notification types
    notifyCandidateUpdate,
    notifyPositionUpdate,
    notifyUserAction,
    notifySystemEvent,
    notifyTaskUpdate,
    notifyCustom,
    
    // Server-only notification creation (for background tasks)
    createServerNotification: createNotification,
    createServerCandidateNotification: createCandidateNotification,
    createServerPositionNotification: createPositionNotification,
    createServerUserNotification: createUserNotification,
    createServerSystemNotification: createSystemNotification,
    createServerTaskBoardNotification: createTaskBoardNotification,
  };
}
