
import React from 'react';
import { Sidebar as SidebarIcon, RotateCcw, ImageUp, X, MoveHorizontal, MoveVertical, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ColorPicker } from '@/components/ui/color-picker';
import { Separator } from '@/components/ui/separator';
import {
    hslGradientToGradientString,
    gradientStringToHslGradient,
    convertHslStringToHex,
    hexToHslString,
} from './utils';
import {

    SidebarColors,
    SidebarBackgroundType,
    SidebarImageFit,
    SidebarImagePosition,
    SIDEBAR_BACKGROUND_TYPE_KEY,
    createInitialSidebarColors,
} from './constants';

// Since we can't import the re-exports from page.tsx easily, we should duplicate or move the helper component.
// I'll inline the SidebarColorInputs logic here or export it if it was a separate component, 
// but in the original file it was a render function or sub-component.
// Based on the read code, it seemed to be part of the render logic but let's implement it cleanly here.

interface SidebarTabProps {
    canEdit: boolean;
    activeSidebarTab: string;
    setActiveSidebarTab: (value: string) => void;
    sidebarColors: SidebarColors;
    setSidebarColors: React.Dispatch<React.SetStateAction<SidebarColors>>;
    resetSidebarColors: (theme: 'Light' | 'Dark') => void;



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

    // Logic for rendering color inputs (adapted from original file)
    const renderSidebarColorInputs = (theme: 'Light' | 'Dark') => {
        const suffix = theme === 'Light' ? 'L' : 'D';
        const bgStartKey = `sidebarBgStart${suffix}` as keyof SidebarColors;
        const bgEndKey = `sidebarBgEnd${suffix}` as keyof SidebarColors;
        const activeBgStartKey = `sidebarActiveBgStart${suffix}` as keyof SidebarColors;
        const activeBgEndKey = `sidebarActiveBgEnd${suffix}` as keyof SidebarColors;

        // Other simple color keys
        const otherKeys = [
            `sidebarText${suffix}` as keyof SidebarColors,
            `sidebarActiveText${suffix}` as keyof SidebarColors,
            `sidebarHoverBg${suffix}` as keyof SidebarColors,
            `sidebarHoverText${suffix}` as keyof SidebarColors,
            `sidebarBorder${suffix}` as keyof SidebarColors,
        ];

        const labels: Record<string, string> = {
            [`sidebarText${suffix}`]: "Text Color",
            [`sidebarActiveText${suffix}`]: "Active Text",
            [`sidebarHoverBg${suffix}`]: "Hover Background",
            [`sidebarHoverText${suffix}`]: "Hover Text",
            [`sidebarBorder${suffix}`]: "Border Color",
        };

        return (
            <div className="space-y-6 pt-4">
                {/* Background Gradient - Merged */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-4">
                        <Label className="text-sm font-medium">Background Gradient</Label>
                    </div>
                    <div className="md:col-span-8">
                        <ColorPicker
                            value={(() => {
                                // Check if we have a stored full gradient string (stored in bgStartKey as a special format)
                                const storedGradient = sidebarColors[bgStartKey] as string;
                                if (storedGradient && (storedGradient.startsWith('linear-gradient') || storedGradient.startsWith('radial-gradient') || storedGradient.startsWith('conic-gradient'))) {
                                    return storedGradient;
                                }
                                // Fall back to converting HSL start/end to gradient string
                                return hslGradientToGradientString(
                                    sidebarColors[bgStartKey] || '',
                                    sidebarColors[bgEndKey] || ''
                                );
                            })()}
                            onChange={(gradientString) => {
                                // Store the full gradient string in bgStartKey, and extract start/end for backward compatibility
                                const gradient = gradientStringToHslGradient(gradientString);
                                setSidebarColors((prev: SidebarColors) => {
                                    const updated = { ...prev };
                                    // Store full gradient string in bgStartKey
                                    updated[bgStartKey] = gradientString;
                                    // Also store start/end for backward compatibility
                                    if (gradient) {
                                        updated[bgEndKey] = gradient.end;
                                    }
                                    return updated;
                                });
                            }}
                            className="w-full"
                            disabled={!canEdit}
                        />
                    </div>
                </div>

                {/* Active Background Gradient - Merged */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                     <div className="md:col-span-4">
                        <Label className="text-sm font-medium">Active Background Gradient</Label>
                    </div>
                    <div className="md:col-span-8">
                        <ColorPicker
                            value={(() => {
                                // Check if we have a stored full gradient string
                                const storedGradient = sidebarColors[activeBgStartKey] as string;
                                if (storedGradient && (storedGradient.startsWith('linear-gradient') || storedGradient.startsWith('radial-gradient') || storedGradient.startsWith('conic-gradient'))) {
                                    return storedGradient;
                                }
                                // Fall back to converting HSL start/end to gradient string
                                return hslGradientToGradientString(
                                    sidebarColors[activeBgStartKey] || '',
                                    sidebarColors[activeBgEndKey] || ''
                                );
                            })()}
                            onChange={(gradientString) => {
                                // Store the full gradient string in activeBgStartKey, and extract start/end for backward compatibility
                                const gradient = gradientStringToHslGradient(gradientString);
                                setSidebarColors((prev: SidebarColors) => {
                                    const updated = { ...prev };
                                    // Store full gradient string in activeBgStartKey
                                    updated[activeBgStartKey] = gradientString;
                                    // Also store start/end for backward compatibility
                                    if (gradient) {
                                        updated[activeBgEndKey] = gradient.end;
                                    } else if (!gradientString.startsWith('linear-gradient') && !gradientString.startsWith('radial-gradient') && !gradientString.startsWith('conic-gradient')) {
                                        // For solid colors, sync end with start to avoid unintended gradients
                                        updated[activeBgEndKey] = gradientString;
                                    }
                                    return updated;
                                });
                            }}
                            className="w-full"
                            disabled={!canEdit}
                        />
                    </div>
                </div>

                {/* Other color inputs */}
                {otherKeys.map((key) => (
                    <div key={key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-4">
                             <Label htmlFor={String(key)} className="text-sm font-medium">
                                {labels[String(key)]}
                            </Label>
                        </div>
                        <div className="md:col-span-8">
                            <ColorPicker
                                value={convertHslStringToHex(sidebarColors[key])}
                                onChange={(hex) => setSidebarColors((prev: SidebarColors) => ({ ...prev, [key]: hexToHslString(hex) }))}
                                className="w-full"
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                ))}

                {/* Button Text Color - separate from sidebar active text */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-4">
                        <Label htmlFor={`buttonTextColor${suffix}`} className="text-sm font-medium">
                            Button Text Color
                        </Label>
                    </div>
                    <div className="md:col-span-8">
                        <ColorPicker
                            value={convertHslStringToHex(sidebarColors[`buttonTextColor${suffix}` as keyof SidebarColors])}
                            onChange={(hex) => setSidebarColors((prev: SidebarColors) => ({
                                ...prev,
                                [`buttonTextColor${suffix}`]: hexToHslString(hex)
                            }))}
                            className="w-full"
                            disabled={!canEdit}
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
                {/* Sidebar Appearance */}
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

                        {/* Background Customization */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                            <div className="md:col-span-4 space-y-1">
                                <Label className="text-base font-semibold">Sidebar Background</Label>
                                <p className="text-sm text-muted-foreground">Customize the background appearance of the sidebar</p>
                            </div>

                            <div className="md:col-span-8 space-y-6">
                                {/* Background Type Selection */}
                                <div className="space-y-3">
                                    <Label>Background Type</Label>
                                    <Select
                                        value={sidebarBackgroundType}
                                        onValueChange={(value) => setSidebarBackgroundType(value as SidebarBackgroundType)}
                                        disabled={!canEdit}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select background type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gradient">Gradient / Solid Color</SelectItem>
                                            <SelectItem value="image">Background Image</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Image Settings */}
                                {sidebarBackgroundType === 'image' && (
                                    <div className="space-y-4">
                                        <Label>Background Image</Label>
                                        <div className="flex items-center gap-4">
                                            {sidebarImagePreviewUrl || savedSidebarImageUrl ? (
                                                <div className="relative w-24 h-32 rounded-md overflow-hidden border">
                                                    <img
                                                        src={sidebarImagePreviewUrl || savedSidebarImageUrl || ''}
                                                        alt="Sidebar background"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="destructive"
                                                        className="absolute top-1 right-1 h-6 w-6 rounded-full"
                                                        onClick={() => removeSelectedSidebarImage(true)}
                                                        disabled={!canEdit}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="w-24 h-32 rounded-md border-2 border-dashed flex items-center justify-center bg-muted/50">
                                                    <ImageUp className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                            )}

                                            <div className="flex-1 space-y-2">
                                                <div>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleSidebarImageFileChange}
                                                        disabled={!canEdit}
                                                        className="hidden"
                                                        id="sidebar-bg-image-upload"
                                                    />
                                                    <Label
                                                        htmlFor="sidebar-bg-image-upload"
                                                        className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full"
                                                    >
                                                        Upload Image
                                                    </Label>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Recommended: Vertical image, optimized for web (jpg/webp)
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Image Fit</Label>
                                                <Select
                                                    value={sidebarImageFit}
                                                    onValueChange={(value) => setSidebarImageFit(value as SidebarImageFit)}
                                                    disabled={!canEdit}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="cover">Cover (Fill)</SelectItem>
                                                        <SelectItem value="contain">Contain</SelectItem>
                                                        <SelectItem value="fill">Stretch</SelectItem>
                                                        <SelectItem value="none">Original Size</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Position</Label>
                                                <Select
                                                    value={sidebarImagePosition}
                                                    onValueChange={(value) => setSidebarImagePosition(value as SidebarImagePosition)}
                                                    disabled={!canEdit}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="center">Center</SelectItem>
                                                        <SelectItem value="top">Top</SelectItem>
                                                        <SelectItem value="bottom">Bottom</SelectItem>
                                                        <SelectItem value="left">Left</SelectItem>
                                                        <SelectItem value="right">Right</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator className="my-6" />

                        {/* Colors Tabs */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                            <div className="md:col-span-4 space-y-1">
                                <Label className="text-base font-semibold">Color Theme</Label>
                                <p className="text-sm text-muted-foreground">Fine-tune colors for different states</p>
                            </div>
                            
                            <div className="md:col-span-8">
                                <Tabs value={activeSidebarTab} onValueChange={setActiveSidebarTab} className="w-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <TabsList>
                                            <TabsTrigger value="light" className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full border border-gray-300 bg-white"></div>
                                                Light Mode
                                            </TabsTrigger>
                                            <TabsTrigger value="dark" className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full border border-gray-600 bg-slate-900"></div>
                                                Dark Mode
                                            </TabsTrigger>
                                        </TabsList>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => resetSidebarColors(activeSidebarTab === 'light' ? 'Light' : 'Dark')}
                                            disabled={!canEdit}
                                            title="Reset to defaults"
                                        >
                                            <RotateCcw className="h-4 w-4 mr-2" />
                                            Reset
                                        </Button>
                                    </div>

                                    <TabsContent value="light" className="mt-0">
                                        {renderSidebarColorInputs('Light')}
                                    </TabsContent>

                                    <TabsContent value="dark" className="mt-0">
                                        {renderSidebarColorInputs('Dark')}
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
