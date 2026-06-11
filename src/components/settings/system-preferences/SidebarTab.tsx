import React from 'react';
import { Sidebar as SidebarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    SidebarBackgroundType,
    SidebarColors,
    SidebarImageFit,
    SidebarImagePosition,
} from './constants';
import {
    SidebarBackgroundSettings,
    SidebarColorThemeSection,
} from './SidebarTabParts';

interface SidebarTabProps {
    canEdit: boolean;
    activeSidebarTab: string;
    setActiveSidebarTab: (value: string) => void;
    sidebarColors: SidebarColors;
    setSidebarColors: React.Dispatch<React.SetStateAction<SidebarColors>>;
    resetSidebarColors: () => void;
    sidebarBackgroundType: SidebarBackgroundType;
    setSidebarBackgroundType: (value: SidebarBackgroundType) => void;
    sidebarImagePreviewUrl: string | null;
    savedSidebarImageUrl: string | null;
    removeSelectedSidebarImage: (shouldRemoveSaved: boolean) => void;
    handleSidebarImageFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    sidebarImageFit: SidebarImageFit;
    setSidebarImageFit: (value: SidebarImageFit) => void;
    sidebarImagePosition: SidebarImagePosition;
    setSidebarImagePosition: (value: SidebarImagePosition) => void;
}

export function SidebarTab({
    canEdit,
    activeSidebarTab,
    setActiveSidebarTab,
    sidebarColors,
    setSidebarColors,
    resetSidebarColors,
    sidebarBackgroundType,
    setSidebarBackgroundType,
    sidebarImagePreviewUrl,
    savedSidebarImageUrl,
    removeSelectedSidebarImage,
    handleSidebarImageFileChange,
    sidebarImageFit,
    setSidebarImageFit,
    sidebarImagePosition,
    setSidebarImagePosition
}: SidebarTabProps) {
    return (
        <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SidebarIcon className="h-5 w-5 text-primary" />
                            Sidebar Appearance
                        </CardTitle>
                        <CardDescription>
                            Customize logic and colors for the sidebar
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <SidebarBackgroundSettings
                            canEdit={canEdit}
                            sidebarBackgroundType={sidebarBackgroundType}
                            setSidebarBackgroundType={setSidebarBackgroundType}
                            sidebarImagePreviewUrl={sidebarImagePreviewUrl}
                            savedSidebarImageUrl={savedSidebarImageUrl}
                            removeSelectedSidebarImage={removeSelectedSidebarImage}
                            handleSidebarImageFileChange={handleSidebarImageFileChange}
                            sidebarImageFit={sidebarImageFit}
                            setSidebarImageFit={setSidebarImageFit}
                            sidebarImagePosition={sidebarImagePosition}
                            setSidebarImagePosition={setSidebarImagePosition}
                        />
                        <SidebarColorThemeSection
                            activeSidebarTab={activeSidebarTab}
                            canEdit={canEdit}
                            resetSidebarColors={resetSidebarColors}
                            setActiveSidebarTab={setActiveSidebarTab}
                            setSidebarColors={setSidebarColors}
                            sidebarColors={sidebarColors}
                        />
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
