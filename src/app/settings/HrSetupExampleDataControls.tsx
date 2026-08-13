"use client";

import { useMemo, useState } from 'react';
import { Database, Eye, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  getRecommendedPlatformInitializationIds,
  platformSetupFeatures,
  type PlatformSetupFeatureStatus,
} from '@/lib/admin-platform-setup';
import type { AppKitSetupPreviewGroup } from '@/lib/appkit-setup-preview';
import { getJsonErrorMessage, readJsonObject } from '@/lib/response-json';

type AppKitEnvironment = 'development' | 'production';

export function HrSetupExampleDataControls({
  statuses,
  onApplied,
}: {
  statuses: PlatformSetupFeatureStatus[];
  onApplied: () => Promise<void>;
}) {
  const [environment, setEnvironment] = useState<AppKitEnvironment>('production');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewGroups, setPreviewGroups] = useState<AppKitSetupPreviewGroup[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const pendingIds = useMemo(() => getRecommendedPlatformInitializationIds(statuses), [statuses]);

  const preview = async () => {
    if (pendingIds.length === 0) {
      toast.success('All available example data is already applied');
      return;
    }
    setPreviewOpen(true);
    setLoadingPreview(true);
    setPreviewGroups([]);
    try {
      const response = await fetch('/api/settings/platform-setup/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment, featureIds: pendingIds }),
      });
      const payload = await readJsonObject(response);
      if (!response.ok) throw new Error(getJsonErrorMessage(payload, 'Unable to preview example data'));
      setPreviewGroups(Array.isArray(payload.groups) ? payload.groups as unknown as AppKitSetupPreviewGroup[] : []);
    } catch (error) {
      setPreviewOpen(false);
      toast.error(error instanceof Error ? error.message : 'Unable to preview example data');
    } finally {
      setLoadingPreview(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    const results = await Promise.allSettled(pendingIds.map(async featureId => {
      const feature = platformSetupFeatures.find(candidate => candidate.id === featureId);
      if (!feature?.endpoint) return;
      const response = await fetch(feature.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment }),
      });
      const payload = await readJsonObject(response);
      if (!response.ok) throw new Error(getJsonErrorMessage(payload, `Unable to apply ${feature.title}`));
    }));
    const failures = results.filter(result => result.status === 'rejected');
    await onApplied();
    setApplying(false);
    setPreviewOpen(false);
    if (failures.length === 0) toast.success('Example data applied to HR Setup');
    else toast.error(`${results.length - failures.length} items applied; ${failures.length} need attention`);
  };

  return (
    <>
      <div className="flex h-8 items-center rounded-md border border-border bg-background dark:border-[#344150] dark:bg-[#0b1118]">
        <label htmlFor="hr-setup-appkit-environment" className="inline-flex items-center gap-1.5 border-r border-border px-2 text-[11px] font-medium text-muted-foreground dark:border-[#344150]">
          <Database className="h-3.5 w-3.5" /> Environment
        </label>
        <select
          id="hr-setup-appkit-environment"
          value={environment}
          disabled={applying || loadingPreview}
          onChange={event => setEnvironment(event.target.value as AppKitEnvironment)}
          className="h-full rounded-r-md bg-transparent px-2 text-[11px] font-semibold text-foreground outline-none focus:ring-2 focus:ring-inset focus:ring-primary dark:text-white"
        >
          <option value="production">Production</option>
          <option value="development">Development</option>
        </select>
      </div>
      <Button size="sm" onClick={() => void preview()} disabled={applying || loadingPreview || statuses.length === 0}>
        {loadingPreview ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
        Apply example data
      </Button>

      <Dialog open={previewOpen} onOpenChange={next => !applying && setPreviewOpen(next)}>
        <DialogContent dialogId="hr-setup-example-data-preview" className="max-h-[85vh] overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-6 pb-5 pt-6 pr-14">
            <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Preview example data</DialogTitle>
            <DialogDescription>
              Review the {environment} AppKit records. Existing records may be updated by matching keys or names.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
            {loadingPreview ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading preview…</div>
            ) : (
              <div className="space-y-3">
                {previewGroups.map(group => (
                  <section key={group.featureId} className="rounded-lg border bg-muted/15 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">{platformSetupFeatures.find(feature => feature.id === group.featureId)?.title ?? group.featureId}</h3>
                      <Badge variant="secondary">{group.count} {group.count === 1 ? 'record' : 'records'}</Badge>
                    </div>
                    <ul className="mt-3 divide-y text-sm">
                      {group.items.map((item, index) => <li key={`${item.label}-${index}`} className="py-2 first:pt-0 last:pb-0"><p className="font-medium">{item.label}</p>{item.detail && <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>}</li>)}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="ghost" disabled={applying} onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button disabled={loadingPreview || applying || previewGroups.length === 0} onClick={() => void apply()}>
              {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm and apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
