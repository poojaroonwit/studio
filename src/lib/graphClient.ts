/**
 * Microsoft Graph API Client
 * 
 * Provides authentication and API calls to Microsoft Graph for Azure AD integration.
 * Uses client credentials flow for server-side authentication.
 */

interface GraphAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  expires_at: number; // Calculated timestamp
}

interface MeetingRoom {
  id: string;
  displayName: string;
  emailAddress: string;
  capacity: number | null;
  building: string | null;
  floorNumber: number | null;
  isWheelChairAccessible: boolean | null;
  address: {
    city: string | null;
    countryOrRegion: string | null;
    postalCode: string | null;
    state: string | null;
    street: string | null;
  } | null;
}

// Token cache for client credentials flow
let cachedToken: GraphAccessToken | null = null;

/**
 * Check if Azure AD is properly configured for Graph API
 */
export function isGraphConfigured(): boolean {
  const hasClientId = !!process.env.AZURE_AD_CLIENT_ID && 
    process.env.AZURE_AD_CLIENT_ID !== 'your_azure_ad_application_client_id';
  const hasClientSecret = !!process.env.AZURE_AD_CLIENT_SECRET && 
    process.env.AZURE_AD_CLIENT_SECRET !== 'your_azure_ad_client_secret_value';
  const hasTenantId = !!process.env.AZURE_AD_TENANT_ID && 
    process.env.AZURE_AD_TENANT_ID !== 'your_azure_ad_directory_tenant_id';
  
  return hasClientId && hasClientSecret && hasTenantId;
}

/**
 * Get access token using client credentials flow
 * This is suitable for server-side API calls that don't require user context
 */
export async function getGraphAccessToken(): Promise<string | null> {
  if (!isGraphConfigured()) {
    console.warn('[GraphClient] Azure AD is not properly configured');
    return null;
  }

  // Check if cached token is still valid (with 5 minute buffer)
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now + 300000) {
    return cachedToken.access_token;
  }

  try {
    const tenantId = process.env.AZURE_AD_TENANT_ID!;
    const clientId = process.env.AZURE_AD_CLIENT_ID!;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GraphClient] Token request failed:', response.status, errorText);
      return null;
    }

    const tokenData = await response.json();
    
    // Cache the token with calculated expiry
    cachedToken = {
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      expires_at: now + (tokenData.expires_in * 1000),
    };

    return cachedToken.access_token;
  } catch (error) {
    console.error('[GraphClient] Error getting access token:', error);
    return null;
  }
}

/**
 * Fetch meeting rooms from Microsoft Graph Places API
 * Requires Places.Read.All application permission
 */
export async function fetchMeetingRooms(): Promise<MeetingRoom[]> {
  const accessToken = await getGraphAccessToken();
  if (!accessToken) {
    console.warn('[GraphClient] No access token available for fetching meeting rooms');
    return [];
  }

  try {
    const graphEndpoint = 'https://graph.microsoft.com/v1.0/places/microsoft.graph.room';
    
    const response = await fetch(graphEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GraphClient] Failed to fetch meeting rooms:', response.status, errorText);
      
      // Check for specific error codes
      if (response.status === 403) {
        console.error('[GraphClient] Permission denied - ensure Places.Read.All permission is configured and admin consent granted');
      }
      
      return [];
    }

    const data = await response.json();
    
    // Map the response to our MeetingRoom interface
    const rooms: MeetingRoom[] = (data.value || []).map((room: any) => ({
      id: room.id,
      displayName: room.displayName || room.nickname || 'Unknown Room',
      emailAddress: room.emailAddress || '',
      capacity: room.capacity || null,
      building: room.building || null,
      floorNumber: room.floorNumber || null,
      isWheelChairAccessible: room.isWheelChairAccessible ?? null,
      address: room.address ? {
        city: room.address.city || null,
        countryOrRegion: room.address.countryOrRegion || null,
        postalCode: room.address.postalCode || null,
        state: room.address.state || null,
        street: room.address.street || null,
      } : null,
    }));

    return rooms;
  } catch (error) {
    console.error('[GraphClient] Error fetching meeting rooms:', error);
    return [];
  }
}

/**
 * Fetch room lists (collections of rooms) from Microsoft Graph
 */
export async function fetchRoomLists(): Promise<Array<{ id: string; displayName: string; emailAddress: string }>> {
  const accessToken = await getGraphAccessToken();
  if (!accessToken) {
    return [];
  }

  try {
    const graphEndpoint = 'https://graph.microsoft.com/v1.0/places/microsoft.graph.roomList';
    
    const response = await fetch(graphEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[GraphClient] Failed to fetch room lists:', response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.value || []).map((list: any) => ({
      id: list.id,
      displayName: list.displayName || 'Unknown List',
      emailAddress: list.emailAddress || '',
    }));
  } catch (error) {
    console.error('[GraphClient] Error fetching room lists:', error);
    return [];
  }
}

/**
 * Test the Graph API connection
 */
export async function testGraphConnection(): Promise<{ success: boolean; error?: string; roomCount?: number }> {
  try {
    if (!isGraphConfigured()) {
      return { success: false, error: 'Azure AD is not configured' };
    }

    const token = await getGraphAccessToken();
    if (!token) {
      return { success: false, error: 'Failed to obtain access token' };
    }

    const rooms = await fetchMeetingRooms();
    return { success: true, roomCount: rooms.length };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
