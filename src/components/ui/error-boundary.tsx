"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Bug } from 'lucide-react';

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

    // Log the error to console for debugging
    console.error('Production error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
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

      const isFilterError = this.state.error?.message?.includes('filter is not a function');
      const isChartError = this.state.error?.message?.includes('Filler plugin');
      const isMimeError = this.state.error?.message?.includes('MIME type');

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="mt-2">
                {isFilterError && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-700">
                      A data filtering error occurred. This is usually caused by unexpected data format.
                    </p>
                    <p className="text-xs text-red-600">
                      Error: {this.state.error?.message}
                    </p>
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
                {!isFilterError && !isChartError && !isMimeError && (
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
              <Button 
                onClick={this.handleRetry} 
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
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
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
} 