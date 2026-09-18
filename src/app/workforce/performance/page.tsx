import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AppraisalWorkspace } from '@/components/appraisal/AppraisalWorkspace';
import { PerformanceWorkspace } from '@/components/performance/PerformanceWorkspace';
import { canAccessPerformanceManagement } from '@/lib/performance/performance-service';
import { cn } from '@/lib/utils';

export default async function WorkforcePerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');
  if (!await canAccessPerformanceManagement(session.user)) redirect('/ess/performance');

  const { tab } = await searchParams;
  const appraisalActive = tab === 'appraisal';

  return (
    <div className="min-h-full bg-background">
      <nav
        aria-label="Performance workspace"
        className="flex min-h-12 items-end gap-6 overflow-x-auto border-b border-border bg-background px-5 sm:px-6"
      >
        <WorkspaceLink href="/workforce/performance" active={!appraisalActive}>
          Continuous performance
        </WorkspaceLink>
        <WorkspaceLink
          href="/workforce/performance?tab=appraisal&appraisalTab=overview"
          active={appraisalActive}
        >
          Appraisal
        </WorkspaceLink>
      </nav>

      {appraisalActive ? <AppraisalWorkspace embedded /> : <PerformanceWorkspace />}
    </div>
  );
}

function WorkspaceLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-h-12 shrink-0 items-center px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground',
        active && 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground',
      )}
    >
      {children}
    </Link>
  );
}
