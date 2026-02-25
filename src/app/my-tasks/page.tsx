export const dynamic = "force-dynamic";
// src/app/my-tasks/page.tsx (Server Component)
import { auth } from '@/auth';
import { MyTasksPageClient } from '@/components/tasks/MyTasksPageClient';
import { hasAnyPermission } from '@/lib/permissions';

export default async function MyTasksPageServer() {
  const session = await auth();

  // Check if user has permission to access task board
  if (!session?.user) {
    // Redirect to signin page instead of showing error message
    // This will be handled by the client component
    return (
      <MyTasksPageClient
        userSession={null}
      />
    );
  }

  // Allow access if user has TASK_BOARD_VIEW permission OR has applicantS_VIEW permission
  const canAccessTaskBoard = hasAnyPermission(
    session.user,
    ['TASK_BOARD_VIEW', 'applicantS_VIEW']
  );

  if (!canAccessTaskBoard) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-destructive">You don't have permission to access the task board.</p>
      </div>
    );
  }

  // Only pass minimal info to the client; all data fetching is client-side
  return (
    <MyTasksPageClient
      userSession={session?.user ? { id: session.user.id, role: session.user.role || '', name: session.user.name || null } : null}
    />
  );
}

