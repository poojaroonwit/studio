import { hasPermission, type SessionLikeUser } from "@/lib/permissions";
import type { PlatformModuleId } from "@/lib/types";
import type { SidebarNavItem } from "./SidebarNavConfig";

export function hasSidebarItemPermission(
  item: SidebarNavItem,
  isAdmin: boolean,
  modulePermissions: PlatformModuleId[],
  user: SessionLikeUser | null | undefined,
) {
  if (isAdmin) return true;
  if (item.adminOnly) return false;

  if (item.permissionId) {
    return hasPermission(user, item.permissionId);
  }

  if (item.href === "/dashboard" || item.href === "/") {
    return modulePermissions.includes("DASHBOARD_VIEW");
  }
  if (item.href === "/my-tasks") {
    return modulePermissions.includes("TASK_BOARD_MANAGE_OWN") ||
      modulePermissions.includes("TASK_BOARD_VIEW") ||
      modulePermissions.includes("applicantS_VIEW");
  }
  if (item.href === "/positions") {
    return modulePermissions.includes("POSITIONS_VIEW");
  }
  if (item.href === "/calendar") {
    return modulePermissions.includes("EVALUATION_LINKS_VIEW") ||
      modulePermissions.includes("EVALUATION_LINKS_CREATE_OWN") ||
      modulePermissions.includes("EVALUATION_LINKS_CREATE_ALL") ||
      modulePermissions.includes("EVALUATION_LINKS_MANAGE_OWN") ||
      modulePermissions.includes("EVALUATION_LINKS_MANAGE_ALL");
  }
  if (item.href.startsWith("/settings/users")) {
    return modulePermissions.includes("USERS_VIEW") || isAdmin;
  }
  if (item.href === "/settings/system-settings" || item.href === "/settings/system-preferences" || item.href === "/settings/system-prompts") {
    return modulePermissions.includes("SYSTEM_SETTINGS_VIEW") || isAdmin;
  }
  if (item.href === "/settings/data-configuration") {
    return modulePermissions.includes("RECRUITMENT_STAGES_VIEW") || isAdmin;
  }
  if (item.href === "/settings/webhooks") {
    return modulePermissions.includes("WEBHOOKS_VIEW") || isAdmin;
  }
  if (item.href === "/settings/logs") {
    return modulePermissions.includes("LOGS_VIEW") || isAdmin;
  }

  return true;
}
