import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view process queue data
    // Users should be able to view queue data if they can manage uploads or have system monitoring permissions
    if (!hasPermission(session.user, 'UPLOAD_QUEUE_VIEW') && 
        !hasPermission(session.user, 'SYSTEM_MONITORING_VIEW')) {
      return NextResponse.json({ message: 'Forbidden: Insufficient permissions to view process queue data' }, { status: 403 });
    }

    const actingUserId = session.user.id;
    const actingUserName = session.user.name || session.user.email || 'System';

    const client = await getPool().connect();
    
    try {
      // Query to get pending count (queued + inprocess)
      const countQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'queued') as queued,
          COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess
        FROM upload_queue
      `;

      const result = await client.query(countQuery);
      const counts = result.rows[0];

      const pendingCount = Number(counts.queued || 0) + Number(counts.inprocess || 0);

      const response = {
        count: pendingCount
      };

      // Log the count access for audit
      await logAudit(
        'INFO',
        `Process queue pending count accessed by ${actingUserName}`,
        'API:ProcessQueue:PendingCount',
        actingUserId,
        { pendingCount }
      );

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
          'X-Response-Time': `${Date.now() - Date.now()}ms`
        }
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Error fetching process queue pending count:', error);
    return NextResponse.json({ 
      message: 'Error fetching process queue pending count', 
      error: error.message 
    }, { status: 500 });
  }
}
