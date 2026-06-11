"use client";

import { ImageUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  SystemPreferenceImageUploadFieldProps,
  SystemPreferencesLogoSettingsCardProps,
} from "./SystemPreferencesFormTypes";

const SIDEBAR_LOGO_SIZE_OPTIONS = [
  { value: 32, label: "Small (32px)" },
  { value: 48, label: "Medium (48px)" },
  { value: 64, label: "Large (64px)" },
];

function SystemPreferenceImageUploadField({
  id,
  label,
  imageUrl,
  imageAlt,
  imageClassName,
  accept,
  actionLabel,
  replacementActionLabel,
  helperText,
  onUpload,
  onRemove,
}: SystemPreferenceImageUploadFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {imageUrl && (
          <div className="relative">
            <img
              src={imageUrl}
              alt={imageAlt}
              className={`${imageClassName} rounded border bg-muted/20 object-contain`}
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -right-2 -top-2 h-6 w-6 p-0"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex-1">
          <Input
            id={id}
            type="file"
            accept={accept}
            onChange={onUpload}
            className="hidden"
          />
          <Label
            htmlFor={id}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ImageUp className="h-4 w-4" />
            {imageUrl ? replacementActionLabel : actionLabel}
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
        </div>
      </div>
    </div>
  );
}

export function SystemPreferencesLogoSettingsCard({
  appLogoUrl,
  appFaviconUrl,
  showLogoOnly,
  sidebarLogoSize,
  onAppLogoUpload,
  onAppFaviconUpload,
  onRemoveAppLogo,
  onRemoveAppFavicon,
  onShowLogoOnlyChange,
  onSidebarLogoSizeChange,
}: SystemPreferencesLogoSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageUp className="h-5 w-5" />
          Logo Settings
        </CardTitle>
        <CardDescription>Configure application logo and branding</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <SystemPreferenceImageUploadField
            id="appLogo"
            label="Application Logo"
            imageUrl={appLogoUrl}
            imageAlt="App Logo"
            imageClassName="h-16 w-16"
            accept="image/*"
            actionLabel="Upload Logo"
            replacementActionLabel="Change Logo"
            helperText="Recommended: 64x64px or larger, PNG/SVG"
            onUpload={onAppLogoUpload}
            onRemove={onRemoveAppLogo}
          />

          <SystemPreferenceImageUploadField
            id="appFavicon"
            label="Application Favicon"
            imageUrl={appFaviconUrl}
            imageAlt="App Favicon"
            imageClassName="h-8 w-8"
            accept="image/x-icon,image/png,image/svg+xml"
            actionLabel="Upload Favicon"
            replacementActionLabel="Change Favicon"
            helperText="Recommended: 32x32px .ico or .png"
            onUpload={onAppFaviconUpload}
            onRemove={onRemoveAppFavicon}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sidebarLogoSize">Sidebar Logo Size</Label>
          <Select
            value={sidebarLogoSize.toString()}
            onValueChange={value => onSidebarLogoSizeChange(parseInt(value, 10))}
          >
            <SelectTrigger id="sidebarLogoSize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIDEBAR_LOGO_SIZE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showLogoOnly"
            checked={showLogoOnly}
            onChange={event => onShowLogoOnlyChange(event.target.checked)}
            className="rounded"
          />
          <Label htmlFor="showLogoOnly">Show logo only (hide app name)</Label>
        </div>
      </CardContent>
    </Card>
  );
}

