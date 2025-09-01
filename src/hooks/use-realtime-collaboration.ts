import { useCallback, useRef } from 'react';
import { useToastManager } from '@/hooks/use-toast-manager';
import { useSession } from 'next-auth/react';
import { useSimpleSSE } from './use-simple-sse';

interface RealtimeCollaborationOptions {
  onCandidateUpdate?: (candidate: any) => void;
  onTransitionUpdate?: (transition: any) => void;
  onCommentUpdate?: (comment: any) => void;
  onResumeUpdate?: (resume: any) => void;
  onAttachmentUpdate?: (attachment: any) => void;
  onRecruitmentStagesUpdate?: (stages: any[]) => void;
  onPositionUpdate?: (position: any) => void;
  onPositionListUpdate?: () => void;
  onPositionStatisticsUpdate?: (statistics: any) => void;
  showNotifications?: boolean;
  /** Whether to show error toast notifications (defaults to showNotifications value) */
  showErrorNotifications?: boolean;
  endpoint?: string;
  /** Minimum time between error toasts in milliseconds to avoid spam */
  errorToastCooldownMs?: number;
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
  /** Base delay for reconnection attempts in milliseconds */
  reconnectDelayMs?: number;
  /** Maximum delay for reconnection attempts in milliseconds */
  maxReconnectDelayMs?: number;
}

export function useRealtimeCollaboration(options: RealtimeCollaborationOptions = {}) {
  const {
    onCandidateUpdate,
    onTransitionUpdate,
    onCommentUpdate,
    onResumeUpdate,
    onAttachmentUpdate,
    onRecruitmentStagesUpdate,
    onPositionUpdate,
    onPositionListUpdate,
    onPositionStatisticsUpdate,
    showNotifications = true,
    showErrorNotifications,
    errorToastCooldownMs = 60000,
    maxReconnectAttempts = 10,
    reconnectDelayMs = 1000,
    maxReconnectDelayMs = 30000
  } = options;

  // Default showErrorNotifications to showNotifications value if not explicitly set
  const shouldShowErrorNotifications = showErrorNotifications !== undefined ? showErrorNotifications : showNotifications;

  const { success: showToast, error: showErrorToast } = useToastManager({ deduplicationWindowMs: 2000 });
  const lastErrorToastTimeRef = useRef<number>(0);
  const { data: session } = useSession();

  const showNotification = useCallback((message: string, icon: string = '🔄') => {
    if (showNotifications) {
      try {
        showToast(message, {
          duration: 3000,
          icon
        });
      } catch (error) {
        console.error('Error showing toast notification:', error);
      }
    }
  }, [showNotifications, showToast]);

  const showErrorNotification = useCallback((message: string) => {
    const now = Date.now();
    if (shouldShowErrorNotifications && (now - lastErrorToastTimeRef.current > errorToastCooldownMs)) {
      try {
        showErrorToast(message, {
          duration: 5000
        });
        lastErrorToastTimeRef.current = now;
      } catch (error) {
        console.error('Error showing error toast notification:', error);
      }
    }
  }, [shouldShowErrorNotifications, errorToastCooldownMs, showErrorToast]);

  // Use the unified real-time hook instead of individual SSE connection
  const { isConnected, lastMessage, reconnect, disconnect } = useSimpleSSE();
    onCandidateUpdate: (data) => {
      if (data.type === 'candidate_update' && data.candidate) {
        const updatedCandidate = data.candidate;
        
        // Call the callback if provided
        if (onCandidateUpdate) {
          onCandidateUpdate(updatedCandidate);
        }
        
        // Show notification (but not for user's own actions)
        if (updatedCandidate.status && (!data.actingUserId || data.actingUserId !== session?.user?.id)) {
          showNotification(`Candidate ${updatedCandidate.name} moved to ${updatedCandidate.status}`, '🔄');
        }
      }
    },
    onPositionUpdate: (data) => {
      if (data.type === 'position_update' && data.position) {
        const position = data.position;
        
        // Call the callback if provided
        if (onPositionUpdate) {
          onPositionUpdate(position);
        }
        
        // Show notification (but not for user's own actions)
        if (!data.actingUserId || data.actingUserId !== session?.user?.id) {
          showNotification(`Position "${position.title}" updated`, '💼');
        }
      }
    }
  });

  return {
    isConnected,
    lastUpdate,
    reconnect,
    disconnect
  };
}
