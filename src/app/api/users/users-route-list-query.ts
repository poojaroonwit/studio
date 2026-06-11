import type { Prisma } from '@prisma/client';
import type { Session } from 'next-auth';
import { getPool } from '@/lib/db';
import { expandPermissionSet } from '@/lib/permission-aliases';
import { hasAnyPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  personalColor: true,
  authenticationMethods: true,
  forcePasswordChange: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  userGroupId: true,
  userTeamId: true,
  twoFactorEnabled: true,
  twoFactorMethod: true,
  positionTitle: true,
} as const satisfies Prisma.UserSelect;

export type UserListItem = Prisma.UserGetPayload<{ select: typeof userListSelect }>;

export type UsersPagination = {
  page: number;
  pageSize: number;
  skip: number;
};

type LastLoginRow = {
  timestamp: Date | string | null;
};

export class UsersTableMissingError extends Error {}

export function buildUsersWhereConditions(searchParams: URLSearchParams, session: Session): Prisma.UserWhereInput {
  const whereConditions: Prisma.UserWhereInput = {};
  const filterRoleInput = searchParams.get('role');
  const canManageUsers = hasAnyPermission(session.user, ['USERS_VIEW']);

  if (filterRoleInput && filterRoleInput !== 'ALL_ROLES') {
    whereConditions.role = filterRoleInput;
  } else if (!canManageUsers) {
    whereConditions.role = 'Recruiter';
  }

  const filterNameInput = searchParams.get('name');
  const filterEmailInput = searchParams.get('email');
  const filterTeamIdInput = searchParams.get('teamId');

  if (filterNameInput) {
    whereConditions.name = { contains: filterNameInput, mode: 'insensitive' };
  }
  if (filterEmailInput) {
    whereConditions.email = { contains: filterEmailInput, mode: 'insensitive' };
  }
  if (filterTeamIdInput) {
    whereConditions.userTeamId = filterTeamIdInput;
  }

  return whereConditions;
}

export function getUsersPagination(searchParams: URLSearchParams): UsersPagination {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export async function getUsersTotalCount(whereConditions: Prisma.UserWhereInput) {
  return prisma.user.count({ where: whereConditions });
}

export async function findUserIdsOnly(whereConditions: Prisma.UserWhereInput) {
  const userIds = await prisma.user.findMany({
    where: whereConditions,
    select: { id: true },
    orderBy: { name: 'asc' },
  });

  return userIds.map((user: { id: string }) => user.id);
}

export async function findUsersForList(
  whereConditions: Prisma.UserWhereInput,
  pagination: UsersPagination
) {
  try {
    return await prisma.user.findMany({
      where: whereConditions,
      select: userListSelect,
      orderBy: { name: 'asc' },
      skip: pagination.skip,
      take: pagination.pageSize,
    });
  } catch (err) {
    console.error('User table or fields missing:', err);
    throw new UsersTableMissingError();
  }
}

export async function enrichUsersForList(users: UserListItem[], session: Session) {
  const isManager = session.user.role === 'Hiring Manager' || hasAnyPermission(session.user, ['USERS_VIEW']);

  return Promise.all(users.map(async (user) => {
    const [userGroup, userTeam, lastLogin] = await Promise.all([
      getUserGroup(user.userGroupId),
      getUserTeam(user.userTeamId),
      isManager ? getLastLogin(user.id) : Promise.resolve(null),
    ]);

    return {
      ...user,
      teams: userTeam ? [userTeam] : [],
      modulePermissions: expandPermissionSet(userGroup?.permissions || []),
      userGroupName: userGroup?.name || null,
      lastLogin,
    };
  }));
}

function getUserGroup(userGroupId?: string | null) {
  return userGroupId
    ? prisma.userGroup.findUnique({
      where: { id: userGroupId },
      select: { id: true, name: true, permissions: true },
    })
    : null;
}

function getUserTeam(userTeamId?: string | null) {
  return userTeamId
    ? prisma.userTeam.findUnique({
      where: { id: userTeamId },
      select: { id: true, name: true, color: true },
    })
    : null;
}

async function getLastLogin(userId: string): Promise<string | null> {
  try {
    const client = await getPool().connect();
    try {
      const lastLoginResult = await client.query<LastLoginRow>(`
        SELECT timestamp
        FROM "LogEntry"
        WHERE "actingUserId" = $1
          AND (message ILIKE '%login%' OR message ILIKE '%sign in%' OR source ILIKE '%auth%')
        ORDER BY timestamp DESC
        LIMIT 1
      `, [userId]);
      const timestamp = lastLoginResult.rows[0]?.timestamp;
      return timestamp instanceof Date ? timestamp.toISOString() : timestamp || null;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching last login:', error);
    return null;
  }
}
