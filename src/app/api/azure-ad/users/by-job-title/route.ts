import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobTitle = searchParams.get('jobTitle');

    if (!jobTitle) {
      return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
    }

    try {
      const client = await getGraphClient();

      // Search for users with the given job title
      // We use $filter with 'startswith' or 'eq' depending on strictness. 
      // Users often have slightly different titles, but exact match is safer for "list employees for THIS position"
      // Let's use exact match for now as per requirement "if that position (job title) if have on AD"
      
      // Escape single quotes in jobTitle to prevent injection in OData filter
      const safeJobTitle = jobTitle.replace(/'/g, "''");
      
      const response = await client.api('/users')
        .filter(`jobTitle eq '${safeJobTitle}'`)
        .select('id,displayName,mail,jobTitle,department,mobilePhone')
        .top(100)
        .orderby('displayName')
        .get();

      return NextResponse.json({ 
        users: response.value || [] 
      });

    } catch (error: any) {
      console.error('[API] Error fetching AD users:', error);
      
      // Check for specific error like "Azure AD not configured"
      if (error.message && (error.message.includes('Azure AD is not configured') || error.message.includes('credential'))) {
         return NextResponse.json({ 
           users: [], 
           error: 'Azure AD is not configured', 
           isConfigured: false 
         });
      }

      return NextResponse.json({ error: 'Failed to fetch users from Azure AD' }, { status: 500 });
    }

  } catch (error) {
    console.error('[API] Unexpected error in AD users endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
