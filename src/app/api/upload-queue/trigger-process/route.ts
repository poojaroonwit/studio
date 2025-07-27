import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only allow admins to manually trigger processing
  if (session.user.role !== 'Admin') {
    await logAudit('WARN', `Forbidden attempt to trigger queue processing by ${session.user.name || session.user.email || 'Unknown'}`, 'API:UploadQueue:TriggerProcess', session.user.id);
    return NextResponse.json({ error: 'Forbidden: Only admins can trigger processing' }, { status: 403 });
  }

  try {
    const baseUrl = request.nextUrl.origin;
    const processUrl = `${baseUrl}/api/upload-queue/process`;
    
    console.log(`[TRIGGER] Manually triggering queue processing at: ${processUrl}`);
    
    const response = await fetch(processUrl, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.PROCESSOR_API_KEY || '',
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    await logAudit('INFO', `Queue processing manually triggered by ${session.user.name || session.user.email}`, 'API:UploadQueue:TriggerProcess', session.user.id, {
      success: response.ok,
      result: result
    });

    if (response.ok) {
      return NextResponse.json({
        message: 'Queue processing triggered successfully',
        result: result
      });
    } else {
      return NextResponse.json({
        message: 'Queue processing triggered but no jobs were processed',
        result: result
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Error triggering queue processing:', error);
    await logAudit('ERROR', `Failed to trigger queue processing: ${(error as Error).message}`, 'API:UploadQueue:TriggerProcess', session.user.id);
    
    return NextResponse.json(
      { error: 'Failed to trigger queue processing' },
      { status: 500 }
    );
  }
} 