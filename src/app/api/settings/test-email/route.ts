export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { testEmailConnection } from '@/lib/emailService';
import { getPool } from '@/lib/db';
import { z } from 'zod';

import { auth } from '@/auth';
const testEmailSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT')) {
    return NextResponse.json(
      { message: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const validationResult = testEmailSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      {
        message: 'Invalid request data',
        errors: validationResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { host, port, secure, user, password } = validationResult.data;

  // Temporarily save config to test
  const client = await getPool().connect();
  try {
    // Save temporarily
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO "SystemSetting" (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['emailSmtpHost', host]
    );
    await client.query(
      `INSERT INTO "SystemSetting" (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['emailSmtpPort', port.toString()]
    );
    await client.query(
      `INSERT INTO "SystemSetting" (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['emailSmtpSecure', secure.toString()]
    );
    await client.query(
      `INSERT INTO "SystemSetting" (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['emailSmtpUser', user]
    );
    await client.query(
      `INSERT INTO "SystemSetting" (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['emailSmtpPassword', password]
    );
    await client.query('COMMIT');

    // Test connection
    const result = await testEmailConnection();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Test Email] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Connection test failed',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

