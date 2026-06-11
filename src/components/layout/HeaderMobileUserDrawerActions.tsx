import {
  ComputerDesktopIcon as Monitor,
  MoonIcon as Moon,
  SunIcon as Sun,
  TrashIcon as Trash2,
  ArrowRightOnRectangleIcon as LogOut,
} from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import type {
  HeaderMobileUserDrawerProps,
  MobileThemeOption,
} from "./HeaderMobileUserDrawerTypes";

const mobileThemeOptions: MobileThemeOption[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

type HeaderMobileUserDrawerAppearanceProps = Pick<
  HeaderMobileUserDrawerProps,
  "currentTheme"
>;

export function HeaderMobileUserDrawerAppearance({
  currentTheme,
}: HeaderMobileUserDrawerAppearanceProps) {
  return (
    <div className="space-y-3 p-1">
      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 px-4">
        Appearance
      </h4>
      <div className="flex items-center gap-2 px-1">
        {mobileThemeOptions.map((themeOption) => (
          <ThemeOptionButton
            key={themeOption.id}
            currentTheme={currentTheme}
            themeOption={themeOption}
          />
        ))}
      </div>
    </div>
  );
}

type HeaderMobileUserDrawerSessionActionsProps = Pick<
  HeaderMobileUserDrawerProps,
  "onClearCache" | "onSignOut"
>;

export function HeaderMobileUserDrawerSessionActions({
  onClearCache,
  onSignOut,
}: HeaderMobileUserDrawerSessionActionsProps) {
  return (
    <>
      <div className="space-y-1">
        <button
          type="button"
          onClick={onClearCache}
          className="flex items-center w-full px-4 py-3.5 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group gap-4 text-amber-600 dark:text-amber-400"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold">Clear Cache</span>
            <span className="text-[11px] opacity-70">
              Refresh local data and assets
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center w-full px-4 py-3.5 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group gap-4 text-red-600 dark:text-red-400"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold tracking-tight">Sign Out</span>
            <span className="text-[11px] opacity-70">
              End your current session
            </span>
          </div>
        </button>
      </div>

      <div className="text-center pt-2">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-600">
          Version {APP_VERSION}
        </span>
      </div>
    </>
  );
}

function ThemeOptionButton({
  currentTheme,
  themeOption,
}: {
  currentTheme: string;
  themeOption: MobileThemeOption;
}) {
  const Icon = themeOption.icon;

  return (
    <button
      type="button"
      onClick={() =>
        import("@/lib/themeUtils").then((module) =>
          module.setThemeAndColors({ themePreference: themeOption.id }),
        )
      }
      className={cn(
        "flex-1 flex flex-col items-center py-3 rounded-2xl border transition-all gap-1.5",
        currentTheme === themeOption.id
          ? "bg-white dark:bg-zinc-800 border-primary text-primary shadow-sm"
          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500",
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-bold uppercase tracking-wider">
        {themeOption.label}
      </span>
    </button>
  );
}
