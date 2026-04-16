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
  ClipboardDocumentCheckIcon as ClipboardCheck,
  PaintBrushIcon as Palette,
  CpuChipIcon as BrainCircuit,
  ShareIcon as Webhook,
  CodeBracketIcon as Code2,
  ListBulletIcon as ListOrdered
} from "@heroicons/react/24/outline";

export interface SidebarNavItem {
  label: string;
  icon: any;
  href: string;
  adminOnly?: boolean;
  badge?: string;
  description?: string;
  section?: string;
  permissionId?: string;
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
  ClipboardCheck,
  Palette,
  BrainCircuit,
  Webhook,
  Code2,
  ListOrdered
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
        description: "Overview and analytics",
        permissionId: "DASHBOARD_VIEW"
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
        description: "Personal task management",
        permissionId: "TASK_BOARD_VIEW"
      },
      {
        label: "Applicants",
        icon: "Users",
        href: "/applicants",
        description: "Manage Applicant profiles",
        permissionId: "applicantS_VIEW"
      },
      {
        label: "Positions",
        icon: "Briefcase",
        href: "/positions",
        description: "Job positions and openings",
        permissionId: "POSITIONS_VIEW"
      },
      {
        label: "Process Queue",
        icon: "UploadCloud",
        href: "/process-queue",
        description: "Review and manage uploaded files",
        permissionId: "UPLOAD_QUEUE_VIEW"
      },
    ],
  },
  {
    label: "Shortlist & Interview Calendar",
    icon: "ClipboardCheck",
    items: [
      {
        label: "Candidates",
        icon: "Users",
        href: "/candidates",
        description: "Focus view for hiring managers and interviewers",
        permissionId: "applicantS_VIEW"
      },
      {
        label: "Interview Calendar",
        icon: "Calendar",
        href: "/calendar",
        description: "Applicant evaluation portal",
        permissionId: "EVALUATION_LINKS_VIEW"
      },
    ],
  },
  {
    label: "Settings",
    icon: "Settings",
    items: [
      {
        label: "System Settings",
        icon: "Database",
        href: "/settings/system-settings",
        description: "System-wide configuration and integrations",
        section: "Platform",
        permissionId: "SYSTEM_SETTINGS_VIEW"
      },
      {
        label: "Branding & Theme",
        icon: "Palette",
        href: "/settings/system-preferences",
        description: "Global branding, theme, and logo settings",
        section: "Platform",
        permissionId: "SYSTEM_SETTINGS_VIEW"
      },
      {
        label: "Prompts & Categories",
        icon: "BrainCircuit",
        href: "/settings/system-prompts",
        description: "Manage AI system prompts and categories",
        section: "Configuration",
        permissionId: "SYSTEM_SETTINGS_VIEW"
      },
      {
        label: "Data Configuration",
        icon: "Database",
        href: "/settings/data-configuration",
        description: "Manage stages, sources, and positions",
        section: "Configuration",
        permissionId: "RECRUITMENT_STAGES_VIEW"
      },
      {
        label: "User Management",
        icon: "Users",
        href: "/settings/users",
        description: "Manage users and roles",
        section: "Workspace",
        permissionId: "USERS_VIEW"
      },
      {
        label: "Webhook Management",
        icon: "Webhook",
        href: "/settings/webhooks",
        description: "Create and manage outgoing webhooks",
        section: "Workspace",
        permissionId: "WEBHOOKS_VIEW"
      },
      {
        label: "API Documentation",
        icon: "Code2",
        href: "/settings/api-docs",
        description: "Developer API reference",
        section: "Developer"
      },
      {
        label: "Application Logs",
        icon: "ListOrdered",
        href: "/settings/logs",
        description: "View system and audit logs",
        section: "Developer",
        permissionId: "LOGS_VIEW"
      },
      {
        label: "Meeting Room",
        icon: "Calendar",
        href: "/settings/rooms",
        description: "Manage integrated meeting rooms",
        section: "Workspace",
        permissionId: "SYSTEM_SETTINGS_VIEW"
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
