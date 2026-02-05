"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTodo, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import ApplicantImportUploadQueue from '@/components/applicants/ApplicantImportUploadQueue';
import ProcessQueueAnalytics from '@/components/applicants/ProcessQueueAnalytics';
import BulkUploadCVsModal from '@/components/BulkUploadCVsModal';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function ProcessQueuePage() {
  const [activeTab, setActiveTab] = React.useState<'queue' | 'analytics'>('queue');
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Content Area with Custom Tabs */}
      <div className="flex-1 p-4 md:p-6 pt-2 overflow-y-auto">
        <div className="w-full">
          <div className="flex w-full border-b border-border/50 overflow-x-auto">
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
              onClick={() => setActiveTab('analytics')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'analytics'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </div>
            
            {/* Upload CV Button - only show on queue tab */}
            {activeTab === 'queue' && (
              <div className="ml-auto flex items-center p-4">
                <Button
                  onClick={() => setIsBulkUploadModalOpen(true)}
                  className="h-8 px-3 text-sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CVs
                </Button>
              </div>
            )}
          </div>
          
          <div className="mt-3 md:mt-4">
            {activeTab === 'queue' && <ApplicantImportUploadQueue />}
            {activeTab === 'analytics' && (
              <ErrorBoundary>
                <ProcessQueueAnalytics />
              </ErrorBoundary>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Upload CVs Modal */}
      <BulkUploadCVsModal
        isOpen={isBulkUploadModalOpen}
        onOpenChange={setIsBulkUploadModalOpen}
        onUploadSuccess={() => {
          // Refresh the queue data after successful upload
          // The ApplicantImportUploadQueue component will handle the refresh
        }}
      />
    </div>
  );
}
