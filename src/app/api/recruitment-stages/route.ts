// src/app/api/recruitment-stages/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '../../../lib/db';
import { hasPermission } from '@/lib/permissions';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


/**
 * @openapi
 * /api/recruitment-stages:
 *   get:
 *     summary: Get all recruitment stages for filtering
 *     description: Returns all recruitment stages for use in filters. Requires authentication but no special permissions.
 *     responses:
 *       200:
 *         description: List of recruitment stages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   sort_order:
 *                     type: integer
 *                   color_complete:
 *                     type: string
 *                   color_badge:
 *                     type: string
 *                   is_system:
 *                     type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view recruitment stages
    // Users should be able to view stages if they can view Applicants (for filtering purposes)
    if (!hasPermission(session.user, 'applicantS_VIEW')) {
        return NextResponse.json({ message: "Forbidden: Insufficient permissions to view recruitment stages" }, { status: 403 });
    }

    const client = await getPool().connect();
    try {
        const result = await client.query(
            'SELECT id, name, description, sort_order, color_complete, color_badge, is_system FROM "RecruitmentStage" ORDER BY sort_order ASC, name ASC'
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error("Failed to fetch recruitment stages:", error);
        return NextResponse.json({ 
            message: "Error fetching recruitment stages", 
            error: error.message 
        }, { status: 500 });
    } finally {
        client.release();
    }
}

