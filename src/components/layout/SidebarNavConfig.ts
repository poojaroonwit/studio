import {
  Squares2X2Icon as LayoutDashboard,
  UsersIcon as Users,
  BriefcaseIcon as Briefcase,
  Cog6ToothIcon as Settings,
  ClipboardDocumentListIcon as ListTodo,
  CloudArrowUpIcon as UploadCloud,
  DocumentTextIcon as FileText,
  ChartBarIcon as BarChart3,
  CalendarIcon as Calendar,
  ChatBubbleLeftRightIcon as MessageSquare,
  ShieldCheckIcon as Shield,
  CircleStackIcon as Database,
  BoltIcon as Zap,
  FlagIcon as Target,
  ViewColumnsIcon as Kanban,
  ExclamationTriangleIcon as AlertTriangle,
  ClipboardDocumentCheckIcon as ClipboardCheck
} from "@heroicons/react/24/outline";

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
        description: "Manage Applicant profiles"
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
        description: "Monitor and manage Applicant import queue"
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
        label: "Interview",
        icon: "ClipboardCheck",
        href: "/interview",
        description: "Applicant interview portal"
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
      {
        label: "Security Logs",
        icon: "Shield",
        href: "/settings/security-logs",
        description: "Monitor security incidents",
        adminOnly: true
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
