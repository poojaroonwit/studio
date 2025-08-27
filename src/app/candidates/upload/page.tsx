"use client";

import React, { useState } from "react";
import { BarChart3, ListTodo } from "lucide-react";
import { CandidateQueueProvider } from "@/components/candidates/CandidateImportUploadQueue";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from 'next/navigation';
import { CandidateImportUploadQueue } from '@/components/candidates/CandidateImportUploadQueue';
import { UploadQueueStatistics } from '@/components/UploadQueueStatistics';



function UploadPageContent() {
  const [activeTab, setActiveTab] = useState('queue');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial pagination state from URL
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  // Update URL when pagination changes
  const updateURL = (page: number, pageSize: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (pageSize !== 20) params.set('pageSize', pageSize.toString());
    
    const newURL = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/candidates/upload${newURL}`, { scroll: false });
  };



  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Process Queue</h1>
          <p className="text-muted-foreground">Monitor and manage the upload queue and view analytics</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Tab Navigation */}
          <div className="flex w-full border-b border-border/50 mb-6">
            <div
              onClick={() => setActiveTab('queue')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'queue'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <ListTodo className="h-4 w-4" />
              Queue Management
            </div>
            <div
              onClick={() => setActiveTab('statistics')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'statistics'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'queue' && (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  <div>
                    <div className="mb-4">
                      <h2 className="flex items-center gap-2 text-xl font-semibold">
                        <ListTodo className="h-5 w-5 text-primary" />
                        Queue Management
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Monitor and manage the upload queue items
                      </p>
                    </div>
                    <CandidateImportUploadQueue 
                      initialPage={initialPage}
                      initialPageSize={initialPageSize}
                      onPaginationChange={updateURL}
                    />
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'statistics' && (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  <div>
                    <div className="mb-4">
                      <h2 className="flex items-center gap-2 text-xl font-semibold">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Upload Queue Analytics
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Real-time analytics and insights for the upload queue
                      </p>
                    </div>
                    <UploadQueueStatistics />
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MultiCandidateUploadPage() {
  return (
    <CandidateQueueProvider>
      <UploadPageContent />
    </CandidateQueueProvider>
  );
} 