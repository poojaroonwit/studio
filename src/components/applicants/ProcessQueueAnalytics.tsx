"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowPathIcon as Loader2, ExclamationTriangleIcon as AlertTriangle, CircleStackIcon as Database, XMarkIcon as X } from '@heroicons/react/24/outline';
import { useChartSetup } from '@/hooks/use-chart-setup';
import { ProcessQueueAnalyticsFilters } from './ProcessQueueAnalyticsFilters';
import { ProcessQueueErrorAnalysisTab } from './ProcessQueueErrorAnalysisTab';
import { ProcessQueueDurationTab } from './ProcessQueueDurationTab';
import { ProcessQueueFileAnalysisTab } from './ProcessQueueFileAnalysisTab';
import { ProcessQueueJobDetailsDialog } from './ProcessQueueJobDetailsDialog';
import { ProcessQueueOverviewCards } from './ProcessQueueOverviewCards';
import { ProcessQueueScatterTab } from './ProcessQueueScatterTab';
import { ProcessQueueSourceAnalyticsTab } from './ProcessQueueSourceAnalyticsTab';
import { useProcessQueueAnalytics } from './use-process-queue-analytics';

export default function ProcessQueueAnalytics() {
  const {
    data,
    loading,
    error,
    dateRange,
    statusFilter,
    selectedJob,
    isJobDetailsOpen,
    setDateRange,
    setStatusFilter,
    setIsJobDetailsOpen,
    setDatePreset,
    handlePointClick,
    handleExportErrors,
    handleViewErrorDetails,
    handleExportSingleError,
  } = useProcessQueueAnalytics();
  const { chartReady, isLoading: chartLoading, error: chartError } = useChartSetup();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertTriangle className="h-8 w-8 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
        <p className="text-muted-foreground">No queue data available for analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex items-center justify-between">
        {(statusFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
            }}
            className="text-gray-600 hover:text-gray-800 h-7 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear Status Filter
          </Button>
        )}
      </div>
      <ProcessQueueAnalyticsFilters
        dateRange={dateRange}
        statusFilter={statusFilter}
        onDateRangeChange={setDateRange}
        onStatusFilterChange={setStatusFilter}
        onDatePresetChange={setDatePreset}
      />

      <ProcessQueueOverviewCards stats={data!.stats} />

      {/* Charts and Detailed Stats */}
      <Tabs defaultValue="scatter" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="scatter">Process Time vs Duration</TabsTrigger>
          <TabsTrigger value="duration">Duration Analysis</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="files">File Analysis</TabsTrigger>
          <TabsTrigger value="sources">Source Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="scatter" className="mt-6">
          <ProcessQueueScatterTab
            data={data}
            chartLoading={chartLoading}
            chartError={chartError}
            chartReady={chartReady}
            onPointClick={handlePointClick}
          />
        </TabsContent>

        <TabsContent value="duration" className="mt-6">
          <ProcessQueueDurationTab
            data={data}
            chartLoading={chartLoading}
            chartError={chartError}
            chartReady={chartReady}
          />
        </TabsContent>

        <TabsContent value="errors" className="mt-6">
          <ProcessQueueErrorAnalysisTab
            errorsByReason={data!.stats.errorsByReason}
            totalJobs={data!.stats.totalJobs}
            onExportAll={handleExportErrors}
            onExportSingle={handleExportSingleError}
            onViewDetails={handleViewErrorDetails}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <ProcessQueueFileAnalysisTab fileSizeRanges={data.stats.fileSizeRanges} />
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
          <ProcessQueueSourceAnalyticsTab sources={data.stats.sourceAnalytics} />
        </TabsContent>
      </Tabs>

      <ProcessQueueJobDetailsDialog
        open={isJobDetailsOpen}
        onOpenChange={setIsJobDetailsOpen}
        job={selectedJob}
      />
    </div>
  );
}
