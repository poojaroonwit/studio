import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AppraisalWorkspace } from '@/components/appraisal/AppraisalWorkspace';

export default async function AppraisalPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  return <AppraisalWorkspace />;
}
