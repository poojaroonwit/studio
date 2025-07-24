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

    // Get candidates who have job matches for this position
    console.log('Fetching candidates with job matches...');
    let totalMatching = 0;
    let matchingNotApplied = 0;
    
    try {
      // Method 1: Check JobMatch table directly (new system)
      const jobMatchCandidates = await prisma.jobMatch.findMany({
        where: {
          jobId: positionId
        },
        select: {
          candidateId: true,
          candidate: {
            select: {
              positionId: true
            }
          }
        }
      });

      console.log('Job matches found in JobMatch table:', jobMatchCandidates.length);

      // Get unique candidate IDs from JobMatch table
      const jobMatchCandidateIds = new Set(jobMatchCandidates.map(match => match.candidateId));

      // Method 2: Check parsedData.job_matches (legacy system)
      const allCandidates = await prisma.candidate.findMany({
        select: {
          id: true,
          positionId: true,
          parsedData: true
        }
      });
      
      console.log('Total candidates found:', allCandidates.length);
      
      // Filter candidates who have job matches for this position in parsedData
      const parsedDataCandidateIds = new Set();
      allCandidates.forEach((candidate: any) => {
        try {
          const parsedData = candidate.parsedData as any;
          if (!parsedData || typeof parsedData !== 'object') return;
          
          const jobMatches = parsedData.job_matches;
          if (!Array.isArray(jobMatches)) return;
          
          // Check if any job match has the target positionId
          const hasMatch = jobMatches.some((match: any) => 
            match && typeof match === 'object' && match.jobId === positionId
          );
          
          if (hasMatch) {
            parsedDataCandidateIds.add(candidate.id);
          }
        } catch (error) {
          console.log('Error parsing candidate data for candidate', candidate.id, ':', error);
        }
      });

      console.log('Candidates with job matches in parsedData:', parsedDataCandidateIds.size);

      // Combine both sources - get unique candidate IDs
      const allMatchingCandidateIds = new Set([...jobMatchCandidateIds, ...parsedDataCandidateIds]);
      totalMatching = allMatchingCandidateIds.size;
      console.log('Total unique matching candidates:', totalMatching);

      // Calculate matching but not applied
      // Get candidates who match but haven't applied to this position
      matchingNotApplied = 0;
      
      // From JobMatch table
      jobMatchCandidates.forEach(match => {
        if (match.candidate.positionId !== positionId) {
          matchingNotApplied++;
        }
      });
      
      // From parsedData (only count if not already counted from JobMatch table)
      allCandidates
        .filter(candidate => 
          parsedDataCandidateIds.has(candidate.id) && 
          !jobMatchCandidateIds.has(candidate.id) &&
          candidate.positionId !== positionId
        )
        .forEach(() => {
          matchingNotApplied++;
        });

      console.log('Matching but not applied candidates:', matchingNotApplied);
      
    } catch (error) {
      console.error('Error calculating job matching statistics:', error);
      totalMatching = 0;
      matchingNotApplied = 0;
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