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
    let candidates = [];
    try {
      candidates = await prisma.candidate.findMany({
        select: { educationData: true },
      });
=======
// In-memory cache for majors (refreshes every 5 minutes)
let majorsCache: { data: string[], timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  try {
    // Check cache first to reduce database load
    const now = Date.now();
    if (majorsCache && (now - majorsCache.timestamp) < CACHE_TTL) {
      return NextResponse.json({ data: majorsCache.data });
    }

    // Fetch candidates in batches to reduce memory usage
    const BATCH_SIZE = 500;
    const majors = new Set<string>();
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
        
        // Extract majors from this batch
        candidates.forEach((candidate: any) => {
          if (Array.isArray(candidate.educationData)) {
            candidate.educationData.forEach((edu: any) => {
              const major = edu.major?.trim();
              if (major) {
                majors.add(major);
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
    // Extract all majors from all educationData arrays
    const majors = candidates.flatMap((candidate: any) => {
      if (!candidate.educationData || !Array.isArray(candidate.educationData)) return [];
      return candidate.educationData
        .map((edu: any) => edu.major?.trim())
        .filter((major: string | undefined) => !!major);
    });
    // Deduplicate
    const uniqueMajors = Array.from(new Set(majors));
=======
    
    const uniqueMajors = Array.from(majors);
    
    // Update cache
    majorsCache = { data: uniqueMajors, timestamp: now };
    
>>>>>>> ca51ac36
    return NextResponse.json({ data: uniqueMajors });
  } catch (error) {
    console.error('Failed to fetch majors:', error);
    return NextResponse.json({ error: 'Failed to fetch majors', details: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
} 
