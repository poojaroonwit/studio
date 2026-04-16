import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import SafeComponentWrapper from '@/components/ui/safe-component-wrapper';
import { CandidatesPageClient } from '@/components/candidates/CandidatesPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CandidatesPageServer() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session.user, 'applicantS_VIEW')) {
    redirect('/unauthorized');
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse">Initializing candidate view...</p>
        </div>
      </div>}>
        <SafeComponentWrapper
          fallbackTitle="Candidates Page Error"
          fallbackDescription="There was an issue loading the candidates page."
        >
          <CandidatesPageClient />
        </SafeComponentWrapper>
      </Suspense>
    </ErrorBoundary>
  );
}
