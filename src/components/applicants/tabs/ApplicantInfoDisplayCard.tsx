import type React from 'react';
import { formatApplicantNameWithLang } from '@/lib/applicantUtils';
import type { Applicant } from '@/lib/types';
import {
  getApplicantInfoFieldValue,
  getApplicantPersonalInfo,
} from './applicant-info-tab-utils';

export function ApplicantInfoDisplayCard({ applicant }: { applicant: Applicant }) {
  const nameInfo = formatApplicantNameWithLang(applicant);
  const personalInfo = getApplicantPersonalInfo(applicant.parsedData);
  const titleHonorific = getApplicantInfoFieldValue(personalInfo?.title_honorific);
  const nickname = getApplicantInfoFieldValue(personalInfo?.nickname);
  const location = getApplicantInfoFieldValue(personalInfo?.location);
  const introduction = getApplicantInfoFieldValue(personalInfo?.introduction_aboutme);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Applicant details</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Identity and personal information from the applicant profile.</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <ApplicantInfoSection title="Personal profile" description="Core identity details used throughout Recruitment.">
          <ApplicantInfoValue label="Title" value={titleHonorific} />
          <ApplicantInfoValue label="Name" value={nameInfo.name} className={nameInfo.fontClass} lang={nameInfo.lang} />
          <ApplicantInfoValue label="Nickname" value={nickname} />
          <ApplicantInfoValue label="Location" value={location} />
        </ApplicantInfoSection>
        <ApplicantInfoSection title="Introduction" description="The applicant's profile summary and personal introduction.">
          <ApplicantInfoValue label="About" value={introduction} wide />
        </ApplicantInfoSection>
      </div>
    </section>
  );
}

function ApplicantInfoSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid border-b border-border last:border-b-0 lg:grid-cols-[minmax(150px,190px)_minmax(0,1fr)]">
      <div className="bg-muted/25 px-4 py-5 lg:border-r lg:border-border lg:px-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-x-8 px-4 py-1 sm:grid-cols-2 lg:px-6">
        {children}
      </div>
    </div>
  );
}

function ApplicantInfoValue({ label, value, wide, className, lang }: { label: string; value: string; wide?: boolean; className?: string; lang?: string }) {
  return (
    <div className={`border-b border-border/70 py-4 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-medium leading-6 text-foreground ${className || ''}`} lang={lang}>{value || 'Not provided'}</p>
    </div>
  );
}
