import { describe, expect, it } from "vitest";

import type { SidebarNavGroup, SidebarNavItem } from "./SidebarNavConfig";
import {
  buildAdminCenterMegaMenuGroups,
  getCategoryFirstHref,
  slugHeaderNavigationText,
} from "./header-navigation-config";

const Icon = () => null;

function item(label: string, href: string): SidebarNavItem {
  return { label, href, icon: Icon };
}

describe("header navigation config", () => {
  it("normalizes labels for localization keys", () => {
    expect(slugHeaderNavigationText("Audit, Logs & Monitoring")).toBe(
      "audit-logs-and-monitoring",
    );
  });

  it("uses the first home destination as-is", () => {
    expect(
      getCategoryFirstHref({
        label: "Home",
        items: [
          item("Admin Portal", "/dashboard"),
          item("Employee Portal", "/employee-portal"),
        ],
      }),
    ).toBe("/dashboard");
  });

  it("skips employee portal as the default destination for non-home categories", () => {
    expect(
      getCategoryFirstHref({
        label: "People",
        items: [
          item("Employee Portal", "/employee-portal"),
          item("Employees", "/people"),
        ],
      }),
    ).toBe("/people");
  });

  it("splits a large admin group into stable presentation columns", () => {
    const adminGroup: SidebarNavGroup = {
      id: "admin-center",
      label: "Admin Center",
      icon: Icon,
      items: Array.from({ length: 13 }, (_, index) =>
        item(`Item ${index + 1}`, `/settings/${index + 1}`),
      ),
    };

    const groups = buildAdminCenterMegaMenuGroups("Admin Center", [adminGroup]);

    expect(groups.map(group => group.label)).toEqual([
      "Workspace",
      "Platform controls",
      "Integrations & oversight",
    ]);
    expect(groups.map(group => group.items.length)).toEqual([5, 5, 3]);
  });
});
