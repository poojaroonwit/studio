"use client";

interface ApplicantsPageLoadingStateProps {
  message: string;
}

export function ApplicantsPageLoadingState({ message }: ApplicantsPageLoadingStateProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex h-full flex-col bg-background"
      role="status"
    >
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
          />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}
