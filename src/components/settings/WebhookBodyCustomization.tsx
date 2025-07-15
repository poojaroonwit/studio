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
import { Plus, Trash2, Copy, Check, Eye, EyeOff, Code, Settings, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
}

const TRANSFORM_OPTIONS = [
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'trim', label: 'Trim' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
];

export default function WebhookBodyCustomization({
  webhookId,
  webhookEvents,
  initialConfig,
  onSave
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
          const fieldsMap: Record<string, string[]> = {};
          const payloadsMap: Record<string, any> = {};
          
          data.event_types.forEach((eventData: any) => {
            fieldsMap[eventData.event_type] = eventData.available_fields;
            payloadsMap[eventData.event_type] = eventData.sample_payload;
          });
          
          setAvailableFields(fieldsMap);
          setSamplePayloads(payloadsMap);
        }
      } catch (error) {
        console.error('Error loading available fields:', error);
      }
    };

    loadAvailableFields();
  }, []);

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

  const handleClose = () => {
    setIsOpen(false);
  };

  const addGlobalFieldMapping = () => {
    setGlobalFieldMappings([
      ...globalFieldMappings,
      { source_field: '', target_field: '' }
    ]);
  };

  const removeGlobalFieldMapping = (index: number) => {
    setGlobalFieldMappings(globalFieldMappings.filter((_, i) => i !== index));
  };

  const updateGlobalFieldMapping = (index: number, field: keyof FieldMapping, value: any) => {
    const updated = [...globalFieldMappings];
    updated[index] = { ...updated[index], [field]: value };
    setGlobalFieldMappings(updated);
  };

  const addEventConfig = (eventType: string) => {
    setBodyConfigs({
      ...bodyConfigs,
      [eventType]: {
        event_type: eventType,
        body_template: globalBodyTemplate || '{\n  "event": "{{event}}",\n  "timestamp": "{{timestamp}}",\n  "data": {{data}}\n}',
        field_mappings: [],
        is_active: true
      }
    });
    setSelectedEvent(eventType);
  };

  const removeEventConfig = (eventType: string) => {
    const updated = { ...bodyConfigs };
    delete updated[eventType];
    setBodyConfigs(updated);
  };

  const updateEventConfig = (eventType: string, field: keyof WebhookBodyConfig, value: any) => {
    setBodyConfigs({
      ...bodyConfigs,
      [eventType]: {
        ...bodyConfigs[eventType],
        [field]: value
      }
    });
  };

  const addEventFieldMapping = (eventType: string) => {
    const config = bodyConfigs[eventType];
    const updatedMappings = [...(config.field_mappings || []), { source_field: '', target_field: '' }];
    updateEventConfig(eventType, 'field_mappings', updatedMappings);
  };

  const removeEventFieldMapping = (eventType: string, index: number) => {
    const config = bodyConfigs[eventType];
    const updatedMappings = config.field_mappings?.filter((_, i) => i !== index) || [];
    updateEventConfig(eventType, 'field_mappings', updatedMappings);
  };

  const updateEventFieldMapping = (eventType: string, index: number, field: keyof FieldMapping, value: any) => {
    const config = bodyConfigs[eventType];
    const updatedMappings = [...(config.field_mappings || [])];
    updatedMappings[index] = { ...updatedMappings[index], [field]: value };
    updateEventConfig(eventType, 'field_mappings', updatedMappings);
  };

  const validateTemplate = async (template: string, eventType?: string) => {
    try {
      const response = await fetch('/api/settings/webhooks/validate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          event_type: eventType,
          sample_data: eventType ? samplePayloads[eventType] : undefined
        })
      });

      const result = await response.json();
      return result.valid;
    } catch (error) {
      return false;
    }
  };

  const previewTemplate = async (template: string, eventType: string) => {
    try {
      setPreviewLoading(true);
      const response = await fetch('/api/settings/webhooks/validate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          event_type: eventType,
          sample_data: samplePayloads[eventType]
        })
      });

      const result = await response.json();
      if (result.valid) {
        setPreviewData(result.processed_payload);
        setShowPreview(true);
      } else {
        showError('Template validation failed: ' + result.error);
      }
    } catch (error) {
      showError('Failed to preview template');
    } finally {
      setPreviewLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Copied to clipboard');
    } catch (error) {
      showError('Failed to copy to clipboard');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Customize Body
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Webhook Body Customization</DialogTitle>
            <DialogDescription>
              Customize the webhook payload structure and field mappings for each event type.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="global" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="global">Global Settings</TabsTrigger>
              <TabsTrigger value="events">Event-Specific</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Global Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="custom-payload">Use Custom Payload</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable custom body templates instead of default webhook format
                      </p>
                    </div>
                    <Switch
                      id="custom-payload"
                      checked={customPayload}
                      onCheckedChange={setCustomPayload}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="include-metadata">Include Metadata</Label>
                      <p className="text-sm text-muted-foreground">
                        Include webhook metadata in the payload
                      </p>
                    </div>
                    <Switch
                      id="include-metadata"
                      checked={includeMetadata}
                      onCheckedChange={setIncludeMetadata}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Global Body Template</CardTitle>
                  <CardDescription>
                    JSON template used as fallback for events without specific configurations.
                    Use {'{{variable}}'} syntax for dynamic values.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={globalBodyTemplate}
                    onChange={(e) => setGlobalBodyTemplate(e.target.value)}
                    placeholder='{\n  "event": "{{event}}",\n  "timestamp": "{{timestamp}}",\n  "data": {{data}}\n}'
                    className="font-mono text-sm"
                    rows={8}
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    Available variables: event, timestamp, webhook_id, webhook_name, and all data fields
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Global Field Mappings</CardTitle>
                  <CardDescription>
                    Transform and map fields globally across all events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {globalFieldMappings.map((mapping, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        placeholder="Source field (e.g., data.candidate.name)"
                        value={mapping.source_field}
                        onChange={(e) => updateGlobalFieldMapping(index, 'source_field', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Target field (e.g., candidate_name)"
                        value={mapping.target_field}
                        onChange={(e) => updateGlobalFieldMapping(index, 'target_field', e.target.value)}
                        className="flex-1"
                      />
                      <Select
                        value={mapping.transform || ''}
                        onValueChange={(value) => updateGlobalFieldMapping(index, 'transform', value || undefined)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Transform" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSFORM_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Default value"
                        value={mapping.default_value || ''}
                        onChange={(e) => updateGlobalFieldMapping(index, 'default_value', e.target.value)}
                        className="w-32"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeGlobalFieldMapping(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addGlobalFieldMapping}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field Mapping
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event-Specific Configurations</CardTitle>
                  <CardDescription>
                    Configure custom body templates and field mappings for specific events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {webhookEvents.map(eventType => {
                      const config = bodyConfigs[eventType];
                      const fields = availableFields[eventType] || [];
                      
                      return (
                        <Card key={eventType} className="border-2">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">{eventType}</CardTitle>
                                <CardDescription>
                                  {fields.length} available fields
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2">
                                {config ? (
                                  <>
                                    <Badge variant={config.is_active ? "default" : "secondary"}>
                                      {config.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                    <Switch
                                      checked={config.is_active}
                                      onCheckedChange={(checked) => 
                                        updateEventConfig(eventType, 'is_active', checked)
                                      }
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeEventConfig(eventType)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addEventConfig(eventType)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Config
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          
                          {config && (
                            <CardContent className="space-y-4">
                              <div>
                                <Label>Body Template</Label>
                                <Textarea
                                  value={config.body_template}
                                  onChange={(e) => updateEventConfig(eventType, 'body_template', e.target.value)}
                                  placeholder='{\n  "event": "{{event}}",\n  "data": {{data}}\n}'
                                  className="font-mono text-sm mt-1"
                                  rows={4}
                                />
                              </div>

                              <div>
                                <Label>Field Mappings</Label>
                                <div className="space-y-2 mt-2">
                                  {config.field_mappings?.map((mapping, index) => (
                                    <div key={index} className="flex gap-2">
                                      <Select
                                        value={mapping.source_field}
                                        onValueChange={(value) => 
                                          updateEventFieldMapping(eventType, index, 'source_field', value)
                                        }
                                      >
                                        <SelectTrigger className="flex-1">
                                          <SelectValue placeholder="Source field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {fields.map(field => (
                                            <SelectItem key={field} value={field}>
                                              {field}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        placeholder="Target field"
                                        value={mapping.target_field}
                                        onChange={(e) => 
                                          updateEventFieldMapping(eventType, index, 'target_field', e.target.value)
                                        }
                                        className="flex-1"
                                      />
                                      <Select
                                        value={mapping.transform || ''}
                                        onValueChange={(value) => 
                                          updateEventFieldMapping(eventType, index, 'transform', value || undefined)
                                        }
                                      >
                                        <SelectTrigger className="w-32">
                                          <SelectValue placeholder="Transform" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {TRANSFORM_OPTIONS.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeEventFieldMapping(eventType, index)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addEventFieldMapping(eventType)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Field Mapping
                                  </Button>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => previewTemplate(config.body_template, eventType)}
                                  disabled={previewLoading}
                                >
                                  {previewLoading ? (
                                    <div className="animate-spin h-4 w-4 mr-2" />
                                  ) : (
                                    <TestTube className="h-4 w-4 mr-2" />
                                  )}
                                  Preview
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(config.body_template)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Template
                                </Button>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Template Preview</CardTitle>
                  <CardDescription>
                    Preview how your webhook payload will look with sample data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {showPreview && previewData ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Processed Payload</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(previewData, null, 2))}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy JSON
                        </Button>
                      </div>
                      <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                        {JSON.stringify(previewData, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Click "Preview" on any event configuration to see the processed payload</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 