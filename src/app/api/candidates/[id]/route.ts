// src/app/api/candidates/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { broadcastCandidateUpdate, broadcastCandidateTransitionUpdate } from '@/lib/candidateSse';

/**
 * @openapi
 * /api/candidates/{id}:
 *   get:
 *     summary: Get a candidate by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Candidate details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Candidate'
 *       404:
 *         description: Candidate not found
 *   put:
 *     summary: Update a candidate by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Candidate'
 *     responses:
 *       200:
 *         description: Candidate updated
 *   delete:
 *     summary: Delete a candidate by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Candidate deleted
 *       404:
 *         description: Candidate not found
 */

// Define Zod schemas for validation...
const updateCandidateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  positionId: z.string().uuid().nullable().optional(),
  recruiterId: z.string().uuid().nullable().optional(),
  fitScore: z.number().min(0).max(100).optional(),
  status: z.string().min(1).optional(),
  assignmentJustification: z.string().optional().nullable(),
  parsedData: z.record(z.any()).optional().nullable(),
  custom_attributes: z.record(z.any()).optional().nullable(),
  resumePath: z.string().optional().nullable(),
  transitionNotes: z.string().optional().nullable(),
});

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/candidates\/([^/]+)/);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  // Validate UUID
  const uuidSchema = z.string().uuid();
  if (!uuidSchema.safeParse(id).success) {
    console.error('Invalid candidate ID format:', id);
    return NextResponse.json({ message: 'Invalid candidate ID format' }, { status: 400 });
  }

  const client = await getPool().connect();
  try {
    // Get candidate with position and recruiter info
    const candidateQuery = `
      SELECT c.*, p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      WHERE c.id = $1::uuid;
    `;
    const candidateResult = await client.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
    }

    const candidate = candidateResult.rows[0];

    // Get job matches for this candidate
    const jobMatchesQuery = `
      SELECT jm.*, p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."candidateId" = $1::uuid
      ORDER BY jm."fitScore" DESC;
    `;
    const jobMatchesResult = await client.query(jobMatchesQuery, [id]);

    // Get attachment history for this candidate (replaces ResumeHistory)
    const attachmentsQuery = `
      SELECT a.*, u.name as "uploadedByUserName"
      FROM "Attachment" a
      LEFT JOIN "User" u ON a."uploadedById" = u.id
      WHERE a."candidateId" = $1::uuid
      ORDER BY a."uploadedAt" DESC;
    `;
    const attachmentsResult = await client.query(attachmentsQuery, [id]);

    // Defensive: always provide customAttributes as an object
    let customAttributes = {};
    try {
      customAttributes = candidate.customAttributes || {};
      if (typeof customAttributes === 'string') {
        try {
          customAttributes = JSON.parse(customAttributes);
        } catch (parseErr) {
          console.error('Failed to parse customAttributes for candidate', id, parseErr, customAttributes);
          customAttributes = {};
        }
      }
    } catch (e) {
      console.error('Error handling customAttributes for candidate', id, e);
      customAttributes = {};
    }

    return NextResponse.json({
      ...candidate,
      fitScore: candidate.fitScore ? candidate.fitScore / 100 : null, // Convert integer back to decimal for consistency
      assignmentJustification: candidate.assignmentJustification || null,
      customAttributes,
      position: candidate.positionId ? {
        title: candidate.positionTitle || null,
        department: candidate.positionDepartment || null
      } : null,
      recruiter: candidate.recruiterId ? { name: candidate.recruiterName || null } : null,
      jobMatches: jobMatchesResult.rows.map(match => ({
        ...match,
        fitScore: match.fitScore ? match.fitScore / 100 : 0, // Convert integer back to decimal
      })) || [],
      attachmentHistory: attachmentsResult.rows || [],
    });
  } catch (error: any) {
    console.error('Error fetching candidate', id, error); // Add server-side log with ID
    return NextResponse.json({ message: 'Error fetching candidate', error: error?.message || String(error) }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = updateCandidateSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, email, phone, positionId, recruiterId, fitScore, status, assignmentJustification, parsedData, custom_attributes, resumePath, transitionNotes } = validationResult.data;

  console.log('API received payload:', { name, email, phone, positionId, recruiterId, fitScore, status, assignmentJustification, parsedData, custom_attributes, resumePath, transitionNotes });

  // Extra validation to prevent DB errors
  if (!status || typeof status !== 'string' || status.trim() === '') {
    return NextResponse.json({ message: 'Status is required and must be a non-empty string.' }, { status: 400 });
  }
  // Helper to check UUID
  function isValidUUID(val: string) {
    return typeof val === 'string' && /^[0-9a-fA-F-]{36}$/.test(val);
  }
  if (positionId !== undefined && positionId !== null && !isValidUUID(positionId)) {
    return NextResponse.json({ message: 'positionId must be a valid UUID or null.' }, { status: 400 });
  }
  if (recruiterId !== undefined && recruiterId !== null && !isValidUUID(recruiterId)) {
    return NextResponse.json({ message: 'recruiterId must be a valid UUID or null.' }, { status: 400 });
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Existence checks for foreign keys
    if (positionId) {
      const posCheck = await client.query('SELECT id FROM "Position" WHERE id = $1::uuid', [positionId]);
      if (posCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'Position not found.' }, { status: 400 });
      }
    }
    if (recruiterId) {
      const recCheck = await client.query('SELECT id FROM "User" WHERE id = $1::uuid', [recruiterId]);
      if (recCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'Recruiter not found.' }, { status: 400 });
      }
    }
    
    // Check if candidate exists
    const existingResult = await client.query('SELECT * FROM "Candidate" WHERE id = $1::uuid', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
    }

    const existingCandidate = existingResult.rows[0];
    const oldStatus = existingCandidate.status;

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(email);
      paramIndex++;
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      updateValues.push(phone);
      paramIndex++;
    }
    if (positionId !== undefined) {
      updateFields.push(`"positionId" = $${paramIndex}`);
      updateValues.push(positionId);
      paramIndex++;
    }
    if (recruiterId !== undefined) {
      updateFields.push(`"recruiterId" = $${paramIndex}`);
      updateValues.push(recruiterId);
      paramIndex++;
    }
    if (fitScore !== undefined) {
      updateFields.push(`"fitScore" = $${paramIndex}`);
      updateValues.push(fitScore);
      paramIndex++;
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }
    if (assignmentJustification !== undefined) {
      updateFields.push(`"assignmentJustification" = $${paramIndex}`);
      updateValues.push(assignmentJustification);
      paramIndex++;
    }
    if (parsedData !== undefined) {
      updateFields.push(`"parsedData" = $${paramIndex}`);
      updateValues.push(parsedData);
      paramIndex++;
    }
    if (custom_attributes !== undefined) {
      updateFields.push(`"customAttributes" = $${paramIndex}`);
      updateValues.push(custom_attributes);
      paramIndex++;
    }
    if (resumePath !== undefined) {
      updateFields.push(`"resumePath" = $${paramIndex}`);
      updateValues.push(resumePath);
      paramIndex++;
    }

    // Always update the updatedAt timestamp
    updateFields.push(`"updatedAt" = NOW()`);

    const updateQuery = `
      UPDATE "Candidate" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}::uuid
      RETURNING *;
    `;
    updateValues.push(id);

    const updateResult = await client.query(updateQuery, updateValues);

    // Create transition record if status changed
    if (oldStatus !== status) {
      console.log('Creating transition record:', { oldStatus, newStatus: status, transitionNotes, actingUserId });
      const safePositionId = positionId ?? null; // Default to null if undefined
      const transitionMessage = `Status changed from ${oldStatus} to ${status}` + (transitionNotes ? `\nNote: ${transitionNotes}` : '');
      const newTransitionId = uuidv4();
      const insertTransitionQuery = `
        INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date)
        VALUES ($1, $2, $3, $4, $5, $6, NOW());
      `;
      try {
        await client.query(insertTransitionQuery, [
          newTransitionId, id, safePositionId, status, transitionMessage, actingUserId
        ]);
        console.log('Transition record created successfully');
        
        // Get the created transition record to broadcast
        const getTransitionQuery = 'SELECT * FROM "TransitionRecord" WHERE id = $1';
        const transitionResult = await client.query(getTransitionQuery, [newTransitionId]);
        if (transitionResult.rows.length > 0) {
          const newTransition = transitionResult.rows[0];
          // Broadcast the new transition
          broadcastCandidateTransitionUpdate({
            candidateId: id,
            transition: newTransition,
            action: 'add'
          });
        }
      } catch (transitionError) {
        console.error('Error creating transition record:', transitionError);
        throw transitionError;
      }
    } else {
      console.log('No status change detected, skipping transition record creation');
    }

    await client.query('COMMIT');
    await logAudit('AUDIT', `Candidate '${name}' updated by ${actingUserName}.`, 'API:Candidates:Update', actingUserId, { candidateId: id, oldStatus, newStatus: status });
    // After update, re-fetch the candidate using the same logic as GET to ensure response structure is identical
    const candidateResult = await client.query(`
      SELECT c.*, p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      WHERE c.id = $1::uuid;
    `, [id]);
    const candidate = candidateResult.rows[0];
    // Get job matches for this candidate
    const jobMatchesResult = await client.query(`
      SELECT jm.*, p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."candidateId" = $1::uuid
      ORDER BY jm."fitScore" DESC;
    `, [id]);
    // Get attachment history for this candidate
    const attachmentsResult = await client.query(`
      SELECT a.*, u.name as "uploadedByUserName"
      FROM "Attachment" a
      LEFT JOIN "User" u ON a."uploadedById" = u.id
      WHERE a."candidateId" = $1::uuid
      ORDER BY a."uploadedAt" DESC;
    `, [id]);
    // Defensive: always provide customAttributes as an object
    let customAttributes = {};
    try {
      customAttributes = candidate.customAttributes || {};
      if (typeof customAttributes === 'string') {
        try {
          customAttributes = JSON.parse(customAttributes);
        } catch (parseErr) {
          customAttributes = {};
        }
      }
    } catch (e) {
      customAttributes = {};
    }
    broadcastCandidateUpdate({ ...candidate, customAttributes }); // Broadcast update
    return NextResponse.json({
      ...candidate,
      assignmentJustification: candidate.assignmentJustification || null,
      customAttributes,
      position: candidate.positionId ? {
        title: candidate.positionTitle || null,
        department: candidate.positionDepartment || null
      } : null,
      recruiter: candidate.recruiterId ? { name: candidate.recruiterName || null } : null,
      jobMatches: jobMatchesResult.rows || [],
      attachmentHistory: attachmentsResult.rows || [],
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to update candidate. Error: ${error.message}`, 'API:Candidates:Update', actingUserId, { candidateId: id, input: body });
    if (error.code === '23505' && error.constraint === 'Candidate_email_key') {
      return NextResponse.json({ message: `A candidate with the email "${email}" already exists.` }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error updating candidate', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    
    // Get candidate name for audit log
    const result = await client.query('DELETE FROM "Candidate" WHERE id = $1::uuid RETURNING name', [id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
    }

    const candidateName = result.rows[0].name;
    await client.query('COMMIT');
    await logAudit('AUDIT', `Candidate '${candidateName}' deleted by ${actingUserName}.`, 'API:Candidates:Delete', actingUserId, { candidateId: id });
    broadcastCandidateUpdate({ id, deleted: true }); // Broadcast removal
    return NextResponse.json({ message: 'Candidate deleted successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to delete candidate. Error: ${error.message}`, 'API:Candidates:Delete', actingUserId, { candidateId: id });
    return NextResponse.json({ message: 'Error deleting candidate', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}