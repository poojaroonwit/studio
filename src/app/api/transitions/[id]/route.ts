// src/app/api/transitions/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { broadcastCandidateTransitionUpdate } from '@/lib/candidateSse';

export const dynamic = "force-dynamic";

const updateTransitionSchema = z.object({
  notes: z.string().optional().nullable(),
});

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/transitions\/([^/]+)/);
  return match ? match[1] : null;
}

export async function PUT(request: NextRequest) {
  const id = extractIdFromUrl(request);
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  if (!actingUserId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error: any) {
    return NextResponse.json({ message: "Error parsing request body", error: error.message }, { status: 400 });
  }

  const validationResult = updateTransitionSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: "Invalid input", errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }
  
  const client = await getPool().connect();
  try {
    // First get the current transition record to get the candidateId
    const getTransitionQuery = 'SELECT * FROM "TransitionRecord" WHERE id = $1';
    const getResult = await client.query(getTransitionQuery, [id]);
    
    if (getResult.rowCount === 0) {
      return NextResponse.json({ message: "Transition record not found" }, { status: 404 });
    }
    
    const currentTransition = getResult.rows[0];
    
    // Update the transition record
    const updateQuery = 'UPDATE "TransitionRecord" SET notes = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *';
    const result = await client.query(updateQuery, [validationResult.data.notes, id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Transition record not found" }, { status: 404 });
    }
    
    const updatedTransition = result.rows[0];
    
    // Broadcast the transition update
    broadcastCandidateTransitionUpdate({
      candidateId: currentTransition.candidateId,
      transition: updatedTransition,
      action: 'update'
    });
    
    await logAudit('AUDIT', `Transition record (ID: ${id}) was updated.`, 'API:Transitions:Update', actingUserId, { transitionId: id });
    return NextResponse.json(updatedTransition, { status: 200 });
  } catch (error: any) {
    console.error(`Failed to update transition record ${id}:`, error);
    await logAudit('ERROR', `Failed to update transition record (ID: ${id}). Error: ${error.message}`, 'API:Transitions:Update', actingUserId);
    return NextResponse.json({ message: "Error updating transition record", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  if (!actingUserId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  
  const client = await getPool().connect();
  try {
    // First get the transition record to get the candidateId before deleting
    const getTransitionQuery = 'SELECT * FROM "TransitionRecord" WHERE id = $1';
    const getResult = await client.query(getTransitionQuery, [id]);
    
    if (getResult.rowCount === 0) {
      return NextResponse.json({ message: "Transition record not found" }, { status: 404 });
    }
    
    const transitionToDelete = getResult.rows[0];
    
    // Delete the transition record
    const result = await client.query('DELETE FROM "TransitionRecord" WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Transition record not found" }, { status: 404 });
    }
    
    // Broadcast the transition deletion
    broadcastCandidateTransitionUpdate({
      candidateId: transitionToDelete.candidateId,
      transition: transitionToDelete,
      action: 'delete'
    });
    
    await logAudit('AUDIT', `Transition record (ID: ${id}) was deleted.`, 'API:Transitions:Delete', actingUserId, { transitionId: id });
    return NextResponse.json({ message: "Transition record deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error(`Failed to delete transition record ${id}:`, error);
    await logAudit('ERROR', `Failed to delete transition record (ID: ${id}). Error: ${error.message}`, 'API:Transitions:Delete', actingUserId);
    return NextResponse.json({ message: "Error deleting transition record", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

    