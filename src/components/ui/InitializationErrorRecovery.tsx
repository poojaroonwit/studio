'use client';

import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CacheClearHelper } from '@/lib/cache-clear-helper';
import { initializationChecker } from '@/lib/initialization-checker';

interface InitializationErrorRecoveryProps {
  error?: Error;
  onRetry?: () => void;
  onRefresh?: () => void;
}

export function InitializationErrorRecovery({ 
  error, 
  onRetry, 
  onRefresh 
}: InitializationErrorRecoveryProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const isInitializationError = error ? CacheClearHelper.isInitializationError(error) : false;
  const isTgError = error?.message.includes('tg') && 
                   (error?.message.includes('Cannot access') || 
                    error?.message.includes('before initialization'));
  const isEeError = error?.message.includes('ee') && 
                   (error?.message.includes('Cannot access') || 
                    error?.message.includes('before initialization'));
  
  // Run initialization checks to provide more specific recommendations
  const checkResult = initializationChecker.runChecks();
  const isEnvironmentSafe = initializationChecker.isEnvironmentSafe();

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Default retry behavior
        window.location.reload();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  const handleClearCache = async () => {
    try {
      await CacheClearHelper.clearAndReload();
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Fallback to simple reload
      window.location.reload();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <CardTitle className="text-lg">
          {isInitializationError ? 'JavaScript Bundle Error' : 'Initialization Error'}
        </CardTitle>
        <CardDescription>
          {isInitializationError 
            ? CacheClearHelper.getErrorMessage(error!)
            : 'An unexpected error occurred during initialization.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            {isInitializationError 
              ? 'This error typically occurs when JavaScript variables are accessed before they are properly initialized. This is common with minified code bundles.'
              : 'Please try the following solutions:'
            }
          </p>
          {isInitializationError && (
            <ul className="list-disc list-inside space-y-1 text-xs">
              {CacheClearHelper.getRecommendedActions().map((action, index) => (
                <li key={index}>{action}</li>
              ))}
              {!isEnvironmentSafe && (
                <li className="text-orange-600 font-medium">Your browser or connection may be causing issues</li>
              )}
              {checkResult.issues.length > 0 && (
                <li className="text-red-600 font-medium">System detected potential issues: {checkResult.issues.join(', ')}</li>
              )}
            </ul>
          )}
        </div>
        
        <div className="flex flex-col space-y-2">
          <Button 
            onClick={handleRetry} 
            disabled={isRetrying}
            className="w-full"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleRefresh}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Page
          </Button>
          
          <Button 
            onClick={handleClearCache}
            variant="outline"
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Cache & Reload
          </Button>
        </div>
        
        {error && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Technical Details
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

export default InitializationErrorRecovery;
