import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';

export interface RecruiterSyncResult {
  positionId: string;
  positionTitle: string;
  applicantsUpdated: number;
  applicantsSkipped: number;
  errors: string[];
}

/**
 * Syncs recruiter assignments for all Applicants of a specific position
 * @param positionId - The position ID to sync recruiters for
 * @param actingUserId - The user performing the sync
 * @param actingUserName - The name of the user performing the sync
 * @returns Promise<RecruiterSyncResult>
 */
export async function syncRecruiterForPosition(
  positionId: string,
  actingUserId: string,
  actingUserName: string
): Promise<RecruiterSyncResult> {
  const client = await getPool().connect();
  const result: RecruiterSyncResult = {
    positionId,
    positionTitle: '',
    applicantsUpdated: 0,
    applicantsSkipped: 0,
    errors: []
  };

  try {
    await client.query('BEGIN');

    // Get position details with timeout
    const positionQuery = `
      SELECT p.id, p.title, p."recruiterId", u.name as "recruiterName"
      FROM "Position" p
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      WHERE p.id = $1::uuid
    `;
    const positionResult = await client.query(positionQuery, [positionId]);
    
    if (positionResult.rows.length === 0) {
      throw new Error('Position not found');
    }

    const position = positionResult.rows[0];
    result.positionTitle = position.title;
    const positionRecruiterId = position.recruiterId;

    // Get all applicants for this position with timeout
    const applicantsQuery = `
      SELECT c.id, c.name, c."recruiterId", u.name as "recruiterName"
      FROM "Applicant" c
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c."positionId" = $1::uuid
    `;
    const applicantsResult = await client.query(applicantsQuery, [positionId]);

    // Process applicants in batches to prevent memory issues
    const batchSize = 50;
    for (let i = 0; i < applicantsResult.rows.length; i += batchSize) {
      const batch = applicantsResult.rows.slice(i, i + batchSize);
      
      for (const applicant of batch) {
        try {
          // Skip if applicant already has a recruiter assigned (preserve existing assignment)
          if (applicant.recruiterId !== null) {
            result.applicantsSkipped++;
            continue;
          }

          // Skip if position has no recruiter to assign
          if (!positionRecruiterId) {
            result.applicantsSkipped++;
            continue;
          }

          // Update applicant's recruiter (only for unassigned applicants)
          const updateQuery = `
            UPDATE "Applicant" 
            SET "recruiterId" = $1, "updatedAt" = NOW()
            WHERE id = $2::uuid
          `;
          await client.query(updateQuery, [positionRecruiterId, applicant.id]);

          // Create transition record for the recruiter assignment
          const transitionMessage = `Recruiter auto-assigned from position: ${position.recruiterName || positionRecruiterId}`;

          const newTransitionId = uuidv4();
          const insertTransitionQuery = `
            INSERT INTO "TransitionRecord" (id, "applicant_id", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW());
          `;
          
          await client.query(insertTransitionQuery, [
            newTransitionId,
            applicant.id,
            positionId,
            'Applied', // Default stage
            transitionMessage,
            actingUserId
          ]);

          result.applicantsUpdated++;

          // Log the sync action (don't await to prevent blocking)
          logAudit(
            'INFO',
            `Applicant ${applicant.name} recruiter auto-assigned to ${position.recruiterName || positionRecruiterId}`,
            'RecruiterSync:Position',
            actingUserId,
            {
              applicantId: applicant.id,
              positionId,
              oldRecruiterId: null,
              newRecruiterId: positionRecruiterId
            }
          ).catch(error => {
            console.error('Failed to log audit for applicant sync:', error);
          });

        } catch (error) {
          const errorMsg = `Failed to sync applicant ${applicant.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }
      
      // Small delay between batches to prevent overwhelming the database
      if (i + batchSize < applicantsResult.rows.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    await client.query('COMMIT');

    // Log overall sync result (don't await to prevent blocking)
    logAudit(
      'INFO',
      `Recruiter sync completed for position "${position.title}": ${result.applicantsUpdated} updated, ${result.applicantsSkipped} skipped`,
      'RecruiterSync:Position',
      actingUserId,
      { positionId, result }
    ).catch(error => {
      console.error('Failed to log audit for sync completion:', error);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    const errorMsg = `Failed to sync recruiters for position: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error(errorMsg, error);
    throw error;
  } finally {
    client.release();
  }

  return result;
}

/**
 * Syncs recruiter assignments for all positions and their Applicants
 * @param actingUserId - The user performing the sync
 * @param actingUserName - The name of the user performing the sync
 * @returns Promise<RecruiterSyncResult[]>
 */
export async function syncAllRecruiter(
  actingUserId: string,
  actingUserName: string
): Promise<RecruiterSyncResult[]> {
  const client = await getPool().connect();
  const results: RecruiterSyncResult[] = [];

  try {
    // Get all positions with Applicants
    const positionsQuery = `
      SELECT DISTINCT p.id, p.title
      FROM "Position" p
      INNER JOIN "Applicant" c ON p.id = c."positionId"
    `;
    const positionsResult = await client.query(positionsQuery);

    for (const position of positionsResult.rows) {
      try {
        const result = await syncRecruiterForPosition(
          position.id,
          actingUserId,
          actingUserName
        );
        results.push(result);
      } catch (error) {
        const errorMsg = `Failed to sync position ${position.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg, error);
        results.push({
          positionId: position.id,
          positionTitle: position.title,
          applicantsUpdated: 0,
          applicantsSkipped: 0,
          errors: [errorMsg]
        });
      }
    }

  } finally {
    client.release();
  }

  return results;
}

/**
 * Syncs recruiter for a single Applicant when their position's recruiter changes
 * @param applicantId - The Applicant ID to sync
 * @param positionId - The position ID (optional, will be fetched if not provided)
 * @param actingUserId - The user performing the sync
 * @param actingUserName - The name of the user performing the sync
 * @returns Promise<boolean> - True if sync was successful
 */
export async function syncRecruiterForApplicant(
  applicantId: string,
  positionId: string | null = null,
  actingUserId: string,
  actingUserName: string
): Promise<boolean> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Get applicant details if positionId not provided
    if (!positionId) {
      const applicantQuery = 'SELECT "positionId" FROM "Applicant" WHERE id = $1::uuid';
      const applicantResult = await client.query(applicantQuery, [applicantId]);
      
      if (applicantResult.rows.length === 0) {
        throw new Error('Applicant not found');
      }
      
      positionId = applicantResult.rows[0].positionId;
      
      if (!positionId) {
        // Applicant has no position, nothing to sync
        return true;
      }
    }

    // Get position recruiter
    const positionQuery = `
      SELECT p."recruiterId", u.name as "recruiterName"
      FROM "Position" p
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      WHERE p.id = $1::uuid
    `;
    const positionResult = await client.query(positionQuery, [positionId]);
    
    if (positionResult.rows.length === 0) {
      throw new Error('Position not found');
    }

    const position = positionResult.rows[0];
    const positionRecruiterId = position.recruiterId;

    // Get current applicant recruiter
    const applicantQuery = `
      SELECT c."recruiterId", u.name as "recruiterName"
      FROM "Applicant" c
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c.id = $1::uuid
    `;
    const applicantResult = await client.query(applicantQuery, [applicantId]);
    
    if (applicantResult.rows.length === 0) {
      throw new Error('Applicant not found');
    }

    const applicantRecord = applicantResult.rows[0];
    
    // Skip if applicant already has a recruiter assigned (preserve existing assignment)
    if (applicantRecord.recruiterId !== null) {
      return true;
    }

    // Skip if position has no recruiter to assign
    if (!positionRecruiterId) {
      return true;
    }

    const oldRecruiterId = applicantRecord.recruiterId;
    const oldRecruiterName = applicantRecord.recruiterName;

    // Update Applicant's recruiter
    const updateQuery = `
      UPDATE "Applicant" 
      SET "recruiterId" = $1, "updatedAt" = NOW()
      WHERE id = $2::uuid
    `;
    await client.query(updateQuery, [positionRecruiterId, applicantId]);

    // Create transition record
    const transitionMessage = `Recruiter auto-assigned from position: ${position.recruiterName || positionRecruiterId}`;

    const newTransitionId = uuidv4();
    const insertTransitionQuery = `
      INSERT INTO "TransitionRecord" (id, "applicant_id", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW());
    `;
    
    await client.query(insertTransitionQuery, [
      newTransitionId,
      applicantId,
      positionId,
      'Applied',
      transitionMessage,
      actingUserId
    ]);

    await client.query('COMMIT');

    // Log the sync action
    await logAudit(
      'INFO',
      `Applicant recruiter auto-assigned to ${position.recruiterName || positionRecruiterId}`,
      'RecruiterSync:Applicant',
      actingUserId,
      {
        applicantId,
        positionId,
        oldRecruiterId: null,
        newRecruiterId: positionRecruiterId
      }
    );

    return true;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to sync recruiter for Applicant:', error);
    return false;
  } finally {
    client.release();
  }
}
