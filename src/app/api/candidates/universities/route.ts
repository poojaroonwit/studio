import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

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
          where: { educationData: { not: null } },
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
    } catch (err) {
      // If the field is missing or not JSON, return empty array
      console.error('educationData field missing or not JSON:', err);
      return NextResponse.json({ data: [] });
    }
    
    const uniqueUniversities = Array.from(universities);
    
    // Update cache
    universitiesCache = { data: uniqueUniversities, timestamp: now };
    
    return NextResponse.json({ data: uniqueUniversities });
  } catch (error) {
    console.error('Failed to fetch universities:', error);
    return NextResponse.json({ error: 'Failed to fetch universities', details: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
} 
