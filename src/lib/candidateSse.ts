// src/lib/candidateSse.ts
// This file now uses the unified real-time system
// Import the unified broadcast functions
import { broadcastToAll, broadcastToUser } from '@/lib/realtime';

// Keep the old controllers for backward compatibility during transition
const controllers = new Set<ReadableStreamDefaultController<any>>();
const userControllers = new Map<string, Set<ReadableStreamDefaultController<any>>>();

// Cleanup stale controllers periodically
const __globalRealtime = globalThis as unknown as { __candidateSseCleanup?: NodeJS.Timeout };
if (!__globalRealtime.__candidateSseCleanup) {
	__globalRealtime.__candidateSseCleanup = setInterval(() => {
		const initialCount = controllers.size;
		for (const controller of controllers) {
			try {
				// Try to send a keepalive to test if the connection is still alive
				controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
			} catch (e) {
				// Remove the controller if it's causing errors
				controllers.delete(controller);
				// Also remove from user-specific tracking
				for (const [userId, userControllerSet] of userControllers.entries()) {
					if (userControllerSet.has(controller)) {
						userControllerSet.delete(controller);
						if (userControllerSet.size === 0) {
							userControllers.delete(userId);
						}
					}
				}
			}
		}
	}, 60000); // Check every minute
}

export function addSseController(controller: ReadableStreamDefaultController<any>, userId?: string) {
  controllers.add(controller);
  
  // Track user-specific controllers if userId is provided
  if (userId) {
    if (!userControllers.has(userId)) {
      userControllers.set(userId, new Set());
    }
    userControllers.get(userId)!.add(controller);
  }
}

export function removeSseController(controller: ReadableStreamDefaultController<any>) {
  controllers.delete(controller);
  
  // Remove from user-specific tracking
  for (const [userId, userControllerSet] of userControllers.entries()) {
    if (userControllerSet.has(controller)) {
      userControllerSet.delete(controller);
      if (userControllerSet.size === 0) {
        userControllers.delete(userId);
      }
    }
  }
}

export function broadcastCandidateUpdate(candidate: any, actingUserId?: string) {
  const data = { 
    type: 'candidate_update', 
    candidateId: candidate.id, 
    candidate,
    actingUserId 
  };
  
  // Use unified broadcast system
  broadcastToAll('candidate_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: candidate\ndata: ${JSON.stringify(data)}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting candidate update:', e);
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
}

export function broadcastCandidateListUpdate() {
  const data = { type: 'candidate_list_update', timestamp: new Date().toISOString() };
  
  // Use unified broadcast system
  broadcastToAll('candidate_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: candidate\ndata: ${JSON.stringify(data)}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting candidate list update:', e);
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
}

export function broadcastCandidateCommentUpdate(payload: { candidateId: string, comment: any, action: string }, actingUserId?: string) {
  const data = { ...payload, actingUserId };
  
  // Use unified broadcast system
  broadcastToAll('candidate_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: comment\ndata: ${JSON.stringify(data)}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting comment update:', e);
      controllers.delete(controller);
    }
  }
}

export function broadcastCandidateResumeUpdate(payload: { candidateId: string, resume: any, action: string }) {
  const data = payload;
  
  // Use unified broadcast system
  broadcastToAll('candidate_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: resume\ndata: ${JSON.stringify(payload)}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting resume update:', e);
      controllers.delete(controller);
    }
  }
}

export function broadcastCandidateTransitionUpdate(payload: { candidateId: string, transition: any, action: string }, actingUserId?: string) {
  const data = { ...payload, actingUserId };
  
  // Use unified broadcast system
  broadcastToAll('candidate_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: transition\ndata: ${JSON.stringify({ ...payload, actingUserId })}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting transition update:', e);
      controllers.delete(controller);
    }
  }
}

export function broadcastCandidateAttachmentUpdate(payload: { candidateId: string, attachment: any, action: string }, actingUserId?: string) {
  const data = { ...payload, actingUserId };
  
  // Use unified broadcast system
  broadcastToAll('candidate_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: attachment\ndata: ${JSON.stringify({ ...payload, actingUserId })}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting attachment update:', e);
      controllers.delete(controller);
    }
  }
}

export function broadcastRecruitmentStagesUpdate(stages: any[]) {
  const data = stages;
  
  // Use unified broadcast system
  broadcastToAll('candidate_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: recruitment-stages\ndata: ${JSON.stringify(stages)}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting recruitment stages update:', e);
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
}

export function broadcastPositionUpdate(position: any, actingUserId?: string) {
  const data = { 
    type: 'position_update', 
    positionId: position.id, 
    position,
    actingUserId 
  };
  
  // Use unified broadcast system
  broadcastToAll('position_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: position\ndata: ${JSON.stringify(data)}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting position update:', e);
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
}

export function broadcastPositionListUpdate() {
  const data = { type: 'position_list_update' };
  
  // Use unified broadcast system
  broadcastToAll('position_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: position\ndata: ${JSON.stringify({ type: 'position_list_update' })}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting position list update:', e);
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
}

export function broadcastPositionStatisticsUpdate(statistics: any) {
  const data = { type: 'position_statistics_update', statistics };
  
  // Use unified broadcast system
  broadcastToAll('position_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: position-statistics\ndata: ${JSON.stringify({ type: 'position_statistics_update', statistics })}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting position statistics update:', e);
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
}

export function broadcastNotification(notification: any) {
  const data = { type: 'new_notification', notification };
  
  // Use unified broadcast system
  broadcastToAll('notification_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: notification\ndata: ${JSON.stringify({ type: 'new_notification', notification })}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting notification:', e);
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
}

export function broadcastUserNotification(userId: string, notification: any) {
  const data = { type: 'new_notification', notification, targetUserId: userId };
  
  // Use unified broadcast system
  broadcastToUser(userId, 'notification_update', data);
  
  // Keep old system for backward compatibility
  const oldData = `event: notification\ndata: ${JSON.stringify({ type: 'new_notification', notification, targetUserId: userId })}\n\n`;
  const encodedData = new TextEncoder().encode(oldData);
  
  // Only send to controllers belonging to the target user
  const userControllerSet = userControllers.get(userId);
  if (userControllerSet) {
    for (const controller of userControllerSet) {
      try {
        controller.enqueue(encodedData);
      } catch (e) {
        console.error('[SSE] Error broadcasting user notification:', e);
        // Remove the controller if it's causing errors
        userControllerSet.delete(controller);
        controllers.delete(controller);
        if (userControllerSet.size === 0) {
          userControllers.delete(userId);
        }
      }
    }
  }
} 