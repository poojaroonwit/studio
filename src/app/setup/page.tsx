export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isPlatformSetupRequired } from '@/lib/platform-installation';
import PlatformSetupClient from './PlatformSetupClient';

export const metadata: Metadata = {
  title: 'Set up hrive',
  description: 'Create the first administrator and prepare the recruitment platform.',
};

export default async function PlatformSetupPage() {
  if (!(await isPlatformSetupRequired())) {
    redirect('/auth/signin');
  }

  return <PlatformSetupClient />;
}
