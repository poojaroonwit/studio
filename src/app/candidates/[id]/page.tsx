"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ServerCrash, UserCircle } from 'lucide-react';
import CandidateDetailView from '@/components/candidates/CandidateDetailView';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import SafeComponentWrapper from '@/components/ui/safe-component-wrapper';
import type { Candidate } from '@/lib/types';

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const candidateId = params.id as string;

  // Loading state while session is being determined
  if (sessionStatus === 'loading') {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (sessionStatus === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  // Validate candidate ID
  if (!candidateId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId)) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-6">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Invalid Candidate ID</h2>
        <p className="text-muted-foreground mb-6">The candidate ID in the URL is not valid.</p>
        <Button onClick={() => router.push('/candidates')}>Back to Candidates</Button>
      </div>
    );
  }

    return (
      <div className="h-full">
        <ErrorBoundary>
          <SafeComponentWrapper 
            fallbackTitle="Candidate Page Error"
            fallbackDescription="There was an issue loading the candidate details. This may be due to a temporary initialization problem."
          >
            <CandidateDetailView
              candidateId={candidateId}
              isModal={false}
              onClose={() => router.push('/candidates')}
            />
          </SafeComponentWrapper>
        </ErrorBoundary>
      </div>
    );
}
