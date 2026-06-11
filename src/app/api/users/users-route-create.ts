import { NextResponse, type NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { clearUserValidationCache } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { expandPermissionSet } from '@/lib/permission-aliases';
import prisma from '@/lib/prisma';
import { dispatchWebhooks } from '@/lib/webhooks';
import { readRequestJsonResult } from '@/lib/request-json';
import { createUserSchema, type CreateUserInput } from './users-route-schema';
import { getCreateUserErrorMessage, handleCreateUserError } from './users-route-create-errors';
import {
  resolveCreateUserRoleAndGroups,
  resolveTargetUserGroupId,
} from './users-route-create-groups';
import { resolveCreateUserPassword } from './users-route-create-password';

export async function handleCreateUser(request: NextRequest, session: Session) {
  const bodySizeError = await validateCreateUserBodySize(request);
  if (bodySizeError) {
    return bodySizeError;
  }

  const parsedBody = await parseCreateUserBody(request);
  if (parsedBody instanceof NextResponse) {
    return parsedBody;
  }

  const validationResult = createUserSchema.safeParse(parsedBody);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  return createUser(validationResult.data, session);
}

async function validateCreateUserBodySize(request: NextRequest) {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) {
    return null;
  }

  const { securityConfig } = await import('@/lib/securityConfig');
  const maxSize = securityConfig.requestBody?.maxJsonSize || 10 * 1024 * 1024;
  const size = parseInt(contentLength, 10);

  return size > maxSize
    ? NextResponse.json({
      message: `Request body too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
    }, { status: 413 })
    : null;
}

async function parseCreateUserBody(request: NextRequest): Promise<unknown | NextResponse> {
  const result = await readRequestJsonResult(request);
  if (!result.ok) {
    console.error('Error parsing request body for new user:', result.error);
    return NextResponse.json({
      message: 'Error parsing request body',
      error: getCreateUserErrorMessage(result.error),
    }, { status: 400 });
  }

  return result.value;
}

async function createUser(input: CreateUserInput, session: Session) {
  const roleResolution = await resolveCreateUserRoleAndGroups(input, session);
  if (roleResolution instanceof NextResponse) {
    return roleResolution;
  }

  const hashedPassword = await resolveCreateUserPassword(input, session);
  if (hashedPassword instanceof NextResponse) {
    return hashedPassword;
  }

  try {
    const targetUserGroupId = await resolveTargetUserGroupId(
      input.email,
      roleResolution.finalRole,
      roleResolution.finalUserGroupIds,
      session
    );

    if (targetUserGroupId instanceof NextResponse) {
      return targetUserGroupId;
    }

    const newUser = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: roleResolution.finalRole || 'Recruiter',
        avatarUrl: `https://placehold.co/100x100.png?text=${input.name?.charAt(0)?.toUpperCase() || 'U'}`,
        dataAiHint: 'profile person',
        authenticationMethods: input.authenticationMethods,
        forcePasswordChange: input.forcePasswordChange,
        personalColor: input.personalColor,
        positionTitle: input.positionTitle,
        userGroupId: targetUserGroupId,
        userTeamId: input.userTeamIds.length > 0 ? input.userTeamIds[0] : null,
      },
    });

    const userGroup = await prisma.userGroup.findUnique({
      where: { id: targetUserGroupId },
      select: { id: true, name: true, permissions: true },
    });
    const userToReturn = {
      ...newUser,
      teams: input.userTeamIds || [],
      modulePermissions: expandPermissionSet(userGroup?.permissions || []),
    };

    clearUserValidationCache(newUser.id);

    await logAudit(
      'AUDIT',
      `User account '${userToReturn.name}' (ID: ${userToReturn.id}) created by ${session.user.name}.`,
      'API:Users:Create',
      session.user.id,
      {
        targetUserId: userToReturn.id,
        role: userToReturn.role,
        permissions: userToReturn.modulePermissions,
        groups: input.userTeamIds,
      }
    );
    await dispatchWebhooks.userCreated(newUser);

    return NextResponse.json(userToReturn, { status: 201 });
  } catch (error: unknown) {
    return handleCreateUserError(error, input.email, session);
  }
}
