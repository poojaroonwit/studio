import { Button } from '@/components/ui/button';
import { Briefcase, Edit, Loader2, Save, XCircle } from 'lucide-react';

export interface DetailsTabHeaderProps {
  isEditMode: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onEdit: () => void;
}

export function DetailsTabHeader({
  isEditMode,
  isSaving,
  onCancel,
  onEdit,
}: DetailsTabHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-primary" />
          Position Details
        </h2>
        <p className="mt-2 text-muted-foreground">
          {isEditMode ? 'Edit position information' : 'View position details'}
        </p>
      </div>
      {!isEditMode ? (
        <Button variant="outline" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
