export const dynamic = "force-dynamic";
// src/app/my-tasks/page.tsx (Server Component)
import { getServerSession } from 'next-auth/next';
import { MyTasksPageClient } from '@/components/tasks/MyTasksPageClient';
import { authOptions } from '@/lib/auth';

export default async function MyTasksPageServer() {
  const session = await getServerSession(authOptions);

  // Only pass minimal info to the client; all data fetching is client-side
  return (
    <MyTasksPageClient
      userSession={session?.user ? { id: session.user.id, role: session.user.role, name: session.user.name || null } : null}
    />
  );
}
