// src/app/api/users/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { UserProfile, PlatformModuleId, UserTeam } from '@/lib/types';
import { PLATFORM_MODULES } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions, clearUserValidationCache } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { dispatchWebhooks } from '@/lib/webhooks';
import { createDefaultWarningConfigurations } from '@/lib/userWarningDefaults';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Returns a list of all users.
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *   post:
 *     summary: Create a new user
 *     description: Creates a new user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */

const platformModuleIds = PLATFORM_MODULES.map(m => m.id) as [PlatformModuleId, ...PlatformModuleId[]];

const userRoleEnum = z.enum(['Admin', 'Recruiter', 'Hiring Manager']);

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  // Password is only required for 'basic' users; for 'azure', it is optional
  password: z.string().min(8, "Password must be at least 8 characters long").optional(),
  role: userRoleEnum,
  modulePermissions: z.array(z.enum(platformModuleIds)).optional().default([]),
  userTeamIds: z.array(z.string().uuid()).optional().default([]),
  authenticationMethod: z.enum(['basic', 'azure']).optional().default('basic'),
  forcePasswordChange: z.boolean().optional().default(false),
  personalColor: z.string().optional().default('#3B82F6'),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized: User session required." }, { status: 401 });
  }
  
  const userRole = session.user.role;
  const { searchParams } = new URL(request.url);
  const filterNameInput = searchParams.get('name');
  const filterEmailInput = searchParams.get('email');
  const filterRoleInput = searchParams.get('role');
  const filterTeamIdInput = searchParams.get('teamId');
  
  // Pagination parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');
  const skip = (page - 1) * pageSize;

  const canManageUsers = userRole === 'Admin' || (session.user.modulePermissions?.includes('USERS_MANAGE') ?? false);
  const isRecruiter = userRole === 'Recruiter';

  // Allow all authenticated users to fetch recruiters for filtering purposes
  // Only restrict user management operations, not viewing recruiters

  try {
    // Build where conditions
    const whereConditions: any = {};
    
    // Always allow fetching recruiters for filtering purposes, regardless of user role
    if (filterRoleInput && filterRoleInput !== "ALL_ROLES") {
      whereConditions.role = filterRoleInput;
    } else if (!canManageUsers) {
      // For non-admin users without USERS_MANAGE, default to showing only recruiters
      // This allows them to use recruiter filters while maintaining security
      whereConditions.role = 'Recruiter';
    }
    // If canManageUsers and no specific role filter, show all users

    
    if (filterNameInput) {
      whereConditions.name = { contains: filterNameInput, mode: 'insensitive' };
    }
    if (filterEmailInput) {
      whereConditions.email = { contains: filterEmailInput, mode: 'insensitive' };
    }

    // Team filter joins
    if (filterTeamIdInput) {
      whereConditions.userTeams = {
        some: {
          teamId: filterTeamIdInput
        }
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.user.count({
      where: whereConditions
    });

    let users = [];
    try {
      users = await prisma.user.findMany({
        where: whereConditions,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          personalColor: true,
          authenticationMethod: true,
          forcePasswordChange: true,
          module_permissions: true,
          createdAt: true,
          updatedAt: true,
          userTeams: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  color: true
                }
              }
            }
          }
        } as any,
        orderBy: {
          name: 'asc'
        },
        skip,
        take: pageSize
      });
    } catch (err) {
      // If the table or fields are missing, return empty array
      console.error('User table or fields missing:', err);
      return NextResponse.json({
        users: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
          pageSize: pageSize
        }
      }, { status: 200 });
    }

    const usersToReturn = users.map((user: any) => ({
      ...user,
      teams: user.userTeams.map((ut: any) => ut.team),
      modulePermissions: user.module_permissions || []
    }));

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      users: usersToReturn,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch users (Prisma Error):", error);
    const userNameForLog = session?.user?.name || session?.user?.email || 'Unknown User';
    await logAudit('ERROR', `Failed to fetch users by ${userNameForLog}. Prisma Error: ${(error instanceof Error ? error.message : String(error))}`, 'API:Users:Get', session.user.id);
    return NextResponse.json({ 
        message: "Error fetching users due to a server-side database error.", 
        error: (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized: User session required." },
      { status: 401 }
    );
  }

  const isAdmin = session.user?.role === 'Admin';
  const hasUserManagePermission = session.user?.modulePermissions?.includes('USERS_MANAGE');
  
  if (!isAdmin && !hasUserManagePermission) {
    await logAudit('WARN', `Forbidden attempt to create user by ${session?.user?.email || 'Unknown'} (ID: ${session?.user?.id || 'N/A'}). Required: Admin role or USERS_MANAGE permission.`, 'API:Users:Create', session?.user?.id);
    return NextResponse.json(
      { message: "Forbidden: You must be an Admin or have USERS_MANAGE permission to create users." },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Error parsing request body for new user:", error);
    return NextResponse.json({ message: "Error parsing request body", error: (error as Error).message }, { status: 400 });
  }

  const validationResult = createUserSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: "Invalid input", errors: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password, role, modulePermissions, userTeamIds, authenticationMethod, forcePasswordChange, personalColor } = validationResult.data;


  const saltRounds = 10;
  let hashedPassword;
  try {
    if (authenticationMethod === 'azure') {
      // For Azure users, generate a placeholder password
      hashedPassword = await bcrypt.hash('azure-ad-placeholder-' + Date.now(), saltRounds);
    } else {
      if (!password) {
        return NextResponse.json({ message: "Password is required for basic authentication." }, { status: 400 });
      }
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }
  } catch (hashError) {
    console.error("Error hashing password:", hashError);
    await logAudit('ERROR', `Error hashing password for new user ${email} by ${session.user.name}. Error: ${(hashError as Error).message}`, 'API:Users:Create', session.user.id);
    return NextResponse.json({ message: "Error processing user creation (hashing failed)." }, { status: 500 });
  }
  
  try {
    const defaultAvatarUrl = `https://placehold.co/100x100.png?text=${name?.charAt(0)?.toUpperCase() || 'U'}`;
    const defaultDataAiHint = "profile person";

    // Define role to group ID mappings
    const roleToGroupId = {
      'Admin': '00000000-0000-0000-0000-000000000001',
      'Recruiter': '00000000-0000-0000-0000-000000000002',
      'Hiring Manager': '00000000-0000-0000-0000-000000000003'
    };

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        avatarUrl: defaultAvatarUrl,
        dataAiHint: defaultDataAiHint,
        module_permissions: modulePermissions,
        authenticationMethod,
        forcePasswordChange,
        personalColor,
        // Assign user to the appropriate group based on role
        userGroups: roleToGroupId[role] ? {
          create: {
            groupId: roleToGroupId[role]
          }
        } : undefined,
        // Temporarily comment out team assignment to isolate the issue
        // userTeams: userTeamIds && userTeamIds.length > 0 ? {
        //   create: userTeamIds.map(teamId => ({
        //     teamId
        //   }))
        // } : undefined
      } as any
    });

    // Create default warning configurations for the new user
    try {
      await createDefaultWarningConfigurations(newUser.id, session.user.id);
      // console.log('Default warning configurations created for user:', newUser.id);
    } catch (warningError) {
      console.error('Error creating default warning configurations:', warningError);
      // Don't fail the user creation if warning config creation fails
      await logAudit('WARN', `Failed to create default warning configurations for user ${newUser.id}. Error: ${(warningError as Error).message}`, 'API:Users:Create', session.user.id);
    }

    const userToReturn = {
      ...newUser,
      teams: [],
      modulePermissions: (newUser as any).module_permissions || []
    };

    // Clear user validation cache for the new user
    clearUserValidationCache(newUser.id);

    await logAudit('AUDIT', `User account '${userToReturn.name}' (ID: ${userToReturn.id}) created by ${session.user.name}.`, 'API:Users:Create', session.user.id, { targetUserId: userToReturn.id, role: userToReturn.role, permissions: userToReturn.modulePermissions, groups: userTeamIds });
    await dispatchWebhooks.userCreated(newUser);
    return NextResponse.json(userToReturn, { status: 201 });

  } catch (error: any) {
    console.error("Failed to create user:", error);
    console.error("Error details:", {
      code: error.code,
      meta: error.meta,
      message: error.message,
      stack: error.stack
    });
    const userNameForLog = session?.user?.name || session?.user?.email || 'Unknown User';
    await logAudit('ERROR', `Failed to create user ${email} by ${userNameForLog}. Error: ${error.message}.`, 'API:Users:Create', session.user.id);
    
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ message: "User with this email already exists." }, { status: 409 });
    }
    
    return NextResponse.json({ message: "Error creating user", error: error.message }, { status: 500 });
  }
}
