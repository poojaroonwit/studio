"use client";

import { PageLoadingState } from '@/components/ui/PageLoadingState';

interface ApplicantsPageLoadingStateProps {
  message: string;
}

export function ApplicantsPageLoadingState({ message }: ApplicantsPageLoadingStateProps) {
  return <PageLoadingState className="bg-background" message={message} />;
}
