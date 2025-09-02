"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Bug } from 'lucide-react';
import { globalErrorHandler, isFilterError } from '@/lib/error-handler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  timestamp: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    timestamp: Date.now(),
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      timestamp: Date.now(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('ErrorBoundary error info:', errorInfo);

    // Enhanced error logging with more context
    const errorContext = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      // Add additional context for filter errors
      filterErrorContext: this.getFilterErrorContext(error),
    };

    console.error('Production error:', errorContext);

    // Report to global error handler
    globalErrorHandler.handleError(error, 'error_boundary', {
      componentStack: errorInfo.componentStack,
      filterErrorContext: this.getFilterErrorContext(error),
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  private getFilterErrorContext(error: Error): any {
    if (!isFilterError(error)) {
      return null;
    }

    // Try to extract more context from the error
    const context: any = {
      errorType: 'filter_error',
      message: error.message,
    };

    // Try to get the component name from the stack trace
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      const componentLine = stackLines.find(line => 
        line.includes('CandidateKanbanView') || 
        line.includes('CandidateTable') || 
        line.includes('DashboardPageClient') ||
        line.includes('CandidatesPageClient')
      );
      if (componentLine) {
        context.component = componentLine.trim();
      }
    }

    // Try to get the function name that caused the error
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      const functionLine = stackLines.find(line => 
        line.includes('filter') && 
        (line.includes('useMemo') || line.includes('useEffect') || line.includes('render'))
      );
      if (functionLine) {
        context.function = functionLine.trim();
      }
    }

    return context;
  }

  private getFilterErrorDetails(): React.ReactNode {
    if (!this.state.error?.stack) {
      return null;
    }

    const stackLines = this.state.error.stack.split('\n');
    const relevantLines = stackLines
      .filter(line => 
        line.includes('CandidateKanbanView') || 
        line.includes('CandidateTable') || 
        line.includes('DashboardPageClient') ||
        line.includes('CandidatesPageClient') ||
        line.includes('useMemo') ||
        line.includes('useEffect') ||
        line.includes('filter')
      )
      .slice(0, 5); // Show first 5 relevant lines

    if (relevantLines.length === 0) {
      return null;
    }

    return (
      <details className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
        <summary className="cursor-pointer font-medium text-red-700">
          Error Details (Click to expand)
        </summary>
        <div className="mt-2 space-y-1">
          <p className="text-red-600 font-medium">Stack Trace (Relevant Lines):</p>
          {relevantLines.map((line, index) => (
            <pre key={index} className="text-red-500 font-mono text-xs whitespace-pre-wrap">
              {line.trim()}
            </pre>
          ))}
          <p className="text-red-600 mt-2">
            <strong>Root Cause:</strong> The error occurs when trying to call .filter() on a value that is not an array. 
            This typically happens when API data is null, undefined, or has an unexpected structure.
          </p>
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-700 text-xs font-medium mb-1">Suggested Fixes:</p>
            <ul className="text-yellow-600 text-xs space-y-1">
              <li>• Use the safe filter utility: <code className="bg-yellow-100 px-1 rounded">reactSafeArray.filter()</code></li>
              <li>• Add defensive checks: <code className="bg-yellow-100 px-1 rounded">Array.isArray(data) ? data.filter(...) : []</code></li>
              <li>• Use the useSafeFilter hook for React components</li>
              <li>• Check API response structure and ensure data is properly initialized</li>
            </ul>
          </div>
        </div>
      </details>
    );
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      timestamp: Date.now(),
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isFilterErrorType = this.state.error ? isFilterError(this.state.error) : false;
      const isChartError = this.state.error?.message?.includes('Filler plugin');
      const isMimeError = this.state.error?.message?.includes('MIME type');

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="mt-2">
                {isFilterErrorType && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-700">
                      A data filtering error occurred. This is usually caused by unexpected data format.
                    </p>
                    <p className="text-xs text-red-600">
                      Error: {this.state.error?.message}
                    </p>
                    {this.getFilterErrorDetails()}
                  </div>
                )}
                {isChartError && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-700">
                      A chart rendering error occurred. The chart library may need to be reinitialized.
                    </p>
                    <p className="text-xs text-red-600">
                      Error: {this.state.error?.message}
                    </p>
                  </div>
                )}
                {isMimeError && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-700">
                      A resource loading error occurred. This may be due to browser caching issues.
                    </p>
                    <p className="text-xs text-red-600">
                      Error: {this.state.error?.message}
                    </p>
                  </div>
                )}
                {!isFilterErrorType && !isChartError && !isMimeError && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-700">
                      An unexpected error occurred. Please try refreshing the page.
                    </p>
                    <p className="text-xs text-red-600">
                      Error: {this.state.error?.message}
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-2">
              {null}
              
              <Button 
                onClick={this.handleReload} 
                className="w-full"
                variant="default"
              >
                <Bug className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
                <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
                <pre className="mt-2 whitespace-pre-wrap text-gray-700">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    if (process.env.NODE_ENV === 'production') {
      // Log to monitoring service
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
} 