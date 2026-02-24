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
  icon: any; // Added for primary sidebar
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
    icon: "BarChart3",
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
    icon: "Briefcase",
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
    label: "Shortlist & Calendar",
    icon: "ClipboardCheck",
    items: [
      {
        label: "Candidate",
        icon: "Users",
        href: "/applicants?status=Hiring Manager Associate",
        description: "Candidates in Hiring Manager Associate stage"
      },
      {
        label: "Calendar",
        icon: "Calendar",
        href: "/calendar",
        description: "Applicant evaluation portal"
      },
    ],
  },
  {
    label: "Employee",
    icon: "Users",
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
        href: "/users",
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
        href: "/evaluation-configuration",
        description: "Configure evaluation settings"
      },
    ],
  },
];

// Full config with actual icon components for client-side use
export const sidebarConfig: SidebarNavGroup[] = sidebarConfigData.map(group => ({
  ...group,
  icon: iconMap[group.icon as keyof typeof iconMap],
  items: group.items.map(item => ({
    ...item,
    icon: iconMap[item.icon as keyof typeof iconMap]
  }))
})); 
