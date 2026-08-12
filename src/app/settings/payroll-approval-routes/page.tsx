import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/permissions';
import { PayrollApprovalRoutesClient } from './PayrollApprovalRoutesClient';

export default async function PayrollApprovalRoutesPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/signin');
  if (!hasPermission(session.user, 'SYSTEM_SETTINGS_VIEW')) redirect('/unauthorized');
  return <PayrollApprovalRoutesClient canEdit={hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT')} />;
}
