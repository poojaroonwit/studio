
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addConnection, removeConnection, broadcastToAll } from '@/lib/realtime';
import { 
  setUserPresence, 
  getAllUserPresence, 
  markUserOffline, 
  cleanupOfflineUsers,
  type UserPresence 
} from '@/lib/presence-store';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const userId = session.user.id;
  let keepaliveInterval: NodeJS.Timeout | null = null;
  let presenceInterval: NodeJS.Timeout | null = null;
  let isConnected = false;

  const stream = new ReadableStream({
    start(controller) {
      try {
        addConnection(userId, controller);
        isConnected = true;
        
        // Send initial connection confirmation
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`));
        
        // Update user's presence when they connect
        const presence: UserPresence = {
          userId,
          userName: session.user.name || session.user.email || 'User',
          userRole: session.user.role || 'User',
          avatarUrl: (session.user as any).avatarUrl || session.user.image,
          personalColor: (session.user as any).personalColor,
          currentPage: '/',
          lastSeen: new Date(),
          isOnline: true
        };
        
        setUserPresence(userId, presence);
        
        // Broadcast user joined event
        try {
          broadcastToAll('presence_update', {
            userId,
            action: 'joined',
            userData: {
              userId: presence.userId,
              userName: presence.userName,
              userRole: presence.userRole,
              avatarUrl: presence.avatarUrl,
              personalColor: presence.personalColor,
              currentPage: presence.currentPage,
              lastSeen: presence.lastSeen.toISOString(),
              isOnline: presence.isOnline
            }
          });
        } catch (broadcastError) {
          console.error('[Unified Realtime] Failed to broadcast user joined:', broadcastError);
        }
        
        // Send initial user list to the new user
        try {
          const allUsers = getAllUserPresence().map(presence => ({
            userId: presence.userId,
            userName: presence.userName,
            userRole: presence.userRole,
            avatarUrl: presence.avatarUrl,
            personalColor: presence.personalColor,
            currentPage: presence.currentPage,
            lastSeen: presence.lastSeen.toISOString(),
            isOnline: presence.isOnline
          }));
          
          controller.enqueue(encoder.encode(`event: user_list_update\ndata: ${JSON.stringify({ users: allUsers })}\n\n`));
        } catch (userListError) {
          console.error('[Unified Realtime] Failed to send user list:', userListError);
        }
        
        // Send keepalive every 30 seconds
        keepaliveInterval = setInterval(() => {
          try {
            if (isConnected) {
              controller.enqueue(encoder.encode(`event: keepalive\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`));
            }
          } catch (error) {
            console.error('[Unified Realtime] Keepalive failed:', error);
            cleanup();
          }
        }, 30000);

        // Send presence updates every 10 seconds
        presenceInterval = setInterval(() => {
          try {
            if (!isConnected) return;
            
            // Clean up offline users
            cleanupOfflineUsers();
            
            // Get updated user list
            const allUsers = getAllUserPresence().map(presence => ({
              userId: presence.userId,
              userName: presence.userName,
              userRole: presence.userRole,
              avatarUrl: presence.avatarUrl,
              personalColor: presence.personalColor,
              currentPage: presence.currentPage,
              lastSeen: presence.lastSeen.toISOString(),
              isOnline: presence.isOnline
            }));
            
            // Broadcast updated user list to all users
            broadcastToAll('user_list_update', { users: allUsers });
          } catch (error) {
            console.error('[Unified Realtime] Presence update failed:', error);
            // Don't cleanup on presence update errors, just log them
          }
        }, 10000);

        // Cleanup function
        const cleanup = () => {
          isConnected = false;
          
          if (keepaliveInterval) {
            clearInterval(keepaliveInterval);
            keepaliveInterval = null;
          }
          if (presenceInterval) {
            clearInterval(presenceInterval);
            presenceInterval = null;
          }
          
          // Mark user as offline
          try {
            markUserOffline(userId);
            
            // Broadcast user left event
            broadcastToAll('presence_update', {
              userId,
              action: 'left'
            });
          } catch (error) {
            console.error('[Unified Realtime] Failed to mark user offline:', error);
          }
          
          removeConnection(userId);
        };

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          cleanup();
        });

        // Store cleanup function for cancel method
        (controller as any).cleanup = cleanup;

      } catch (error) {
        console.error('[Unified Realtime] Failed to start stream:', error);
        controller.close();
      }
    },
    cancel() {
      try {
        isConnected = false;
        
        if (keepaliveInterval) {
          clearInterval(keepaliveInterval);
          keepaliveInterval = null;
        }
        if (presenceInterval) {
          clearInterval(presenceInterval);
          presenceInterval = null;
        }
        
        // Mark user as offline
        try {
          markUserOffline(userId);
          
          // Broadcast user left event
          broadcastToAll('presence_update', {
            userId,
            action: 'left'
          });
        } catch (error) {
          console.error('[Unified Realtime] Failed to mark user offline on cancel:', error);
        }
        
        removeConnection(userId);
      } catch (error) {
        console.error('[Unified Realtime] Error in cancel:', error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
