'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Trash2, Copy, Check, Eye, EyeOff, Code, Settings, TestTube, 
  Database, Palette, Layers, Zap, Save, X, AlertTriangle, Info, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ExpandablePayload } from '@/components/ui/ExpandablePayload';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FieldMapping {
  source_field: string;
  target_field: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'date' | 'number' | 'boolean';
  default_value?: any;
}

interface WebhookBodyConfig {
  event_type: string;
  body_template: string;
  field_mappings?: FieldMapping[];
  is_active: boolean;
}

interface WebhookBodyCustomizationProps {
  webhookId: string;
  webhookEvents: string[];
  initialConfig?: {
    body_template?: string;
    field_mappings?: FieldMapping[];
    include_metadata?: boolean;
    custom_payload?: boolean;
    body_configs?: WebhookBodyConfig[];
  };
  onSave: (config: any) => Promise<void>;
  onClose?: () => void;
}

const TRANSFORM_OPTIONS = [
  { value: 'uppercase', label: 'Uppercase', description: 'Convert to uppercase' },
  { value: 'lowercase', label: 'Lowercase', description: 'Convert to lowercase' },
  { value: 'trim', label: 'Trim', description: 'Remove whitespace' },
  { value: 'date', label: 'Date', description: 'Format as date' },
  { value: 'number', label: 'Number', description: 'Convert to number' },
  { value: 'boolean', label: 'Boolean', description: 'Convert to boolean' },
];

export default function WebhookBodyCustomization({
  webhookId,
  webhookEvents,
  initialConfig,
  onSave,
  onClose
}: WebhookBodyCustomizationProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [availableFields, setAvailableFields] = useState<Record<string, string[]>>({});
  const [samplePayloads, setSamplePayloads] = useState<Record<string, any>>({});
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Global settings
  const [customPayload, setCustomPayload] = useState(initialConfig?.custom_payload ?? false);
  const [includeMetadata, setIncludeMetadata] = useState(initialConfig?.include_metadata ?? true);
  const [globalBodyTemplate, setGlobalBodyTemplate] = useState(initialConfig?.body_template ?? '');
  const [globalFieldMappings, setGlobalFieldMappings] = useState<FieldMapping[]>(initialConfig?.field_mappings ?? []);
  
  // Event-specific configs
  const [bodyConfigs, setBodyConfigs] = useState<Record<string, WebhookBodyConfig>>(
    initialConfig?.body_configs?.reduce((acc, config) => {
      acc[config.event_type] = config;
      return acc;
    }, {} as Record<string, WebhookBodyConfig>) ?? {}
  );

  const { error: showError, success: showSuccess } = useToast();

  // Load available fields for all events
  useEffect(() => {
    const loadAvailableFields = async () => {
      try {
        const response = await fetch('/api/settings/webhooks/available-fields');
        if (response.ok) {
          const data = await response.json();
          setAvailableFields(data.fields || {});
          setSamplePayloads(data.samples || {});
        }
      } catch (error) {
        console.error('Error loading available fields:', error);
      }
    };

    loadAvailableFields();
  }, []);

  // Set first event as selected if none selected
  useEffect(() => {
    if (webhookEvents.length > 0 && !selectedEvent) {
      setSelectedEvent(webhookEvents[0]);
    }
  }, [webhookEvents, selectedEvent]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const config = {
        custom_payload: customPayload,
        include_metadata: includeMetadata,
        body_template: globalBodyTemplate,
        field_mappings: globalFieldMappings,
        body_configs: Object.values(bodyConfigs)
      };

      await onSave(config);
      showSuccess('Webhook body configuration saved successfully');
      setIsOpen(false);
    } catch (error) {
      showError('Failed to save webhook body configuration');
    } finally {
      setLoading(false);
    }
  };

  const addGlobalFieldMapping = () => {
    setGlobalFieldMappings(prev => [...prev, { source_field: '', target_field: '' }]);
  };

  const removeGlobalFieldMapping = (index: number) => {
    setGlobalFieldMappings(prev => prev.filter((_, i) => i !== index));
  };

  const updateGlobalFieldMapping = (index: number, field: keyof FieldMapping, value: any) => {
    setGlobalFieldMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, [field]: value } : mapping
    ));
  };

  const addEventConfig = (eventType: string) => {
    setBodyConfigs(prev => ({
      ...prev,
      [eventType]: {
        event_type: eventType,
        body_template: globalBodyTemplate || '{\n  "event": "{{event}}",\n  "data": {{data}},\n  "timestamp": "{{timestamp}}"\n}',
        field_mappings: [...globalFieldMappings],
        is_active: true
      }
    }));
  };

  const removeEventConfig = (eventType: string) => {
    setBodyConfigs(prev => {
      const newConfigs = { ...prev };
      delete newConfigs[eventType];
      return newConfigs;
    });
  };

  const updateEventConfig = (eventType: string, field: keyof WebhookBodyConfig, value: any) => {
    setBodyConfigs(prev => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        [field]: value
      }
    }));
  };

  const addEventFieldMapping = (eventType: string) => {
    const currentConfig = bodyConfigs[eventType];
    if (currentConfig) {
      const newMappings = [...(currentConfig.field_mappings || []), { source_field: '', target_field: '' }];
      updateEventConfig(eventType, 'field_mappings', newMappings);
    }
  };

  const removeEventFieldMapping = (eventType: string, index: number) => {
    const currentConfig = bodyConfigs[eventType];
    if (currentConfig) {
      const newMappings = (currentConfig.field_mappings || []).filter((_, i) => i !== index);
      updateEventConfig(eventType, 'field_mappings', newMappings);
    }
  };

  const updateEventFieldMapping = (eventType: string, index: number, field: keyof FieldMapping, value: any) => {
    const currentConfig = bodyConfigs[eventType];
    if (currentConfig) {
      const newMappings = (currentConfig.field_mappings || []).map((mapping, i) => 
        i === index ? { ...mapping, [field]: value } : mapping
      );
      updateEventConfig(eventType, 'field_mappings', newMappings);
    }
  };

  const generatePreview = async () => {
    if (!selectedEvent) return;
    
    try {
      setPreviewLoading(true);
      const config = bodyConfigs[selectedEvent] || {
        event_type: selectedEvent,
        body_template: globalBodyTemplate,
        field_mappings: globalFieldMappings
      };

      const response = await fetch('/api/settings/webhooks/validate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: selectedEvent,
          body_template: config.body_template,
          field_mappings: config.field_mappings
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.preview);
        setShowPreview(true);
      } else {
        showError('Failed to generate preview');
      }
    } catch (error) {
      showError('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const getDefaultTemplate = (eventType: string) => {
    return `{
  "event": "${eventType}",
  "timestamp": "{{timestamp}}",
  "data": {{data}},
  "webhook_id": "{{webhook_id}}"
}`;
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-7xl p-0 overflow-hidden" dialogId="webhook-body-customization-modal">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Code className="h-5 w-5" />
              Webhook Body Customization
            </DialogTitle>
            <DialogDescription>
              Customize the payload structure and field mappings for your webhook events.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col lg:flex-row h-[80vh]">
            {/* Left Panel: Event Selection and Global Settings */}
            <div className="w-full lg:w-1/3 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 border-r border-border flex flex-col">
              <div className="space-y-6">
                {/* Global Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    Global Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border">
                      <div>
                        <Label className="text-sm font-medium">Custom Payload</Label>
                        <p className="text-xs text-muted-foreground">Use custom payload structure</p>
                      </div>
                      <Switch
                        checked={customPayload}
                        onCheckedChange={setCustomPayload}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border">
                      <div>
                        <Label className="text-sm font-medium">Include Metadata</Label>
                        <p className="text-xs text-muted-foreground">Include webhook metadata</p>
                      </div>
                      <Switch
                        checked={includeMetadata}
                        onCheckedChange={setIncludeMetadata}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Event Selection */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Layers className="h-5 w-5 text-green-600" />
                    Event Configurations
                  </h3>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {webhookEvents.map(eventType => {
                      const hasConfig = !!bodyConfigs[eventType];
                      return (
                        <div
                          key={eventType}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all",
                            selectedEvent === eventType
                              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                              : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                          )}
                          onClick={() => setSelectedEvent(eventType)}
                         role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{eventType}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {hasConfig ? (
                                  <Badge variant="default" className="text-xs">
                                    <Code className="h-3 w-3 mr-1" />
                                    Custom
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {!hasConfig && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addEventConfig(eventType);
                                      }}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Add custom configuration</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {hasConfig && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeEventConfig(eventType);
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Remove custom configuration</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Configuration Editor */}
            <div className="w-full lg:w-2/3 p-6 flex flex-col">
              {selectedEvent ? (
                <div className="space-y-6">
                  {/* Event Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Database className="h-5 w-5 text-purple-600" />
                        {selectedEvent}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Configure payload structure for this event
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generatePreview}
                        disabled={previewLoading}
                      >
                        {previewLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        ) : (
                          <Eye className="h-4 w-4 mr-1" />
                        )}
                        Preview
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="template" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="template" className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Template
                      </TabsTrigger>
                      <TabsTrigger value="mappings" className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Field Mappings
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                      </TabsTrigger>
                    </TabsList>

                    {/* Template Tab */}
                    <TabsContent value="template" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Body Template</CardTitle>
                          <CardDescription>
                            Define the JSON structure for the webhook payload. Use placeholders like {"{{field_name}}"} for dynamic values.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="body-template" className="text-sm font-medium">Template</Label>
                              <Textarea
                                id="body-template"
                                value={bodyConfigs[selectedEvent]?.body_template || globalBodyTemplate || getDefaultTemplate(selectedEvent)}
                                onChange={(e) => {
                                  if (bodyConfigs[selectedEvent]) {
                                    updateEventConfig(selectedEvent, 'body_template', e.target.value);
                                  } else {
                                    setGlobalBodyTemplate(e.target.value);
                                  }
                                }}
                                placeholder="Enter JSON template..."
                                className="font-mono text-sm min-h-[200px]"
                              />
                            </div>
                            
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                  <p className="font-medium mb-1">Available Placeholders:</p>
                                  <ul className="space-y-1 text-xs">
                                    <li><code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">{"{{event}}"}</code> - Event type</li>
                                    <li><code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">{"{{timestamp}}"}</code> - Current timestamp</li>
                                    <li><code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">{"{{data}}"}</code> - Event data</li>
                                    <li><code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">{"{{webhook_id}}"}</code> - Webhook ID</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Field Mappings Tab */}
                    <TabsContent value="mappings" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Field Mappings</CardTitle>
                          <CardDescription>
                            Map source fields to target fields and apply transformations.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Field Mappings</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (bodyConfigs[selectedEvent]) {
                                    addEventFieldMapping(selectedEvent);
                                  } else {
                                    addGlobalFieldMapping();
                                  }
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Mapping
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {(bodyConfigs[selectedEvent]?.field_mappings || globalFieldMappings).map((mapping, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                                  <div className="flex-1">
                                    <Label className="text-xs font-medium">Source Field</Label>
                                    <Input
                                      value={mapping.source_field}
                                      onChange={(e) => {
                                        if (bodyConfigs[selectedEvent]) {
                                          updateEventFieldMapping(selectedEvent, index, 'source_field', e.target.value);
                                        } else {
                                          updateGlobalFieldMapping(index, 'source_field', e.target.value);
                                        }
                                      }}
                                      placeholder="e.g., user.name"
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <Label className="text-xs font-medium">Target Field</Label>
                                    <Input
                                      value={mapping.target_field}
                                      onChange={(e) => {
                                        if (bodyConfigs[selectedEvent]) {
                                          updateEventFieldMapping(selectedEvent, index, 'target_field', e.target.value);
                                        } else {
                                          updateGlobalFieldMapping(index, 'target_field', e.target.value);
                                        }
                                      }}
                                      placeholder="e.g., name"
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="w-32">
                                    <Label className="text-xs font-medium">Transform</Label>
                                    <Select
                                      value={mapping.transform || 'none'}
                                      onValueChange={(value) => {
                                        if (bodyConfigs[selectedEvent]) {
                                          updateEventFieldMapping(selectedEvent, index, 'transform', value === 'none' ? undefined : value);
                                        } else {
                                          updateGlobalFieldMapping(index, 'transform', value === 'none' ? undefined : value);
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="None" />
                                      </SelectTrigger>
                                                                             <SelectContent>
                                         <SelectItem value="none">None</SelectItem>
                                         {TRANSFORM_OPTIONS.map(option => (
                                           <SelectItem key={option.value} value={option.value}>
                                             {option.label}
                                           </SelectItem>
                                         ))}
                                       </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (bodyConfigs[selectedEvent]) {
                                        removeEventFieldMapping(selectedEvent, index);
                                      } else {
                                        removeGlobalFieldMapping(index);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            {availableFields[selectedEvent] && (
                              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <Database className="h-4 w-4 text-green-600 mt-0.5" />
                                  <div className="text-sm text-green-700 dark:text-green-300">
                                    <p className="font-medium mb-1">Available Fields for {selectedEvent}:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {availableFields[selectedEvent].map(field => (
                                        <Badge key={field} variant="outline" className="text-xs">
                                          {field}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Preview Tab */}
                    <TabsContent value="preview" className="space-y-4">
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
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an event to configure its payload</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
} 