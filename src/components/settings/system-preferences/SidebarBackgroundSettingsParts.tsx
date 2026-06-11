import type { ChangeEvent } from "react";
import { ImageUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  SidebarBackgroundType,
  SidebarImageFit,
  SidebarImagePosition,
} from "./constants";
import {
  SIDEBAR_IMAGE_FIT_OPTIONS,
  SIDEBAR_IMAGE_POSITION_OPTIONS,
} from "./sidebar-background-settings-options";

type SidebarSelectOption<TValue extends string> = {
  label: string;
  value: TValue;
};

interface SidebarOptionSelectProps<TValue extends string> {
  canEdit: boolean;
  label: string;
  onValueChange: (value: TValue) => void;
  options: SidebarSelectOption<TValue>[];
  placeholder?: string;
  value: TValue;
}

export function SidebarOptionSelect<TValue extends string>({
  canEdit,
  label,
  onValueChange,
  options,
  placeholder,
  value,
}: SidebarOptionSelectProps<TValue>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue as TValue)}
        disabled={!canEdit}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface SidebarImageSettingsProps {
  canEdit: boolean;
  handleSidebarImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  removeSelectedSidebarImage: (shouldRemoveSaved: boolean) => void;
  savedSidebarImageUrl: string | null;
  setSidebarImageFit: (value: SidebarImageFit) => void;
  setSidebarImagePosition: (value: SidebarImagePosition) => void;
  sidebarImageFit: SidebarImageFit;
  sidebarImagePosition: SidebarImagePosition;
  sidebarImagePreviewUrl: string | null;
}

export function SidebarImageSettings({
  canEdit,
  sidebarImagePreviewUrl,
  savedSidebarImageUrl,
  removeSelectedSidebarImage,
  handleSidebarImageFileChange,
  sidebarImageFit,
  setSidebarImageFit,
  sidebarImagePosition,
  setSidebarImagePosition,
}: SidebarImageSettingsProps) {
  return (
    <div className="space-y-4">
      <Label>Background Image</Label>
      <div className="flex items-center gap-4">
        <SidebarImagePreview
          canEdit={canEdit}
          imageUrl={sidebarImagePreviewUrl || savedSidebarImageUrl}
          onRemove={() => removeSelectedSidebarImage(true)}
        />
        <SidebarImageUploadControl
          canEdit={canEdit}
          onChange={handleSidebarImageFileChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SidebarOptionSelect
          canEdit={canEdit}
          label="Image Fit"
          value={sidebarImageFit}
          onValueChange={setSidebarImageFit}
          options={SIDEBAR_IMAGE_FIT_OPTIONS}
        />
        <SidebarOptionSelect
          canEdit={canEdit}
          label="Position"
          value={sidebarImagePosition}
          onValueChange={setSidebarImagePosition}
          options={SIDEBAR_IMAGE_POSITION_OPTIONS}
        />
      </div>
    </div>
  );
}

interface SidebarImagePreviewProps {
  canEdit: boolean;
  imageUrl: string | null;
  onRemove: () => void;
}

function SidebarImagePreview({
  canEdit,
  imageUrl,
  onRemove,
}: SidebarImagePreviewProps) {
  if (!imageUrl) {
    return (
      <div className="flex h-32 w-24 items-center justify-center rounded-md border-2 border-dashed bg-muted/50">
        <ImageUp className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-32 w-24 overflow-hidden rounded-md border">
      <img
        src={imageUrl}
        alt="Sidebar background"
        className="h-full w-full object-cover"
      />
      <Button
        size="icon"
        variant="destructive"
        className="absolute right-1 top-1 h-6 w-6 rounded-full"
        onClick={onRemove}
        disabled={!canEdit}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface SidebarImageUploadControlProps {
  canEdit: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function SidebarImageUploadControl({
  canEdit,
  onChange,
}: SidebarImageUploadControlProps) {
  return (
    <div className="flex-1 space-y-2">
      <Input
        type="file"
        accept="image/*"
        onChange={onChange}
        disabled={!canEdit}
        className="hidden"
        id="sidebar-bg-image-upload"
      />
      <Label
        htmlFor="sidebar-bg-image-upload"
        className="inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        Upload Image
      </Label>
      <p className="text-xs text-muted-foreground">
        Recommended: Vertical image, optimized for web (jpg/webp)
      </p>
    </div>
  );
}
