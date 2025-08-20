"use client";

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, X, Clock, AlertCircle, Info } from 'lucide-react';
import { useWarnings } from '@/contexts/WarningContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface WarningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WarningDrawer({ isOpen, onClose }: WarningDrawerProps) {
  const { warnings, isLoading } = useWarnings();

  // Since warnings are now automatic, we only show active warnings
  const activeWarnings = warnings;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20';
      case 'warning':
        return 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20';
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20';
      default:
        return 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full max-w-md p-0 flex flex-col [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <SheetHeader className="!flex !flex-row !items-center !justify-between border-b px-6 py-4 bg-card !text-left !space-y-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <SheetTitle className="text-lg font-semibold text-foreground">Warnings</SheetTitle>
            {activeWarnings.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {activeWarnings.length} active
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1 bg-background">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeWarnings.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No active warnings</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Warnings appear automatically when conditions are not met
                    </p>
                  </div>
                ) : (
                  activeWarnings.map((warning) => (
                    <div
                      key={warning.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all duration-200",
                        getSeverityColor(warning.severity)
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(warning.severity)}
                          <span className="text-sm font-medium text-foreground">
                            {warning.configuration.name}
                          </span>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                          >
                            {warning.entityType}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-foreground mb-2">
                        {warning.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Field: {warning.field}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(warning.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

