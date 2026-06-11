import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ImageUp } from "lucide-react";
import type { BrandingTabProps } from "./BrandingTabTypes";
import { HeaderBrandingSection } from "./BrandingHeaderSection";
import { LogoManagementSection } from "./BrandingLogoManagementSection";
import { SplashScreenSection } from "./BrandingSplashSection";

export function BrandingContentCard(props: BrandingTabProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ImageUp className="h-5 w-5 text-primary" />
                    Logo Management
                </CardTitle>
                <CardDescription>
                    Configure your company logos for different contexts throughout the application
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <LogoManagementSection {...props} />
                <Separator />
                <HeaderBrandingSection {...props} />
                <Separator />
                <SplashScreenSection {...props} />
            </CardContent>
        </Card>
    );
}
