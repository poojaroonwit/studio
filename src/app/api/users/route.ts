// src/app/api/users/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { UserProfile, PlatformModuleId, UserGroup } from '@/lib/types';
import { PLATFORM_MODULES } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions, clearUserValidationCache } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { dispatchWebhooks } from '@/lib/webhooks';

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
  groupIds: z.array(z.string().uuid()).optional().default([]),
  authenticationMethod: z.enum(['basic', 'azure']).optional().default('basic'),
  forcePasswordChange: z.boolean().optional().default(false),
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

  const canManageUsers = userRole === 'Admin' || (session.user.modulePermissions?.includes('USERS_MANAGE') ?? false);
  const isRecruiter = userRole === 'Recruiter';

  // Allow recruiters to fetch other recruiters for assignment purposes
  // but restrict other user management operations
  if (!canManageUsers && !isRecruiter) {
    const userNameForLog = session?.user?.name || session?.user?.email || 'Unknown User';
    await logAudit('WARN', `Forbidden attempt to list users by ${userNameForLog} (Role: ${userRole}). Lacks USERS_MANAGE.`, 'API:Users:Get', session.user.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions to list users." }, { status: 403 });
  }

  try {
    // Build where conditions
    const whereConditions: any = {};
    
    if (canManageUsers) {
      // Admins and users with USERS_MANAGE can see all users with role filtering
      if (filterRoleInput && filterRoleInput !== "ALL_ROLES") {
        whereConditions.role = filterRoleInput;
      }
    } else if (isRecruiter) {
      // Recruiters can only see other recruiters for assignment purposes
      whereConditions.role = 'Recruiter';
      if (filterRoleInput && filterRoleInput !== "ALL_ROLES" && filterRoleInput !== "Recruiter") {
        // Return empty result for non-recruiter roles when user is recruiter
        return NextResponse.json([], { status: 200 });
      }
    }

    if (filterNameInput) {
      whereConditions.name = { contains: filterNameInput, mode: 'insensitive' };
    }
    if (filterEmailInput) {
      whereConditions.email = { contains: filterEmailInput, mode: 'insensitive' };
    }

    let users = [];
    try {
      users = await prisma.user.findMany({
        where: whereConditions,
        include: {
          userGroups: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });
    } catch (err) {
      // If the table or fields are missing, return empty array
      console.error('User table or fields missing:', err);
      return NextResponse.json([], { status: 200 });
    }

    const usersToReturn = users.map((user: any) => ({
      ...user,
      groups: user.userGroups.map((ug: any) => ug.group)
    }));

    return NextResponse.json(usersToReturn, { status: 200 });
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
  if (!session || session.user?.role !== 'Admin') {
    await logAudit('WARN', `Forbidden attempt to create user by ${session?.user?.email || 'Unknown'} (ID: ${session?.user?.id || 'N/A'}). Required role: Admin.`, 'API:Users:Create', session?.user?.id);
    return NextResponse.json(
      { message: "Forbidden: You must be an Admin to create users." },
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

  const { name, email, password, role, modulePermissions, groupIds, authenticationMethod, forcePasswordChange } = validationResult.data;

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

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        avatarUrl: defaultAvatarUrl,
        dataAiHint: defaultDataAiHint,
        modulePermissions,
        authenticationMethod,
        forcePasswordChange,
        userGroups: groupIds && groupIds.length > 0 ? {
          create: groupIds.map(groupId => ({
            groupId
          }))
        } : undefined
      },
      include: {
        userGroups: {
          include: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    const userToReturn = {
      ...newUser,
      groups: newUser.userGroups.map((ug: any) => ug.group)
    };

    // Clear user validation cache for the new user
    clearUserValidationCache(newUser.id);

    await logAudit('AUDIT', `User account '${userToReturn.name}' (ID: ${userToReturn.id}) created by ${session.user.name}.`, 'API:Users:Create', session.user.id, { targetUserId: userToReturn.id, role: userToReturn.role, permissions: userToReturn.modulePermissions, groups: groupIds });
    await dispatchWebhooks.userCreated(newUser);
    return NextResponse.json(userToReturn, { status: 201 });

  } catch (error: any) {
    console.error("Failed to create user:", error);
    const userNameForLog = session?.user?.name || session?.user?.email || 'Unknown User';
    await logAudit('ERROR', `Failed to create user ${email} by ${userNameForLog}. Error: ${error.message}.`, 'API:Users:Create', session.user.id);
    
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ message: "User with this email already exists." }, { status: 409 });
    }
    
    return NextResponse.json({ message: "Error creating user", error: error.message }, { status: 500 });
  }
}
