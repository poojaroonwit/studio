import type { ChangeEvent } from "react";

import { Label } from "@/components/ui/label";

import type {
  SidebarBackgroundType,
  SidebarImageFit,
  SidebarImagePosition,
} from "./constants";
import {
  SidebarImageSettings,
  SidebarOptionSelect,
} from "./SidebarBackgroundSettingsParts";
import { SIDEBAR_BACKGROUND_TYPE_OPTIONS } from "./sidebar-background-settings-options";

interface SidebarBackgroundSettingsProps {
  canEdit: boolean;
  sidebarBackgroundType: SidebarBackgroundType;
  setSidebarBackgroundType: (value: SidebarBackgroundType) => void;
  sidebarImagePreviewUrl: string | null;
  savedSidebarImageUrl: string | null;
  removeSelectedSidebarImage: (shouldRemoveSaved: boolean) => void;
  handleSidebarImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  sidebarImageFit: SidebarImageFit;
  setSidebarImageFit: (value: SidebarImageFit) => void;
  sidebarImagePosition: SidebarImagePosition;
  setSidebarImagePosition: (value: SidebarImagePosition) => void;
}

export function SidebarBackgroundSettings({
  canEdit,
  sidebarBackgroundType,
  setSidebarBackgroundType,
  sidebarImagePreviewUrl,
  savedSidebarImageUrl,
  removeSelectedSidebarImage,
  handleSidebarImageFileChange,
  sidebarImageFit,
  setSidebarImageFit,
  sidebarImagePosition,
  setSidebarImagePosition,
}: SidebarBackgroundSettingsProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
      <div className="space-y-1 md:col-span-4">
        <Label className="text-base font-semibold">Sidebar Background</Label>
        <p className="text-sm text-muted-foreground">
          Customize the background appearance of the sidebar
        </p>
      </div>

      <div className="space-y-6 md:col-span-8">
        <SidebarOptionSelect
          canEdit={canEdit}
          label="Background Type"
          value={sidebarBackgroundType}
          onValueChange={setSidebarBackgroundType}
          options={SIDEBAR_BACKGROUND_TYPE_OPTIONS}
          placeholder="Select background type"
        />

        {sidebarBackgroundType === "image" && (
          <SidebarImageSettings
            canEdit={canEdit}
            sidebarImagePreviewUrl={sidebarImagePreviewUrl}
            savedSidebarImageUrl={savedSidebarImageUrl}
            removeSelectedSidebarImage={removeSelectedSidebarImage}
            handleSidebarImageFileChange={handleSidebarImageFileChange}
            sidebarImageFit={sidebarImageFit}
            setSidebarImageFit={setSidebarImageFit}
            sidebarImagePosition={sidebarImagePosition}
            setSidebarImagePosition={setSidebarImagePosition}
          />
        )}
      </div>
    </div>
  );
}
