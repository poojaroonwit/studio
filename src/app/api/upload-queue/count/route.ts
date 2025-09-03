import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

    const actingUserId = session.user.id;
    const actingUserName = session.user.name || session.user.email || 'System';

    const client = await getPool().connect();
    
    try {
      // Single optimized query to get all counts at once
      const countQuery = `
        SELECT 
          COUNT(*) as total,
                  COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'failed') as error
        FROM upload_queue
      `;

      const result = await client.query(countQuery);
      const counts = result.rows[0];

      const response = {
        total: Number(counts.total) || 0,
        queued: Number(counts.queued) || 0,
        inprocess: Number(counts.inprocess) || 0,
        success: Number(counts.success) || 0,
        error: Number(counts.error) || 0,
        pending: Number(counts.queued || 0) + Number(counts.inprocess || 0)
      };

      // Log the count access for audit
      await logAudit(
        'INFO',
        `Upload queue count accessed by ${actingUserName}`,
        'API:UploadQueue:Count',
        actingUserId,
        { counts: response }
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
    console.error('Error fetching upload queue count:', error);
    return NextResponse.json({ 
      message: 'Error fetching upload queue count', 
      error: error.message 
    }, { status: 500 });
  }
}
