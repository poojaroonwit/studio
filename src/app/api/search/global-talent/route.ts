import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatMeta(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" - ");
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const query = (request.nextUrl.searchParams.get("q") || "").trim();

  if (query.length < 2) {
    return NextResponse.json({
      query,
      results: {
        applicants: [],
        positions: [],
        users: [],
      },
    });
  }

  const client = await getPool().connect();

  try {
    const applicantSearch = `%${query}%`;

    const [applicantsResult, positionsResult, usersResult] = await Promise.all([
      client.query(
        `
          SELECT
            a.id,
            a.name,
            a.email,
            rs.name AS status,
            p.title AS "positionTitle"
          FROM "Applicant" a
          LEFT JOIN "RecruitmentStage" rs ON rs.id = a."statusId"
          LEFT JOIN "Position" p ON p.id = a."positionId"
          WHERE
            a.name ILIKE $1 OR
            a.email ILIKE $1 OR
            a.phone ILIKE $1 OR
            p.title ILIKE $1
          ORDER BY a."updatedAt" DESC NULLS LAST, a."createdAt" DESC NULLS LAST
          LIMIT 8
        `,
        [applicantSearch],
      ),
      client.query(
        `
          SELECT
            p.id,
            p.title,
            p.department,
            p."isOpen",
            u.name AS "recruiterName"
          FROM "Position" p
          LEFT JOIN "User" u ON u.id = p."recruiterId"
          WHERE
            p.title ILIKE $1 OR
            COALESCE(p.department, '') ILIKE $1 OR
            COALESCE(u.name, '') ILIKE $1
          ORDER BY p."updatedAt" DESC NULLS LAST, p."createdAt" DESC NULLS LAST
          LIMIT 8
        `,
        [applicantSearch],
      ),
      client.query(
        `
          SELECT
            u.id,
            u.name,
            u.email,
            u.role
          FROM "User" u
          WHERE
            COALESCE(u.name, '') ILIKE $1 OR
            COALESCE(u.email, '') ILIKE $1 OR
            COALESCE(u.role, '') ILIKE $1
          ORDER BY u."updatedAt" DESC NULLS LAST, u."createdAt" DESC NULLS LAST
          LIMIT 8
        `,
        [applicantSearch],
      ),
    ]);

    return NextResponse.json({
      query,
      results: {
        applicants: applicantsResult.rows.map((row: any) => ({
          id: row.id,
          type: "applicant",
          title: row.name || row.email || "Unnamed Applicant",
          subtitle: row.email || row.positionTitle || "Applicant",
          meta: formatMeta([row.positionTitle, row.status]),
        })),
        positions: positionsResult.rows.map((row: any) => ({
          id: row.id,
          type: "position",
          title: row.title,
          subtitle: row.department || (row.isOpen ? "Open position" : "Closed position"),
          meta: formatMeta([row.recruiterName, row.isOpen ? "Open" : "Closed"]),
        })),
        users: usersResult.rows.map((row: any) => ({
          id: row.id,
          type: "user",
          title: row.name || row.email || "Unnamed User",
          subtitle: row.email || "User",
          meta: row.role || undefined,
        })),
      },
    });
  } catch (error) {
    console.error("[global-talent-search] failed", error);
    return NextResponse.json({ error: "Failed to search talent data" }, { status: 500 });
  } finally {
    client.release();
  }
}
