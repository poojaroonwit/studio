import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
<<<<<<< HEAD
=======
import { Prisma } from '@prisma/client';
>>>>>>> ca51ac36

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

<<<<<<< HEAD
export async function GET(req: NextRequest) {
  try {
    // Fetch all candidates with non-null educationData
    let candidates = [];
    try {
      candidates = await prisma.candidate.findMany({
        select: { educationData: true },
      });
      // Filter out candidates with null educationData
      candidates = candidates.filter((candidate: any) => candidate.educationData !== null);
=======
// In-memory cache for universities (refreshes every 5 minutes)
let universitiesCache: { data: string[], timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  try {
    // Check cache first to reduce database load
    const now = Date.now();
    if (universitiesCache && (now - universitiesCache.timestamp) < CACHE_TTL) {
      return NextResponse.json({ data: universitiesCache.data });
    }

    // Fetch candidates in batches to reduce memory usage
    const BATCH_SIZE = 500;
    const universities = new Set<string>();
    let offset = 0;
    
    try {
      while (true) {
        const candidates = await prisma.candidate.findMany({
          select: { educationData: true },
          where: { NOT: { educationData: { equals: Prisma.DbNull } } },
          take: BATCH_SIZE,
          skip: offset
        });
        
        if (candidates.length === 0) break;
        
        // Extract university names from this batch
        candidates.forEach((candidate: any) => {
          if (Array.isArray(candidate.educationData)) {
            candidate.educationData.forEach((edu: any) => {
              const university = edu.university?.trim();
              if (university) {
                universities.add(university);
              }
            });
          }
        });
        
        offset += candidates.length;
        if (candidates.length < BATCH_SIZE) break;
      }
>>>>>>> ca51ac36
    } catch (err) {
      // If the field is missing or not JSON, return empty array
      console.error('educationData field missing or not JSON:', err);
      return NextResponse.json({ data: [] });
    }
<<<<<<< HEAD
    // Extract all university names from all educationData arrays
    const universities = candidates.flatMap((candidate: any) => {
      if (!Array.isArray(candidate.educationData)) return [];
      return candidate.educationData
        .map((edu: any) => edu.university?.trim())
        .filter((university: string | undefined) => !!university);
    });
    // Deduplicate
    const uniqueUniversities = Array.from(new Set(universities));
=======
    
    const uniqueUniversities = Array.from(universities);
    
    // Update cache
    universitiesCache = { data: uniqueUniversities, timestamp: now };
    
>>>>>>> ca51ac36
    return NextResponse.json({ data: uniqueUniversities });
  } catch (error) {
    console.error('Failed to fetch universities:', error);
    return NextResponse.json({ error: 'Failed to fetch universities', details: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
} 
