import { auth } from '@/auth';
import { hasPermission, isAdminUser } from '@/lib/permissions';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await auth();
  const isAdminLike = isAdminUser(session?.user) || hasPermission(session?.user, 'SYSTEM_SETTINGS_VIEW');

  if (isAdminLike) {
    redirect('/dashboard');
  }

  redirect('/employee-portal');
}
