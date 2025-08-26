// Sidebar configuration data for API routes (no React components)
export interface SidebarNavItemData {
  label: string;
  icon: string;
  href: string;
  adminOnly?: boolean;
  badge?: string;
  description?: string;
}

export interface SidebarNavGroupData {
  label: string;
  items: SidebarNavItemData[];
}

// Config with icon names instead of components for API serialization
export const sidebarConfigData: SidebarNavGroupData[] = [
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
        label: "Candidates", 
        icon: "Users", 
        href: "/candidates",
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
        href: "/candidates/upload",
        description: "Import candidates in bulk"
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
        label: "Task Board", 
        icon: "Kanban", 
        href: "/task-board",
        description: "General task management with drag & drop"
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
