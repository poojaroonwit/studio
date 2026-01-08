'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AutoWarningClear() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { showWithDescription, errorWithDescription } = useToast();

  const handleAutoClear = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/warnings/auto-clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setLastResult(data);
        showWithDescription('Success', `Cleared ${data.warningsResolved} resolved warnings`);
      } else {
        errorWithDescription('Error', data.error || 'Failed to clear warnings');
      }
    } catch (error) {
      console.error('Error clearing warnings:', error);
      errorWithDescription('Error', 'Failed to clear warnings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Auto Warning Clear
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Automatically clear warnings that have been resolved. This will check all active warnings and remove those where conditions are no longer valid.
        </p>
        
        <Button 
          onClick={handleAutoClear} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Clear Resolved Warnings
            </>
          )}
        </Button>

        {lastResult && (
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Total checked:</span>
              <span className="font-medium">{lastResult.totalWarnings}</span>
            </div>
            <div className="flex justify-between">
              <span>Resolved:</span>
              <span className="font-medium text-green-600">{lastResult.warningsResolved}</span>
            </div>
            {lastResult.errorsEncountered > 0 && (
              <div className="flex justify-between">
                <span>Errors:</span>
                <span className="font-medium text-red-600">{lastResult.errorsEncountered}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
