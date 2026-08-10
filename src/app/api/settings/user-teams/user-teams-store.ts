import type { QueryResultRow } from 'pg';

import { getPool } from '@/lib/db';

import type { UserTeamInput } from './user-teams-schema';

export type UserTeamRow = QueryResultRow & {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  member_count?: string;
};

export async function fetchUserTeams(): Promise<UserTeamRow[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query<UserTeamRow>(`
      SELECT 
        ut.id,
        ut.name,
        ut.description,
        ut.color,
        ut."is_active" as "isActive",
        ut."createdAt",
        ut."updatedAt",
        COUNT(u.id) as member_count
      FROM "UserTeam" ut
      LEFT JOIN "User" u ON ut.id = u."userTeamId"
      GROUP BY ut.id, ut.name, ut.description, ut.color, ut."is_active", ut."createdAt", ut."updatedAt"
      ORDER BY ut.name
    `);

    return result.rows;
  } finally {
    client.release();
  }
}

export async function createUserTeam(id: string, input: UserTeamInput): Promise<UserTeamRow> {
  const client = await getPool().connect();
  try {
    const result = await client.query<UserTeamRow>(
      'INSERT INTO "UserTeam" (id, name, description, color, "is_active") VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, input.name, input.description, input.color, input.isActive]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}
