"use client";

import { RecruiterSyncCard } from '@/components/settings/RecruiterSyncCard';

export default function RecruiterSyncPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recruiter Assignment Sync</h1>
        <p className="text-muted-foreground">
          Manage automatic synchronization of recruiter assignments between positions and candidates.
        </p>
      </div>

      <RecruiterSyncCard />
    </div>
  );
}
