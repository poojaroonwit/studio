import {
  ComputerDesktopIcon as Monitor,
  MoonIcon as Moon,
  SunIcon as Sun,
  TrashIcon as Trash2,
  ArrowRightOnRectangleIcon as LogOut,
  LanguageIcon as Languages,
} from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import { LocaleFlag } from "./locale-flags";
import type {
  HeaderMobileUserDrawerProps,
  MobileThemeOption,
} from "./HeaderMobileUserDrawerTypes";

type HeaderMobileUserDrawerAppearanceProps = Pick<
  HeaderMobileUserDrawerProps,
  "currentTheme" | "currentLocale" | "onLocaleChange" | "labels"
>;

export function HeaderMobileUserDrawerAppearance({
  currentTheme,
  currentLocale,
  onLocaleChange,
  labels,
}: HeaderMobileUserDrawerAppearanceProps) {
  const mobileThemeOptions: MobileThemeOption[] = [
    { id: "light", label: labels.light, icon: Sun },
    { id: "dark", label: labels.dark, icon: Moon },
    { id: "system", label: labels.system, icon: Monitor },
  ];
  return (
    <div className="space-y-3 p-1">
      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 px-4">
        {labels.appearance}
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
      <div className="px-1 pt-2">
        <div className="mb-2 flex items-center gap-2 px-3 text-xs font-semibold text-muted-foreground">
          <Languages className="h-4 w-4" />
          <span>{labels.localization}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["en-US", "th-TH"] as const).map((locale) => (
            <button
              key={locale}
              type="button"
              aria-pressed={currentLocale === locale}
              onClick={() => onLocaleChange(locale)}
              className={cn(
                "min-h-11 rounded-xl border px-3 text-xs font-bold transition-colors",
                currentLocale === locale
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <LocaleFlag locale={locale} className="h-3.5 w-6" />
                <span>{locale === "en-US" ? labels.english : labels.thai}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type HeaderMobileUserDrawerSessionActionsProps = Pick<
  HeaderMobileUserDrawerProps,
  "onClearCache" | "onSignOut" | "labels"
>;

export function HeaderMobileUserDrawerSessionActions({
  onClearCache,
  onSignOut,
  labels,
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
            <span className="text-sm font-bold">{labels.clearCache}</span>
            <span className="text-[11px] opacity-70">
              {labels.clearCacheDescription}
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
            <span className="text-sm font-bold tracking-tight">{labels.signOut}</span>
            <span className="text-[11px] opacity-70">
              {labels.signOutDescription}
            </span>
          </div>
        </button>
      </div>

      <div className="text-center pt-2">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-600">
          {labels.version} {APP_VERSION}
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
