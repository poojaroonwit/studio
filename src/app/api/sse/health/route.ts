import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { userConnections } from '@/lib/unified-connection-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        message: 'No valid user session found',
        timestamp: new Date().toISOString()
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;
    const userConnection = userConnections.get(userId);
    
    // Get connection health information
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      userId,
      connection: userConnection ? {
        isConnected: true,
        connectionStartTime: userConnection.connectionStartTime,
        lastActivity: userConnection.lastActivity,
        uptime: Date.now() - userConnection.connectionStartTime,
        hasKeepaliveInterval: !!userConnection.keepaliveInterval
      } : {
        isConnected: false,
        message: 'No active connection found'
      },
      recommendations: []
    };

    // Add recommendations based on connection state
    if (!userConnection) {
      healthData.recommendations.push('Establish new SSE connection');
    } else {
      const uptime = Date.now() - userConnection.connectionStartTime;
      if (uptime > 300000) { // 5 minutes
        healthData.recommendations.push('Connection is stable (running for over 5 minutes)');
      }
      if (!userConnection.keepaliveInterval) {
        healthData.recommendations.push('Keepalive interval not set - connection may be unstable');
      }
    }

    // Add general SSE recommendations
    healthData.recommendations.push('Ensure nginx is configured with proper SSE settings');
    healthData.recommendations.push('Check for network interruptions or proxy timeouts');
    healthData.recommendations.push('Verify server is running and accessible');

    return new Response(JSON.stringify(healthData, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('[SSE Health] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'Failed to check SSE health',
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
