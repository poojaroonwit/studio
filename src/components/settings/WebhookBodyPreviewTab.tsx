import { Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ExpandablePayload } from '@/components/ui/ExpandablePayload';
import type { WebhookBodyCustomizationController } from './use-webhook-body-customization';

interface WebhookBodyPreviewTabProps {
  controller: WebhookBodyCustomizationController;
}

export function WebhookBodyPreviewTab({ controller }: WebhookBodyPreviewTabProps) {
  const {
    generatePreview,
    previewData,
    showPreview,
  } = controller;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Payload Preview</CardTitle>
        <CardDescription>
          Preview how the webhook payload will look with sample data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showPreview && previewData ? (
          <div className="space-y-4">
            <ExpandablePayload
              data={previewData}
              title="Payload Preview"
              maxHeight="max-h-80"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generatePreview}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Preview" to generate a sample payload</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
