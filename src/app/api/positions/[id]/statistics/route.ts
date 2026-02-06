export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSystemSetting } from '@/lib/systemSettings';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: positionId } = await params;
    
    if (!positionId) {
      return NextResponse.json(
        { error: 'Position ID is required' },
        { status: 400 }
      );
    }

    // Get total applicants who applied to this position (regardless of status)
    let totalApplied = 0;
    try {
      totalApplied = await prisma.applicant.count({
        where: {
          positionId: positionId
        }
      });
    } catch (error) {
      console.error('Error fetching applied applicants:', error);
      totalApplied = 0;
    }

    // Check if job match feature is enabled
    const jobMatchFeatureEnabled = await getSystemSetting('jobMatchFeatureEnabled');
    const isJobMatchEnabled = jobMatchFeatureEnabled !== 'false';

    // Get applicants who have job matches for this position
    let totalMatching = 0;
    let matchingNotApplied = 0;
    
    if (isJobMatchEnabled) {
      try {
        // Method 1: Check JobMatch table directly (new system)
        const jobMatchApplicants = await prisma.jobMatch.findMany({
          where: {
            jobId: positionId
          },
          select: {
            applicantId: true,
            applicant: {
              select: {
                positionId: true
              }
            }
          }
        });

        // Get unique Applicant IDs from JobMatch table
        const jobMatchApplicantIds = new Set(jobMatchApplicants.map((match: any) => match.applicantId));

        // Method 2: Check parsedData.job_matches (legacy system)
        const filteredApplicants = await prisma.applicant.findMany({
          select: {
            id: true,
            positionId: true,
            parsedData: true
          }
        });
        
        // Filter applicants who have job matches for this position in parsedData
        const parsedDataApplicantIds = new Set();
        filteredApplicants.forEach((applicant: any) => {
          try {
            const parsedData = applicant.parsedData as any;
            if (!parsedData || typeof parsedData !== 'object') return;
            
            const jobMatches = parsedData.job_matches;
            if (!Array.isArray(jobMatches)) return;
            
            // Check if any job match has the target positionId
            const hasMatch = jobMatches.some((match: any) => 
              match && typeof match === 'object' && match.jobId === positionId
            );
            
            if (hasMatch) {
              parsedDataApplicantIds.add(applicant.id);
            }
          } catch (error) {
            console.error('Error parsing Applicant data for Applicant', applicant.id, ':', error);
          }
        });

        // Combine both sources - get unique Applicant IDs
        const allMatchingApplicantIds = new Set([...jobMatchApplicantIds, ...parsedDataApplicantIds]);
        totalMatching = allMatchingApplicantIds.size;

        // Calculate matching but not applied
        // Get applicants who match but haven't applied to this position
        matchingNotApplied = 0;
        
        // From JobMatch table
        jobMatchApplicants.forEach((match: any) => {
          if (match.applicant.positionId !== positionId) {
            matchingNotApplied++;
          }
        });
        
        // From parsedData (only count if not already counted from JobMatch table)
        filteredApplicants
          .filter((applicant: any) =>
            parsedDataApplicantIds.has(applicant.id) &&
            !jobMatchApplicantIds.has(applicant.id) &&
            applicant.positionId !== positionId
          )
          .forEach(() => {
            matchingNotApplied++;
          });

      } catch (error) {
        console.error('Error calculating job matching statistics:', error);
        totalMatching = 0;
        matchingNotApplied = 0;
      }
    }

    const result = {
      totalApplied,
      totalMatching,
      matchingNotApplied
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching position statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch position statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 