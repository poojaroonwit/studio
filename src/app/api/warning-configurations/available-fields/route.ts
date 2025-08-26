import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering since we use headers() in getServerSession
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Define available fields for each entity type
    const availableFields = {
      candidate: [
        'id',
        'name',
        'email',
        'phone',
        'status',
        'source',
        'recruiterId',
        'gradeId',
        'positionId',
        'createdAt',
        'updatedAt',
        'resumeUrl',
        'linkedinUrl',
        'experience',
        'education',
        'skills',
        'notes',
        'isActive',
        'lastContactDate',
        'expectedSalary',
        'currentSalary',
        'noticePeriod',
        'location',
        'availability',
        'preferredWorkType',
        'languages',
        'certifications',
        'references',
        'interviewNotes',
        'assessmentScore',
        'feedback',
        'rejectionReason',
        'offerStatus',
        'startDate',
        'onboardingStatus'
      ],
      position: [
        'id',
        'title',
        'description',
        'department',
        'isOpen',
        'positionLevel',
        'recruiterId',
        'gradeId',
        'hiringDate',
        'positionAttribute',
        'createdAt',
        'updatedAt',
        'companyId',
        'matchCriteria',
        'customAttributes'
      ],
      headcount: [
        'id',
        'positionId',
        'type',
        'status',
        'candidateId',
        'onboardingDate',
        'notes',
        'memoId',
        'customFields',
        'createdAt',
        'updatedAt'
      ]
    };

    return NextResponse.json(availableFields);
  } catch (error) {
    console.error('Error fetching available fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available fields' },
      { status: 500 }
    );
  }
}
