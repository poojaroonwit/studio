import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

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
  endpoint?: string;
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
    endpoint = '/api/candidates/sse'
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const showNotification = useCallback((message: string, icon: string = '🔄') => {
    if (showNotifications) {
      toast.success(message, {
        duration: 3000,
        icon
      });
    }
  }, [showNotifications]);

  useEffect(() => {
    const eventSource = new EventSource(endpoint);

    // Handle connection events
    eventSource.onopen = () => {
      console.log('🔄 Real-time collaboration connected');
      setIsConnected(true);
      setLastUpdate(new Date());
    };

    eventSource.onerror = (error) => {
      console.error('❌ Real-time collaboration error:', error);
      setIsConnected(false);
      if (showNotifications) {
        toast.error('Real-time connection lost. Reconnecting...', {
          duration: 5000
        });
      }
    };

    // Listen for candidate updates
    eventSource.addEventListener('candidate', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'candidate_update' && data.candidate) {
          const updatedCandidate = data.candidate;
          
          // Call the callback if provided
          if (onCandidateUpdate) {
            onCandidateUpdate(updatedCandidate);
          }
          
          // Show notification
          if (updatedCandidate.status) {
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
        const data = JSON.parse(event.data);
        if (data.type === 'transition_update' && data.transition) {
          const transition = data.transition;
          
          // Call the callback if provided
          if (onTransitionUpdate) {
            onTransitionUpdate(transition);
          }
          
          // Show notification
          showNotification(`Status updated: ${transition.stage}`, '📋');
          
          setLastUpdate(new Date());
        }
      } catch (e) {
        console.error('Error parsing transition update:', e);
      }
    });

    // Listen for recruitment stage updates
    eventSource.addEventListener('recruitment-stages', (event: MessageEvent) => {
      try {
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
        const data = JSON.parse(event.data);
        if (data.type === 'comment_update' && data.comment) {
          // Call the callback if provided
          if (onCommentUpdate) {
            onCommentUpdate(data.comment);
          }
          
          // Show notification
          showNotification(`New comment added by ${data.comment.createdBy || 'Team member'}`, '💬');
          
          setLastUpdate(new Date());
        }
      } catch (e) {
        console.error('Error parsing comment update:', e);
      }
    });

    // Listen for resume updates
    eventSource.addEventListener('resume', (event: MessageEvent) => {
      try {
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
        const data = JSON.parse(event.data);
        if (data.type === 'position_update' && data.position) {
          // Call the callback if provided
          if (onPositionUpdate) {
            onPositionUpdate(data.position);
          }
          
          // Show notification
          showNotification(`Position "${data.position.title}" updated`, '💼');
          
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

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
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
    showNotification
  ]);

  return {
    isConnected,
    lastUpdate
  };
}
