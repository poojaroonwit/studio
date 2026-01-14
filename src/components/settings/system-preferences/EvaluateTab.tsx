
import React from 'react';
import { Target, ImageUp, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ColorPicker } from '@/components/ui/color-picker';
import {
    hslGradientToGradientString,
    convertHslStringToHex,
    hexToHslString
} from './utils';
import {
    EvaluateHeaderBackgroundType,
    DEFAULT_EVALUATE_HEADER_BACKGROUND_GRADIENT_START,
    DEFAULT_EVALUATE_HEADER_BACKGROUND_GRADIENT_END,
} from './constants';

interface EvaluateTabProps {
    canEdit: boolean;
    evaluateHeaderBackgroundType: EvaluateHeaderBackgroundType;
    setEvaluateHeaderBackgroundType: (value: EvaluateHeaderBackgroundType) => void;
    evaluateHeaderImagePreviewUrl: string | null;
    savedEvaluateHeaderImageDataUrl: string | null;
    removeSelectedEvaluateHeaderImage: (shouldRemoveSaved: boolean) => void;
    handleEvaluateHeaderImageFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    evaluateHeaderBackgroundGradient: string | null;
    setEvaluateHeaderBackgroundGradient: (value: string) => void;
    evaluateHeaderBackgroundColor: string;
    setEvaluateHeaderBackgroundColor: (value: string) => void;
    evaluateHeaderTextColor: string;
    setEvaluateHeaderTextColor: (value: string) => void;
}

export function EvaluateTab({
    canEdit,
    evaluateHeaderBackgroundType,
    setEvaluateHeaderBackgroundType,
    evaluateHeaderImagePreviewUrl,
    savedEvaluateHeaderImageDataUrl,
    removeSelectedEvaluateHeaderImage,
    handleEvaluateHeaderImageFileChange,
    evaluateHeaderBackgroundGradient,
    setEvaluateHeaderBackgroundGradient,
    evaluateHeaderBackgroundColor,
    setEvaluateHeaderBackgroundColor,
    evaluateHeaderTextColor,
    setEvaluateHeaderTextColor
}: EvaluateTabProps) {
    return (
        <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Evaluate Page Settings
                        </CardTitle>
                        <CardDescription>
                            Customize the appearance of the candidates evaluation page
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Header Background Type */}
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="eval-bg-type">Header Background Type</Label>
                                <Select
                                    value={evaluateHeaderBackgroundType}
                                    onValueChange={(value) => setEvaluateHeaderBackgroundType(value as EvaluateHeaderBackgroundType)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger id="eval-bg-type" className="w-full">
                                        <SelectValue placeholder="Select background type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gradient">Gradient</SelectItem>
                                        <SelectItem value="image">Image</SelectItem>
                                        <SelectItem value="solid">Solid Color</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Background Image */}
                        {evaluateHeaderBackgroundType === 'image' && (
                            <div className="space-y-3">
                                <Label>Header Background Image</Label>
                                <div className="flex items-center gap-4">
                                    {(evaluateHeaderImagePreviewUrl || savedEvaluateHeaderImageDataUrl) && (
                                        <div className="relative">
                                            <img
                                                src={evaluateHeaderImagePreviewUrl || savedEvaluateHeaderImageDataUrl || ''}
                                                alt="Background preview"
                                                className="w-32 h-16 object-cover rounded-md border"
                                            />
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                className="absolute -top-2 -right-2 h-6 w-6"
                                                onClick={() => removeSelectedEvaluateHeaderImage(true)}
                                                disabled={!canEdit}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleEvaluateHeaderImageFileChange}
                                            disabled={!canEdit}
                                            className="hidden"
                                            id="eval-header-bg-upload"
                                        />
                                        <Label
                                            htmlFor="eval-header-bg-upload"
                                            className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                        >
                                            <ImageUp className="mr-2 h-4 w-4" />
                                            Upload Image
                                        </Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Recommended: 1920x200px (Banner)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Gradient Colors */}
                        {evaluateHeaderBackgroundType === 'gradient' && (
                            <div className="space-y-2">
                                <Label>Gradient Colors</Label>
                                <ColorPicker
                                    value={evaluateHeaderBackgroundGradient || hslGradientToGradientString(DEFAULT_EVALUATE_HEADER_BACKGROUND_GRADIENT_START, DEFAULT_EVALUATE_HEADER_BACKGROUND_GRADIENT_END)}
                                    onChange={(gradientString) => {
                                        setEvaluateHeaderBackgroundGradient(gradientString);
                                    }}
                                    disabled={!canEdit}
                                    className="w-full"
                                />
                            </div>
                        )}

                        {/* Solid Color */}
                        {evaluateHeaderBackgroundType === 'solid' && (
                            <div className="space-y-2">
                                <Label>Background Color</Label>
                                <ColorPicker
                                    value={convertHslStringToHex(evaluateHeaderBackgroundColor)}
                                    onChange={(hex) => setEvaluateHeaderBackgroundColor(hexToHslString(hex))}
                                    disabled={!canEdit}
                                    className="w-full"
                                />
                            </div>
                        )}

                        {/* Text Color */}
                        <div className="space-y-2">
                            <Label>Header Text Color</Label>
                            <ColorPicker
                                value={convertHslStringToHex(evaluateHeaderTextColor)}
                                onChange={(hex) => setEvaluateHeaderTextColor(hexToHslString(hex))}
                                disabled={!canEdit}
                                className="w-full"
                            />
                        </div>

                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
