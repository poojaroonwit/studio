"use client";

import React from 'react';
import { ImageUp, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function OrganizationLogoField({
  isSaving,
  organizationLogoPreviewUrl,
  setOrganizationLogoPreviewUrl,
  setSavedOrganizationLogoUrl,
}: {
  isSaving: boolean;
  organizationLogoPreviewUrl: string | null;
  setOrganizationLogoPreviewUrl: (val: string | null) => void;
  setSavedOrganizationLogoUrl: (val: string | null) => void;
}) {
  const handleOrganizationLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) {
      toast.error('Logo file size exceeds 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setOrganizationLogoPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <Label>Organization Logo</Label>
      <div className="flex items-center gap-4">
        {organizationLogoPreviewUrl && (
          <div className="relative">
            <img
              src={organizationLogoPreviewUrl}
              alt="Organization logo preview"
              className="h-20 w-auto object-contain rounded-md border p-2"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={() => {
                setOrganizationLogoPreviewUrl(null);
                setSavedOrganizationLogoUrl(null);
              }}
              disabled={isSaving}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex-1">
          <Input
            type="file"
            accept="image/*"
            onChange={handleOrganizationLogoChange}
            disabled={isSaving}
            className="hidden"
            id="organization-logo-upload"
          />
          <Label
            htmlFor="organization-logo-upload"
            className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            <ImageUp className="mr-2 h-4 w-4" />
            {organizationLogoPreviewUrl ? 'Replace Logo' : 'Upload Logo'}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Recommended: PNG or SVG, max 500KB.
          </p>
        </div>
      </div>
    </div>
  );
}

export function OrganizationInfoFields({
  isSaving,
  organizationAddress,
  organizationContact,
  organizationName,
  setOrganizationAddress,
  setOrganizationContact,
  setOrganizationName,
}: {
  isSaving: boolean;
  organizationAddress: string;
  organizationContact: string;
  organizationName: string;
  setOrganizationAddress: (val: string) => void;
  setOrganizationContact: (val: string) => void;
  setOrganizationName: (val: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="organization-name">Organization Name</Label>
        <Input
          id="organization-name"
          value={organizationName}
          onChange={(event) => setOrganizationName(event.target.value)}
          placeholder="Enter organization name"
          disabled={isSaving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="organization-address">Organization Address</Label>
        <Input
          id="organization-address"
          value={organizationAddress}
          onChange={(event) => setOrganizationAddress(event.target.value)}
          placeholder="Enter organization address"
          disabled={isSaving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="organization-contact">Contact Information</Label>
        <Input
          id="organization-contact"
          value={organizationContact}
          onChange={(event) => setOrganizationContact(event.target.value)}
          placeholder="Enter contact information"
          disabled={isSaving}
        />
      </div>
    </>
  );
}
