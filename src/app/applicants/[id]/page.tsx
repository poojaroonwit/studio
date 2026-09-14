"use client";

import { useParams } from 'next/navigation';

import ApplicantDetailView from '@/components/applicants/ApplicantDetailView';
import { AppPage } from '@/components/layout/AppPage';

export default function ApplicantDetailPage() {
  const params = useParams();
  const applicantId = params.id as string;

  return (
    <AppPage className="h-full min-h-0">
      <ApplicantDetailView applicantId={applicantId} />
    </AppPage>
  );
}
