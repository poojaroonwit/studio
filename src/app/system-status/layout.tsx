import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Status | FitScan',
  description: 'Inspect infrastructure dependencies, storage, authentication, and environment readiness.',
};

export default function SystemStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
