import { useState, useEffect, useCallback, useRef } from 'react';
import { useToastManager } from '@/hooks/use-toast-manager';
import { useSession } from 'next-auth/react';

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
    endpoint = '/api/candidates/sse',
    errorToastCooldownMs = 60000,
    maxReconnectAttempts = 10,
    reconnectDelayMs = 1000,
    maxReconnectDelayMs = 30000
  } = options;

  // Default showErrorNotifications to showNotifications value if not explicitly set
  const shouldShowErrorNotifications = showErrorNotifications !== undefined ? showErrorNotifications : showNotifications;

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const { success: showToast, error: showErrorToast } = useToastManager({ deduplicationWindowMs: 2000 });
  const lastErrorToastTimeRef = useRef<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef<number>(Date.now());
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

  const cleanupConnection = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (error) {
        console.error('Error closing SSE connection:', error);
      }
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
  }, []);

  const startHealthCheck = useCallback(() => {
    // Clear any existing health check
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    // Start health check every 30 seconds
    healthCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageTimeRef.current;
      
      // If no message received for more than 60 seconds, consider connection dead
      if (timeSinceLastMessage > 60000) {
        console.warn('Health check failed: No messages received for 60 seconds');
        setIsConnected(false);
        handleReconnect();
      }
    }, 30000);
  }, []);

  const handleReconnect = useCallback(() => {
    if (isReconnecting || reconnectAttempts >= maxReconnectAttempts) {
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        showErrorNotification('Real-time connection failed. Please refresh the page.');
      }
      return;
    }

    setIsReconnecting(true);
    cleanupConnection();

    // Calculate delay with exponential backoff
    const delay = Math.min(
      reconnectDelayMs * Math.pow(2, reconnectAttempts),
      maxReconnectDelayMs
    );

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      connectSSE();
    }, delay);
  }, [isReconnecting, reconnectAttempts, maxReconnectAttempts, reconnectDelayMs, maxReconnectDelayMs, cleanupConnection]);

  const connectSSE = useCallback(() => {
    try {
      const eventSource = new EventSource(endpoint);
      eventSourceRef.current = eventSource;

      // Handle connection events
      eventSource.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempts(0);
        setLastUpdate(new Date());
        lastMessageTimeRef.current = Date.now();
        lastErrorToastTimeRef.current = 0;
        
        // Start health check
        startHealthCheck();
      };

      eventSource.onerror = (error) => {
        console.error('❌ Real-time collaboration error:', error);
        setIsConnected(false);
        setIsReconnecting(false);
        
        // Only show error notification if not reconnecting
        if (!isReconnecting) {
          showErrorNotification('Real-time connection lost. Reconnecting...');
        }
        
        // Attempt to reconnect
        handleReconnect();
      };

      // Listen for candidate updates
      eventSource.addEventListener('candidate', (event: MessageEvent) => {
        try {
          lastMessageTimeRef.current = Date.now();
          const data = JSON.parse(event.data);
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
            
            setLastUpdate(new Date());
          }
        } catch (e) {
          console.error('Error parsing candidate update:', e);
        }
      });

      // Listen for transition updates
      eventSource.addEventListener('transition', (event: MessageEvent) => {
        try {
          lastMessageTimeRef.current = Date.now();
          const data = JSON.parse(event.data);
          if (data.type === 'transition_update' && data.transition) {
            const transition = data.transition;
            
            // Call the callback if provided
            if (onTransitionUpdate) {
              onTransitionUpdate(transition);
            }
            
            // Show notification (but not for user's own actions)
            if (!data.actingUserId || data.actingUserId !== session?.user?.id) {
              showNotification(`Status updated: ${transition.stage}`, '📋');
            }
            
            setLastUpdate(new Date());
          }
        } catch (e) {
          console.error('Error parsing transition update:', e);
        }
      });

      // Listen for recruitment stage updates
      eventSource.addEventListener('recruitment-stages', (event: MessageEvent) => {
        try {
          lastMessageTimeRef.current = Date.now();
          const updatedStages = JSON.parse(event.data);
          
          // Call the callback if provided
          if (onRecruitmentStagesUpdate) {
            onRecruitmentStagesUpdate(updatedStages);
          }
          
          // Show notification
          showNotification('Recruitment stages updated in real-time', '📋');
          
          setLastUpdate(new Date());
        } catch (e) {
          console.error('Error parsing recruitment stages update:', e);
        }
      });

      // Listen for comment updates
      eventSource.addEventListener('comment', (event: MessageEvent) => {
        try {
          lastMessageTimeRef.current = Date.now();
          const data = JSON.parse(event.data);
          if (data.type === 'comment_update' && data.comment) {
            // Call the callback if provided
            if (onCommentUpdate) {
              onCommentUpdate(data.comment);
            }
            
            // Show notification (but not for user's own actions)
            if (!data.actingUserId || data.actingUserId !== session?.user?.id) {
              showNotification(`New comment added by ${data.comment.createdBy || 'Team member'}`, '💬');
            }
            
            setLastUpdate(new Date());
          }
        } catch (e) {
          console.error('Error parsing comment update:', e);
        }
      });

      // Listen for resume updates
      eventSource.addEventListener('resume', (event: MessageEvent) => {
        try {
          lastMessageTimeRef.current = Date.now();
          const data = JSON.parse(event.data);
          if (data.type === 'resume_update' && data.resume) {
            // Call the callback if provided
            if (onResumeUpdate) {
              onResumeUpdate(data.resume);
            }
            
            // Show notification
            showNotification('Resume uploaded for candidate', '📄');
            
            setLastUpdate(new Date());
          }
        } catch (e) {
          console.error('Error parsing resume update:', e);
        }
      });

      // Listen for attachment updates
      eventSource.addEventListener('attachment', (event: MessageEvent) => {
        try {
          lastMessageTimeRef.current = Date.now();
          const data = JSON.parse(event.data);
          if (data.type === 'attachment_update' && data.attachment) {
            // Call the callback if provided
            if (onAttachmentUpdate) {
              onAttachmentUpdate(data.attachment);
            }
            
            // Show notification
            showNotification('New attachment added', '📎');
            
            setLastUpdate(new Date());
          }
        } catch (e) {
          console.error('Error parsing attachment update:', e);
        }
      });

      // Listen for position updates
      eventSource.addEventListener('position', (event: MessageEvent) => {
        try {
          lastMessageTimeRef.current = Date.now();
          const data = JSON.parse(event.data);
          if (data.type === 'position_update' && data.position) {
            // Call the callback if provided
            if (onPositionUpdate) {
              onPositionUpdate(data.position);
            }
            
            // Show notification (but not for user's own actions)
            if (!data.actingUserId || data.actingUserId !== session?.user?.id) {
              showNotification(`Position "${data.position.title}" updated`, '💼');
            }
            
            setLastUpdate(new Date());
          } else if (data.type === 'position_list_update') {
            // Call the callback if provided
            if (onPositionListUpdate) {
              onPositionListUpdate();
            }
            
            // Show notification
            showNotification('Position list updated', '📋');
            
            setLastUpdate(new Date());
          }
        } catch (e) {
          console.error('Error parsing position update:', e);
        }
      });

      // Listen for position statistics updates
      eventSource.addEventListener('position-statistics', (event: MessageEvent) => {
        try {
          lastMessageTimeRef.current = Date.now();
          const data = JSON.parse(event.data);
          if (data.type === 'position_statistics_update' && data.statistics) {
            // Call the callback if provided
            if (onPositionStatisticsUpdate) {
              onPositionStatisticsUpdate(data.statistics);
            }
            
            setLastUpdate(new Date());
          }
        } catch (e) {
          console.error('Error parsing position statistics update:', e);
        }
      });

      // Listen for keepalive messages
      eventSource.addEventListener('keepalive', () => {
        lastMessageTimeRef.current = Date.now();
      });

    } catch (error) {
      console.error('Error setting up SSE connection:', error);
      setIsConnected(false);
      setIsReconnecting(false);
      showErrorNotification('Failed to establish real-time connection');
      handleReconnect();
    }
  }, [
    endpoint,
    onCandidateUpdate,
    onTransitionUpdate,
    onCommentUpdate,
    onResumeUpdate,
    onAttachmentUpdate,
    onRecruitmentStagesUpdate,
    onPositionUpdate,
    onPositionListUpdate,
    onPositionStatisticsUpdate,
    showNotification,
    showErrorNotification,
    handleReconnect,
    startHealthCheck,
    isReconnecting,
    session
  ]);

  useEffect(() => {
    connectSSE();

    // Cleanup on unmount
    return () => {
      cleanupConnection();
    };
  }, [connectSSE, cleanupConnection]);

  // Reset reconnection attempts when connection is successful
  useEffect(() => {
    if (isConnected && reconnectAttempts > 0) {
      setReconnectAttempts(0);
    }
  }, [isConnected, reconnectAttempts]);

  return {
    isConnected,
    lastUpdate,
    isReconnecting,
    reconnectAttempts
  };
}
