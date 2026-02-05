import { auth } from '@/auth';
// src/app/api/transitions/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { broadcastApplicantUpdate } from '@/lib/simple-broadcaster';
import { hasAnyPermission, canUpdateApplicantPipelineStage } from '@/lib/permissions';

export const dynamic = 'force-dynamic';


const updateTransitionSchema = z.object({
  notes: z.string().optional().nullable(),
  date: z.string().datetime().optional(),
});

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/transitions\/([^/]+)/);
  return match ? match[1] : null;
}

export async function PUT(request: NextRequest) {
  const id = extractIdFromUrl(request);
  if (!id) {
    return NextResponse.json({ message: "Invalid transition ID" }, { status: 400 });
  }
  
  // SECURITY: Validate UUID format to prevent injection attacks
  const { validateUuid } = await import('@/lib/security');
  if (!validateUuid(id)) {
    console.error('[SECURITY] Invalid UUID format in transitions PUT request:', id);
    return NextResponse.json({ message: "Invalid transition ID format" }, { status: 400 });
  }
  
  const session = await auth();
  const actingUserId = session?.user?.id;
  if (!actingUserId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Initial permission check - we'll do detailed ownership check after retrieving transition data
  const hasGlobalTransitionPermission = hasAnyPermission(session.user, ['USERS_MANAGE', 'APPLICANTS_PIPELINE_STAGE_UPDATE']);
  const hasOwnTransitionPermission = hasAnyPermission(session.user, ['APPLICANTS_PIPELINE_STAGE_UPDATE_OWN']);
  
  if (!hasGlobalTransitionPermission && !hasOwnTransitionPermission) {
    await logAudit('WARN', `Forbidden attempt to update transition by ${session.user.name || session.user.email || 'Unknown'}`, 'API:Transitions:Update', actingUserId);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to manage Applicant transitions' }, { status: 403 });
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
    // First get the current transition record and Applicant data for ownership check
    const getTransitionQuery = `
      SELECT tr.*, c."recruiterId" 
      FROM "TransitionRecord" tr 
      JOIN "Candidate" c ON tr."candidateId" = c.id 
      WHERE tr.id = $1
    `;
    const getResult = await client.query(getTransitionQuery, [id]);
    
    if (getResult.rowCount === 0) {
      return NextResponse.json({ message: "Transition record not found" }, { status: 404 });
    }
    
    const currentTransition = getResult.rows[0];
    
    // Check ownership-based permissions for transition update
    if (!hasGlobalTransitionPermission) {
      const transitionPermission = canUpdateApplicantPipelineStage(session.user, currentTransition.recruiterId, actingUserId);
      if (!transitionPermission.canUpdate) {
        await logAudit('WARN', `Forbidden attempt to update transition by ${session.user.name || session.user.email || 'Unknown'}: ${transitionPermission.reason}`, 'API:Transitions:Update', actingUserId);
        return NextResponse.json({ message: `Forbidden: ${transitionPermission.reason}` }, { status: 403 });
      }
    }
    
    // Update the transition record
    const updateFields = ['notes = $1', '"updatedAt" = NOW()'];
    const updateValues = [validationResult.data.notes];
    let paramIndex = 2;
    
    if (validationResult.data.date) {
      updateFields.push(`date = $${paramIndex}`);
      updateValues.push(validationResult.data.date);
      paramIndex++;
    }
    
    const updateQuery = `UPDATE "TransitionRecord" SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    updateValues.push(id);
    const result = await client.query(updateQuery, updateValues);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Transition record not found" }, { status: 404 });
    }
    
    const updatedTransition = result.rows[0];
    
    // Broadcast the transition update
    broadcastApplicantUpdate({
      candidateId: currentTransition.candidateId,
      transition: updatedTransition,
      action: 'update'
    }, session.user.id);
    
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
  if (!id) {
    return NextResponse.json({ message: "Invalid transition ID" }, { status: 400 });
  }
  
  // SECURITY: Validate UUID format to prevent injection attacks
  const { validateUuid } = await import('@/lib/security');
  if (!validateUuid(id)) {
    console.error('[SECURITY] Invalid UUID format in transitions DELETE request:', id);
    return NextResponse.json({ message: "Invalid transition ID format" }, { status: 400 });
  }
  
  const session = await auth();
  const actingUserId = session?.user?.id;
  if (!actingUserId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Initial permission check - we'll do detailed ownership check after retrieving transition data
  const hasGlobalTransitionPermission = hasAnyPermission(session.user, ['USERS_MANAGE', 'APPLICANTS_PIPELINE_STAGE_UPDATE']);
  const hasOwnTransitionPermission = hasAnyPermission(session.user, ['APPLICANTS_PIPELINE_STAGE_UPDATE_OWN']);
  
  if (!hasGlobalTransitionPermission && !hasOwnTransitionPermission) {
    await logAudit('WARN', `Forbidden attempt to delete transition by ${session.user.name || session.user.email || 'Unknown'}`, 'API:Transitions:Delete', actingUserId);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to manage Applicant transitions' }, { status: 403 });
  }
  
  const client = await getPool().connect();
  try {
    // First get the transition record and Applicant data for ownership check
    const getTransitionQuery = `
      SELECT tr.*, c."recruiterId" 
      FROM "TransitionRecord" tr 
      JOIN "Candidate" c ON tr."candidateId" = c.id 
      WHERE tr.id = $1
    `;
    const getResult = await client.query(getTransitionQuery, [id]);
    
    if (getResult.rowCount === 0) {
      return NextResponse.json({ message: "Transition record not found" }, { status: 404 });
    }
    
    const transitionToDelete = getResult.rows[0];
    
    // Check ownership-based permissions for transition deletion
    if (!hasGlobalTransitionPermission) {
      const transitionPermission = canUpdateApplicantPipelineStage(session.user, transitionToDelete.recruiterId, actingUserId);
      if (!transitionPermission.canUpdate) {
        await logAudit('WARN', `Forbidden attempt to delete transition by ${session.user.name || session.user.email || 'Unknown'}: ${transitionPermission.reason}`, 'API:Transitions:Delete', actingUserId);
        return NextResponse.json({ message: `Forbidden: ${transitionPermission.reason}` }, { status: 403 });
      }
    }
    
    // Delete the transition record
    const result = await client.query('DELETE FROM "TransitionRecord" WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Transition record not found" }, { status: 404 });
    }
    
    // Broadcast the transition deletion
    broadcastApplicantUpdate({
      candidateId: transitionToDelete.candidateId,
      transition: transitionToDelete,
      action: 'delete'
    }, session.user.id);
    
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

    