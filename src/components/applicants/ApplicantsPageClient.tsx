"use client";

import { ApplicantsPageClientResolvedView } from './ApplicantsPageClientResolvedView';
import { ApplicantsPageLoadingState } from './ApplicantsPageLoadingState';
import type { ApplicantsPageClientProps } from './ApplicantsPageClientTypes';
import { useApplicantsPageClientController } from './hooks/use-applicants-page-client-controller';

export function ApplicantsPageClient(props: ApplicantsPageClientProps) {
  const controller = useApplicantsPageClientController(props);

  if (controller.sessionGateMessage) {
    return <ApplicantsPageLoadingState message={controller.sessionGateMessage} />;
  }

  return <ApplicantsPageClientResolvedView controller={controller} />;
}
