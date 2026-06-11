import { auth } from '@/auth';
import { ApplicantsPageClient } from '@/components/applicants/ApplicantsPageClient';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import SafeComponentWrapper from '@/components/ui/safe-component-wrapper';
import { Suspense } from 'react';
import { candidateInitialFilters, loadCandidatePageData } from './candidate-page-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CandidatePageServer() {
  const session = await auth();
  const {
    initialApplicants,
    initialAvailablePositions,
    initialAvailableStages,
    initialFetchError,
  } = await loadCandidatePageData(Boolean(session?.user));

  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading candidates...</div>}>
        <SafeComponentWrapper
          fallbackTitle="Candidate Page Error"
          fallbackDescription="There was an issue loading the candidate page. This may be due to a temporary initialization problem."
        >
          <ErrorBoundary>
            <ApplicantsPageClient
              initialApplicants={initialApplicants}
              initialAvailablePositions={initialAvailablePositions}
              initialAvailableStages={initialAvailableStages}
              initialFetchError={initialFetchError}
              initialFilters={candidateInitialFilters}
            />
          </ErrorBoundary>
        </SafeComponentWrapper>
      </Suspense>
    </ErrorBoundary>
  );
}
