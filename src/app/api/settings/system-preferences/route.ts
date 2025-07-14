import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import { authOptions } from '@/lib/auth';

const preferenceSchema = z.object({
  themePreference: z.enum(["light", "dark", "system"]).optional(),
  appName: z.string().optional(),
  appLogoDataUrl: z.string().nullable().optional(),
  appFaviconDataUrl: z.string().nullable().optional(),
  loginBackgroundType: z.enum(["image", "gradient", "solid"]).optional(),
  loginBackgroundGradientStart: z.string().optional(),
  loginBackgroundGradientEnd: z.string().optional(),
  loginBackgroundColor: z.string().optional(),
  loginPageBackgroundImageUrl: z.string().nullable().optional(),
  // Sidebar colors and other UI preferences
  sidebarBgStartL: z.string().optional(),
  sidebarBgEndL: z.string().optional(),
  sidebarTextL: z.string().optional(),
  sidebarActiveBgStartL: z.string().optional(),
  sidebarActiveBgEndL: z.string().optional(),
  sidebarActiveTextL: z.string().optional(),
  sidebarHoverBgL: z.string().optional(),
  sidebarHoverTextL: z.string().optional(),
  sidebarBorderL: z.string().optional(),
  sidebarBgStartD: z.string().optional(),
  sidebarBgEndD: z.string().optional(),
  sidebarTextD: z.string().optional(),
  sidebarActiveBgStartD: z.string().optional(),
  sidebarActiveBgEndD: z.string().optional(),
  sidebarActiveTextD: z.string().optional(),
  sidebarHoverBgD: z.string().optional(),
  sidebarHoverTextD: z.string().optional(),
  sidebarBorderD: z.string().optional(),
}).and(z.record(z.string(), z.any().optional())); // Allow any additional string keys
});

// System-wide preferences use a special system user ID
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function GET(request: NextRequest) {
  try {
    const result = await getPool().query(
      'SELECT key, value FROM "SystemPreference" WHERE "userId" = $1',
      [SYSTEM_USER_ID]
    );
    const prefs = Object.fromEntries(result.rows.map(row => [row.key, row.value]));
    return NextResponse.json(prefs, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch system preferences:", error);
    return NextResponse.json({ message: "Error fetching system preferences", error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin' && !session?.user?.modulePermissions?.includes('SYSTEM_SETTINGS_MANAGE')) {
    await logAudit('WARN', `Forbidden attempt to update system preferences by user ${session?.user?.email || 'Unknown'}.`, 'API:SystemPreferences:Update', session?.user?.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: "Error parsing request body", error: (error as Error).message }, { status: 400 });
  }

  const validationResult = preferenceSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: "Invalid input for system preferences", errors: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const prefsToSave = validationResult.data;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    
    // Delete existing system preferences for the keys we're updating
    const keysToUpdate = Object.keys(prefsToSave);
    if (keysToUpdate.length > 0) {
      const placeholders = keysToUpdate.map((_, i) => `$${i + 2}`).join(',');
      await client.query(
        `DELETE FROM "SystemPreference" WHERE "userId" = $1 AND key IN (${placeholders})`,
        [SYSTEM_USER_ID, ...keysToUpdate]
      );
    }
    
    // Insert new preferences
    for (const [key, value] of Object.entries(prefsToSave)) {
      await client.query(
        `INSERT INTO "SystemPreference" ("userId", key, value, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [SYSTEM_USER_ID, key, value]
      );
    }
    
    await client.query('COMMIT');
    await logAudit('AUDIT', `System preferences updated by ${session.user.name}. Keys: ${Object.keys(prefsToSave).join(', ')}`, 'API:SystemPreferences:Update', session.user.id, { updatedKeys: Object.keys(prefsToSave) });
    return NextResponse.json({ message: "System preferences updated" }, { status: 200 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Failed to save system preferences:", error);
    await logAudit('ERROR', `Failed to save system preferences by ${session.user.name}. Error: ${error.message}`, 'API:SystemPreferences:Update', session.user.id);
    return NextResponse.json({ message: "Error saving system preferences", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
} 