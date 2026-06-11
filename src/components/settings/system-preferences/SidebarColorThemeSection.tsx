import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import {
  SidebarColorThemeTabs,
  type SidebarColorThemeTabsProps,
} from "./SidebarColorThemeControls";

export function SidebarColorThemeSection(props: SidebarColorThemeTabsProps) {
  return (
    <>
      <Separator className="my-6" />
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
        <div className="space-y-1 md:col-span-4">
          <Label className="text-base font-semibold">Color Theme</Label>
          <p className="text-sm text-muted-foreground">
            Fine-tune colors for different states
          </p>
        </div>

        <div className="md:col-span-8">
          <SidebarColorThemeTabs {...props} />
        </div>
      </div>
    </>
  );
}
