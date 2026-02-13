export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// src/app/api/ai/search-Applicants/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { searchApplicantsAIChat } from '@/ai/flows/search-applicants-flow';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/permissions';

const searchRequestSchema = z.object({
  query: z.string(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to use AI search
  // Users should be able to use AI search if they can view Applicants or have AI-specific permissions
  if (!hasPermission(session.user, 'Applicants_VIEW') && 
      !hasPermission(session.user, 'AI_INTEGRATION_VIEW')) {
    return NextResponse.json({ message: "Forbidden: Insufficient permissions to use AI search" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = searchRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        message: 'Invalid request body', 
        error: 'Invalid request body', 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const validatedData = validation.data;
    const query = validatedData.query;
    const result = await searchApplicantsAIChat({ query });

    // Log audit asynchronously to avoid blocking the response
    logAudit('AUDIT', `User performed an AI search. Query: "${query}"`, 'AI Search', session.user.id, { query })
      .catch(err => console.error('Failed to log audit for AI search:', err));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI search failed:", error);
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorDetails = error?.stack || errorMessage;
    
    // Log audit asynchronously to avoid blocking the error response
    logAudit('ERROR', 'An error occurred during AI search.', 'AI Search', session.user.id, { 
      error: errorMessage,
      stack: error?.stack 
    }).catch(err => console.error('Failed to log audit for AI search error:', err));
    
    return NextResponse.json({ 
      message: `AI search failed: ${errorMessage}`,
      error: 'An error occurred during the AI search.', 
      details: errorDetails 
    }, { status: 500 });
  }
}
