"use client";

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  useEffect(() => {
    // Redirect to the new applicants detail page
    router.replace(`/applicants/${candidateId}`);
  }, [candidateId, router]);

  return (
    <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to applicants page...</p>
      </div>
    </div>
  );
}
