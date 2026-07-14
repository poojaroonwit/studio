import React from 'react';
import { Sidebar as SidebarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sidebarConfigData } from '../../layout/SidebarNavConfig';
import {
    SETTINGS_SIDEBAR_GROUP_LABEL,
    type SidebarNavigationMode,
} from '../../layout/sidebar-layout-settings';
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
    sidebarNavigationMode: SidebarNavigationMode;
    setSidebarNavigationMode: (value: SidebarNavigationMode) => void;
    sidebarSecondaryGroupLabels: string[];
    setSidebarSecondaryGroupLabels: React.Dispatch<React.SetStateAction<string[]>>;
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
    setSidebarImagePosition,
    sidebarNavigationMode,
    setSidebarNavigationMode,
    sidebarSecondaryGroupLabels,
    setSidebarSecondaryGroupLabels,
}: SidebarTabProps) {
    const navigationGroups = sidebarConfigData.map(group => group.label);
    const isSplitMode = sidebarNavigationMode === 'split';

    const toggleSecondaryGroup = (groupLabel: string, checked: boolean) => {
        setSidebarSecondaryGroupLabels((currentLabels) => {
            if (checked) {
                return currentLabels.includes(groupLabel)
                    ? currentLabels
                    : [...currentLabels, groupLabel];
            }

            return currentLabels.filter(label => label !== groupLabel);
        });
    };

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
                        <div className="space-y-4 rounded-lg border border-border/70 p-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Navigation Layout</h3>
                                <p className="text-sm text-muted-foreground">
                                    Choose a compact single sidebar or split selected navigation groups into a secondary menu.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sidebar-navigation-mode">Sidebar mode</Label>
                                <Select
                                    value={sidebarNavigationMode}
                                    onValueChange={(value) => setSidebarNavigationMode(value as SidebarNavigationMode)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger id="sidebar-navigation-mode" className="w-full">
                                        <SelectValue placeholder="Select sidebar mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">Single sidebar</SelectItem>
                                        <SelectItem value="split">Split sidebar</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-medium">Groups shown in the secondary sidebar</p>
                                    <p className="text-xs text-muted-foreground">
                                        Settings always opens as a secondary sidebar; add other groups when they need a nested menu.
                                    </p>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {navigationGroups.map((groupLabel) => {
                                        const isRequiredSecondaryGroup = groupLabel === SETTINGS_SIDEBAR_GROUP_LABEL;

                                        return (
                                        <label
                                            key={groupLabel}
                                            className="flex min-h-10 items-center gap-3 rounded-md border border-border/70 px-3 py-2 text-sm"
                                        >
                                            <Checkbox
                                                checked={isRequiredSecondaryGroup || sidebarSecondaryGroupLabels.includes(groupLabel)}
                                                disabled={!canEdit || !isSplitMode || isRequiredSecondaryGroup}
                                                onCheckedChange={(checked) => toggleSecondaryGroup(groupLabel, checked === true)}
                                            />
                                            <span className="min-w-0 truncate">{groupLabel}</span>
                                        </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
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
