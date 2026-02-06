"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ServerCrash, UserCircle } from 'lucide-react';
import ApplicantDetailView from '@/components/applicants/ApplicantDetailView';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import SafeComponentWrapper from '@/components/ui/safe-component-wrapper';
import type { Applicant } from '@/lib/types';

export default function ApplicantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const applicantId = params.id as string;

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

  // UUID validation removed - proceed with any Applicant ID

    return (
      <div className="h-full bg-background">
        <ErrorBoundary>
          <SafeComponentWrapper 
            fallbackTitle="Applicant Page Error"
            fallbackDescription="There was an issue loading the Applicant details. This may be due to a temporary initialization problem."
          >
            <ApplicantDetailView
              applicantId={applicantId}
              isModal={false}
              onClose={() => router.push('/applicants')}
            />
          </SafeComponentWrapper>
        </ErrorBoundary>
      </div>
    );
}
