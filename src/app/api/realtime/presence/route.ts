import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/realtime/presence:
 *   get:
 *     summary: Get presence information
 *     responses:
 *       200:
 *         description: Presence data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *   post:
 *     summary: Update presence information
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Presence updated
 */


export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, userName, userRole, currentPage } = body;

    if (!userId || !userName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In-memory presence update for now
    // In a real application, you would use Redis or a message queue
    // For this example, we'll just return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating presence:', error);
    return NextResponse.json({ 
      error: 'Failed to update presence',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // In-memory presence removal for now
    // In a real application, you would use Redis or a message queue
    // For this example, we'll just return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing presence:', error);
    return NextResponse.json({ 
      error: 'Failed to remove presence',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // In-memory online users for now
    // In a real application, you would use Redis or a message queue
    // For this example, we'll just return an empty array
    return NextResponse.json([]);
  } catch (error) {
    console.error('Error getting online users:', error);
    return NextResponse.json({ 
      error: 'Failed to get online users',
      details: (error as Error).message 
    }, { status: 500 });
  }
} 