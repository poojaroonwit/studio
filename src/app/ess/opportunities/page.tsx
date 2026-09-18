import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { InternalOpportunitiesView } from '@/components/ess/InternalOpportunitiesView';

export default async function InternalOpportunitiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin?callbackUrl=%2Fess%2Fopportunities');

  return <InternalOpportunitiesView />;
}
