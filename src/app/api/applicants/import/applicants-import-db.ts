import { v4 as uuidv4 } from 'uuid';
import { getPool, type DbClient } from '@/lib/db';
import type { ApplicantImportInput, ApplicantImportResults } from './applicants-import-schema';
import { parseDate, parseFitScore, parseJsonField } from './applicants-import-schema';

function buildParsedData(applicant: ApplicantImportInput) {
  return {
    personal_info: {
      location: applicant.location || null,
      introduction_aboutme: applicant.introductionAboutMe || null,
    },
    education: parseJsonField(applicant.education),
    experience: parseJsonField(applicant.experience),
    skills: parseJsonField(applicant.skills),
    job_suitable: parseJsonField(applicant.jobSuitable),
  };
}

async function resolveRecruitmentStageId(client: DbClient, applicant: ApplicantImportInput): Promise<string | null> {
  if (applicant.statusId) {
    const result = await client.query('SELECT id FROM "RecruitmentStage" WHERE id = $1 LIMIT 1', [applicant.statusId]);
    if (result.rows[0]?.id) {
      return result.rows[0].id;
    }
    throw new Error(`Recruitment stage ID ${applicant.statusId} was not found`);
  }

  const statusName = applicant.status?.trim() || 'Applied';
  const result = await client.query('SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = LOWER($1) LIMIT 1', [statusName]);
  if (result.rows[0]?.id) {
    return result.rows[0].id;
  }

  throw new Error(`Recruitment stage "${statusName}" was not found`);
}

async function updateApplicant(client: DbClient, applicant: ApplicantImportInput) {
  const fitScore = parseFitScore(applicant.fitScore);
  const applicationDate = parseDate(applicant.applicationDate);
  const parsedData = buildParsedData(applicant);
  const customAttributes = parseJsonField(applicant.customAttributes) || {};
  const statusId = await resolveRecruitmentStageId(client, applicant);

  return client.query(
    `
      UPDATE "Applicant"
      SET
        name = $1,
        email = $2,
        phone = $3,
        "positionId" = $4,
        "recruiterId" = $5,
        "fitScore" = $6,
        "statusId" = $7,
        "applicationDate" = $8,
        "parsedData" = $9,
        "customAttributes" = $10,
        "updatedAt" = NOW()
      WHERE id = $11
    `,
    [
      applicant.name,
      applicant.email,
      applicant.phone || null,
      applicant.positionId || null,
      applicant.recruiterId || null,
      fitScore,
      statusId,
      applicationDate || new Date(),
      parsedData,
      customAttributes,
      applicant.id,
    ]
  );
}

async function createApplicant(client: DbClient, applicant: ApplicantImportInput) {
  const fitScore = parseFitScore(applicant.fitScore);
  const applicationDate = parseDate(applicant.applicationDate);
  const parsedData = buildParsedData(applicant);
  const customAttributes = parseJsonField(applicant.customAttributes) || {};
  const statusId = await resolveRecruitmentStageId(client, applicant);

  await client.query(
    `
      INSERT INTO "Applicant" (
        id, name, email, phone, "positionId", "recruiterId",
        "fitScore", "statusId", "applicationDate", "parsedData",
        "customAttributes", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    `,
    [
      uuidv4(),
      applicant.name,
      applicant.email,
      applicant.phone || null,
      applicant.positionId || null,
      applicant.recruiterId || null,
      fitScore,
      statusId,
      applicationDate || new Date(),
      parsedData,
      customAttributes,
    ]
  );
}

export async function importApplicantsToDatabase(applicants: ApplicantImportInput[]): Promise<ApplicantImportResults> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const results: ApplicantImportResults = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (const applicant of applicants) {
      try {
        if (applicant.id) {
          const updateResult = await updateApplicant(client, applicant);
          if (updateResult.rowCount && updateResult.rowCount > 0) {
            results.updated += 1;
          } else {
            results.errors.push(`Applicant with ID ${applicant.id} not found`);
          }
        } else {
          await createApplicant(client, applicant);
          results.created += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Failed to process ${applicant.email}: ${message}`);
      }
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
