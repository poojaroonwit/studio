import { NextResponse, type NextRequest } from 'next/server';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ExpertiseSkill = {
  id: string;
  name: string;
  description: any;
  maxScore: number;
  skillType: string;
  isActive: boolean;
  sortOrder: number;
  groupId: string | null;
  createdAt: any;
  updatedAt: any;
  group: { id: string; name: string; color: any } | null;
};

type ExpertiseGroup = {
  id: string;
  name: string;
  description: any;
  color: any;
  isActive: boolean;
  sortOrder: number;
  createdAt: any;
  updatedAt: any;
  skills: ExpertiseSkill[];
};

/**
 * @openapi
 * /api/evaluation/expertise-skills:
 *   get:
 *     summary: Get all expertise skills and groups
 *     responses:
 *       200:
 *         description: List of expertise skills and groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: object
 *                 groups:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.error('[Expertise Skills API] Unauthorized access attempt');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to view evaluation configuration
  if (!hasPermission(session.user, 'POSITIONS_VIEW')) {
    console.error(`[Expertise Skills API] Forbidden access attempt by user ${session.user.id} - missing POSITIONS_VIEW permission`);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to view evaluation configuration' }, { status: 403 });
  }

  let client;
  try {
    client = await getPool().connect();
  } catch (connectionError: any) {
    console.error(`[Expertise Skills API] Failed to connect to database:`, connectionError);
    return NextResponse.json({ 
      message: 'Database connection error', 
      error: connectionError.message
    }, { status: 500 });
  }

  try {
    // Get all expertise groups
    const groupsQuery = `
      SELECT id, name, description, color, is_active, sort_order, "createdAt", "updatedAt"
      FROM "ExpertiseGroup"
      WHERE is_active = true
      ORDER BY sort_order ASC, name ASC
    `;
    const groupsResult = await client.query(groupsQuery);
    
    // Get all expertise skills
    const skillsQuery = `
      SELECT 
        s.id, s.name, s.description, s.max_score, s.skill_type, s.is_active, s.sort_order, s."groupId",
        s."createdAt", s."updatedAt",
        g.name as group_name, g.color as group_color
      FROM "ExpertiseSkill" s
      LEFT JOIN "ExpertiseGroup" g ON s."groupId" = g.id
      WHERE s.is_active = true
      ORDER BY s.sort_order ASC, s.name ASC
    `;
    const skillsResult = await client.query(skillsQuery);
    
    // Transform the data
    const groups: ExpertiseGroup[] = groupsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      skills: [] as ExpertiseSkill[] // Will be populated below
    }));
    
    const skills: ExpertiseSkill[] = skillsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      maxScore: row.max_score,
      skillType: row.skill_type,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      groupId: row.groupId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      group: row.groupId ? {
        id: row.groupId,
        name: row.group_name,
        color: row.group_color
      } : null
    }));
    
    // Populate skills in groups
    groups.forEach(group => {
      group.skills = skills.filter(skill => skill.groupId === group.id);
    });
    
    return NextResponse.json({
      skills,
      groups
    });
  } catch (error: any) {
    console.error(`[Expertise Skills API] Database error:`, error);
    return NextResponse.json({ 
      message: 'Error fetching expertise skills', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    if (client) {
    client.release();
    }
  }
}
