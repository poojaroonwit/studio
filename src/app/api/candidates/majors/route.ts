import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let candidates = [];
    try {
      candidates = await prisma.candidate.findMany({
        select: { educationData: true },
      });
    } catch (err) {
      // If the field is missing or not JSON, return empty array
      console.error('educationData field missing or not JSON:', err);
      return NextResponse.json({ data: [] });
    }
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
    console.error('Failed to fetch majors:', error);
    return NextResponse.json({ error: 'Failed to fetch majors', details: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
} 