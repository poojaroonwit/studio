// src/lib/apiUtils.ts
import { getPool } from './db';
import type { Position, RecruitmentStage, Applicant, UserProfile } from './types';
import { normalizeFitScore } from './scoreUtils';

export async function fetchAllPositionsDb(): Promise<Position[]> {
  const pool = getPool();
  try {
    const result = await pool.query('SELECT * FROM "Position" ORDER BY title ASC');
    const positionsFromDb = result.rows;
    return positionsFromDb;
  } catch (error) {
    console.error("Error fetching all positions from DB:", error);
    throw error;
  }
}

export async function fetchAllRecruitmentStagesDb(): Promise<RecruitmentStage[]> {
  const pool = getPool();
  try {
    const result = await pool.query('SELECT * FROM "RecruitmentStage" ORDER BY sort_order ASC, name ASC');
    const stagesFromDb = result.rows;
    return stagesFromDb;
  } catch (error) {
    console.error("Error fetching all recruitment stages from DB:", error);
    throw error;
  }
}

export async function fetchAllUsersDb(filterRole?: UserProfile['role']): Promise<UserProfile[]> {
  const pool = getPool();
  try {
    let query = 'SELECT id, name, email, role, image as "avatarUrl" FROM "User"';
    const queryParams = [];
    if (filterRole) {
      query += ' WHERE role = $1';
      queryParams.push(filterRole);
    }
    query += ' ORDER BY name ASC';
    const result = await pool.query(query, queryParams);
    const usersFromDb = result.rows;
    return usersFromDb;
  } catch (error) {
    console.error(`Error fetching users from DB (role: ${filterRole || 'all'}):`, error);
    throw error;
  }
}

export async function fetchInitialDashboardApplicantsDb(limit: number = 10): Promise<Applicant[]> {
  const pool = getPool();
  try {
    const query = `
      SELECT id, name, email, phone, "positionId", "recruiterId", "fitScore", "statusId", "applicationDate", "parsedData", "customAttributes", "resumePath", "createdAt", "updatedAt"
      FROM "Applicant"
      ORDER BY "createdAt" DESC
      LIMIT $1;
    `;
    const result = await pool.query(query, [limit]);
    return result.rows.map((row: any) => ({
      ...row,
      fitScore: normalizeFitScore(row.fitScore),
    }));
  } catch (error) {
    console.error("Error fetching initial dashboard Applicants from DB:", error);
    throw error;
  }
}

export async function getAllPositions() {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM "Position" ORDER BY title ASC');
  return result.rows.map((row: any) => ({
    ...row,
    customAttributes: row.customAttributes || {},
  }));
}

export async function getAllUsers() {
  const pool = getPool();
  let query = 'SELECT id, name, email, role, image as "avatarUrl" FROM "User"';
  const result = await pool.query(query);
  return result.rows;
}

export async function getAllApplicants() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT c.*, p.title as "positionTitle", r.name as "recruiterName", r."avatarUrl" as "recruiterAvatarUrl"
    FROM "Applicant" c
    LEFT JOIN "Position" p ON c."positionId" = p.id
    LEFT JOIN "User" r ON c."recruiterId" = r.id
    ORDER BY c."applicationDate" DESC
  `);
  return result.rows.map((row: any) => ({
    ...row,
    customAttributes: row.customAttributes || {},
    position: row.positionId ? { title: row.positionTitle } : null,
    recruiter: row.recruiterId ? { 
      name: row.recruiterName,
      avatarUrl: row.recruiterAvatarUrl || null
    } : null,
  }));
}

/**
 * Recursively converts string booleans (case-insensitive) and numeric strings to their correct types in an object or array.
 * - "true"/"false" (any case) => boolean
 * - Numeric strings => number
 */
export function convertStringBooleansAndNumbers(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertStringBooleansAndNumbers);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, convertStringBooleansAndNumbers(value)])
    );
  } else if (typeof obj === 'string') {
    const lower = obj.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    // Check if string is a number (integer or float)
    if (!isNaN(obj as any) && obj.trim() !== '') return Number(obj);
  }
  return obj;
}

/**
 * Recursively converts string booleans ("true", "false") and numeric strings to their respective types in an object or array.
 * Leaves other types unchanged.
 */
export function normalizePayloadTypes<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map(normalizePayloadTypes) as unknown as T;
  }
  if (input !== null && typeof input === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = normalizePayloadTypes(value);
    }
    return result;
  }
  if (typeof input === 'string') {
    // Boolean conversion (case-insensitive)
    const lower = input.toLowerCase();
    if (lower === 'true') return true as unknown as T;
    if (lower === 'false') return false as unknown as T;
    // Number conversion (but not empty string)
    if (input !== '' && !isNaN(Number(input))) {
      const num = Number(input);
      // If the number is an integer (e.g., 42.0), return as integer
      if (Number.isInteger(num)) {
        return Math.trunc(num) as unknown as T;
      }
      return num as unknown as T;
    }
  }
  return input;
}

// Utility to convert specific fields to string, number, or boolean as required by API
const FIELDS_TO_STRINGIFY = [
  // educationData & experienceData
  'GPA', 'startMonth', 'startYear', 'endMonth', 'endYear', 'isCurrent', 'major', 'university', 'company', 'position', 'description',
  // applicant_info.personal_info
  'firstname', 'lastname', 'nickname', 'title_honorific', 'introduction_aboutme', 'location',
  // applicant_info.contact_info
  'email', 'phone',
  // applicant_info
  'cv_language', 'status',
  // applicant_info.job_suitable
  'suitable_career', 'suitable_job_level', 'suitable_job_position', 'suitable_salary_bath_month',
  // applicant_info.skills
  'segment_skill'
];

const FIELDS_TO_NUMBERIFY: string[] = [
  // Add fields that must be numbers here if needed in the future
];

const FIELDS_TO_BOOLEANIFY: string[] = [
  // Add fields that must be booleans here if needed in the future
];

export function convertFieldsToTypes(obj: any): any {
  if (Array.isArray(obj)) {
    // If it's an array of primitives, handle conversion if needed
    return obj.map(convertFieldsToTypes);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const value = obj[key];

      if (FIELDS_TO_STRINGIFY.includes(key)) {
        newObj[key] = value != null ? value.toString() : '';
      } else if (FIELDS_TO_NUMBERIFY.includes(key)) {
        if (typeof value === 'number') {
          newObj[key] = value;
        } else if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
          newObj[key] = Number(value);
        } else {
          newObj[key] = value;
        }
      } else if (FIELDS_TO_BOOLEANIFY.includes(key)) {
        if (typeof value === 'boolean') {
          newObj[key] = value;
        } else if (typeof value === 'string') {
          newObj[key] = value.toLowerCase() === 'true';
        } else if (typeof value === 'number') {
          newObj[key] = value !== 0;
        } else {
          newObj[key] = Boolean(value);
        }
      } else if (key === 'skill' && Array.isArray(value)) {
        // Special case: skills.skill is an array of strings
        newObj[key] = value.map((item: any) => typeof item === 'string' ? item : item.toString());
      } else {
        newObj[key] = convertFieldsToTypes(value);
      }
    }
    return newObj;
  }
  return obj;
}
