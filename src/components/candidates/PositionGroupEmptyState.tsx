import React from 'react';
import { BadgeInfo } from 'lucide-react';

export function PositionGroupEmptyState(): React.ReactElement {
  return (
    <div className="p-12 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 translate-y-[-10px]">
      <BadgeInfo className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
      <p className="text-zinc-400 text-sm">No candidates have applied to this position via your scope yet.</p>
    </div>
  );
}
