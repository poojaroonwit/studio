export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import { authOptions } from '@/lib/auth';

const personalColorSchema = z.object({
  personalColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Personal color must be a valid hex color code'),
});

/**
 * @openapi
 * /api/settings/personal-color:
 *   get:
 *     summary: Get user's personal color
 *     description: Returns the current user's personal color preference. Requires authentication.
 *     responses:
 *       200:
 *         description: User's personal color
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 personalColor:
 *                   type: string
 *                   description: Hex color code
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   post:
 *     summary: Update user's personal color
 *     description: Updates the current user's personal color preference. Requires authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               personalColor:
 *                 type: string
 *                 description: Hex color code (e.g., "#3B82F6")
 *     responses:
 *       200:
 *         description: Personal color updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized: No active session" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const result = await getPool().query(
      'SELECT personal_color AS "personalColor" FROM "User" WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ personalColor: result.rows[0].personalColor }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch user's personal color:", error);
    await logAudit('ERROR', `Failed to fetch personal color for user ${userId}. Error: ${(error as Error).message}`, 'API:PersonalColor:Get', userId);
    return NextResponse.json({ message: "Error fetching user's personal color", error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized: No active session" }, { status: 401 });
  }
  const userId = session.user.id;

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: "Error parsing request body", error: (error as Error).message }, { status: 400 });
  }

  const validationResult = personalColorSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: "Invalid input for personal color", errors: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { personalColor } = validationResult.data;

  try {
    await getPool().query(
      'UPDATE "User" SET personal_color = $1, "updatedAt" = NOW() WHERE id = $2',
      [personalColor, userId]
    );

    await logAudit('AUDIT', `Personal color updated by ${session.user.name} to ${personalColor}`, 'API:PersonalColor:Update', userId, { personalColor });
    return NextResponse.json({ message: "Personal color updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to update user's personal color:", error);
    await logAudit('ERROR', `Failed to update personal color for user ${userId} by ${session.user.name}. Error: ${(error as Error).message}`, 'API:PersonalColor:Update', userId);
    return NextResponse.json({ message: "Error updating user's personal color", error: (error as Error).message }, { status: 500 });
  }
}
