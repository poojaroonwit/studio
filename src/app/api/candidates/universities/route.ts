import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Fetch all candidates with non-null educationData
    const candidates = await prisma.candidate.findMany({
      select: { educationData: true },
      where: { educationData: { not: null } },
    });

    // Extract all university names from all educationData arrays
    const universities = candidates.flatMap(candidate => {
      if (!Array.isArray(candidate.educationData)) return [];
      return candidate.educationData
        .map((edu: any) => edu.university?.trim())
        .filter((u: string | undefined) => u && u.length > 0);
    });

    // Deduplicate
    const uniqueUniversities = Array.from(new Set(universities));

    return NextResponse.json({ data: uniqueUniversities });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch universities' }, { status: 500 });
  }
} 