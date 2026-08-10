import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { LeaveBlockListClient } from '@/app/settings/leave-block-list/LeaveBlockListClient';
import { HolidaysPageClient } from './HolidaysPageClient';

interface WorkforceHolidaysPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

const sections = [
  { id: 'holidays', label: 'Holiday list', href: '/workforce/holidays' },
  { id: 'leave-blocks', label: 'Leave block list', href: '/workforce/holidays?tab=leave-blocks' },
] as const;

export default async function WorkforceHolidaysPage({ searchParams }: WorkforceHolidaysPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session.user, 'HR_WORKFORCE_VIEW')) {
    redirect('/unauthorized');
  }

  const requestedTab = (await searchParams)?.tab;
  const activeTab = requestedTab === 'leave-blocks' ? 'leave-blocks' : 'holidays';

  return (
    <div className="min-h-full text-foreground">
      <nav aria-label="Holiday management sections" className="border-b border-border px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto">
          {sections.map(section => (
            <Link
              key={section.id}
              href={section.href}
              aria-current={activeTab === section.id ? 'page' : undefined}
              className={cn(
                'relative shrink-0 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                activeTab === section.id
                  ? 'text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {section.label}
            </Link>
          ))}
        </div>
      </nav>
      {activeTab === 'leave-blocks' ? <LeaveBlockListClient /> : <HolidaysPageClient />}
    </div>
  );
}
