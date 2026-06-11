"use client";

import React from 'react';
import { Database, Zap } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
export { WebhookSettingsSection } from './ProcessingWebhookFields';

interface AccordionTitleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface ProcessingConfigSectionProps {
  maxConcurrentProcessors: number;
  setMaxConcurrentProcessors: (value: number) => void;
  isSaving: boolean;
}

export function ProcessingAccordionTitle({ icon, title, description }: AccordionTitleProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="text-left">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground font-normal">{description}</div>
      </div>
    </div>
  );
}

export function ProcessingConfigTitle(): React.ReactElement {
  return (
    <ProcessingAccordionTitle
      icon={<Database className="h-5 w-5 text-primary" />}
      title="Processing Configuration"
      description="Configure system performance and processing settings"
    />
  );
}

export function WebhookConfigTitle(): React.ReactElement {
  return (
    <ProcessingAccordionTitle
      icon={<Zap className="h-5 w-5 text-primary" />}
      title="PDF Processing Webhook"
      description="Configure webhook for all PDF processing including resume uploads and automated Applicant creation"
    />
  );
}

export function ProcessingConfigSection({
  maxConcurrentProcessors,
  setMaxConcurrentProcessors,
  isSaving
}: ProcessingConfigSectionProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label htmlFor="max-concurrent-processors">Max Concurrent Processors</Label>
      <Input
        id="max-concurrent-processors"
        type="number"
        min={1}
        max={100}
        value={maxConcurrentProcessors}
        onChange={(event) => setMaxConcurrentProcessors(Number(event.target.value))}
        className="w-32"
        disabled={isSaving}
      />
      <p className="text-xs text-muted-foreground">Maximum number of concurrent resume processing jobs</p>
    </div>
  );
}
