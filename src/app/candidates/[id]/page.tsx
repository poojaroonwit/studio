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

  // UUID validation removed - proceed with any candidate ID

    return (
      <div className="h-full bg-background">
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
