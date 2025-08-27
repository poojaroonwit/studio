/**
 * Utility functions for debugging position loading issues
 */

export interface PositionDebugInfo {
  positionId: string;
  timestamp: string;
  userAgent: string;
  sessionInfo: {
    userId?: string;
    userEmail?: string;
    userRole?: string;
  };
  requestInfo: {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  errorDetails?: {
    message: string;
    status?: number;
    statusText?: string;
    responseText?: string;
  };
}

export function logPositionDebugInfo(info: PositionDebugInfo) {
  console.group(`🔍 Position Debug: ${info.positionId}`);
  console.log('Timestamp:', info.timestamp);
  console.log('User Agent:', info.userAgent);
  console.log('Session Info:', info.sessionInfo);
  console.log('Request Info:', info.requestInfo);
  if (info.errorDetails) {
    console.error('Error Details:', info.errorDetails);
  }
  console.groupEnd();
}

export function createPositionDebugInfo(
  positionId: string,
  request: Request,
  session?: any,
  error?: any
): PositionDebugInfo {
  const debugInfo: PositionDebugInfo = {
    positionId,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server-side',
    sessionInfo: {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role,
    },
    requestInfo: {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
    },
  };

  if (error) {
    debugInfo.errorDetails = {
      message: error.message || 'Unknown error',
      status: error.status,
      statusText: error.statusText,
      responseText: error.responseText,
    };
  }

  return debugInfo;
}

export async function testPositionEndpoint(positionId: string): Promise<{
  success: boolean;
  status: number;
  data?: any;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/positions/${positionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: data.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export function validatePositionId(positionId: string): boolean {
  // Check if it's a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(positionId);
}
