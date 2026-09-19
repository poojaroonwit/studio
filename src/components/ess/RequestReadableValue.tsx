"use client";

import { stringValue } from './ess-types';

function readableLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

export function RequestReadableValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">None</span>;
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
            <RequestReadableValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-muted-foreground">None</span>;
    return (
      <dl className="space-y-2">
        {entries.map(([key, child]) => (
          <div key={key} className="grid gap-0.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
            <dt className="text-xs font-medium text-muted-foreground">{readableLabel(key)}</dt>
            <dd className="min-w-0 break-words text-sm"><RequestReadableValue value={child} /></dd>
          </div>
        ))}
      </dl>
    );
  }

  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  return <span>{stringValue(value, '—')}</span>;
}
