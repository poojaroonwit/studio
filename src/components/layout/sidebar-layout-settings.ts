import { normalizeSystemSettingsResponse } from "../../lib/system-settings-response";
import type { SidebarNavGroup } from "./SidebarNavConfig";

export const SIDEBAR_NAVIGATION_MODE_KEY = "sidebarNavigationMode";
export const SIDEBAR_SECONDARY_GROUP_LABELS_KEY = "sidebarSecondaryGroupLabels";

export const SIDEBAR_NAVIGATION_MODES = ["single", "split"] as const;
export type SidebarNavigationMode = (typeof SIDEBAR_NAVIGATION_MODES)[number];

export interface SidebarLayoutSettings {
  mode: SidebarNavigationMode;
  secondaryGroupLabels: string[];
}

export const DEFAULT_SIDEBAR_LAYOUT_SETTINGS: SidebarLayoutSettings = {
  mode: "single",
  secondaryGroupLabels: [],
};

function isSidebarNavigationMode(value: unknown): value is SidebarNavigationMode {
  return typeof value === "string" && SIDEBAR_NAVIGATION_MODES.includes(value as SidebarNavigationMode);
}

export function parseSidebarSecondaryGroupLabels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((label): label is string => typeof label === "string" && label.trim().length > 0);
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parseSidebarSecondaryGroupLabels(parsed);
    }
  } catch {
    return value
      .split(",")
      .map(label => label.trim())
      .filter(Boolean);
  }

  return [];
}

export function buildSidebarLayoutSettings(data: unknown): SidebarLayoutSettings {
  const settings = normalizeSystemSettingsResponse(data);
  const mode = isSidebarNavigationMode(settings[SIDEBAR_NAVIGATION_MODE_KEY])
    ? settings[SIDEBAR_NAVIGATION_MODE_KEY]
    : DEFAULT_SIDEBAR_LAYOUT_SETTINGS.mode;

  return {
    mode,
    secondaryGroupLabels: parseSidebarSecondaryGroupLabels(settings[SIDEBAR_SECONDARY_GROUP_LABELS_KEY]),
  };
}

export function getSidebarGroupLabels(groups: readonly Pick<SidebarNavGroup, "label">[]) {
  return groups.map(group => group.label);
}

export function getEffectiveSecondaryGroupLabels(
  configuredLabels: readonly string[],
  groups: readonly Pick<SidebarNavGroup, "label">[],
) {
  const groupLabels = getSidebarGroupLabels(groups);
  const validLabels = configuredLabels.filter(label => groupLabels.includes(label));

  return validLabels.length > 0 ? validLabels : groupLabels;
}

export function isSidebarGroupInSecondaryPanel(
  groupLabel: string | undefined,
  secondaryGroupLabels: readonly string[],
) {
  return !!groupLabel && secondaryGroupLabels.includes(groupLabel);
}
