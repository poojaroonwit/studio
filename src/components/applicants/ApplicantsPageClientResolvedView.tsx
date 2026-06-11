"use client";

import { ApplicantsPageClientView } from './ApplicantsPageClientView';
import { buildApplicantsPageClientViewProps } from './applicants-page-client-view-props';
import type { ApplicantsPageClientController } from './hooks/use-applicants-page-client-controller';

interface ApplicantsPageClientResolvedViewProps {
  controller: ApplicantsPageClientController;
}

export function ApplicantsPageClientResolvedView({ controller }: ApplicantsPageClientResolvedViewProps) {
  return <ApplicantsPageClientView {...buildApplicantsPageClientViewProps(controller)} />;
}
