import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Fetch all candidates with their educationData
    const candidates = await prisma.candidate.findMany({
      select: { educationData: true },
    });
    // Extract all majors from all educationData arrays
    const majors = candidates.flatMap((candidate: any) => {
      if (!candidate.educationData || !Array.isArray(candidate.educationData)) return [];
      return candidate.educationData
        .map((edu: any) => edu.major?.trim())
        .filter((major: string | undefined) => !!major);
    });
    // Deduplicate
    const uniqueMajors = Array.from(new Set(majors));
    return NextResponse.json({ data: uniqueMajors });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch majors' }, { status: 500 });
  }
} 