"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, GripVertical, Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface ApiKey {
  key: string;
  priority: number;
  isActive: boolean;
  source: string;
  errorCount: number;
  lastError?: string;
  lastUsed?: Date;
  selectedModel?: string;
}

interface ApiKeyStats {
  apiKeys: ApiKey[];
  totalKeys: number;
  activeKeys: number;
  environmentKey: boolean;
}

export default function AiApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiKey, setNewApiKey] = useState('');
  const [newPriority, setNewPriority] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<ApiKeyStats | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingKey, setDeletingKey] = useState<number | null>(null);
  const [availableModels, setAvailableModels] = useState<Array<{name: string, displayName: string}>>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/ai-api-keys');
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      const data = await response.json();
      setApiKeys(data.apiKeys);
      setStats(data);
    } catch (error) {
      toast.error('Failed to load API keys');
      console.error('Error fetching API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableModels = async () => {
    setIsFetchingModels(true);
    try {
      const response = await fetch('/api/ai/available-models');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.models) {
          setAvailableModels(data.models);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Set default models as fallback
      setAvailableModels([
        { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
        { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' }
      ]);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const updateSystemModelSelection = async (model: string) => {
    try {
      const response = await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          { key: 'geminiModelSelection', value: model }
        ])
      });

      if (response.ok) {
        toast.success('System model selection updated');
        // Refresh the API keys to show the updated model
        await fetchApiKeys();
      } else {
        throw new Error('Failed to update system model selection');
      }
    } catch (error) {
      console.error('Error updating system model selection:', error);
      toast.error('Failed to update system model selection');
    }
  };

  useEffect(() => {
    fetchApiKeys();
    fetchAvailableModels();
  }, []);

  // Update newPriority when apiKeys change
  useEffect(() => {
    if (apiKeys.length > 0) {
      const maxPriority = Math.max(...apiKeys.map(k => k.priority));
      setNewPriority(maxPriority + 1);
    } else {
      setNewPriority(1);
    }
  }, [apiKeys]);

  const addApiKey = () => {
    if (!newApiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    if (newPriority <= 0) {
      toast.error('Priority must be greater than 0');
      return;
    }

    // Check for duplicate priority and auto-adjust if needed
    let finalPriority = newPriority;
    if (apiKeys.some(key => key.priority === newPriority)) {
      // Priority is duplicate, find next available priority
      const maxPriority = Math.max(...apiKeys.map(k => k.priority), 0);
      finalPriority = maxPriority + 1;
      toast.info(`Priority ${newPriority} already exists. Adjusted to ${finalPriority}`);
    }

    const newKey: ApiKey = {
      key: newApiKey.trim(),
      priority: finalPriority,
      isActive: true,
      source: `Priority ${finalPriority}`,
      errorCount: 0,
      selectedModel: 'gemini-1.5-pro'
    };

    setApiKeys([...apiKeys, newKey].sort((a, b) => a.priority - b.priority));
    setNewApiKey('');
    // Update priority for next key
    const updatedKeys = [...apiKeys, newKey];
    setNewPriority(Math.max(...updatedKeys.map(k => k.priority), 0) + 1);
  };

  const removeApiKey = useCallback(async (priority: number) => {
    const keyToDelete = apiKeys.find(key => key.priority === priority);
    if (!keyToDelete) return;
    
    // Prevent removing environment key
    if (keyToDelete.source === 'Environment Variable') {
      toast.error('Cannot remove environment API key');
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete the API key with priority ${priority}?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    setDeletingKey(priority);
    try {
      // Remove from local state immediately for better UX
      const updatedKeys = apiKeys.filter(key => key.priority !== priority);
      setApiKeys(updatedKeys);

      // Save the updated keys to the database immediately
      const response = await fetch('/api/settings/ai-api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKeys: updatedKeys
            .filter(key => key.source !== 'Environment Variable') // Exclude environment key
            .map(key => ({
              key: key.key,
              priority: key.priority,
              selectedModel: key.selectedModel || 'gemini-1.5-pro'
            }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete API key');
      }

      toast.success('API key deleted successfully');
    } catch (error) {
      // Revert the local state change on error
      setApiKeys(apiKeys);
      toast.error(error instanceof Error ? error.message : 'Failed to delete API key');
      console.error('Error deleting API key:', error);
    } finally {
      setDeletingKey(null);
    }
  }, [apiKeys]);

  const startEditing = useCallback((apiKey: ApiKey) => {
    setEditingKey(apiKey.key);
    setEditValue(apiKey.key);
  }, []);

  const cancelEditing = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveEditing = () => {
    if (!editingKey || !editValue.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }

    setApiKeys(prev => prev.map(key => 
      key.key === editingKey 
        ? { ...key, key: editValue.trim() }
        : key
    ));
    setEditingKey(null);
    setEditValue('');
    toast.success('API key updated');
  };

  const saveApiKeys = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/ai-api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKeys: apiKeys
            .filter(key => key.source !== 'Environment Variable') // Exclude environment key
            .map(key => ({
              key: key.key,
              priority: key.priority,
              selectedModel: key.selectedModel || 'gemini-1.5-pro'
            }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save API keys');
      }

      const data = await response.json();
      toast.success(data.message);
      await fetchApiKeys(); // Refresh data
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save API keys');
      console.error('Error saving API keys:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    // Filter out environment key for reordering
    const reorderableKeys = apiKeys.filter(key => key.source !== 'Environment Variable');
    const environmentKey = apiKeys.find(key => key.source === 'Environment Variable');
    
    const items = Array.from(reorderableKeys);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update priorities based on new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      priority: index + 1,
    }));

    // Add environment key back at the end
    if (environmentKey) {
      updatedItems.push(environmentKey);
    }

    setApiKeys(updatedItems);

    try {
      const response = await fetch('/api/settings/ai-api-keys/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKeys: updatedItems
            .filter(item => item.source !== 'Environment Variable') // Exclude environment key
            .map(item => ({
              key: item.key,
              priority: item.priority,
              selectedModel: item.selectedModel || 'gemini-1.5-pro'
            }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API reorder failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        let errorMessage = 'Failed to update API key order';
        if (response.status === 403) {
          errorMessage = 'No permission';
        } else if (response.status === 400) {
          errorMessage = errorData.error || errorData.message || 'Invalid request data';
        } else if (response.status === 500) {
          errorMessage = 'Server error occurred. Please try again.';
        }
        
        throw new Error(errorMessage);
      }

      toast.success('API key order updated successfully');
    } catch (error) {
      console.error('Failed to reorder:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update API key order');
      fetchApiKeys(); // Revert to original order
    }
  };

  const getStatusIcon = (apiKey: ApiKey) => {
    if (apiKey.errorCount > 0) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (apiKey.lastUsed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = (apiKey: ApiKey) => {
    if (apiKey.errorCount > 0) {
      return `Error count: ${apiKey.errorCount}`;
    }
    if (apiKey.lastUsed) {
      return `Last used: ${new Date(apiKey.lastUsed).toLocaleString()}`;
    }
    return 'Never used';
  };

  const formatApiKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New API Key */}
      <Card>
        <CardHeader>
          <CardTitle>Add New API Key</CardTitle>
          <CardDescription>
            Add a new Gemini API key with priority. Lower priority numbers are used first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="new-api-key">API Key</Label>
              <Input
                id="new-api-key"
                type="password"
                placeholder="Enter your Gemini API Key"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
              />
            </div>
            <div className="w-32">
              <Label htmlFor="new-priority">Priority</Label>
              <Input
                id="new-priority"
                type="number"
                min="1"
                value={newPriority}
                onChange={(e) => setNewPriority(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addApiKey} disabled={!newApiKey.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured API Keys</CardTitle>
          <CardDescription>
            Manage your API keys. Drag and drop to reorder by priority (1 = highest priority). Click edit to modify API keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API keys configured. Add your first API key above.
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="api-keys">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {apiKeys.map((apiKey, index) => (
                      <Draggable
                        key={apiKey.priority}
                        draggableId={apiKey.priority.toString()}
                        index={index}
                        isDragDisabled={apiKey.source === 'Environment Variable'}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center justify-between p-4 border rounded-lg",
                              apiKey.errorCount > 0 ? "border-red-200 bg-red-50" : "border-border",
                              snapshot.isDragging && "shadow-lg border-primary",
                              apiKey.source === 'Environment Variable' && "opacity-75"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              {apiKey.source !== 'Environment Variable' && (
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                              )}
                              {apiKey.source === 'Environment Variable' && (
                                <div className="w-4 h-4 flex items-center justify-center text-muted-foreground">
                                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                {getStatusIcon(apiKey)}
                                <Badge variant={apiKey.priority === 1 ? "default" : "secondary"}>
                                  Priority {apiKey.priority}
                                </Badge>
                              </div>
                              <div className="flex-1">
                                {editingKey === apiKey.key ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="password"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="font-mono text-sm"
                                      placeholder="Enter new API key"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={saveEditing}
                                      className="h-8 px-2"
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditing}
                                      className="h-8 px-2"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="font-mono text-sm">
                                    {formatApiKey(apiKey.key)}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  {getStatusText(apiKey)}
                                </div>
                                {apiKey.lastError && (
                                  <div className="text-xs text-red-600 mt-1">
                                    Last error: {apiKey.lastError}
                                  </div>
                                )}
                                <div className="mt-2">
                                  <Label htmlFor={`model-${apiKey.priority}`} className="text-xs">
                                    AI Model
                                  </Label>
                                  <Select
                                    value={apiKey.selectedModel || 'gemini-1.5-pro'}
                                    onValueChange={(value) => {
                                      if (apiKey.source === 'Environment Variable') {
                                        // For environment key, update system-wide model selection
                                        updateSystemModelSelection(value);
                                      } else {
                                        // For database keys, update local state
                                        setApiKeys(prev => prev.map(key => 
                                          key.priority === apiKey.priority 
                                            ? { ...key, selectedModel: value }
                                            : key
                                        ));
                                      }
                                    }}
                                  >
                                    <SelectTrigger id={`model-${apiKey.priority}`} className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableModels.map((model) => (
                                        <SelectItem key={model.name} value={model.name}>
                                          {model.displayName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingKey !== apiKey.key && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditing(apiKey)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              {apiKey.source !== 'Environment Variable' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeApiKey(apiKey.priority)}
                                  disabled={deletingKey === apiKey.priority}
                                >
                                {deletingKey === apiKey.priority ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={fetchApiKeys}
          disabled={isSaving}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button
          onClick={saveApiKeys}
          disabled={isSaving || apiKeys.length === 0}
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">How Fallback Works</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• API keys are used in priority order (1 = highest priority)</li>
                <li>• If a key fails, the system automatically tries the next key</li>
                <li>• Error counts and last error messages are tracked for each key</li>
                <li>• Environment variable GOOGLE_API_KEY is used as final fallback</li>
                <li>• All attempts and failures are logged for monitoring</li>
                <li>• Drag and drop to reorder priorities, or click edit to modify keys</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
