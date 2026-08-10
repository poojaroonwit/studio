import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { hasAnyPermission } from '@/lib/permissions';
import type { PlatformModuleId } from '@/lib/types';
import { LeaveWorkspacePage, type LeaveWorkspaceView } from './LeaveWorkspacePage';

export async function LeaveWorkspaceRoute({ view }: { view: LeaveWorkspaceView }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');
  const canView = hasAnyPermission(session.user, ['HR_WORKFORCE_VIEW', 'HR_WORKFORCE_MANAGE'] as PlatformModuleId[]);
  if (!canView && view !== 'encashment') redirect('/unauthorized');
  const canManage = hasAnyPermission(session.user, ['HR_WORKFORCE_MANAGE'] as PlatformModuleId[]);
  return <LeaveWorkspacePage view={view} canManage={canManage} />;
}
