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
    label: "Analyst",
    items: [
      {
        label: "Dashboard",
        icon: "LayoutDashboard",
        href: "/dashboard",
        description: "Overview and analytics"
      },
    ],
  },
  {
    label: "Hiring",
    items: [
      {
        label: "My Task Board",
        icon: "ListTodo",
        href: "/my-tasks",
        description: "Personal task management"
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
    ],
  },
  {
    label: "Shortlist & Interview",
    items: [
      {
        label: "Candidate",
        icon: "Users",
        href: "/applicants?status=Hiring Manager Associate",
        description: "Candidates in Hiring Manager Associate stage"
      },
      {
        label: "Interview Page",
        icon: "ClipboardCheck",
        href: "/interview",
        description: "Applicant interview portal"
      },
    ],
  },
  {
    label: "Employee",
    items: [
      {
        label: "Organization Settings",
        icon: "Settings",
        href: "/settings",
        description: "System configuration"
      },
      {
        label: "User Management",
        icon: "Users",
        href: "/settings/users",
        description: "Manage users and roles"
      },
      {
        label: "Meeting Room",
        icon: "Calendar",
        href: "/settings/rooms",
        description: "Manage meeting rooms"
      },
      {
        label: "Evaluation Configuration",
        icon: "Target",
        href: "/settings/evaluation-configuration",
        description: "Configure evaluation settings"
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
