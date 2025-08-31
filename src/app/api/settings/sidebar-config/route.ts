import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
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
  ]);
} 