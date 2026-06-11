import { Loader2, Lock } from "lucide-react";

interface SystemPreferencesLoadingStateProps {
  message: string;
}

interface SystemPreferencesAccessStateProps {
  title: string;
  description: string;
}

export function SystemPreferencesLoadingState({ message }: SystemPreferencesLoadingStateProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">{message}</span>
    </div>
  );
}

export function SystemPreferencesAccessState({
  title,
  description,
}: SystemPreferencesAccessStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-muted/50 p-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-muted-foreground">{description}</p>
    </div>
  );
}

