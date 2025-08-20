// src/app/candidates/page.tsx - Server Component
import { getServerSession } from 'next-auth/next';
import { CandidatesPageClient } from '@/components/candidates/CandidatesPageClient';
import type { Candidate, Position, RecruitmentStage, UserProfile } from '@/lib/types';
import { authOptions } from '@/lib/auth';
import { CandidateQueueProvider } from "@/components/candidates/CandidateImportUploadQueue";
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import SafeComponentWrapper from '@/components/ui/safe-component-wrapper';

export default async function CandidatesPageServer() {

  
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading candidates...</div>}>
        <SafeComponentWrapper 
          fallbackTitle="Candidates Page Error"
          fallbackDescription="There was an issue loading the candidates page. This may be due to a temporary initialization problem."
        >
          <CandidateQueueProvider>
            <ErrorBoundary>
              <CandidatesPageClient
                initialCandidates={[]}
                initialAvailablePositions={[]}
                initialAvailableStages={[]}
                initialFetchError={undefined}
              />
            </ErrorBoundary>
          </CandidateQueueProvider>
        </SafeComponentWrapper>
      </Suspense>
    </ErrorBoundary>
  );
}
