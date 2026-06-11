import type { ComponentType } from "react";

export type UserPreferencesTab = "appearance" | "taskboard" | "positions" | "sidebar" | "security";

export type UserPreferencesTabConfig = {
  id: UserPreferencesTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
};
