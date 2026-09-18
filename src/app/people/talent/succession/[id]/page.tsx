import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { SuccessionPlanWorkspace } from '@/components/hr/SuccessionPlanWorkspace';
import { hasAnyPermission } from '@/lib/permissions';

export default async function SuccessionPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/auth/signin');
  if (!hasAnyPermission(session.user, ['HR_WORKFORCE_VIEW', 'HR_WORKFORCE_MANAGE'])) {
    redirect('/unauthorized');
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect('/people/talent');

  return <SuccessionPlanWorkspace planId={id} />;
}
