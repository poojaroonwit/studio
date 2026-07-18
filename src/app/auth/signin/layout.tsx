import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | HRI',
  description: 'Authenticate to access the HRI recruitment platform.',
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
