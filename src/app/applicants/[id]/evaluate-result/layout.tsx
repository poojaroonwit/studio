import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Evaluation Report | FitScan',
  description: 'Review averaged scores, detailed analysis, and final interviewer remarks.',
};

export default function ApplicantEvaluateResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
