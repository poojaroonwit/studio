"use client";

import type { ErrorInfo } from 'react';
import { AlertTriangle, Bug } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  getErrorFallbackFlags,
  getRelevantFilterErrorStackLines,
} from './error-boundary-utils';
import { isServiceUnavailableError } from '@/lib/service-unavailable-utils';
import { ServiceUnavailableState } from '@/components/ui/ServiceUnavailableState';

interface ErrorBoundaryFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  onReload: () => void;
}

export function ErrorBoundaryFallback({
  error,
  errorInfo,
  onReload,
}: ErrorBoundaryFallbackProps) {
  if (isServiceUnavailableError(error)) {
    return <ServiceUnavailableState onRetry={onReload} />;
  }

  const flags = getErrorFallbackFlags(error);

  return (
    <div className="min-flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-4">
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="mt-2">
            <ErrorMessageBody error={error} flags={flags} />
          </AlertDescription>
        </Alert>

        <div className="flex flex-col space-y-2">
          <Button onClick={onReload} className="w-full" variant="default">
            <Bug className="h-4 w-4 mr-2" />
            Reload Page
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && errorInfo && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <p className="font-medium mb-2">Error Details (Development)</p>
            <pre className="whitespace-pre-wrap text-gray-700">
              {errorInfo.componentStack}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorMessageBody({
  error,
  flags,
}: Pick<ErrorBoundaryFallbackProps, 'error'> & {
  flags: ReturnType<typeof getErrorFallbackFlags>;
}) {
  if (flags.isFilterErrorType) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-700">
          A data filtering error occurred. This is usually caused by unexpected data format.
        </p>
        <p className="text-xs text-red-600">
          Error: {error?.message}
        </p>
        <FilterErrorDetails error={error} />
      </div>
    );
  }

  if (flags.isChartError) {
    return <FallbackMessage description="A chart rendering error occurred. The chart library may need to be reinitialized." error={error} />;
  }

  if (flags.isMimeError) {
    return <FallbackMessage description="A resource loading error occurred. This may be due to browser caching issues." error={error} />;
  }

  if (flags.isDateError) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-700">
          A date processing error occurred. This is usually caused by invalid date objects.
        </p>
        <p className="text-xs text-red-600">
          Error: {error?.message}
        </p>
        <p className="text-xs text-blue-600">
          This error has been automatically handled. The page should work normally now.
        </p>
      </div>
    );
  }

  if (flags.isChunkError) {
    return <FallbackMessage description="The app loaded an outdated page asset. We are clearing cached files and refreshing." error={error} />;
  }

  return <FallbackMessage description="An unexpected error occurred. Please try refreshing the page." error={error} />;
}

function FallbackMessage({
  description,
  error,
}: {
  description: string;
  error?: Error;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-red-700">{description}</p>
      <p className="text-xs text-red-600">
        Error: {error?.message}
      </p>
    </div>
  );
}

function FilterErrorDetails({ error }: { error?: Error }) {
  const relevantLines = getRelevantFilterErrorStackLines(error);

  if (relevantLines.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
      <p className="font-medium text-red-700 mb-2">Error Details</p>
      <div className="space-y-1">
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
            <li>Use the safe filter utility: <code className="bg-yellow-100 px-1 rounded">reactSafeArray.filter()</code></li>
            <li>Add defensive checks: <code className="bg-yellow-100 px-1 rounded">Array.isArray(data) ? data.filter(...) : []</code></li>
            <li>Use the useSafeFilter hook for React components</li>
            <li>Check API response structure and ensure data is properly initialized</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
