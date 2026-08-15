import type { SidebarNavGroup, SidebarNavItem } from "./SidebarNavConfig";

export const MEGA_MENU_CATEGORIES = [
  { label: "Home", description: "Daily workspace and employee portal", groupIds: ["employee-portal"] },
  { label: "People", description: "Employee records, organization, performance, and growth", groupIds: ["people", "performance"] },
  { label: "ESS", description: "Employee self-service, requests, and personal work", groupIds: ["ess"] },
  { label: "Pay", description: "Payroll, compensation, benefits, and expenses", groupIds: ["payroll", "expenses"] },
  { label: "Time", description: "Attendance, rosters, overtime, and workforce planning", groupIds: ["workforce"] },
  { label: "Leave", description: "Leave requests, balances, policies, and allocation", groupIds: ["leaves"] },
  { label: "Hiring", description: "Recruitment and the candidate-facing portal", groupIds: ["recruitment", "job-portal"] },
  { label: "Analytics", description: "Data operations, reporting, and monitoring tools", groupIds: ["data-and-analytics", "other"] },
  { label: "Learning", description: "Courses, paths, achievements, and certificates", groupIds: ["learning"] },
  { label: "Admin Center", description: "Organization setup, access, preferences, and platform controls", groupIds: ["admin-center"] },
  { label: "More", description: "Communications, policies, releases, and support", groupIds: ["broadcast", "privacy-support", "client", "other"] },
] as const;

export interface HeaderNavigationCategory {
  label: string;
  description: string;
  groups: SidebarNavGroup[];
  items: SidebarNavItem[];
}

export function slugHeaderNavigationText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getCategoryFirstHref(
  category: Pick<HeaderNavigationCategory, "label" | "items">,
) {
  const firstItemHref = category.items.find(item => Boolean(item.href))?.href;
  if (!firstItemHref) return undefined;
  if (category.label === "Home") return firstItemHref;
  return category.items.find(item => item.href !== "/employee-portal")?.href ?? firstItemHref;
}

export function buildAdminCenterMegaMenuGroups(
  categoryLabel: string,
  groups: SidebarNavGroup[],
): SidebarNavGroup[] {
  if (categoryLabel !== "Admin Center" || groups.length !== 1) return groups;

  const [adminGroup] = groups;
  const columns = [
    { id: "admin-essentials", label: "Workspace", items: adminGroup.items.slice(0, 5) },
    { id: "admin-controls", label: "Platform controls", items: adminGroup.items.slice(5, 10) },
    { id: "admin-oversight", label: "Integrations & oversight", items: adminGroup.items.slice(10) },
  ];

  return columns
    .filter(column => column.items.length > 0)
    .map(column => ({
      ...adminGroup,
      id: column.id,
      label: column.label,
      icon: column.items[0]?.icon ?? adminGroup.icon,
      items: column.items,
    }));
}
