export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateCandidateHiringStatus } from '@/lib/headcountUtils';

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');
    const positionId = searchParams.get('positionId');

    if (!candidateId || !positionId) {
      return NextResponse.json(
        { error: 'Missing required parameters: candidateId and positionId' },
        { status: 400 }
      );
    }

    // Validate headcount availability
    const validationResult = await validateCandidateHiringStatus(candidateId, positionId);

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error('Error validating headcount for hiring:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
