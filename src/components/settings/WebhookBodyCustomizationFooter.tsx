import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import type { WebhookBodyCustomizationController } from './use-webhook-body-customization';

interface WebhookBodyCustomizationFooterProps {
  controller: WebhookBodyCustomizationController;
}

export function WebhookBodyCustomizationFooter({
  controller,
}: WebhookBodyCustomizationFooterProps) {
  const {
    handleSave,
    loading,
    setIsOpen,
  } = controller;

  return (
    <DialogFooter className="px-6 py-4 border-t">
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={loading}>
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save Configuration
      </Button>
    </DialogFooter>
  );
}
