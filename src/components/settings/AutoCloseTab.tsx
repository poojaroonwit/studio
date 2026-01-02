"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Info, Loader2, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AutoCloseResult {
  positionId: string;
  positionTitle: string;
  success: boolean;
  message: string;
  action: 'closed' | 'none' | 'error';
  headcountStatus?: {
    totalHeadcounts: number;
    filledHeadcounts: number;
    vacantHeadcounts: number;
  };
}

interface AutoCloseSummary {
  totalProcessed: number;
  closedCount: number;
  errorCount: number;
  noActionCount: number;
}

export default function AutoCloseTab() {
  const { data: session } = useSession();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AutoCloseResult[]>([]);
  const [summary, setSummary] = useState<AutoCloseSummary | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const handleRunAutoClose = async () => {
    if (!session?.user) {
      toast.error('You must be logged in to perform this action');
      return;
    }

    setIsRunning(true);
    setResults([]);
    setSummary(null);

    try {
      // console.log('Starting manual auto-close check...');
      const response = await fetch('/api/positions/auto-close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Auto-close API error:', errorData);
        throw new Error(errorData.error || `Failed to run auto-close check: ${response.status}`);
      }

      const data = await response.json();
      // console.log('Auto-close API response:', data);
      
      setResults(data.results || []);
      setSummary(data.summary || null);
      setLastRun(new Date());
      
      const closedCount = data.summary?.closedCount || 0;
      const totalProcessed = data.summary?.totalProcessed || 0;
      
      if (closedCount > 0) {
        toast.success(`Auto-close completed! Processed ${totalProcessed} positions, closed ${closedCount} positions.`);
      } else {
        toast.success(`Auto-close completed! Processed ${totalProcessed} positions. No positions needed to be closed.`);
      }
    } catch (error) {
      console.error('Error running auto-close:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to run auto-close check');
    } finally {
      setIsRunning(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'closed':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Closed</Badge>;
      case 'none':
        return <Badge variant="secondary">No Action</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  if (session?.user?.role !== 'Admin' && !(session?.user?.modulePermissions || []).includes('POSITIONS_EDIT_DETAILED')) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need administrator permissions or POSITIONS_EDIT_DETAILED permission to access this feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={['info', 'manual', 'summary', 'results']} className="w-full">
      {/* Info Card */}
      <AccordionItem value="info" className="border-b">
        <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-semibold">How it works</div>
              <div className="text-xs text-muted-foreground font-normal">
                This feature automatically closes positions when all associated headcounts are filled.
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-4 pt-2">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Automatic Detection</h4>
                  <p className="text-xs text-muted-foreground">
                    System checks all open positions for filled headcounts
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Smart Closure</h4>
                  <p className="text-xs text-muted-foreground">
                    Only closes positions where ALL headcounts are filled
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Audit Trail</h4>
                  <p className="text-xs text-muted-foreground">
                    All auto-closures are logged with full audit trail
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Manual Trigger */}
      <AccordionItem value="manual" className="border-b">
        <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-semibold">Manual Auto-Close Check</div>
              <div className="text-xs text-muted-foreground font-normal">
                Run a manual check to close all positions that have all headcounts filled.
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-4 pt-2">
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleRunAutoClose} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Run Auto-Close Check
                </>
              )}
            </Button>
            {lastRun && (
              <span className="text-sm text-muted-foreground">
                Last run: {lastRun.toLocaleString()}
              </span>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Results Summary */}
      {summary && (
        <AccordionItem value="summary" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Results Summary</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4 pt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.totalProcessed}</div>
                <div className="text-sm text-muted-foreground">Total Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.closedCount}</div>
                <div className="text-sm text-muted-foreground">Positions Closed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{summary.noActionCount}</div>
                <div className="text-sm text-muted-foreground">No Action Needed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.errorCount}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Detailed Results */}
      {results.length > 0 && (
        <AccordionItem value="results" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Detailed Results</div>
                <div className="text-xs text-muted-foreground font-normal">Detailed breakdown of each position processed</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4 pt-2">
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(result.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm">{result.positionTitle}</h4>
                      {getActionBadge(result.action)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                    {result.headcountStatus && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Total: {result.headcountStatus.totalHeadcounts}</span>
                        <span>Filled: {result.headcountStatus.filledHeadcounts}</span>
                        <span>Vacant: {result.headcountStatus.vacantHeadcounts}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
