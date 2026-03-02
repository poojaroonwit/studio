"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { sidebarConfigData, iconMap } from '@/components/layout/SidebarNavConfig';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Briefcase } from 'lucide-react';

export default function HiringPage() {
  const router = useRouter();
  const hiringGroup = sidebarConfigData.find(g => g.label === 'Hiring');

  if (!hiringGroup) return null;

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Briefcase className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hiring</h1>
          <p className="text-muted-foreground">
            Manage your hiring workflows, applicants, and positions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {hiringGroup.items.map((item) => {
          const IconComponent = iconMap[item.icon as keyof typeof iconMap];
          return (
            <Card 
              key={item.href} 
              className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-card/50 hover:bg-card h-48 flex flex-col"
              onClick={() => router.push(item.href)}
            >
              <CardHeader className="pb-3 flex-1">
                <div className="flex items-start justify-between h-full">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors shrink-0">
                      {IconComponent && <IconComponent className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <CardTitle className="text-base font-medium mb-2">{item.label}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed line-clamp-3 flex-1">
                        {item.description}
                      </CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
