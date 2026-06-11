"use client";

import React from 'react';
import { Smartphone } from 'lucide-react';

import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import type { PwaTabProps } from './pwa-tab-types';
import type { PwaColorFieldDefinition, PwaTextFieldDefinition } from './pwa-tab-utils';
import { PWA_COLOR_FIELDS, PWA_STATUS_BAR_OPTIONS, PWA_TEXT_FIELDS } from './pwa-tab-utils';

type PwaTextStateKey = PwaTextFieldDefinition['stateKey'];
type PwaTextSetterKey = PwaTextFieldDefinition['setterKey'];
type PwaColorStateKey = PwaColorFieldDefinition['stateKey'];
type PwaColorSetterKey = PwaColorFieldDefinition['setterKey'];

type PwaSettingsProps = Omit<PwaTabProps, 'pwaEnabled' | 'setPwaEnabled'>;

export function PwaAccordionTitle(): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <Smartphone className="h-5 w-5 text-primary" />
      <div className="text-left">
        <div className="font-semibold">Progressive Web App (PWA)</div>
        <div className="text-xs text-muted-foreground font-normal">
          Enable or disable Progressive Web App functionality. When enabled, users can install the app on mobile devices and tablets.
        </div>
      </div>
    </div>
  );
}

export function PwaEnabledSwitch({
  pwaEnabled,
  setPwaEnabled,
  isSaving
}: Pick<PwaTabProps, 'pwaEnabled' | 'setPwaEnabled' | 'isSaving'>): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="pwa-enabled">Enable PWA</Label>
        <p className="text-sm text-muted-foreground">
          When enabled, the app will show install prompts on mobile devices and tablets, allowing users to add it to their home screen.
        </p>
      </div>
      <Switch id="pwa-enabled" checked={pwaEnabled} onCheckedChange={setPwaEnabled} disabled={isSaving} />
    </div>
  );
}

function PwaTextFieldControl({
  field,
  value,
  onChange,
  isSaving
}: {
  field: PwaTextFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  isSaving: boolean;
}): React.ReactElement {
  return (
    <div className={`space-y-2 ${field.className ?? ''}`}>
      <Label htmlFor={field.id}>{field.label}</Label>
      <Input
        id={field.id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        disabled={isSaving}
        maxLength={field.maxLength}
      />
      <p className="text-xs text-muted-foreground">{field.description}</p>
    </div>
  );
}

function PwaColorFieldControl({
  field,
  value,
  onChange,
  isSaving
}: {
  field: PwaColorFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  isSaving: boolean;
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label htmlFor={field.id}>{field.label}</Label>
      <div className="flex gap-2">
        <ColorPicker value={value} onChange={onChange} disabled={isSaving} />
        <Input
          id={field.id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          disabled={isSaving}
          className="flex-1"
        />
      </div>
      <p className="text-xs text-muted-foreground">{field.description}</p>
    </div>
  );
}

function PwaStatusBarField({
  pwaAppleMobileWebAppStatusBarStyle,
  setPwaAppleMobileWebAppStatusBarStyle,
  isSaving
}: Pick<
  PwaTabProps,
  'pwaAppleMobileWebAppStatusBarStyle' | 'setPwaAppleMobileWebAppStatusBarStyle' | 'isSaving'
>): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label htmlFor="pwa-apple-status-bar">Apple Status Bar Style</Label>
      <Select
        value={pwaAppleMobileWebAppStatusBarStyle}
        onValueChange={setPwaAppleMobileWebAppStatusBarStyle}
        disabled={isSaving}
      >
        <SelectTrigger id="pwa-apple-status-bar">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PWA_STATUS_BAR_OPTIONS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">iOS status bar appearance</p>
    </div>
  );
}

export function PwaMetadataFields(props: PwaSettingsProps): React.ReactElement {
  return (
    <>
      <Separator />
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">PWA Metadata</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PWA_TEXT_FIELDS.map((field) => (
            <PwaTextFieldControl
              key={field.id}
              field={field}
              value={props[field.stateKey as PwaTextStateKey]}
              onChange={props[field.setterKey as PwaTextSetterKey]}
              isSaving={props.isSaving}
            />
          ))}
          {PWA_COLOR_FIELDS.map((field) => (
            <PwaColorFieldControl
              key={field.id}
              field={field}
              value={props[field.stateKey as PwaColorStateKey]}
              onChange={props[field.setterKey as PwaColorSetterKey]}
              isSaving={props.isSaving}
            />
          ))}
          <PwaStatusBarField
            pwaAppleMobileWebAppStatusBarStyle={props.pwaAppleMobileWebAppStatusBarStyle}
            setPwaAppleMobileWebAppStatusBarStyle={props.setPwaAppleMobileWebAppStatusBarStyle}
            isSaving={props.isSaving}
          />
        </div>
      </div>
    </>
  );
}
