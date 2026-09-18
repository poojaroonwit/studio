export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { HrisUnifiedTaskInbox } from '@/components/hris/HrisUnifiedTaskInbox';

export default async function MyTasksPageServer() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin?callbackUrl=%2Fmy-tasks');

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">My work</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">My Tasks</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Review assigned HR tasks and approvals from people, workforce, performance, learning, payroll, and other connected workflows.
            </p>
          </div>
          <Link
            href="/applicants?view=task-board"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Recruitment task board
          </Link>
        </header>

        <HrisUnifiedTaskInbox standalone />
      </div>
    </main>
  );
}
