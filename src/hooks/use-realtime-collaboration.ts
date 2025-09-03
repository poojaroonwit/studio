import { useToastManager } from '@/hooks/use-toast-manager';
import { useSession } from 'next-auth/react';
import { useEnhancedSSE } from './use-enhanced-sse';
import { useEffect, useCallback, useRef } from 'react';
import { getRecruitmentStageNameClient } from '@/lib/recruitmentStageUtils';

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

  // Use the enhanced SSE hook
  const { isConnected, lastMessage, reconnect, disconnect } = useEnhancedSSE();

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage && isConnected) {
      const data = lastMessage;
      
      // Debug logging
      console.log('[RealtimeCollaboration] Received message:', data);
      
      // Handle both direct data structure and nested data structure
      const eventData = data.data || data;
      
      if (data.type === 'candidate_update' && eventData.candidate) {
        const updatedCandidate = eventData.candidate;
        console.log('[RealtimeCollaboration] Processing candidate update:', updatedCandidate);
        
        // Call the callback if provided
        if (onCandidateUpdate) {
          console.log('[RealtimeCollaboration] Calling onCandidateUpdate callback');
          onCandidateUpdate(eventData);
        }
        
        // Show notification (but not for user's own actions)
        if (updatedCandidate.status && (!eventData.actingUserId || eventData.actingUserId !== session?.user?.id)) {
          // Fetch stage name for display
          getRecruitmentStageNameClient(updatedCandidate.status)
            .then(stageName => {
              showNotification(`Candidate ${updatedCandidate.name} moved to ${stageName}`, '🔄');
            })
            .catch(() => {
              // Fallback to showing the status ID if name fetch fails
              showNotification(`Candidate ${updatedCandidate.name} status updated`, '🔄');
            });
        }
      }
      
      if (data.type === 'position_update' && eventData.position) {
        const position = eventData.position;
        console.log('[RealtimeCollaboration] Processing position update:', position);
        
        // Call the callback if provided
        if (onPositionUpdate) {
          onPositionUpdate(eventData);
        }
        
        // Show notification (but not for user's own actions)
        if (!eventData.actingUserId || eventData.actingUserId !== session?.user?.id) {
          showNotification(`Position "${position.title}" updated`, '💼');
        }
      }
    }
  }, [lastMessage, isConnected, onCandidateUpdate, onPositionUpdate, session?.user?.id, showNotification]);

  return {
    isConnected,
    lastUpdate: lastMessage,
    reconnect,
    disconnect
  };
}
