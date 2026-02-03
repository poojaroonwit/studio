
import React from 'react';
import { LogIn, ImageUp, X, Settings2 } from 'lucide-react';
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
    DEFAULT_LOGIN_BACKGROUND_GRADIENT_START,
    DEFAULT_LOGIN_BACKGROUND_GRADIENT_END,
    LoginBackgroundType,
    LoginPageLayoutType,
    DrawerStyle
} from './constants';

interface AppearanceTabProps {
    canEdit: boolean;
    loginBackgroundType: LoginBackgroundType;
    setLoginBackgroundType: (value: LoginBackgroundType) => void;
    loginImagePreviewUrl: string | null;
    removeSelectedLoginImage: (shouldRemoveSaved: boolean) => void;
    handleLoginImageFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    loginBackgroundGradient: string | null;
    setLoginBackgroundGradient: (value: string) => void;
    loginBackgroundColor: string;
    setLoginBackgroundColor: (value: string) => void;

    // Mobile specific props
    loginBackgroundTypeMobile: LoginBackgroundType;
    setLoginBackgroundTypeMobile: (value: LoginBackgroundType) => void;
    loginImagePreviewUrlMobile: string | null;
    removeSelectedLoginImageMobile: (shouldRemoveSaved: boolean) => void;
    handleLoginImageFileChangeMobile: (event: React.ChangeEvent<HTMLInputElement>) => void;
    loginBackgroundGradientMobile: string | null;
    setLoginBackgroundGradientMobile: (value: string) => void;
    loginBackgroundColorMobile: string;
    setLoginBackgroundColorMobile: (value: string) => void;

    loginLayoutType: LoginPageLayoutType;
    setLoginLayoutType: (value: LoginPageLayoutType) => void;

    drawerStyle: DrawerStyle;
    setDrawerStyle: (value: DrawerStyle) => void;
}

export function AppearanceTab({
    canEdit,
    loginBackgroundType,
    setLoginBackgroundType,
    loginImagePreviewUrl,
    removeSelectedLoginImage,
    handleLoginImageFileChange,
    loginBackgroundGradient,
    setLoginBackgroundGradient,
    loginBackgroundColor,
    setLoginBackgroundColor,
    loginBackgroundTypeMobile,
    setLoginBackgroundTypeMobile,
    loginImagePreviewUrlMobile,
    removeSelectedLoginImageMobile,
    handleLoginImageFileChangeMobile,
    loginBackgroundGradientMobile,
    setLoginBackgroundGradientMobile,
    loginBackgroundColorMobile,
    setLoginBackgroundColorMobile,
    loginLayoutType,
    setLoginLayoutType,
    drawerStyle,
    setDrawerStyle
}: AppearanceTabProps) {
    const [activeTab, setActiveTab] = React.useState<'desktop' | 'mobile'>('desktop');

    return (
        <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
                {/* Login Page Design */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LogIn className="h-5 w-5 text-primary" />
                            Login Page Design
                        </CardTitle>
                        <CardDescription>
                            Customize the appearance of the login page for different devices
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex w-full border-b border-border/50 mb-6">
                            <div
                                onClick={() => setActiveTab('desktop')}
                                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer ${
                                    activeTab === 'desktop' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Desktop
                            </div>
                            <div
                                onClick={() => setActiveTab('mobile')}
                                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer ${
                                    activeTab === 'mobile' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Mobile
                            </div>
                        </div>

                        {activeTab === 'desktop' ? (
                            <div className="space-y-6">
                                {/* Background Type */}
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="background-type">Background Type</Label>
                                        <Select
                                            value={loginBackgroundType}
                                            onValueChange={(value) => setLoginBackgroundType(value as LoginBackgroundType)}
                                            disabled={!canEdit}
                                        >
                                            <SelectTrigger id="background-type" className="w-full">
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

                                {/* Login Layout Type */}
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="login-layout-type">Login Page Layout</Label>
                                        <Select
                                            value={loginLayoutType}
                                            onValueChange={(value) => setLoginLayoutType(value as LoginPageLayoutType)}
                                            disabled={!canEdit}
                                        >
                                            <SelectTrigger id="login-layout-type" className="w-full">
                                                <SelectValue placeholder="Select login layout" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="center">Center</SelectItem>
                                                <SelectItem value="2column">2-Column (Right Aligned)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Choose how the login panel is positioned on desktop screens
                                        </p>
                                    </div>
                                </div>

                                {/* Background Image */}
                                {loginBackgroundType === 'image' && (
                                    <div className="space-y-3">
                                        <Label>Background Image</Label>
                                        <div className="flex items-center gap-4">
                                            {loginImagePreviewUrl && (
                                                <div className="relative">
                                                    <img
                                                        src={loginImagePreviewUrl}
                                                        alt="Login background preview"
                                                        className="w-32 h-20 object-cover rounded-md border"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="destructive"
                                                        className="absolute -top-2 -right-2 h-6 w-6"
                                                        onClick={() => removeSelectedLoginImage(true)}
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
                                                    onChange={handleLoginImageFileChange}
                                                    disabled={!canEdit}
                                                    className="hidden"
                                                    id="login-bg-upload"
                                                />
                                                <Label
                                                    htmlFor="login-bg-upload"
                                                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                                >
                                                    <ImageUp className="mr-2 h-4 w-4" />
                                                    Upload Image
                                                </Label>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Recommended: 1920x1080, max 500KB
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Gradient Colors */}
                                {loginBackgroundType === 'gradient' && (
                                    <div className="space-y-2">
                                        <Label>Gradient Colors</Label>
                                        <ColorPicker
                                            value={loginBackgroundGradient || hslGradientToGradientString(DEFAULT_LOGIN_BACKGROUND_GRADIENT_START, DEFAULT_LOGIN_BACKGROUND_GRADIENT_END)}
                                            onChange={(gradientString) => {
                                                setLoginBackgroundGradient(gradientString);
                                            }}
                                            disabled={!canEdit}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                {/* Solid Color */}
                                {loginBackgroundType === 'solid' && (
                                    <div className="space-y-2">
                                        <Label>Background Color</Label>
                                        <ColorPicker
                                            value={convertHslStringToHex(loginBackgroundColor)}
                                            onChange={(hex) => setLoginBackgroundColor(hexToHslString(hex))}
                                            disabled={!canEdit}
                                            className="w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Background Type */}
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="background-type-mobile">Background Type (Mobile)</Label>
                                        <Select
                                            value={loginBackgroundTypeMobile}
                                            onValueChange={(value) => setLoginBackgroundTypeMobile(value as LoginBackgroundType)}
                                            disabled={!canEdit}
                                        >
                                            <SelectTrigger id="background-type-mobile" className="w-full">
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
                                {loginBackgroundTypeMobile === 'image' && (
                                    <div className="space-y-3">
                                        <Label>Background Image (Mobile)</Label>
                                        <div className="flex items-center gap-4">
                                            {loginImagePreviewUrlMobile && (
                                                <div className="relative">
                                                    <img
                                                        src={loginImagePreviewUrlMobile}
                                                        alt="Login background preview mobile"
                                                        className="w-32 h-20 object-cover rounded-md border"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="destructive"
                                                        className="absolute -top-2 -right-2 h-6 w-6"
                                                        onClick={() => removeSelectedLoginImageMobile(true)}
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
                                                    onChange={handleLoginImageFileChangeMobile}
                                                    disabled={!canEdit}
                                                    className="hidden"
                                                    id="login-bg-upload-mobile"
                                                />
                                                <Label
                                                    htmlFor="login-bg-upload-mobile"
                                                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                                >
                                                    <ImageUp className="mr-2 h-4 w-4" />
                                                    Upload Image
                                                </Label>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Recommended: 1080x1920 (Vertical), max 500KB
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Gradient Colors */}
                                {loginBackgroundTypeMobile === 'gradient' && (
                                    <div className="space-y-2">
                                        <Label>Gradient Colors (Mobile)</Label>
                                        <ColorPicker
                                            value={loginBackgroundGradientMobile || hslGradientToGradientString(DEFAULT_LOGIN_BACKGROUND_GRADIENT_START, DEFAULT_LOGIN_BACKGROUND_GRADIENT_END)}
                                            onChange={(gradientString) => {
                                                setLoginBackgroundGradientMobile(gradientString);
                                            }}
                                            disabled={!canEdit}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                {/* Solid Color */}
                                {loginBackgroundTypeMobile === 'solid' && (
                                    <div className="space-y-2">
                                        <Label>Background Color (Mobile)</Label>
                                        <ColorPicker
                                            value={convertHslStringToHex(loginBackgroundColorMobile)}
                                            onChange={(hex) => setLoginBackgroundColorMobile(hexToHslString(hex))}
                                            disabled={!canEdit}
                                            className="w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Drawer Style Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-primary" />
                            Drawer Style
                        </CardTitle>
                        <CardDescription>
                            Choose how drawers appear throughout the application
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="drawer-style">Drawer Style</Label>
                                <Select
                                    value={drawerStyle}
                                    onValueChange={(value) => setDrawerStyle(value as DrawerStyle)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger id="drawer-style" className="w-full">
                                        <SelectValue placeholder="Select drawer style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="classic">
                                            <div className="flex items-center gap-2">
                                                <span>Classic</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="modern">
                                            <div className="flex items-center gap-2">
                                                <span>Modern</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Preview:</p>
                                <div className="space-y-2 text-xs text-muted-foreground">
                                    {drawerStyle === 'classic' && (
                                        <p>• Drawers slide in from the side and take full height</p>
                                    )}
                                    {drawerStyle === 'modern' && (
                                        <p>• Drawers appear as modal-like panels on the right side with margins and rounded corners</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
