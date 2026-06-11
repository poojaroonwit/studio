import { Bars3BottomLeftIcon as ListFilter, CodeBracketIcon as Code } from '@heroicons/react/24/outline';

import { cn } from '@/lib/utils';

export type ApplicantFilterTab = 'filters' | 'advanced';

interface ApplicantFilterTabsProps {
  activeTab: ApplicantFilterTab;
  onTabChange: (tab: ApplicantFilterTab) => void;
}

export function ApplicantFilterTabs({
  activeTab,
  onTabChange,
}: ApplicantFilterTabsProps) {
  const tabs = [
    { id: 'filters', label: 'Filters', Icon: ListFilter },
    { id: 'advanced', label: 'Advanced', Icon: Code },
  ] as const;

  return (
    <div className="flex w-full border-b border-border/50">
      {tabs.map(({ id, label, Icon }) => (
        <div
          key={id}
          onClick={() => onTabChange(id)}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 relative cursor-pointer flex-1',
            activeTab === id
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onTabChange(id);
            }
          }}
        >
          <Icon className="h-4 w-4" />
          {label}
        </div>
      ))}
    </div>
  );
}
