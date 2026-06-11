import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function HeadcountModalActions({
  isEdit,
  loading,
  onCancel,
}: {
  isEdit: boolean;
  loading: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-3 pt-4">
      <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
        Cancel
      </Button>
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEdit ? 'Update Headcount' : 'Create Headcount'}
      </Button>
    </div>
  );
}
