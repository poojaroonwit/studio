import React from 'react';
import { LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  APPEARANCE_DEVICE_TABS,
  getAppearanceDeviceTabClass,
  getDefaultLoginBackgroundGradient,
  type AppearanceDeviceTabId,
} from './appearance-tab-utils';
import { AppearanceDrawerStyleSection } from './AppearanceDrawerStyleSection';
import { AppearanceLoginBackgroundPanel } from './AppearanceLoginBackgroundPanel';
import type { AppearanceTabProps } from './AppearanceTabTypes';

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
  setDrawerStyle,
}: AppearanceTabProps) {
  const [activeTab, setActiveTab] = React.useState<AppearanceDeviceTabId>('desktop');
  const defaultLoginBackgroundGradient = getDefaultLoginBackgroundGradient();

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6">
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
              {APPEARANCE_DEVICE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={getAppearanceDeviceTabClass(activeTab === tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'desktop' ? (
              <AppearanceLoginBackgroundPanel
                canEdit={canEdit}
                backgroundType={loginBackgroundType}
                setBackgroundType={setLoginBackgroundType}
                imagePreviewUrl={loginImagePreviewUrl}
                removeSelectedImage={removeSelectedLoginImage}
                handleImageFileChange={handleLoginImageFileChange}
                backgroundGradient={loginBackgroundGradient}
                setBackgroundGradient={setLoginBackgroundGradient}
                backgroundColor={loginBackgroundColor}
                setBackgroundColor={setLoginBackgroundColor}
                defaultGradient={defaultLoginBackgroundGradient}
                loginLayoutType={loginLayoutType}
                setLoginLayoutType={setLoginLayoutType}
              />
            ) : (
              <AppearanceLoginBackgroundPanel
                canEdit={canEdit}
                idSuffix="mobile"
                isMobile
                backgroundType={loginBackgroundTypeMobile}
                setBackgroundType={setLoginBackgroundTypeMobile}
                imagePreviewUrl={loginImagePreviewUrlMobile}
                removeSelectedImage={removeSelectedLoginImageMobile}
                handleImageFileChange={handleLoginImageFileChangeMobile}
                backgroundGradient={loginBackgroundGradientMobile}
                setBackgroundGradient={setLoginBackgroundGradientMobile}
                backgroundColor={loginBackgroundColorMobile}
                setBackgroundColor={setLoginBackgroundColorMobile}
                defaultGradient={defaultLoginBackgroundGradient}
              />
            )}
          </CardContent>
        </Card>

        <AppearanceDrawerStyleSection
          canEdit={canEdit}
          drawerStyle={drawerStyle}
          setDrawerStyle={setDrawerStyle}
        />
      </div>
    </ScrollArea>
  );
}
