"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Target,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BasicInfoForm } from './forms/BasicInfoForm';
import { ConditionsForm } from './forms/ConditionsForm';

interface WarningConfiguration {
  id: string;
  name: string;
  description?: string;
  entityType?: string;
  field?: string;
  condition?: string;
  operator?: string;
  value?: string;
  threshold?: number;
  severity: string;
  isActive: boolean;
  isPublic?: boolean;
  conditionGroups?: any[];
  groupsLogicalOperator?: 'AND' | 'OR';
}

interface SimplifiedWarningConfigurationEditDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  configuration: WarningConfiguration | null;
  userId: string;
}

export function SimplifiedWarningConfigurationEditDrawer({
  isOpen,
  onOpenChange,
  configuration,
  userId
}: SimplifiedWarningConfigurationEditDrawerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'basic' | 'conditions'>('basic');
  const [formData, setFormData] = useState<WarningConfiguration>({
    id: '',
    name: '',
    description: '',
    entityType: 'candidate',
    field: '',
    condition: 'is_empty',
    severity: 'warning',
    isActive: true,
    isPublic: false,
    conditionGroups: []
  });
  const [conditions, setConditions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when configuration changes
  useEffect(() => {
    if (configuration) {
      setFormData({
        ...configuration,
        entityType: configuration.entityType || 'candidate'
      });
      // Convert complex conditions to simple format if needed
      if (configuration.conditionGroups) {
        setConditions(configuration.conditionGroups.flatMap((group: any) => group.conditions || []));
      }
    } else {
      // Reset form for new configuration
      setFormData({
        id: '',
        name: '',
        description: '',
        entityType: 'candidate',
        field: '',
        condition: 'is_empty',
        severity: 'warning',
        isActive: true,
        isPublic: false,
        conditionGroups: []
      });
      setConditions([]);
    }
  }, [configuration]);

  const handleSave = async () => {
    if (!formData.name || !formData.entityType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Convert simple conditions back to complex format for API compatibility
      const conditionGroups = conditions.length > 0 ? [{
        logicalOperator: 'AND',
        conditions: conditions
      }] : [];

      const dataToSave = {
        ...formData,
        conditionGroups,
        createdBy: userId
      };

      // TODO: Implement actual save logic
      
      
      toast({
        title: "Success",
        description: "Warning configuration saved successfully.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save warning configuration.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-4xl overflow-y-auto" sheetId="simplified-warning-configuration-edit-drawer">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            {configuration ? (
              <>
                <Settings className="h-5 w-5" />
                Edit Warning Configuration
              </>
            ) : (
              <>
                <Target className="h-5 w-5" />
                New Warning Configuration
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'basic' | 'conditions')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Basic Information
              </TabsTrigger>
              <TabsTrigger value="conditions" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Conditions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-6">
              <BasicInfoForm 
                formData={formData} 
                setFormData={setFormData} 
              />
            </TabsContent>

            <TabsContent value="conditions" className="mt-6">
              <ConditionsForm
                entityType={formData.entityType || 'candidate'}
                conditions={conditions}
                onConditionsChange={setConditions}
              />
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
