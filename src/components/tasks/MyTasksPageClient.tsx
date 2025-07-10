// src/components/tasks/MyTasksPageClient.tsx
"use client";

import { CandidatesPageClient } from '@/components/candidates/CandidatesPageClient';
import type { CandidateFilterValues } from '@/components/candidates/CandidateFilters';

interface MyTasksPageClientProps {
  userSession: { id: string; role: string; name: string | null } | null;
}

export function MyTasksPageClient({ userSession }: MyTasksPageClientProps) {
  // Only show candidates assigned to this recruiter (unless admin)
  const initialFilters: CandidateFilterValues = userSession?.role === 'Admin'
    ? {}
    : { selectedRecruiterIds: [userSession?.id || ''] };

  return (
    <CandidatesPageClient
      initialCandidates={[]}
      initialAvailablePositions={[]}
      initialAvailableStages={[]}
      initialFetchError={undefined}
      initialFilters={initialFilters}
    />
  );
}
