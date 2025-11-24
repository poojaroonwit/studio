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
import { hasAnyPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

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

const platformModuleIds = PLATFORM_MODULES.map(m => m.id);

const userRoleEnum = z.enum(['Admin', 'Recruiter', 'Hiring Manager']);

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  // Password is only required for 'basic' users; for 'azure', it is optional
  password: z.string().min(8, "Password must be at least 8 characters long").optional(),
  role: userRoleEnum.optional(), // Made optional to allow default role assignment
  // modulePermissions removed - permissions come from UserGroup based on role
  userTeamIds: z.array(z.string().uuid()).optional().default([]),
  userGroupIds: z.array(z.string().uuid()).optional().default([]),
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

  const canManageUsers = hasAnyPermission(session.user, ['USERS_VIEW']);
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
      // For non-admin users without USERS_VIEW, default to showing only recruiters
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

    // Team filter using direct foreign key
    if (filterTeamIdInput) {
      whereConditions.userTeamId = filterTeamIdInput;
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
          isActive: true,
          createdAt: true,
          updatedAt: true,
          userGroupId: true, // Added for fetching user group
          userTeamId: true, // Added for fetching user team
        },
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

    // Fetch user groups and teams using direct foreign keys
    // Also fetch last login from audit logs for managers
    const isManager = userRole === 'Hiring Manager' || hasAnyPermission(session.user, ['USERS_VIEW']);
    const usersToReturn = await Promise.all(users.map(async (user: any) => {
      const userGroup = user.userGroupId ? await prisma.userGroup.findUnique({
        where: { id: user.userGroupId },
        select: { id: true, name: true, permissions: true }
      }) : null;
      
      const userTeam = user.userTeamId ? await prisma.userTeam.findUnique({
        where: { id: user.userTeamId },
        select: { id: true, name: true, color: true }
      }) : null;

      // Fetch last login from audit logs if user is a manager
      let lastLogin: string | null = null;
      if (isManager) {
        try {
          const client = await getPool().connect();
          try {
            const lastLoginResult = await client.query(`
              SELECT timestamp 
              FROM "LogEntry" 
              WHERE "actingUserId" = $1 
                AND (message ILIKE '%login%' OR message ILIKE '%sign in%' OR source ILIKE '%auth%')
              ORDER BY timestamp DESC 
              LIMIT 1
            `, [user.id]);
            if (lastLoginResult.rows.length > 0 && lastLoginResult.rows[0].timestamp) {
              lastLogin = lastLoginResult.rows[0].timestamp instanceof Date 
                ? lastLoginResult.rows[0].timestamp.toISOString()
                : lastLoginResult.rows[0].timestamp;
            }
          } finally {
            client.release();
          }
        } catch (error) {
          // Silently fail - last login is optional
          console.error('Error fetching last login:', error);
        }
      }

      return {
        ...user,
        teams: userTeam ? [userTeam] : [],
        modulePermissions: userGroup?.permissions || [],
        // Expose derived group name for UI display
        userGroupName: userGroup?.name || null,
        lastLogin: lastLogin
      };
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

  const hasUserCreatePermission = hasAnyPermission(session.user, ['USERS_CREATE']);
  
  if (!hasUserCreatePermission) {
    await logAudit('WARN', `Forbidden attempt to create user by ${session?.user?.email || 'Unknown'} (ID: ${session?.user?.id || 'N/A'}). Required: USERS_CREATE permission.`, 'API:Users:Create', session?.user?.id);
    return NextResponse.json(
      { message: "Forbidden: You must have USERS_CREATE permission to create users." },
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

     const { name, email, password, role, userTeamIds, userGroupIds, authenticationMethod, forcePasswordChange, personalColor } = validationResult.data;
   
   // Note: modulePermissions are now handled through UserGroup assignment
   // The role determines which UserGroup the user gets, and the UserGroup contains the permissions

  // Handle default role logic
  let finalRole: 'Admin' | 'Recruiter' | 'Hiring Manager' = role || 'Recruiter';
  let finalUserGroupIds = userGroupIds;
  
  if (!role) {
    // No role specified, try to find a default user group
    let defaultUserGroup = await prisma.userGroup.findFirst({
      where: { isDefault: true },
      orderBy: { createdAt: 'asc' } // Use the first default group if multiple exist
    });
    
    // If no default group exists, try to create or find the Recruiter group
    if (!defaultUserGroup) {
      console.log('No default user group found, attempting to find or create Recruiter group...');
      
      // First try to find the Recruiter group
      defaultUserGroup = await prisma.userGroup.findFirst({
        where: {
          OR: [
            { name: 'Recruiter' },
            { name: 'Recruiter' }
          ]
        }
      });
      
      // If still no group found, create the Recruiter group
      if (!defaultUserGroup) {
        console.log('Creating Recruiter group as default...');
        try {
          defaultUserGroup = await prisma.userGroup.create({
            data: {
              id: '00000000-0000-0000-0000-000000000002',
              name: 'Recruiter',
              description: 'Standard recruiter access',
              permissions: [
                'CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC',
                'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC',
                'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'DASHBOARD_VIEW',
                'USER_PREFERENCES_MANAGE_OWN'
              ],
              isDefault: true,
              isSystemRole: true
            }
          });
          console.log('Recruiter group created successfully with ID:', defaultUserGroup.id);
        } catch (createError) {
          console.error('Failed to create Recruiter group:', createError);
          await logAudit('ERROR', `Failed to create user ${email} - Could not create default Recruiter group. Error: ${(createError as Error).message}`, 'API:Users:Create', session.user.id);
          return NextResponse.json({ 
            message: "System configuration error. Please contact your system administrator.",
            error: "Failed to create default user group"
          }, { status: 500 });
        }
      } else {
        // If group exists but is not marked as default, update it
        if (!defaultUserGroup.isDefault) {
          console.log('Updating existing group to be default...');
          await prisma.userGroup.update({
            where: { id: defaultUserGroup.id },
            data: { isDefault: true }
          });
        }
      }
    }
    
    // Map the default group to a role string for API compatibility
    let roleString: 'Admin' | 'Recruiter' | 'Hiring Manager' = 'Recruiter'; // default fallback
    if (defaultUserGroup.name.toLowerCase().includes('admin')) {
      roleString = 'Admin';
    } else if (defaultUserGroup.name.toLowerCase().includes('hiring') || defaultUserGroup.name.toLowerCase().includes('manager')) {
      roleString = 'Hiring Manager';
    } else if (defaultUserGroup.name.toLowerCase().includes('recruiter')) {
      roleString = 'Recruiter';
    }
    
    finalRole = roleString;
    finalUserGroupIds = [defaultUserGroup.id];
    
    await logAudit('INFO', `User ${email} created with default role '${finalRole}' from default group '${defaultUserGroup.name}' (ID: ${defaultUserGroup.id}).`, 'API:Users:Create', session.user.id);
  }

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

    // Use provided userGroupIds or the default group ID from default role logic
    let targetUserGroupId = null;
    
    if (finalUserGroupIds && finalUserGroupIds.length > 0) {
      // Use the first selected user group (either from user input or from default role logic)
      targetUserGroupId = finalUserGroupIds[0];
      
      // Verify that the target user group exists
      const groupExists = await prisma.userGroup.findUnique({
        where: { id: targetUserGroupId }
      });
      
      if (!groupExists) {
        console.error(`User group with ID ${targetUserGroupId} does not exist`);
        await logAudit('ERROR', `Failed to create user ${email} - User group with ID ${targetUserGroupId} does not exist.`, 'API:Users:Create', session.user.id);
        return NextResponse.json({ 
          message: `Selected user group does not exist. Please contact your system administrator.`,
          error: "Missing user group"
        }, { status: 500 });
      }
    } else if (finalRole) {
      // Only fall back to role-based mapping if we have a role but no user group IDs
      // This handles the case where a role is explicitly specified but no user group is selected
      
      // Try to find the user group by name first (more reliable than hardcoded UUIDs)
      let targetUserGroup = await prisma.userGroup.findFirst({
        where: {
          OR: [
            // Try exact name matches first
            { name: finalRole },
            // Then try partial matches
            { name: { contains: finalRole, mode: 'insensitive' } },
            // Handle specific role mappings
            ...(finalRole === 'Recruiter' ? [{ name: 'Recruiter' }] : []),
            ...(finalRole === 'Admin' ? [{ name: 'Admin' }] : []),
            ...(finalRole === 'Hiring Manager' ? [{ name: 'Hiring Manager' }] : [])
          ]
        }
      });
      
      if (targetUserGroup) {
        targetUserGroupId = targetUserGroup.id;
        console.log(`Found user group '${targetUserGroup.name}' (ID: ${targetUserGroup.id}) for role '${finalRole}'`);
      } else {
        // Fallback to hardcoded UUIDs if name-based search fails
        const roleToGroupId = {
          'Admin': '00000000-0000-0000-0000-000000000001',
          'Recruiter': '00000000-0000-0000-0000-000000000002',
          'Hiring Manager': '00000000-0000-0000-0000-000000000003'
        };
        
        const fallbackGroupId = roleToGroupId[finalRole];
        if (fallbackGroupId) {
          const groupExists = await prisma.userGroup.findUnique({
            where: { id: fallbackGroupId }
          });
          
          if (groupExists) {
            targetUserGroupId = fallbackGroupId;
            console.log(`Using fallback UUID ${fallbackGroupId} for role '${finalRole}'`);
          } else {
            console.error(`Fallback user group with ID ${fallbackGroupId} for role ${finalRole} does not exist`);
            await logAudit('ERROR', `Failed to create user ${email} - User group for role ${finalRole} does not exist.`, 'API:Users:Create', session.user.id);
            return NextResponse.json({ 
              message: `User group for role '${finalRole}' does not exist. Please contact your system administrator.`,
              error: "Missing user group"
            }, { status: 500 });
          }
        }
      }
    }
    
    // Ensure we have a valid user group ID before proceeding
    if (!targetUserGroupId) {
      console.error(`No valid user group ID found for user ${email}`);
      await logAudit('ERROR', `Failed to create user ${email} - No valid user group ID found.`, 'API:Users:Create', session.user.id);
      return NextResponse.json({ 
        message: `Unable to determine user group for role '${finalRole}'. Please contact your system administrator.`,
        error: "No valid user group"
      }, { status: 500 });
    }

         const newUser = await prisma.user.create({
           data: {
             name,
             email,
             password: hashedPassword,
             role: finalRole || 'Recruiter',
             avatarUrl: defaultAvatarUrl,
             dataAiHint: defaultDataAiHint,
             // Remove module_permissions - permissions come from UserGroup
             authenticationMethod,
             forcePasswordChange,
             personalColor,
             userGroupId: targetUserGroupId, // Assign user group
             userTeamId: userTeamIds && userTeamIds.length > 0 ? userTeamIds[0] : null, // Assign user team
           }
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

     // Fetch the user's group to get permissions
     const userGroup = targetUserGroupId ? await prisma.userGroup.findUnique({
       where: { id: targetUserGroupId },
       select: { id: true, name: true, permissions: true }
     }) : null;

     const userToReturn = {
       ...newUser,
       teams: userTeamIds || [],
       // Get permissions from UserGroup, not from direct field
       modulePermissions: userGroup?.permissions || []
     };

    // Clear user validation cache for the new user
    clearUserValidationCache(newUser.id);

    await logAudit('AUDIT', `User account '${userToReturn.name}' (ID: ${userToReturn.id}) created by ${session.user.name}.`, 'API:Users:Create', session.user.id, { targetUserId: userToReturn.id, role: userToReturn.role, permissions: userToReturn.modulePermissions, groups: userTeamIds });
    await dispatchWebhooks.userCreated(newUser);
    return NextResponse.json(userToReturn, { status: 201 });

  } catch (error: any) {
    console.error("Failed to create user:", error);
    // SECURITY: Only log stack traces in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.error("Error details:", {
      code: error.code,
      meta: error.meta,
      message: error.message,
      ...(isDevelopment && { stack: error.stack })
    });
    const userNameForLog = session?.user?.name || session?.user?.email || 'Unknown User';
    await logAudit('ERROR', `Failed to create user ${email} by ${userNameForLog}. Error: ${error.message}.`, 'API:Users:Create', session.user.id);
    
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ message: "User with this email already exists." }, { status: 409 });
    }
    
    // Handle database connection errors more gracefully
    if (error.message?.includes('Can\'t reach database server') || 
        error.message?.includes('Connection') ||
        error.code === 'P1001') {
      return NextResponse.json({ 
        message: "Database connection error. Please try again later or contact your system administrator.",
        error: "Database connection failed"
      }, { status: 503 });
    }
    
    return NextResponse.json({ message: "Error creating user", error: error.message }, { status: 500 });
  }
}
