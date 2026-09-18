import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { TalentMobilityWorkspace } from '@/components/hr/TalentMobilityWorkspace';
import { hasAnyPermission, hasPermission } from '@/lib/permissions';

export const metadata = { title: 'Talent & Mobility | hrive' };

export default async function TalentMobilityPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/signin');
  if (!hasAnyPermission(session.user, ['HR_PEOPLE_VIEW', 'HR_WORKFORCE_VIEW', 'HR_WORKFORCE_MANAGE'])) {
    redirect('/unauthorized');
  }

  return (
    <TalentMobilityWorkspace
      canManagePeople={hasPermission(session.user, 'HR_PEOPLE_MANAGE')}
      canManageWorkforce={hasPermission(session.user, 'HR_WORKFORCE_MANAGE')}
    />
  );
}
