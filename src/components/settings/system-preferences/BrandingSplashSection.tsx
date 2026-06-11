import { Button } from "@/components/ui/button";
import { BrandingLogoUploadTile, BrandingSettingsRow } from "./BrandingTabParts";
import type { BrandingTabProps } from "./BrandingTabTypes";
import { ColorSettingsRow, SectionHeading } from "./BrandingSectionShared";

export function SplashScreenSection({
    canEdit,
    handleSplashLogoChange,
    removeSplashLogo,
    setSplashAnimationType,
    setSplashBackgroundColor,
    splashAnimationType,
    splashBackgroundColor,
    splashLogoPreviewUrl,
}: BrandingTabProps) {
    return (
        <div className="space-y-6">
            <SectionHeading
                badgeClassName="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                badgeLabel="New"
                description="Customize the loading screen shown during page navigation"
                title="Splash Screen"
            />

            <div className="grid gap-8">
                <ColorSettingsRow
                    color={splashBackgroundColor}
                    description="The solid background color of the loading screen"
                    label="Background Color"
                    onColorChange={setSplashBackgroundColor}
                />

                <BrandingSettingsRow
                    label="Animation Style"
                    description="The loading indicator style"
                >
                    <div className="flex flex-wrap gap-2">
                        {["spinner", "pulse", "bar", "dots", "none"].map((type) => (
                            <Button
                                key={type}
                                variant={splashAnimationType === type ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSplashAnimationType(type)}
                                className="capitalize"
                            >
                                {type}
                            </Button>
                        ))}
                    </div>
                </BrandingSettingsRow>

                <BrandingSettingsRow
                    label="Splash Logo (Optional)"
                    description="Overrides primary logo if set"
                >
                    <div className="flex items-center gap-4">
                        <BrandingLogoUploadTile
                            id="splash-logo-upload"
                            previewUrl={splashLogoPreviewUrl}
                            alt="Splash logo preview"
                            canEdit={canEdit}
                            onChange={handleSplashLogoChange}
                            onRemove={() => removeSplashLogo(true)}
                            emptyText="Upload"
                        />
                    </div>
                </BrandingSettingsRow>
            </div>
        </div>
    );
}
