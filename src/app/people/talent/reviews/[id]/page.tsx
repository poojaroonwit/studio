import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { TalentReviewWorkspace } from '@/components/hr/TalentReviewWorkspace';
import { hasPermission } from '@/lib/permissions';

export default async function TalentReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/auth/signin');
  if (!hasPermission(session.user, 'HR_WORKFORCE_MANAGE')) redirect('/unauthorized');

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect('/people/talent');

  return <TalentReviewWorkspace reviewId={id} />;
}
