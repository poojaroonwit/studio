"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, GripVertical, Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const addApiKey = () => {
    if (!newApiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    if (newPriority <= 0) {
      toast.error('Priority must be greater than 0');
      return;
    }

    // Check for duplicate priority
    if (apiKeys.some(key => key.priority === newPriority)) {
      toast.error('Priority already exists');
      return;
    }

    const newKey: ApiKey = {
      key: newApiKey.trim(),
      priority: newPriority,
      isActive: true,
      source: `Priority ${newPriority}`,
      errorCount: 0
    };

    setApiKeys([...apiKeys, newKey].sort((a, b) => a.priority - b.priority));
    setNewApiKey('');
    setNewPriority(Math.max(...apiKeys.map(k => k.priority), 0) + 1);
  };

  const removeApiKey = (priority: number) => {
    setApiKeys(apiKeys.filter(key => key.priority !== priority));
  };

  const startEditing = (apiKey: ApiKey) => {
    setEditingKey(apiKey.key);
    setEditValue(apiKey.key);
  };

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
          apiKeys: apiKeys.map(key => ({
            key: key.key,
            priority: key.priority
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

    const items = Array.from(apiKeys);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update priorities based on new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      priority: index + 1,
    }));

    setApiKeys(updatedItems);

    try {
      const response = await fetch('/api/settings/ai-api-keys/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKeys: updatedItems.map(item => ({
            key: item.key,
            priority: item.priority
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
          errorMessage = 'Permission denied. You need SYSTEM_SETTINGS_MANAGE permission or Admin role.';
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
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center justify-between p-4 border rounded-lg",
                              apiKey.errorCount > 0 ? "border-red-200 bg-red-50" : "border-border",
                              snapshot.isDragging && "shadow-lg border-primary"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeApiKey(apiKey.priority)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
