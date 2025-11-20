export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';

// Test webhook connectivity
export async function POST(request: NextRequest) {
  try {
    // Only allow Admin or SYSTEM_SETTINGS_MANAGE
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasPermission(session.user, 'WEBHOOKS_EDIT')) {
      await logAudit('WARN', `Forbidden attempt to test webhook by user ${session?.user?.email || 'Unknown'}.`, 'API:WebhookTest', session?.user?.id);
      return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const { webhookUrl, webhookToken } = await request.json();
    
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 });
    }
    
    // Prepare test payload
    const testPayload = {
      inputs: {
        test: true,
        timestamp: new Date().toISOString(),
        message: "This is a connectivity test from NCC Candidate Management System"
      },
      response_mode: 'blocking',
      user: 'system-test'
    };
    
    // Prepare headers
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (webhookToken) {
      headers['Authorization'] = `Bearer ${webhookToken}`;
    }
    

    
    const startTime = Date.now();
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(30000), // 30 second timeout for test
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    let responseBody;
    try {
      responseBody = await response.text();
      // Try to parse as JSON
      try {
        responseBody = JSON.parse(responseBody);
      } catch {
        // Keep as text if not JSON
      }
    } catch (textErr) {
      responseBody = 'Unable to read response body';
    }
    
    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      responseBody,
      headers: Object.fromEntries(response.headers.entries()),
      testUrl: webhookUrl,
      testPayload
    };
    

    
    await logAudit('AUDIT', `Webhook connectivity test completed for ${webhookUrl}`, 'API:WebhookTest', session?.user?.id, {
      webhookUrl,
      success: response.ok,
      status: response.status,
      responseTime
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error(`[Webhook Test] Error:`, error);
    
    let errorMessage = 'Unknown error during webhook test';
    let errorDetails = '';
    
    if (error && typeof error === 'object') {
      if ('message' in error && typeof (error as any).message === 'string') {
        errorMessage = (error as any).message;
      }
      
      if (error instanceof TypeError && errorMessage.includes('fetch')) {
        errorMessage = `Network error: ${errorMessage}`;
        errorDetails = 'This usually indicates a DNS resolution failure, network connectivity issue, or the webhook URL is not accessible.';
      } else if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = 'Webhook test timed out (30 seconds)';
        errorDetails = 'The webhook test request took too long to complete and was aborted.';
      } else if (error instanceof Error) {
        errorDetails = `Error type: ${error.name}, Stack: ${error.stack}`;
      }
    }
    
    // Get session for audit logging
    const session = await getServerSession(authOptions);
    await logAudit('ERROR', `Webhook connectivity test failed`, 'API:WebhookTest', session?.user?.id, {
      error: errorMessage,
      details: errorDetails
    });
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 
