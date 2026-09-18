import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { HrisOperationsWorkspace } from '@/components/hr/HrisOperationsWorkspace';
import { hasAnyPermission, hasPermission } from '@/lib/permissions';

export const metadata = { title: 'Talent & Mobility | hrive' };

export default async function TalentMobilityPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/signin');
  if (!hasAnyPermission(session.user, ['HR_PEOPLE_VIEW', 'HR_WORKFORCE_VIEW', 'HR_WORKFORCE_MANAGE'])) {
    redirect('/unauthorized');
  }

  const canManagePeople = hasPermission(session.user, 'HR_PEOPLE_MANAGE');
  const canManageWorkforce = hasPermission(session.user, 'HR_WORKFORCE_MANAGE');

  return (
    <HrisOperationsWorkspace
      resources={[
        { key: 'succession-plans', canManage: canManageWorkforce },
        { key: 'talent-reviews', canManage: canManageWorkforce },
        { key: 'internal-opportunities', canManage: canManagePeople },
      ]}
    />
  );
}
