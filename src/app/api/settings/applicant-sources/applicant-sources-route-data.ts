import { v4 as uuidv4 } from 'uuid';

import { getPool } from '@/lib/db';
import type {
  ApplicantSourceIdRow,
  ApplicantSourceRow,
  CreateApplicantSourceInput,
} from './applicant-sources-route-schema';

export async function fetchApplicantSources() {
  const result = await getPool().query<ApplicantSourceRow>(`
    SELECT 
      id, name, description, email, logo, allow_sub_source as "allowSubSource", 
      sort_order as "sortOrder", is_active as "isActive", 
      "createdAt", "updatedAt"
    FROM "ApplicantSource"
    ORDER BY sort_order ASC, name ASC
  `);

  return result.rows;
}

export async function applicantSourceNameExists(name: string) {
  const existingResult = await getPool().query<ApplicantSourceIdRow>(
    'SELECT id FROM "ApplicantSource" WHERE name = $1',
    [name]
  );

  return existingResult.rows.length > 0;
}

export async function createApplicantSource(input: CreateApplicantSourceInput) {
  const id = uuidv4();
  const result = await getPool().query<ApplicantSourceRow>(`
    INSERT INTO "ApplicantSource" (
      id, name, description, email, logo, allow_sub_source, sort_order, is_active, 
      "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING id, name, description, email, logo, allow_sub_source as "allowSubSource", 
              sort_order as "sortOrder", is_active as "isActive", 
              "createdAt", "updatedAt"
  `, [
    id,
    input.name,
    input.description,
    input.email,
    input.logo,
    input.allowSubSource,
    input.sortOrder,
    input.isActive,
  ]);

  return result.rows[0];
}
