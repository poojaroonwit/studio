import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Position statistics API called with params:', params);
    const positionId = params.id;
    
    if (!positionId) {
      return NextResponse.json(
        { error: 'Position ID is required' },
        { status: 400 }
      );
    }

    console.log('Processing position ID:', positionId);

    // Test database connection first
    try {
      await prisma.$connect();
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Get total candidates who applied to this position
    console.log('Fetching total applied candidates...');
    let totalApplied = 0;
    try {
      totalApplied = await prisma.candidate.count({
        where: {
          positionId: positionId
        }
      });
      console.log('Total applied candidates:', totalApplied);
    } catch (error) {
      console.error('Error fetching applied candidates:', error);
      totalApplied = 0;
    }

    // Get total candidates who have job matches for this position
    // Using a simpler approach since array_contains might not work with complex objects
    console.log('Fetching candidates with matches...');
    let candidatesWithMatches: any[] = [];
    try {
      candidatesWithMatches = await prisma.candidate.findMany({
        where: {
          parsedData: {
            not: undefined
          }
        },
        select: {
          id: true,
          positionId: true,
          parsedData: true
        }
      });
      console.log('Candidates with matches found:', candidatesWithMatches.length);
    } catch (error) {
      console.error('Error fetching candidates with matches:', error);
      candidatesWithMatches = [];
    }

    // Calculate job matching statistics
    console.log('Calculating job matching statistics...');
    
    let totalMatching = 0;
    let matchingNotApplied = 0;
    
    try {
      // Filter candidates who have job matches for this position
      const candidatesWithJobMatches = candidatesWithMatches.filter(candidate => {
        try {
          const parsedData = candidate.parsedData as any;
          if (!parsedData) return false;
          
          const jobMatches = parsedData.job_matches;
          if (!Array.isArray(jobMatches)) return false;
          
          return jobMatches.some((match: any) => match?.jobId === positionId);
        } catch (error) {
          console.log('Error parsing candidate data:', error);
          return false;
        }
      });
      
      totalMatching = candidatesWithJobMatches.length;
      console.log('Total matching candidates:', totalMatching);
      
      // Get candidates who match but haven't applied (positionId doesn't match)
      matchingNotApplied = candidatesWithJobMatches.filter(candidate => 
        candidate.positionId !== positionId
      ).length;
      console.log('Matching but not applied candidates:', matchingNotApplied);
      
    } catch (error) {
      console.error('Error calculating job matching statistics:', error);
    }

    const result = {
      totalApplied,
      totalMatching,
      matchingNotApplied
    };

    console.log(`Position statistics for ${positionId}:`, result);
    
    // Close database connection
    try {
      await prisma.$disconnect();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching position statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch position statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 