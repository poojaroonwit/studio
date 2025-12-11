import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  ListTodo,
  UploadCloud,
  FileText,
  BarChart3,
  Calendar,
  MessageSquare,
  Shield,
  Database,
  Zap,
  Target,
  Kanban,
  AlertTriangle,
  ClipboardCheck
} from "lucide-react";

export interface SidebarNavItem {
  label: string;
  icon: any;
  href: string;
  adminOnly?: boolean;
  badge?: string;
  description?: string;
}

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

// Icon mapping for API serialization
export const iconMap = {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  ListTodo,
  UploadCloud,
  FileText,
  BarChart3,
  Calendar,
  MessageSquare,
  Shield,
  Database,
  Zap,
  Target,
  Kanban,
  AlertTriangle,
  ClipboardCheck
};

// Config with icon names instead of components for API serialization
export const sidebarConfigData = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        icon: "LayoutDashboard",
        href: "/",
        description: "Overview and analytics"
      },
      {
        label: "Applicants",
        icon: "Users",
        href: "/applicants",
        description: "Manage candidate profiles"
      },
      {
        label: "Positions",
        icon: "Briefcase",
        href: "/positions",
        description: "Job positions and openings"
      },
      {
        label: "Process queue",
        icon: "UploadCloud",
        href: "/process-queue",
        description: "Monitor and manage candidate import queue"
      },
    ],
  },
  {
    label: "Recruitment",
    items: [
      {
        label: "My Task Board",
        icon: "ListTodo",
        href: "/my-tasks",
        description: "Personal task management"
      },
      {
        label: "Evaluate",
        icon: "ClipboardCheck",
        href: "/evaluate",
        description: "Candidate evaluation portal"
      },
      {
        label: "SLA Monitoring",
        icon: "AlertTriangle",
        href: "/sla-monitoring",
        description: "Monitor Service Level Agreement compliance"
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        icon: "Settings",
        href: "/settings",
        description: "System configuration"
      },
    ],
  },
];

// Full config with actual icon components for client-side use
export const sidebarConfig: SidebarNavGroup[] = sidebarConfigData.map(group => ({
  ...group,
  items: group.items.map(item => ({
    ...item,
    icon: iconMap[item.icon as keyof typeof iconMap]
  }))
})); 
