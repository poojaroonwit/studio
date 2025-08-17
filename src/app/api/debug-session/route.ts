import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions, validateUserSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'No session found',
        status: 'unauthorized'
      }, { status: 401 });
    }

    const validation = await validateUserSession(session);
    
    return NextResponse.json({
      session: {
        user: {
          id: session.user?.id,
          name: session.user?.name,
          email: session.user?.email
        },
        expires: session.expires
      },
      validation: {
        isValid: validation.isValid,
        userId: validation.userId,
        userName: validation.userName,
        error: validation.error
      },
      status: validation.isValid ? 'authorized' : 'invalid_session'
    });
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
