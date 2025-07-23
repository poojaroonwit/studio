import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    // Fetch all candidates with non-null educationData
    const candidates = await prisma.candidate.findMany({
      select: { educationData: true },
      where: { educationData: { not: Prisma.JsonNull } },
    });

    // Extract all university names from all educationData arrays
    const universities = candidates.flatMap((candidate: any) => {
      if (!Array.isArray(candidate.educationData)) return [];
      return candidate.educationData
        .map((edu: any) => edu.university?.trim())
        .filter((university: string | undefined) => !!university);
    });

    // Deduplicate
    const uniqueUniversities = Array.from(new Set(universities));

    return NextResponse.json({ data: uniqueUniversities });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch universities' }, { status: 500 });
  }
} 