import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPicker } from '@/components/ui/color-picker';
import { Loader2, Save, X } from 'lucide-react';
import type { SystemSetting } from "@/lib/types";

interface SystemSettingsFormProps {
  open: boolean;
  setting: SystemSetting | null;
  onClose: () => void;
  onSubmit: (data: SystemSetting[]) => void;
  isSaving?: boolean;
}

// Allowed system setting keys (must match backend systemSettingKeyEnum)
const ALLOWED_SYSTEM_SETTING_KEYS = [
  'appName', 'appLogoDataUrl', 'appFaviconDataUrl', 'appThemePreference',
  'defaultMatchCriteria',
  // New contextual logo settings
  'loginPageLogoLightMode', 'loginPageLogoDarkMode',
  'sidebarLogoCollapsedLightMode', 'sidebarLogoExpandedLightMode',
  'sidebarLogoCollapsedDarkMode', 'sidebarLogoExpandedDarkMode',
  'sidebarLogoCollapsedDarkMode', 'sidebarLogoExpandedDarkMode',
  'primaryGradientStart', 'primaryGradientEnd',
  // Mobile Login Header Customization
  'mobileLoginLogoDataUrl', 'mobileHeaderBackgroundType', 'mobileHeaderFontColor',

  'generalPdfWebhookUrl', 'geminiApiKey',
  'loginPageBackgroundType', 'loginPageBackgroundImageUrl',
  'loginPageBackgroundColor1', 'loginPageBackgroundColor2',
  'loginPageLayoutType',
  // Alternative keys used by system preferences page
  'themePreference', 'loginBackgroundType', 'loginBackgroundGradientStart',
  'loginBackgroundGradientEnd', 'loginBackgroundColor',
  // Feature toggles
  'jobMatchFeatureEnabled',
  'pwaEnabled',
  // PWA Metadata settings
  'pwaName',
  'pwaShortName',
  'pwaDescription',
  'pwaThemeColor',
  'pwaBackgroundColor',
  'pwaAppleMobileWebAppTitle',
  'pwaAppleMobileWebAppStatusBarStyle',
  // Sidebar Light Theme - Background colors
  'sidebarBgStartL', 'sidebarBgEndL', 'sidebarTextL',
  'sidebarActiveBgStartL', 'sidebarActiveBgEndL', 'sidebarActiveTextL',
  'sidebarHoverBgL', 'sidebarHoverTextL', 'sidebarBorderL',
  // Button text colors - separate from sidebar active text
  'buttonTextColorL', 'buttonTextColorD',
  // Sidebar Dark Theme - Background colors
  'sidebarBgStartD', 'sidebarBgEndD', 'sidebarTextD',
  'sidebarActiveBgStartD', 'sidebarActiveBgEndD', 'sidebarActiveTextD',
  'sidebarHoverBgD', 'sidebarHoverTextD', 'sidebarBorderD',
  // Sidebar Light Theme - Font settings
  'sidebarFontFamilyL', 'sidebarFontSizeL', 'sidebarFontWeightL', 'sidebarLineHeightL', 'sidebarLetterSpacingL', 'sidebarTextTransformL',
  // Sidebar Dark Theme - Font settings
  'sidebarFontFamilyD', 'sidebarFontSizeD', 'sidebarFontWeightD', 'sidebarLineHeightD', 'sidebarLetterSpacingD', 'sidebarTextTransformD',
  // Sidebar Light Theme - Border and shadow settings
  'sidebarBorderWidthL', 'sidebarBorderStyleL', 'sidebarBorderRadiusL', 'sidebarShadowL', 'sidebarShadowHoverL', 'sidebarShadowActiveL',
  // Sidebar Dark Theme - Border and shadow settings
  'sidebarBorderWidthD', 'sidebarBorderStyleD', 'sidebarBorderRadiusD', 'sidebarShadowD', 'sidebarShadowHoverD', 'sidebarShadowActiveD',
  // Sidebar Light Theme - Spacing and layout
  'sidebarPaddingXL', 'sidebarPaddingYL', 'sidebarMarginL', 'sidebarGapL', 'sidebarWidthL', 'sidebarWidthCollapsedL', 'sidebarTransitionDurationL', 'sidebarTransitionTimingL',
  // Sidebar Dark Theme - Spacing and layout
  'sidebarPaddingXD', 'sidebarPaddingYD', 'sidebarMarginD', 'sidebarGapD', 'sidebarWidthD', 'sidebarWidthCollapsedD', 'sidebarTransitionDurationD', 'sidebarTransitionTimingD',
  // Sidebar Light Theme - Menu item specific settings
  'sidebarMenuItemBgL', 'sidebarMenuItemBgHoverL', 'sidebarMenuItemBgActiveL', 'sidebarMenuItemColorL', 'sidebarMenuItemColorHoverL', 'sidebarMenuItemColorActiveL',
  'sidebarMenuItemBorderL', 'sidebarMenuItemBorderHoverL', 'sidebarMenuItemBorderActiveL', 'sidebarMenuItemBorderRadiusL', 'sidebarMenuItemPaddingXL', 'sidebarMenuItemPaddingYL',
  'sidebarMenuItemMarginL', 'sidebarMenuItemFontWeightL', 'sidebarMenuItemFontWeightActiveL', 'sidebarMenuItemFontSizeL', 'sidebarMenuItemLineHeightL', 'sidebarMenuItemTransitionL',
  // Sidebar Dark Theme - Menu item specific settings
  'sidebarMenuItemBgD', 'sidebarMenuItemBgHoverD', 'sidebarMenuItemBgActiveD', 'sidebarMenuItemColorD', 'sidebarMenuItemColorHoverD', 'sidebarMenuItemColorActiveD',
  'sidebarMenuItemBorderD', 'sidebarMenuItemBorderHoverD', 'sidebarMenuItemBorderActiveD', 'sidebarMenuItemBorderRadiusD', 'sidebarMenuItemPaddingXD', 'sidebarMenuItemPaddingYD',
  'sidebarMenuItemMarginD', 'sidebarMenuItemFontWeightD', 'sidebarMenuItemFontWeightActiveD', 'sidebarMenuItemFontSizeD', 'sidebarMenuItemLineHeightD', 'sidebarMenuItemTransitionD',
  // Sidebar Light Theme - Icon settings
  'sidebarIconSizeL', 'sidebarIconColorL', 'sidebarIconColorHoverL', 'sidebarIconColorActiveL', 'sidebarIconMarginRightL', 'sidebarIconTransitionL',
  // Sidebar Dark Theme - Icon settings
  'sidebarIconSizeD', 'sidebarIconColorD', 'sidebarIconColorHoverD', 'sidebarIconColorActiveD', 'sidebarIconMarginRightD', 'sidebarIconTransitionD',
  // Sidebar Light Theme - Group label settings
  'sidebarGroupLabelColorL', 'sidebarGroupLabelFontSizeL', 'sidebarGroupLabelFontWeightL', 'sidebarGroupLabelTextTransformL', 'sidebarGroupLabelLetterSpacingL', 'sidebarGroupLabelPaddingL', 'sidebarGroupLabelMarginL',
  // Sidebar Dark Theme - Group label settings
  'sidebarGroupLabelColorD', 'sidebarGroupLabelFontSizeD', 'sidebarGroupLabelFontWeightD', 'sidebarGroupLabelTextTransformD', 'sidebarGroupLabelLetterSpacingD', 'sidebarGroupLabelPaddingD', 'sidebarGroupLabelMarginD',
  'appFontFamily',
  'loginPageContent',
  'loginPageFooter',
  'maxConcurrentProcessors',
  'aiPowerSearchSystemPrompt',
  // Organization branding
  'organizationName', 'organizationAddress', 'organizationContact', 'organizationLogoDataUrl',
];

const SystemSettingsForm: React.FC<SystemSettingsFormProps> = ({
  open,
  setting,
  onClose,
  onSubmit,
  isSaving = false
}) => {
  const [formData, setFormData] = useState<SystemSetting>({
    key: 'appName',
    value: null
  });

  useEffect(() => {
    if (setting) {
      setFormData(setting);
    } else {
      setFormData({ key: 'appName', value: null });
    }
  }, [setting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.key.trim()) {
      // Always send value as string or null
      const safeValue = formData.value === null || formData.value === undefined ? null : String(formData.value);
      onSubmit([{ ...formData, value: safeValue }]);
    }
  };

  const handleInputChange = (field: keyof SystemSetting, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("File size must be less than 2MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        handleInputChange('value', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    handleInputChange('value', '');
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {setting ? 'Edit System Setting' : 'Add System Setting'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key">Setting Key</Label>
            {setting ? (
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => handleInputChange('key', e.target.value)}
                placeholder="e.g., appName, geminiApiKey"
                disabled={!!setting} // Can't edit key for existing settings
                required
              />
            ) : (
              <Select
                value={formData.key}
                onValueChange={(value) => handleInputChange('key', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select setting key" />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_SYSTEM_SETTING_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>{key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            {formData.key.includes('Url') || formData.key.includes('webhook') ? (
  <Textarea
                id="value"
                value={formData.value || ''}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="Enter URL or webhook endpoint"
                rows={3}
              />
            ) : formData.key.includes('DataUrl') ? (
              <div className="space-y-4">
                 {formData.value && (
                  <div className="relative w-full max-w-[200px] h-20 border rounded-md overflow-hidden bg-muted/50 flex items-center justify-center">
                    <img 
                      src={formData.value} 
                      alt="Preview" 
                      className="max-w-full max-h-full object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: PNG or JPG, max 2MB.
                </p>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or enter base64 string</span>
                  </div>
                </div>
                <Textarea
                  value={formData.value || ''}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  placeholder="data:image/png;base64,..."
                  rows={2}
                  className="font-mono text-xs"
                />
              </div>
            ) : formData.key.includes('ApiKey') || formData.key.includes('Secret') ? (
              <Input
                id="value"
                type="password"
                value={formData.value || ''}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="Enter API key or secret"
              />
            ) : formData.key.includes('Port') ? (
              <Input
                id="value"
                type="number"
                value={formData.value || ''}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="Enter port number"
              />
            ) : formData.key.includes('Secure') || formData.key.includes('Required') ? (
              <Select
                value={formData.value || ''}
                onValueChange={(value) => handleInputChange('value', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            ) : formData.key === 'mobileHeaderBackgroundType' ? (
              <Select
                value={formData.value || 'gradient'}
                onValueChange={(value) => handleInputChange('value', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select background type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gradient">Gradient (Default)</SelectItem>
                  <SelectItem value="transparent">Transparent (Match Body)</SelectItem>
                  <SelectItem value="solid">Solid Color</SelectItem>
                </SelectContent>
              </Select>
            ) : formData.key.startsWith('sidebar') && (formData.key.includes('Bg') || formData.key.includes('Text') || formData.key.includes('Border')) ? (
              <div className="space-y-2">
                <ColorPicker
                  value={formData.value ? (() => {
                    // Convert HSL string to hex
                    const hslMatch = formData.value.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
                    if (hslMatch) {
                      const h = parseInt(hslMatch[1]) / 360;
                      const s = parseInt(hslMatch[2]) / 100;
                      const l = parseInt(hslMatch[3]) / 100;
                      const c = (1 - Math.abs(2 * l - 1)) * s;
                      const x = c * (1 - Math.abs((h * 6) % 2 - 1));
                      const m = l - c / 2;
                      let r = 0, g = 0, b = 0;
                      if (h < 1 / 6) { r = c; g = x; b = 0; }
                      else if (h < 2 / 6) { r = x; g = c; b = 0; }
                      else if (h < 3 / 6) { r = 0; g = c; b = x; }
                      else if (h < 4 / 6) { r = 0; g = x; b = c; }
                      else if (h < 5 / 6) { r = x; g = 0; b = c; }
                      else { r = c; g = 0; b = x; }
                      const hex = '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
                      return hex;
                    }
                    return '#ffffff';
                  })() : '#ffffff'}
                  onChange={(hex) => {
                    // Convert hex to HSL
                    const r = parseInt(hex.slice(1, 3), 16) / 255;
                    const g = parseInt(hex.slice(3, 5), 16) / 255;
                    const b = parseInt(hex.slice(5, 7), 16) / 255;

                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    let h = 0, s = 0, l = (max + min) / 2;

                    if (max === min) {
                      h = s = 0;
                    } else {
                      const d = max - min;
                      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                      switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                      }
                      h /= 6;
                    }

                    const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
                    handleInputChange('value', hsl);
                  }}
                  className="w-full"
                />
                <Input
                  id="value"
                  value={formData.value || ''}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  placeholder="e.g., 220 25% 97% (HSL values)"
                  className="text-xs"
                />
              </div>
            ) : formData.key.includes('Color') ? (
              <div className="space-y-2">
                 <ColorPicker
                  value={formData.value || '#000000'}
                  onChange={(hex) => handleInputChange('value', hex)}
                  className="w-full"
                />
                <Input
                  id="value"
                  value={formData.value || ''}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  placeholder="Enter color (Hex or Name)"
                />
              </div>
            ) : (
              <Input
                id="value"
                value={formData.value || ''}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="Enter value"
              />
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !formData.key.trim()}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SystemSettingsForm; 