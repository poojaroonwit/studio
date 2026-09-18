import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ClientDetailPage } from '@/components/clients/ClientDetailPage';
import { hasPermission } from '@/lib/permissions';

export default async function ClientDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/auth/signin');
  if (!hasPermission(session.user, 'HR_PEOPLE_VIEW')) redirect('/unauthorized');

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect('/clients');

  return <ClientDetailPage clientId={id} />;
}
