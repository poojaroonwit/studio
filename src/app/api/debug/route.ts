import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  // Only allow in development or with a secret key
  if (process.env.NODE_ENV === 'production' && !request.nextUrl.searchParams.get('debug_key')) {
    return NextResponse.json({ error: 'Debug endpoint not available in production', status: 403 });
  }

  const debugKey = request.nextUrl.searchParams.get('debug_key');
  if (process.env.NODE_ENV === 'production' && debugKey !== process.env.DEBUG_SECRET_KEY) {
    return NextResponse.json({ error: 'Invalid debug key', status: 403 });
  }

  try {
    // Check Azure AD configuration
    const hasClientId = process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_ID !== 'your_azure_ad_application_client_id';
    const hasClientSecret = process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_CLIENT_SECRET !== 'your_azure_ad_client_secret_value';
    const hasTenantId = process.env.AZURE_AD_TENANT_ID && process.env.AZURE_AD_TENANT_ID !== 'your_azure_ad_directory_tenant_id';
    
    const isAzureAdConfigured = hasClientId && hasClientSecret && hasTenantId;

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      azureAd: {
        isConfigured: isAzureAdConfigured,
        hasClientId,
        hasClientSecret,
        hasTenantId,
        clientIdLength: process.env.AZURE_AD_CLIENT_ID?.length || 0,
        clientSecretLength: process.env.AZURE_AD_CLIENT_SECRET?.length || 0,
        tenantIdLength: process.env.AZURE_AD_TENANT_ID?.length || 0
      },
      nextAuth: {
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        secretLength: process.env.NEXTAUTH_SECRET?.length || 0,
        hasUrl: !!process.env.NEXTAUTH_URL,
        url: process.env.NEXTAUTH_URL,
      },
      database: {
        hasUrl: !!process.env.DATABASE_URL,
        urlLength: process.env.DATABASE_URL?.length || 0
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DEBUG] Error in debug endpoint:', error);
    return NextResponse.json({ error: 'Debug endpoint error', status: 500 });
  }
} 