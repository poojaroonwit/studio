import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { HrisOperationsWorkspace } from '@/components/hr/HrisOperationsWorkspace';
import { hasPermission } from '@/lib/permissions';

export const metadata = { title: 'Employee Movements | hrive' };

export default async function EmployeeMovementsPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/signin');
  if (!hasPermission(session.user, 'HR_PEOPLE_VIEW')) redirect('/unauthorized');

  const canManage = hasPermission(session.user, 'HR_PEOPLE_MANAGE');

  return (
    <HrisOperationsWorkspace
      resources={[
        { key: 'employment-events', canManage },
        { key: 'assignments', canManage },
      ]}
    />
  );
}
