import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { handleCors } from '@/lib/cors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { SimpleErrorHandler,
  createUnauthorizedError,
  createForbiddenError,
  createValidationError,
  createNotFoundError,
  createInternalServerError
} from '@/lib/errors';;
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
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }
  
  const { id } = await params;
  const client = await getPool().connect();
  try {
    const query = `
      SELECT c.id, c."recruiterId", u.name as "recruiterName", u.email as "recruiterEmail"
      FROM "applicant" c
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c.id = $1;
    `;
    const result = await client.query(query, [id]);
    if (result.rows.length === 0) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
    }
    
    const applicant = result.rows[0];
    return SimpleErrorHandler.createSuccessResponse(req, {
      applicantId: applicant.id,
      recruiter: applicant.recruiterId ? {
        id: applicant.recruiterId,
        name: applicant.recruiterName,
        email: applicant.recruiterEmail
      } : null
    }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error fetching Applicant recruiter: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  // Initial permission check - we'll do detailed ownership check after retrieving Applicant data
  const hasGlobalRecruiterPermission = user.modulePermissions?.includes('APPLICANTS_RECRUITER_ASSIGN');
  const hasOwnRecruiterPermission = user.modulePermissions?.includes('APPLICANTS_RECRUITER_ASSIGN_OWN');
  
  if (!user || (user.role !== 'Admin' && !hasGlobalRecruiterPermission && !hasOwnRecruiterPermission)) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to update Applicant recruiter'));
  }
  
  const { id } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid JSON body'));
  }
  
  const validationResult = updateRecruiterSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    const errorMsg = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`).join('; ');
    return SimpleErrorHandler.handleApiError(req, createValidationError(`Invalid input - ${errorMsg}`));
  }
  
  const { recruiterId } = validationResult.data;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if Applicant exists
    const applicantResult = await client.query('SELECT id, name, "recruiterId" FROM "applicant" WHERE id = $1', [id]);
    if (applicantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
    }
    
    const applicant = applicantResult.rows[0];
    const oldRecruiterId = applicant.recruiterId;
    
    // Check ownership-based permissions for recruiter assignment
    if (user.role !== 'Admin' && !hasGlobalRecruiterPermission) {
      const recruiterPermission = canAssignRecruiter(user, applicant.recruiterId, user.id);
      if (!recruiterPermission.canAssign) {
        await client.query('ROLLBACK');
        return SimpleErrorHandler.handleApiError(req, createForbiddenError(`Forbidden: ${recruiterPermission.reason}`));
      }
    }
    
    // If recruiterId is provided, validate that the user exists and is a recruiter
    if (recruiterId) {
      const recruiterCheckQuery = 'SELECT id, name, email, role FROM "User" WHERE id = $1::uuid';
      const recruiterResult = await client.query(recruiterCheckQuery, [recruiterId]);
      
      if (recruiterResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return SimpleErrorHandler.handleApiError(req, createValidationError('Recruiter not found'));
      }
      
      const recruiter = recruiterResult.rows[0];
      if (recruiter.role !== 'Recruiter' && recruiter.role !== 'Admin') {
        await client.query('ROLLBACK');
        return SimpleErrorHandler.handleApiError(req, createValidationError('User is not a recruiter'));
      }
    }
    
    // Update the Applicant's recruiter
    const updateQuery = 'UPDATE "applicant" SET "recruiterId" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *';
    const updateResult = await client.query(updateQuery, [recruiterId, id]);
    
    // Create transition record for recruiter change
    const transitionQuery = `
      INSERT INTO "TransitionRecord" (id, "applicantId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW());
    `;
    
    const positionResult = await client.query('SELECT "positionId", "statusId" FROM "applicant" WHERE id = $1', [id]);
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
    
    // Fetch updated Applicant with recruiter information
    const fetchQuery = `
      SELECT c.*, u.name as "recruiterName", u.email as "recruiterEmail"
      FROM "applicant" c
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c.id = $1;
    `;
    const fetchResult = await client.query(fetchQuery, [id]);
    const updatedApplicant = fetchResult.rows[0];
    
    const actingUserName = (user.name || user.email || user.id || 'System') as string;
    await logAudit('AUDIT', `Applicant '${applicant.name}' recruiter updated by ${actingUserName}.`, 'API:V1:Applicants:UpdateRecruiter', user.id, { 
      applicantId: id, 
      oldRecruiterId, 
      newRecruiterId: recruiterId 
    });
    
    return SimpleErrorHandler.createSuccessResponse(req, {
      message: 'Applicant recruiter updated successfully',
      applicant: {
        id: updatedApplicant.id,
        name: updatedApplicant.name,
        recruiter: updatedApplicant.recruiterId ? {
          id: updatedApplicant.recruiterId,
          name: updatedApplicant.recruiterName,
          email: updatedApplicant.recruiterEmail
        } : null
      }
    }, 200);
    
  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logAudit('ERROR', `Failed to update Applicant recruiter (ID: ${id}) by ${user?.name || 'Unknown'}. Error: ${errorMessage}`, 'API:V1:Applicants:UpdateRecruiter', user?.id, { 
      applicantId: id, 
      error: errorMessage, 
      ...body 
    });
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error updating Applicant recruiter: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user || (user.role !== 'Admin' &&  !user.modulePermissions?.includes('APPLICANTS_RECRUITER_ASSIGN'))) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to unassign Applicant recruiter'));
  }
  
  const { id } = await params;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if Applicant exists and has a recruiter
    const applicantResult = await client.query('SELECT id, name, "recruiterId" FROM "applicant" WHERE id = $1', [id]);
    if (applicantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
    }
    
    const applicant = applicantResult.rows[0];
    if (!applicant.recruiterId) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createValidationError('Applicant has no recruiter assigned'));
    }
    
    // Remove the recruiter assignment
    const updateQuery = 'UPDATE "applicant" SET "recruiterId" = NULL, "updatedAt" = NOW() WHERE id = $1 RETURNING *';
    await client.query(updateQuery, [id]);
    
    // Create transition record
    const positionResult = await client.query('SELECT "positionId", "statusId" FROM "applicant" WHERE id = $1', [id]);
    const positionId = positionResult.rows[0]?.positionId;
    const status = 'Applied'; // Use default status since we don't have the actual status name
    
    const transitionQuery = `
      INSERT INTO "TransitionRecord" (id, "applicantId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
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
    
    const actingUserName = (user.name || user.email || user.id || 'System') as string;
    await logAudit('AUDIT', `Applicant '${applicant.name}' recruiter unassigned by ${actingUserName}.`, 'API:V1:Applicants:UnassignRecruiter', user.id, { 
      applicantId: id, 
      oldRecruiterId: applicant.recruiterId 
    });
    
    return SimpleErrorHandler.createSuccessResponse(req, {
      message: 'Applicant recruiter unassigned successfully'
    }, 200);
    
  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logAudit('ERROR', `Failed to unassign Applicant recruiter (ID: ${id}) by ${user?.name || 'Unknown'}. Error: ${errorMessage}`, 'API:V1:Applicants:UnassignRecruiter', user?.id, { 
      applicantId: id, 
      error: errorMessage 
    });
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error unassigning Applicant recruiter: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
}
