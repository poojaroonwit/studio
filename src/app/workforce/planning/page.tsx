import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { HrisOperationsWorkspace } from '@/components/hr/HrisOperationsWorkspace';
import { hasPermission } from '@/lib/permissions';

export const metadata = { title: 'Workforce Planning | hrive' };

export default async function WorkforcePlanningPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/signin');
  if (!hasPermission(session.user, 'HR_WORKFORCE_VIEW')) redirect('/unauthorized');

  return (
    <HrisOperationsWorkspace
      resources={[
        {
          key: 'workforce-plans',
          canManage: hasPermission(session.user, 'HR_WORKFORCE_MANAGE'),
        },
      ]}
    />
  );
}
