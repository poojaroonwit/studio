import { AlertTriangle, RefreshCw, Trash2, Wifi } from "lucide-react";

import { Button } from "./button";

const INITIALIZATION_ERROR_TOKENS = [
  "tg",
  "activeApplicantTab",
  "ee",
  "tt",
  "nn",
];

export function isTgInitializationError(error: Error) {
  return (
    error.message.includes("Cannot access") &&
    error.message.includes("before initialization") &&
    INITIALIZATION_ERROR_TOKENS.some((token) => error.message.includes(token))
  );
}

interface TgInitializationErrorFallbackProps {
  error: Error;
  maxRetries: number;
  retryCount: number;
  onClearCache: () => void;
  onHardRefresh: () => void;
  onRefresh: () => void;
  onRetry: () => void;
}

export function TgInitializationErrorFallback({
  error,
  maxRetries,
  retryCount,
  onClearCache,
  onHardRefresh,
  onRefresh,
  onRetry,
}: TgInitializationErrorFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>

        <h1 className="mb-2 text-center text-xl font-semibold text-gray-900">
          Initialization Error
        </h1>

        <p className="mb-6 text-center text-gray-600">
          A JavaScript initialization error has occurred. This is usually caused by cached files or browser compatibility issues.
        </p>

        <div className="space-y-3">
          {retryCount < maxRetries && (
            <Button
              onClick={onRetry}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again ({maxRetries - retryCount} attempts left)
            </Button>
          )}

          <Button
            onClick={onRefresh}
            className="w-full"
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Page
          </Button>

          <Button
            onClick={onClearCache}
            className="w-full"
            variant="outline"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Cache & Reload
          </Button>

          <Button
            onClick={onHardRefresh}
            className="w-full"
            variant="outline"
          >
            <Wifi className="mr-2 h-4 w-4" />
            Hard Refresh (Bypass Cache)
          </Button>
        </div>

        <div className="mt-6 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-900">Error Details:</h3>
          <p className="break-all font-mono text-xs text-gray-600">
            {error.message}
          </p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            If this problem persists, try using a different browser or incognito mode.
          </p>
        </div>
      </div>
    </div>
  );
}
