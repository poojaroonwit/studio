import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get('candidateId');

  if (!candidateId) {
    return NextResponse.json({ error: 'Missing candidateId' }, { status: 400 });
  }

  // TODO: Replace with actual logic to fetch transitions for the candidateId
  const transitions = [];

  return NextResponse.json({ transitions });
} 