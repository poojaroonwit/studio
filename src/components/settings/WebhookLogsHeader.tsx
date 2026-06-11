import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface WebhookLogsHeaderProps {
  webhookName: string;
  loading: boolean;
  onRefresh: () => void;
}

export function WebhookLogsHeader({
  webhookName,
  loading,
  onRefresh,
}: WebhookLogsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold">Delivery Logs</h3>
        <p className="text-sm text-muted-foreground">
          View webhook delivery history for {webhookName}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

