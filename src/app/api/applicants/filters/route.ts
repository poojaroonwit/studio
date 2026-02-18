export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// src/app/api/applicants/filters/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireSessionAndPermission } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { session, error } = await requireSessionAndPermission(
      "Applicants_VIEW",
      request
    );
    if (error) return error;

    const client = await getPool().connect();
    try {
      // Set a shorter timeout for filter data
      await client.query("SET statement_timeout = 10000"); // 10 seconds

      // Fetch only the data needed for filters in parallel
      const [positionsResult, stagesResult, recruitersResult, sourcesResult] =
        await Promise.all([
          // Open positions only
          client.query(`
          SELECT 
            p.id,
            p.title,
            p.department,
            p."isOpen",
            u.name as "recruiterName"
          FROM "Position" p 
          LEFT JOIN "User" u ON p."recruiterId" = u.id
          WHERE p."isOpen" = true
          ORDER BY p.title ASC
        `),

          // Recruitment stages
          client.query(`
          SELECT 
            id,
            name,
            "sort_order",
            color_badge AS color,
            description
          FROM "RecruitmentStage" 
          ORDER BY "sort_order" ASC
        `),

          // Recruiter (users with recruiter role)
          client.query(`
          SELECT 
            id,
            name,
            email,
            "avatarUrl",
            personal_color AS "personalColor"
          FROM "User" 
          WHERE role = 'Recruiter' OR role = 'Admin'
          ORDER BY name ASC
        `),

          // Applicant sources
          client.query(`
          SELECT 
            id,
            name,
            description,
            logo
          FROM "ApplicantSource" 
          ORDER BY name ASC
        `),
        ]);

      // Get basic Applicant counts for filter badges
      const applicantCountsResult = await client.query(`
        SELECT 
          rs.name as status,
          COUNT(*) as count
        FROM "Applicant" c
        LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
        GROUP BY rs.name
        ORDER BY rs.name ASC
      `);

      const responseTime = Date.now() - startTime;

      return NextResponse.json(
        {
          positions: positionsResult.rows,
          stages: stagesResult.rows,
          recruiters: recruitersResult.rows,
          sources: sourcesResult.rows,
          applicantCounts: applicantCountsResult.rows,
          responseTime: `${responseTime}ms`,
        },
        {
          headers: {
            "Cache-Control": "public, max-age=300, stale-while-revalidate=600", // Cache for 5 minutes
            "X-Response-Time": `${responseTime}ms`,
          },
        }
      );
    } finally {
      client.release();
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    console.error("Error fetching filter data:", error);

    return NextResponse.json(
      {
        message: "Error fetching filter data",
        error: error.message,
        responseTime: `${responseTime}ms`,
      },
      { status: 500 }
    );
  }
}
