import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { syncRecruiterForPosition } from '@/lib/recruiterSync';
import { NotificationService } from '@/lib/notificationService';
import { SimpleWarningService } from '@/lib/warnings';
import { broadcastPositionUpdate, broadcastPositionListUpdated, broadcastPositionStatisticsUpdated, broadcastPositionDeleted } from '@/lib/simple-broadcaster';

const updatePositionSchema = z.object({
  title: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean().optional(),
  positionLevel: z.string().optional().nullable(),
  positionAttribute: z.string().optional().nullable(),
  gradeId: z.union([
    z.string().uuid(),
    z.null()
  ]).optional(),
  hiringDate: z.string().optional().nullable(),
  recruiterId: z.union([
    z.string().uuid(),
    z.null()
  ]).optional(),
  custom_attributes: z.record(z.any()).optional().nullable(),
});

/**
 * @openapi
 * /api/positions/{id}:
 *   get:
 *     summary: Get a position by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Position details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Position'
 *       404:
 *         description: Position not found
 *   put:
 *     summary: Update a position by ID
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
 *             $ref: '#/components/schemas/Position'
 *     responses:
 *       200:
 *         description: Position updated
 *   delete:
 *     summary: Delete a position by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Position deleted
 *       404:
 *         description: Position not found
 */

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/positions\/([^/]+)/);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.error('[Positions API] Unauthorized access attempt');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to view positions
  if (!hasPermission(session.user, 'POSITIONS_VIEW')) {
    console.error(`[Positions API] Forbidden access attempt by user ${session.user.id} - missing POSITIONS_VIEW permission`);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to view positions' }, { status: 403 });
  }

  const { id } = await params;
  
  const client = await getPool().connect();
  try {
    const query = 'SELECT p.id, p.title, p.department, p.description, p."matchCriteria", p."isOpen", p."positionLevel", p."positionAttribute", p."gradeId", p."hiringDate", p."recruiterId", p."customAttributes", p."createdAt", p."updatedAt", u.name as "recruiterName", g.name as "gradeName", g.label as "gradeLabel", g."sla_days" as "gradeSlaDays", g.color as "gradeColor" FROM "Position" p LEFT JOIN "User" u ON p."recruiterId" = u.id LEFT JOIN "Grade" g ON p."gradeId" = g.id WHERE p.id = $1';
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      console.error(`[Positions API] Position not found: ${id}`);
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }

    const position = result.rows[0];

    // Fetch the latest webhook_payload for this position from upload_queue
    const uploadQueueRes = await client.query(
      "SELECT webhook_payload FROM upload_queue WHERE (webhook_payload->'inputs'->>'jobId') = $1 ORDER BY upload_date DESC LIMIT 1",
      [id]
    );
    const webhook_payload = uploadQueueRes.rows[0]?.webhook_payload || null;

    const responseData = {
      ...position,
      custom_attributes: position.customAttributes || {},
      grade: position.gradeId ? {
        id: position.gradeId,
        name: position.gradeName,
        label: position.gradeLabel,
        slaDays: position.gradeSlaDays,
        color: position.gradeColor
      } : null,
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error(`[Positions API] Database error fetching position ${id}:`, error);
    return NextResponse.json({ 
      message: 'Error fetching position', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  // Debug session information
  console.log('[POSITION UPDATE] Session debug:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    userRole: session?.user?.role,
    modulePermissions: session?.user?.modulePermissions,
    modulePermissionsType: typeof session?.user?.modulePermissions,
    isArray: Array.isArray(session?.user?.modulePermissions)
  });
  
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';
  const actingUserRole = session?.user?.role;
  const modulePermissions: string[] = session?.user?.modulePermissions || [];

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = updatePositionSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const updateData = validationResult.data;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    
    // Check if position exists and get current recruiter
    const positionExistsQuery = 'SELECT id, title, "customAttributes", "recruiterId" FROM "Position" WHERE id = $1';
    const existingResult = await client.query(positionExistsQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }

    const existingPosition = existingResult.rows[0];
    const oldRecruiterId = existingPosition.recruiterId;

    // Authorization: allow Admin, or users with POSITIONS_* module permissions.
    // Additionally, allow the assigned recruiter to edit non-recruiter fields of their own positions.
    const isAdmin = actingUserRole === 'Admin';
    const isAssignedRecruiter = existingPosition.recruiterId && existingPosition.recruiterId === actingUserId;
    const wantsToChangeRecruiter = Object.prototype.hasOwnProperty.call(updateData, 'recruiterId');

    // Debug logging for permission check
    console.log('[POSITION UPDATE] Permission check debug:', {
      actingUserId,
      actingUserRole,
      modulePermissions,
      isAdmin,
      isAssignedRecruiter,
      existingPositionRecruiterId: existingPosition.recruiterId,
      wantsToChangeRecruiter
    });

    const canEditBasic = isAdmin || modulePermissions.includes('POSITIONS_EDIT_BASIC') || isAssignedRecruiter;
    const canAssignRecruiter = isAdmin || modulePermissions.includes('POSITIONS_RECRUITER_ASSIGN');
    
    // Additional safety check - ensure modulePermissions is an array
    if (!Array.isArray(modulePermissions)) {
      console.error('[POSITION UPDATE] modulePermissions is not an array:', modulePermissions);
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Internal server error: invalid permission structure' }, { status: 500 });
    }
    
    console.log('[POSITION UPDATE] Permission results:', {
      canEditBasic,
      canAssignRecruiter
    });

    if (wantsToChangeRecruiter && !canAssignRecruiter) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Forbidden: insufficient permissions to assign recruiter' }, { status: 403 });
    }

    // If recruiterId is provided, validate that the user exists and is a recruiter
    if (updateData.recruiterId) {
      const recruiterCheckQuery = 'SELECT id, name, role FROM "User" WHERE id = $1::uuid';
      const recruiterResult = await client.query(recruiterCheckQuery, [updateData.recruiterId]);
      
      if (recruiterResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'Recruiter not found' }, { status: 400 });
      }
      
      const recruiter = recruiterResult.rows[0];
      if (recruiter.role !== 'Recruiter' && recruiter.role !== 'Admin') {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'User is not a recruiter' }, { status: 400 });
      }
    }

    // Build dynamic UPDATE query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updateData.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(updateData.title);
    }
    if (updateData.department !== undefined) {
      updateFields.push(`department = $${paramIndex++}`);
      updateValues.push(updateData.department);
    }
    if (updateData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(updateData.description);
    }
    if (updateData.matchCriteria !== undefined) {
      updateFields.push(`"matchCriteria" = $${paramIndex++}`);
      updateValues.push(updateData.matchCriteria);
    }
    if (updateData.isOpen !== undefined) {
      updateFields.push(`"isOpen" = $${paramIndex++}`);
      updateValues.push(updateData.isOpen);
    }
    if (updateData.positionLevel !== undefined) {
      updateFields.push(`"positionLevel" = $${paramIndex++}`);
      updateValues.push(updateData.positionLevel);
    }
    if (updateData.positionAttribute !== undefined) {
      updateFields.push(`"positionAttribute" = $${paramIndex++}`);
      updateValues.push(updateData.positionAttribute);
    }
    if (updateData.gradeId !== undefined) {
      updateFields.push(`"gradeId" = $${paramIndex++}`);
      updateValues.push(updateData.gradeId);
    }
    if (updateData.hiringDate !== undefined) {
      updateFields.push(`"hiringDate" = $${paramIndex++}`);
      updateValues.push(updateData.hiringDate);
    }
    if (updateData.recruiterId !== undefined) {
      updateFields.push(`"recruiterId" = $${paramIndex++}`);
      updateValues.push(updateData.recruiterId);
    }
    if (updateData.custom_attributes !== undefined) {
      updateFields.push(`"customAttributes" = $${paramIndex++}`);
      updateValues.push(updateData.custom_attributes);
    }

    // Add updatedAt timestamp
    updateFields.push(`"updatedAt" = NOW()`);

    if (updateFields.length === 1) { // Only updatedAt was added
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    const updateQuery = `
      UPDATE "Position" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
    updateValues.push(id);

    // Check if user has basic edit permissions for any field updates
    console.log('[POSITION UPDATE] Checking basic edit permissions:', { canEditBasic });
    if (!canEditBasic) {
      console.log('[POSITION UPDATE] Permission denied - user lacks basic edit permissions');
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Forbidden: insufficient permissions to edit positions' }, { status: 403 });
    }

    // If the user is only the assigned recruiter (not admin/module), prevent them from changing restricted fields
    if (!canAssignRecruiter && wantsToChangeRecruiter) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Forbidden: insufficient permissions to assign recruiter' }, { status: 403 });
    }
    if (!isAdmin && isAssignedRecruiter) {
      const restrictedKeys = ['title', 'department', 'gradeId', 'hiringDate', 'positionAttribute', 'positionLevel', 'isOpen', 'matchCriteria', 'description'];
      const tryingRestricted = Object.keys(updateData).some((k) => restrictedKeys.includes(k));
      if (tryingRestricted) {
        // Assigned recruiters can edit only custom attributes on their positions, not structural fields
        const onlyCustomAttributes = Object.keys(updateData).every((k) => k === 'custom_attributes');
        if (!onlyCustomAttributes) {
          await client.query('ROLLBACK');
          return NextResponse.json({ message: 'Forbidden: assigned recruiter may only edit custom attributes' }, { status: 403 });
        }
      }
    }

    const updateResult = await client.query(updateQuery, updateValues);
    
    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Position not found or update failed' }, { status: 404 });
    }

    await client.query('COMMIT');
    const updatedPosition = updateResult.rows[0];
    
    // Fetch the updated position with recruiter name and grade information
    const enrichedPositionQuery = 'SELECT p.id, p.title, p.department, p.description, p."matchCriteria", p."isOpen", p."positionLevel", p."positionAttribute", p."gradeId", p."hiringDate", p."recruiterId", p."customAttributes", p."createdAt", p."updatedAt", u.name as "recruiterName", g.name as "gradeName", g.label as "gradeLabel", g."sla_days" as "gradeSlaDays", g.color as "gradeColor" FROM "Position" p LEFT JOIN "User" u ON p."recruiterId" = u.id LEFT JOIN "Grade" g ON p."gradeId" = g.id WHERE p.id = $1';
    const enrichedResult = await client.query(enrichedPositionQuery, [id]);
    const enrichedPosition = enrichedResult.rows[0];
    
    // Auto-assign recruiters to unassigned candidates if position recruiter changed
    let syncResult = null;
    if (updateData.recruiterId !== undefined && updateData.recruiterId !== oldRecruiterId) {
      try {
        // Add timeout for sync operation to prevent hanging
        const syncPromise = syncRecruiterForPosition(id, actingUserId, actingUserName);
        let syncTimeoutId: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise((_, reject) => {
          syncTimeoutId = setTimeout(() => reject(new Error('Sync operation timed out')), 5000);
        });
        
        syncResult = await Promise.race([syncPromise, timeoutPromise]);
        
        // Clear sync timeout
        if (syncTimeoutId) {
          clearTimeout(syncTimeoutId);
        }
        
        // Send notification to the newly assigned recruiter
        if (updateData.recruiterId) {
          try {
            // Add timeout for notification to prevent hanging
            const notificationPromise = NotificationService.notifyRecruiterAssigned(
              id,
              enrichedPosition.title,
              updateData.recruiterId,
              actingUserId
            );
            let notificationTimeoutId: NodeJS.Timeout | null = null;
            const notificationTimeoutPromise = new Promise((_, reject) => {
              notificationTimeoutId = setTimeout(() => reject(new Error('Notification timed out')), 5000);
            });
            
            await Promise.race([notificationPromise, notificationTimeoutPromise]);
            
            // Clear notification timeout
            if (notificationTimeoutId) {
              clearTimeout(notificationTimeoutId);
            }
          } catch (notificationError) {
            console.error('Failed to send recruiter assignment notification:', notificationError);
            // Don't fail the entire operation if notification fails
          }
        }
    
      } catch (syncError) {
        console.error('Failed to assign recruiters after position update:', syncError);
        // Don't fail the position update if sync fails, but log the error
        syncResult = {
          positionId: id,
          positionTitle: enrichedPosition.title,
          candidatesUpdated: 0,
          candidatesSkipped: 0,
          errors: [syncError instanceof Error ? syncError.message : 'Unknown sync error']
        };
      }
    }
    
    await logAudit('AUDIT', `Position '${updatedPosition.title}' updated by ${actingUserName}.`, 'API:Positions:Update', actingUserId, { positionId: id });
    const positionWithCustomAttrs = {
      ...enrichedPosition,
      custom_attributes: enrichedPosition.customAttributes || {},
      // Ensure recruiterName is properly included in the response
      recruiterName: enrichedPosition.recruiterName || null,
      // Include grade information
      grade: enrichedPosition.gradeId ? {
        id: enrichedPosition.gradeId,
        name: enrichedPosition.gradeName,
        label: enrichedPosition.gradeLabel,
        slaDays: enrichedPosition.gradeSlaDays,
        color: enrichedPosition.gradeColor
      } : null,
    };
    
    // Check for warnings after position update using automation system
    try {
      const { WarningAutomation } = await import('@/lib/warningAutomation');
      // Don't await this to prevent blocking the response
      WarningAutomation.triggerEntityCheckWithRetry('position', id, actingUserId).catch(error => {
        console.error('Failed to trigger warning check for updated position:', error);
      });
    } catch (warningError) {
      console.error('Failed to import warning automation:', warningError);
      // Don't fail the request if warning check fails
    }
    
    // Dispatch webhook for position update
    try {
      // Don't await this to prevent blocking the response
      dispatchWebhooks.positionUpdated(positionWithCustomAttrs).catch(error => {
        console.error('Failed to dispatch position update webhook:', error);
      });
    } catch (webhookError) {
      console.error('Failed to dispatch position update webhook:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    // Broadcast to SSE clients
    broadcastPositionUpdate(positionWithCustomAttrs, actingUserId || undefined);
    
    return NextResponse.json({ 
      message: 'Position updated successfully', 
      position: positionWithCustomAttrs,
      recruiterSync: syncResult
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    
    // Check for specific database constraint errors
    if (error.code === '23503') { // Foreign key violation
      await logAudit('ERROR', `Failed to update position - recruiter not found. Error: ${error.message}`, 'API:Positions:Update', actingUserId, { positionId: id, input: body });
      return NextResponse.json({ message: 'Recruiter not found in database', error: error.message }, { status: 400 });
    }
    
    await logAudit('ERROR', `Failed to update position. Error: ${error.message}`, 'API:Positions:Update', actingUserId, { positionId: id, input: body });
    return NextResponse.json({ message: 'Error updating position', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    
    // Check if position has candidates
    const currentPosition = await getPool().query('SELECT * FROM "Position" WHERE id = $1', [id]);
    if (currentPosition.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }

    const positionQuery = 'SELECT p.id, p.title, COUNT(c.id) as "candidateCount" FROM "Position" p LEFT JOIN "Candidate" c ON p.id = c."positionId" WHERE p.id = $1 GROUP BY p.id, p.title;';
    const candidateCountResult = await client.query(positionQuery, [id]);
    const candidateCount = parseInt(candidateCountResult.rows[0]?.candidateCount || '0', 10);

    if (candidateCount > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ 
        message: `Cannot delete position. It has ${candidateCount} associated candidate(s).` 
      }, { status: 409 });
    }

    // Delete position
    const deleteQuery = 'DELETE FROM "Position" WHERE id = $1';
    const deleteResult = await client.query(deleteQuery, [id]);
    
    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }

    await client.query('COMMIT');
    await logAudit('AUDIT', `Position '${currentPosition.rows[0].title}' deleted by ${actingUserName}.`, 'API:Positions:Delete', actingUserId, { positionId: id });
    
    // Dispatch webhook for position deletion
    try {
      const positionToDelete = {
        ...currentPosition.rows[0],
        custom_attributes: currentPosition.rows[0].customAttributes || {},
      };
      await dispatchWebhooks.positionDeleted(positionToDelete);
    } catch (webhookError) {
      console.error('Failed to dispatch position deletion webhook:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    // Broadcast real-time updates
    broadcastPositionDeleted(id, actingUserId);
    broadcastPositionListUpdated();
    // Broadcast statistics update
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
        COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
      FROM "Position"
    `;
    const statsResult = await getPool().query(statsQuery);
    const stats = statsResult.rows[0];
    const statistics = { 
      total: parseInt(stats.total, 10), 
      open: parseInt(stats.open, 10), 
      closed: parseInt(stats.closed, 10) 
    };
    broadcastPositionStatisticsUpdated(statistics);
    
    return NextResponse.json({ message: 'Position deleted successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to delete position. Error: ${error.message}`, 'API:Positions:Delete', actingUserId, { positionId: id });
    return NextResponse.json({ message: 'Error deleting position', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
