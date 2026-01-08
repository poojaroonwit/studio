
import { auth } from '@/auth';
import { getPool } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a more secure app, we might require a password confirmation or recent 2FA check 
    // before allowing disable.

    const client = await getPool().connect();
    
    try {
      await client.query(
        `UPDATE "User" 
         SET "two_factor_enabled" = false,
             "two_factor_secret" = NULL,
             "two_factor_backup_codes" = ARRAY[]::text[],
             "two_factor_method" = NULL,
             "two_factor_verified_at" = NULL
         WHERE id = $1`,
        [session.user.id]
      );

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[2FA Disable] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
