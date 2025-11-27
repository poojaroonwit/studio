export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import { auth } from '@/auth';
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized: No active session" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // Return empty preferences object since data model functionality has been removed
    return NextResponse.json({}, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch user preferences:", error);
    await logAudit('ERROR', `Failed to fetch preferences for user ${userId}. Error: ${(error as Error).message}`, 'API:Preferences:Get', userId);
    return NextResponse.json({ message: "Error fetching user preferences", error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized: No active session" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // Data model functionality has been removed, so just return success
    await logAudit('AUDIT', `User preferences update attempted by ${session.user.name} (data model functionality removed)`, 'API:Preferences:Update', userId);
    return NextResponse.json({ message: "Preferences updated" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to save user preferences:", error);
    await logAudit('ERROR', `Failed to save preferences for user ${userId} by ${session.user.name}. Error: ${error.message}`, 'API:Preferences:Update', userId);
    return NextResponse.json({ message: "Error saving user preferences", error: error.message }, { status: 500 });
  }
} 
