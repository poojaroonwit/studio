import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | FitScan',
  description: 'Authenticate to access the FitScan recruitment platform.',
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
