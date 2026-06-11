import { Settings2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DrawerStyle } from './constants';
import { DRAWER_STYLE_OPTIONS } from './appearance-tab-utils';

interface AppearanceDrawerStyleSectionProps {
  canEdit: boolean;
  drawerStyle: DrawerStyle;
  setDrawerStyle: (value: DrawerStyle) => void;
}

export function AppearanceDrawerStyleSection({
  canEdit,
  drawerStyle,
  setDrawerStyle,
}: AppearanceDrawerStyleSectionProps) {
  return (
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
                {DRAWER_STYLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview:</p>
            <div className="space-y-2 text-xs text-muted-foreground">
              {drawerStyle === 'classic' && (
                <p>- Drawers slide in from the side and take full height</p>
              )}
              {drawerStyle === 'modern' && (
                <p>- Drawers appear as modal-like panels on the right side with margins and rounded corners</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
