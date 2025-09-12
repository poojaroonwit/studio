import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { handleCors } from '@/lib/cors';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createForbiddenError, 
  createValidationError, 
  createNotFoundError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';
import { logAudit } from '@/lib/auditLog';
import { canAssignRecruiter } from '@/lib/permissions';

const updateRecruiterSchema = z.object({
  recruiterId: z.string().uuid().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }
  
  const { id } = await params;
  const client = await getPool().connect();
  try {
    const query = `
      SELECT c.id, c."recruiterId", u.name as "recruiterName", u.email as "recruiterEmail"
      FROM "Candidate" c
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c.id = $1;
    `;
    const result = await client.query(query, [id]);
    if (result.rows.length === 0) {
      return handleApiError(req, createNotFoundError('Candidate not found'));
    }
    
    const candidate = result.rows[0];
    return createSuccessResponse(req, {
      candidateId: candidate.id,
      recruiter: candidate.recruiterId ? {
        id: candidate.recruiterId,
        name: candidate.recruiterName,
        email: candidate.recruiterEmail
      } : null
    }, 200);
  } catch (error) {
    return handleApiError(req, createInternalServerError('Error fetching candidate recruiter', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  // Initial permission check - we'll do detailed ownership check after retrieving candidate data
  const hasGlobalRecruiterPermission = user.modulePermissions?.includes('CANDIDATES_RECRUITER_ASSIGN');
  const hasOwnRecruiterPermission = user.modulePermissions?.includes('CANDIDATES_RECRUITER_ASSIGN_OWN');
  
  if (!user || (user.role !== 'Admin' && !hasGlobalRecruiterPermission && !hasOwnRecruiterPermission)) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to update candidate recruiter'));
  }
  
  const { id } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return handleApiError(req, createValidationError('Invalid JSON body'));
  }
  
  const validationResult = updateRecruiterSchema.safeParse(body);
  if (!validationResult.success) {
    return handleApiError(req, createValidationError('Invalid input', validationResult.error.flatten().fieldErrors));
  }
  
  const { recruiterId } = validationResult.data;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if candidate exists
    const candidateResult = await client.query('SELECT id, name, "recruiterId" FROM "Candidate" WHERE id = $1', [id]);
    if (candidateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return handleApiError(req, createNotFoundError('Candidate not found'));
    }
    
    const candidate = candidateResult.rows[0];
    const oldRecruiterId = candidate.recruiterId;
    
    // Check ownership-based permissions for recruiter assignment
    if (user.role !== 'Admin' && !hasGlobalRecruiterPermission) {
      const recruiterPermission = canAssignRecruiter(user, candidate.recruiterId, user.id);
      if (!recruiterPermission.canAssign) {
        await client.query('ROLLBACK');
        return handleApiError(req, createForbiddenError(`Forbidden: ${recruiterPermission.reason}`));
      }
    }
    
    // If recruiterId is provided, validate that the user exists and is a recruiter
    if (recruiterId) {
      const recruiterCheckQuery = 'SELECT id, name, email, role FROM "User" WHERE id = $1::uuid';
      const recruiterResult = await client.query(recruiterCheckQuery, [recruiterId]);
      
      if (recruiterResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return handleApiError(req, createValidationError('Recruiter not found'));
      }
      
      const recruiter = recruiterResult.rows[0];
      if (recruiter.role !== 'Recruiter' && recruiter.role !== 'Admin') {
        await client.query('ROLLBACK');
        return handleApiError(req, createValidationError('User is not a recruiter'));
      }
    }
    
    // Update the candidate's recruiter
    const updateQuery = 'UPDATE "Candidate" SET "recruiterId" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *';
    const updateResult = await client.query(updateQuery, [recruiterId, id]);
    
    // Create transition record for recruiter change
    const transitionQuery = `
      INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW());
    `;
    
    const positionResult = await client.query('SELECT "positionId", "statusId" FROM "Candidate" WHERE id = $1', [id]);
    const positionId = positionResult.rows[0]?.positionId;
    const status = 'Applied'; // Use default status since we don't have the actual status name
    
    let notes = '';
    if (recruiterId && oldRecruiterId !== recruiterId) {
      const recruiterName = await client.query('SELECT name FROM "User" WHERE id = $1', [recruiterId]);
      notes = `Recruiter assigned: ${recruiterName.rows[0]?.name || 'Unknown'}`;
    } else if (!recruiterId && oldRecruiterId) {
      notes = 'Recruiter unassigned';
    }
    
    if (notes) {
      await client.query(transitionQuery, [
        uuidv4(),
        id,
        positionId,
        status,
        notes,
        user.id
      ]);
    }
    
    await client.query('COMMIT');
    
    // Fetch updated candidate with recruiter information
    const fetchQuery = `
      SELECT c.*, u.name as "recruiterName", u.email as "recruiterEmail"
      FROM "Candidate" c
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c.id = $1;
    `;
    const fetchResult = await client.query(fetchQuery, [id]);
    const updatedCandidate = fetchResult.rows[0];
    
    await logAudit('AUDIT', `Candidate '${candidate.name}' recruiter updated by ${user.name}.`, 'API:V1:Candidates:UpdateRecruiter', user.id, { 
      candidateId: id, 
      oldRecruiterId, 
      newRecruiterId: recruiterId 
    });
    
    return createSuccessResponse(req, {
      message: 'Candidate recruiter updated successfully',
      candidate: {
        id: updatedCandidate.id,
        name: updatedCandidate.name,
        recruiter: updatedCandidate.recruiterId ? {
          id: updatedCandidate.recruiterId,
          name: updatedCandidate.recruiterName,
          email: updatedCandidate.recruiterEmail
        } : null
      }
    }, 200);
    
  } catch (error) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to update candidate recruiter (ID: ${id}) by ${user?.name || 'Unknown'}. Error: ${(error as Error).message}`, 'API:V1:Candidates:UpdateRecruiter', user?.id, { 
      candidateId: id, 
      error: (error as Error).message, 
      ...body 
    });
    return handleApiError(req, createInternalServerError('Error updating candidate recruiter', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user || (user.role !== 'Admin' &&  !user.modulePermissions?.includes('CANDIDATES_RECRUITER_ASSIGN'))) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to unassign candidate recruiter'));
  }
  
  const { id } = await params;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if candidate exists and has a recruiter
    const candidateResult = await client.query('SELECT id, name, "recruiterId" FROM "Candidate" WHERE id = $1', [id]);
    if (candidateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return handleApiError(req, createNotFoundError('Candidate not found'));
    }
    
    const candidate = candidateResult.rows[0];
    if (!candidate.recruiterId) {
      await client.query('ROLLBACK');
      return handleApiError(req, createValidationError('Candidate has no recruiter assigned'));
    }
    
    // Remove the recruiter assignment
    const updateQuery = 'UPDATE "Candidate" SET "recruiterId" = NULL, "updatedAt" = NOW() WHERE id = $1 RETURNING *';
    await client.query(updateQuery, [id]);
    
    // Create transition record
    const positionResult = await client.query('SELECT "positionId", "statusId" FROM "Candidate" WHERE id = $1', [id]);
    const positionId = positionResult.rows[0]?.positionId;
    const status = 'Applied'; // Use default status since we don't have the actual status name
    
    const transitionQuery = `
      INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW());
    `;
    
    await client.query(transitionQuery, [
      uuidv4(),
      id,
      positionId,
      status,
      'Recruiter unassigned',
      user.id
    ]);
    
    await client.query('COMMIT');
    
    await logAudit('AUDIT', `Candidate '${candidate.name}' recruiter unassigned by ${user.name}.`, 'API:V1:Candidates:UnassignRecruiter', user.id, { 
      candidateId: id, 
      oldRecruiterId: candidate.recruiterId 
    });
    
    return createSuccessResponse(req, {
      message: 'Candidate recruiter unassigned successfully'
    }, 200);
    
  } catch (error) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to unassign candidate recruiter (ID: ${id}) by ${user?.name || 'Unknown'}. Error: ${(error as Error).message}`, 'API:V1:Candidates:UnassignRecruiter', user?.id, { 
      candidateId: id, 
      error: (error as Error).message 
    });
    return handleApiError(req, createInternalServerError('Error unassigning candidate recruiter', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
}
