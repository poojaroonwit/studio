export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { broadcastCandidateUpdate, broadcastNotification } from '@/lib/simple-broadcaster';
import { getPool } from '@/lib/db';

import { auth } from '@/auth';
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const actingUserId = session?.user?.id;

    if (!actingUserId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, updates } = await request.json();

    if (!candidateId || !updates) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Update candidate in database
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Build update query dynamically
      const updateFields = Object.keys(updates).map((key, index) => `"${key}" = $${index + 2}`);
      const updateValues = Object.values(updates);
      
      const updateQuery = `
        UPDATE "Candidate" 
        SET ${updateFields.join(', ')}, "updatedAt" = NOW() 
        WHERE id = $1 
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [candidateId, ...updateValues]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
      }
      
      const updatedCandidate = result.rows[0];
      await client.query('COMMIT');

      // Broadcast the update using simple SSE
      broadcastCandidateUpdate(updatedCandidate, actingUserId);
      
      // Send notification
      broadcastNotification(
        `Candidate ${updatedCandidate.name} updated successfully`, 
        'success', 
        actingUserId
      );

      return NextResponse.json({ 
        message: 'Candidate updated successfully',
        candidate: updatedCandidate 
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating candidate:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
