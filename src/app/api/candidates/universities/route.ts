import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Fetch all candidates with non-null educationData
    let candidates = [];
    try {
      candidates = await prisma.candidate.findMany({
        select: { educationData: true },
      });
      // Filter out candidates with null educationData
      candidates = candidates.filter(candidate => candidate.educationData !== null);
    } catch (err) {
      // If the field is missing or not JSON, return empty array
      console.error('educationData field missing or not JSON:', err);
      return NextResponse.json({ data: [] });
    }
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
    console.error('Failed to fetch universities:', error);
    return NextResponse.json({ error: 'Failed to fetch universities', details: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
} 