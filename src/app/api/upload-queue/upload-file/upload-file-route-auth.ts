import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { validateUserSession } from '@/lib/auth';
import { hasAnyPermission } from '@/lib/permissions';

export async function authorizeUploadRequest() {
  const session = await auth();
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const validation = await validateUserSession(session);
  if (!validation.isValid) {
    console.error(`Upload attempt with invalid session by ${validation.userName || 'Unknown'}`, {
      invalidUserId: validation.userId,
      sessionUser: validation.userName,
      error: validation.error,
    });
    return {
      ok: false as const,
      response: NextResponse.json({ error: validation.error }, { status: 401 }),
    };
  }

  if (!hasAnyPermission(session.user, ['BULK_UPLOAD_EXECUTE', 'UPLOAD_QUEUE_MANAGE'])) {
    console.warn(`Forbidden upload attempt by ${validation.userName}`);
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Forbidden: Insufficient permissions to upload files' }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    actingUserId: validation.userId!,
    actingUserName: validation.userName!,
  };
}
