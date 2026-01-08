import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';

export interface RecruiterSyncResult {
  positionId: string;
  positionTitle: string;
  candidatesUpdated: number;
  candidatesSkipped: number;
  errors: string[];
}

/**
 * Syncs recruiter assignments for all candidates of a specific position
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
    candidatesUpdated: 0,
    candidatesSkipped: 0,
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

    // Get all candidates for this position with timeout
    const candidatesQuery = `
      SELECT c.id, c.name, c."recruiterId", u.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c."positionId" = $1::uuid
    `;
    const candidatesResult = await client.query(candidatesQuery, [positionId]);

    // Process candidates in batches to prevent memory issues
    const batchSize = 50;
    for (let i = 0; i < candidatesResult.rows.length; i += batchSize) {
      const batch = candidatesResult.rows.slice(i, i + batchSize);
      
      for (const candidate of batch) {
        try {
          // Skip if candidate already has a recruiter assigned (preserve existing assignment)
          if (candidate.recruiterId !== null) {
            result.candidatesSkipped++;
            continue;
          }

          // Skip if position has no recruiter to assign
          if (!positionRecruiterId) {
            result.candidatesSkipped++;
            continue;
          }

          const oldRecruiterId = candidate.recruiterId;
          const oldRecruiterName = candidate.recruiterName;

          // Update candidate's recruiter (only for unassigned candidates)
          const updateQuery = `
            UPDATE "Candidate" 
            SET "recruiterId" = $1, "updatedAt" = NOW()
            WHERE id = $2::uuid
          `;
          await client.query(updateQuery, [positionRecruiterId, candidate.id]);

          // Create transition record for the recruiter assignment
          const transitionMessage = `Recruiter auto-assigned from position: ${position.recruiterName || positionRecruiterId}`;

          const newTransitionId = uuidv4();
          const insertTransitionQuery = `
            INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW());
          `;
          
          await client.query(insertTransitionQuery, [
            newTransitionId,
            candidate.id,
            positionId,
            'Applied', // Default stage
            transitionMessage,
            actingUserId
          ]);

          result.candidatesUpdated++;

          // Log the sync action (don't await to prevent blocking)
          logAudit(
            'INFO',
            `Candidate ${candidate.name} recruiter auto-assigned to ${position.recruiterName || positionRecruiterId}`,
            'RecruiterSync:Position',
            actingUserId,
            {
              candidateId: candidate.id,
              positionId,
              oldRecruiterId: null,
              newRecruiterId: positionRecruiterId
            }
          ).catch(error => {
            console.error('Failed to log audit for candidate sync:', error);
          });

        } catch (error) {
          const errorMsg = `Failed to sync candidate ${candidate.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }
      
      // Small delay between batches to prevent overwhelming the database
      if (i + batchSize < candidatesResult.rows.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    await client.query('COMMIT');

    // Log overall sync result (don't await to prevent blocking)
    logAudit(
      'INFO',
      `Recruiter sync completed for position "${position.title}": ${result.candidatesUpdated} updated, ${result.candidatesSkipped} skipped`,
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
 * Syncs recruiter assignments for all positions and their candidates
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
    // Get all positions with candidates
    const positionsQuery = `
      SELECT DISTINCT p.id, p.title
      FROM "Position" p
      INNER JOIN "Candidate" c ON p.id = c."positionId"
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
          candidatesUpdated: 0,
          candidatesSkipped: 0,
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
 * Syncs recruiter for a single candidate when their position's recruiter changes
 * @param candidateId - The candidate ID to sync
 * @param positionId - The position ID (optional, will be fetched if not provided)
 * @param actingUserId - The user performing the sync
 * @param actingUserName - The name of the user performing the sync
 * @returns Promise<boolean> - True if sync was successful
 */
export async function syncRecruiterForCandidate(
  candidateId: string,
  positionId: string | null = null,
  actingUserId: string,
  actingUserName: string
): Promise<boolean> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Get candidate details if positionId not provided
    if (!positionId) {
      const candidateQuery = 'SELECT "positionId" FROM "Candidate" WHERE id = $1::uuid';
      const candidateResult = await client.query(candidateQuery, [candidateId]);
      
      if (candidateResult.rows.length === 0) {
        throw new Error('Candidate not found');
      }
      
      positionId = candidateResult.rows[0].positionId;
      
      if (!positionId) {
        // Candidate has no position, nothing to sync
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

    // Get current candidate recruiter
    const candidateQuery = `
      SELECT c."recruiterId", u.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c.id = $1::uuid
    `;
    const candidateResult = await client.query(candidateQuery, [candidateId]);
    
    if (candidateResult.rows.length === 0) {
      throw new Error('Candidate not found');
    }

    const candidate = candidateResult.rows[0];
    
    // Skip if candidate already has a recruiter assigned (preserve existing assignment)
    if (candidate.recruiterId !== null) {
      return true;
    }

    // Skip if position has no recruiter to assign
    if (!positionRecruiterId) {
      return true;
    }

    const oldRecruiterId = candidate.recruiterId;
    const oldRecruiterName = candidate.recruiterName;

    // Update candidate's recruiter
    const updateQuery = `
      UPDATE "Candidate" 
      SET "recruiterId" = $1, "updatedAt" = NOW()
      WHERE id = $2::uuid
    `;
    await client.query(updateQuery, [positionRecruiterId, candidateId]);

    // Create transition record
    const transitionMessage = `Recruiter auto-assigned from position: ${position.recruiterName || positionRecruiterId}`;

    const newTransitionId = uuidv4();
    const insertTransitionQuery = `
      INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW());
    `;
    
    await client.query(insertTransitionQuery, [
      newTransitionId,
      candidateId,
      positionId,
      'Applied',
      transitionMessage,
      actingUserId
    ]);

    await client.query('COMMIT');

    // Log the sync action
    await logAudit(
      'INFO',
      `Candidate recruiter auto-assigned to ${position.recruiterName || positionRecruiterId}`,
      'RecruiterSync:Candidate',
      actingUserId,
      {
        candidateId,
        positionId,
        oldRecruiterId: null,
        newRecruiterId: positionRecruiterId
      }
    );

    return true;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to sync recruiter for candidate:', error);
    return false;
  } finally {
    client.release();
  }
}
