"use client";

import { DocumentTextIcon as FileText } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProcessQueueAnalyticsData } from './process-queue-analytics-utils';

interface ProcessQueueFileAnalysisTabProps {
  fileSizeRanges: ProcessQueueAnalyticsData['stats']['fileSizeRanges'];
}

export function ProcessQueueFileAnalysisTab({ fileSizeRanges }: ProcessQueueFileAnalysisTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>File Size Analysis</CardTitle>
        <CardDescription>Performance metrics by file size range</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fileSizeRanges.map((item) => (
            <div key={item.range} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{item.range}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.count} files
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{item.avgDuration.toFixed(1)}m avg</p>
                <p className="text-sm text-muted-foreground">duration</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
