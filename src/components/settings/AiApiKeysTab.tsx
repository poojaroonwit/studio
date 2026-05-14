"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, GripVertical, Edit2, X, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  provider?: 'gemini' | 'openai';
}

interface ApiKeyStats {
  provider?: 'gemini' | 'openai';
  selectedProvider?: 'gemini' | 'openai';
  apiKeys: ApiKey[];
  totalKeys: number;
  activeKeys: number;
  environmentKey: boolean;
}

export default function AiApiKeysTab() {
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai'>('gemini');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiKey, setNewApiKey] = useState('');
  const [newPriority, setNewPriority] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<ApiKeyStats | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingKey, setDeletingKey] = useState<number | null>(null);
  const [availableModels, setAvailableModels] = useState<Array<{ name: string, displayName: string }>>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const providerLabel = selectedProvider === 'openai' ? 'OpenAI' : 'Gemini';
  const providerDefaultModel = selectedProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash';

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/settings/ai-api-keys?provider=${selectedProvider}`);
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      const data = await response.json();

      // Validate response data
      if (data && Array.isArray(data.apiKeys)) {
        if (!stats && (data.selectedProvider === 'openai' || data.selectedProvider === 'gemini') && data.selectedProvider !== selectedProvider) {
          setSelectedProvider(data.selectedProvider);
          setIsLoading(false);
          return;
        }
        setApiKeys(data.apiKeys);
        setStats(data);
      } else {
        console.error('Invalid API response format:', data);
        setApiKeys([]);
        setStats(null);
        toast.error('Invalid response format from server');
      }
    } catch (error) {
      toast.error('Failed to load API keys');
      console.error('Error fetching API keys:', error);
      setApiKeys([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableModels = useCallback(async () => {
    // Only fetch if we have API keys configured
    if (apiKeys.length === 0) {
      setAvailableModels([]);
      return;
    }

    setIsFetchingModels(true);
    try {
      const response = await fetch(`/api/ai/available-models?provider=${selectedProvider}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.models && data.models.length > 0) {
          setAvailableModels(data.models);
        } else {
          // No models returned or API error
          setAvailableModels([]);
          if (data.error) {
            toast.error(`Failed to fetch models: ${data.error}`);
          }
        }
      } else {
        // API returned error status
        const errorData = await response.json().catch(() => ({}));
        setAvailableModels([]);
        toast.error(errorData.error || 'Failed to fetch available models. Please check your API key configuration.');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setAvailableModels([]);
      toast.error('Failed to fetch available models. Please ensure at least one API key is configured and valid.');
    } finally {
      setIsFetchingModels(false);
    }
  }, [apiKeys.length, selectedProvider]);

  const updateProviderSelection = async (provider: 'gemini' | 'openai') => {
    setSelectedProvider(provider);
    try {
      await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          { key: 'aiProviderSelection', value: provider },
        ]),
      });
    } catch (error) {
      console.error('Error saving AI provider selection:', error);
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
          { key: selectedProvider === 'openai' ? 'openaiModelSelection' : 'geminiModelSelection', value: model }
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
  }, [selectedProvider]);

  // Fetch models when API keys are loaded or updated
  useEffect(() => {
    if (apiKeys.length > 0 && !isLoading) {
      fetchAvailableModels();
    }
  }, [apiKeys.length, isLoading, fetchAvailableModels]);

  // Update newPriority when apiKeys change
  useEffect(() => {
    if (apiKeys && Array.isArray(apiKeys) && apiKeys.length > 0) {
      const priorities = apiKeys.map(k => k.priority).filter(p => !isNaN(p) && p > 0);
      if (priorities.length > 0) {
        const maxPriority = Math.max(...priorities);
        setNewPriority(maxPriority + 1);
      } else {
        setNewPriority(1);
      }
    } else {
      setNewPriority(1);
    }
  }, [apiKeys]);

  const addApiKey = async () => {
    if (!newApiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    // Check for duplicate API key value (not priority)
    const trimmedKey = newApiKey.trim();
    const duplicateKey = apiKeys.find(key => key.key === trimmedKey);
    if (duplicateKey) {
      toast.error(`This API key already exists with priority ${duplicateKey.priority}`);
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
      const maxPriority = apiKeys.length > 0
        ? Math.max(...apiKeys.map(k => k.priority), 0)
        : 0;
      finalPriority = maxPriority + 1;
      toast(`Priority ${newPriority} already exists. Adjusted to ${finalPriority}`);
    }

    const newKey: ApiKey = {
      key: trimmedKey,
      priority: finalPriority,
      isActive: true,
      source: `Priority ${finalPriority}`,
      errorCount: 0,
      selectedModel: providerDefaultModel,
      provider: selectedProvider,
    };

    // Add new key and re-sort
    const updatedKeys = [...apiKeys, newKey].sort((a, b) => a.priority - b.priority);

    // Reassign priorities sequentially to ensure no gaps
    const reorderedWithNewPriorities = updatedKeys.map((key, index) => ({
      ...key,
      priority: index + 1,
      source: `Priority ${index + 1}`
    }));

    // Update local state immediately for better UX
    setApiKeys(reorderedWithNewPriorities);
    setNewApiKey('');

    // Update priority for next key
    const nextPriority = reorderedWithNewPriorities.length + 1;
    setNewPriority(nextPriority);

    // Save to database immediately
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/ai-api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKeys: reorderedWithNewPriorities.map(key => ({
            key: key.key,
            priority: key.priority,
            selectedModel: key.selectedModel || providerDefaultModel
          })),
          provider: selectedProvider
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save API key');
      }

      const data = await response.json();
      toast.success('API key added successfully');

      // Refresh from server to get the correct state
      await fetchApiKeys();

      // Fetch available models with the new API key
      await fetchAvailableModels();
    } catch (error) {
      // Revert local state change on error - restore previous apiKeys
      setApiKeys([...apiKeys]);
      setNewApiKey(trimmedKey); // Restore the input value
      toast.error(error instanceof Error ? error.message : 'Failed to save API key');
      console.error('Error saving API key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const removeApiKey = useCallback(async (priority: number) => {
    // Find all keys with this priority (in case of duplicates)
    const keysToDelete = apiKeys.filter(key => key.priority === priority);
    if (keysToDelete.length === 0) return;

    const keyToDelete = keysToDelete[0];

    // Show confirmation dialog with key info
    const keyPreview = keyToDelete.key.length > 20
      ? `${keyToDelete.key.substring(0, 8)}...${keyToDelete.key.substring(keyToDelete.key.length - 4)}`
      : keyToDelete.key;

    const confirmed = window.confirm(
      `Are you sure you want to delete the API key with priority ${priority}?\n\nKey: ${keyPreview}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingKey(priority);
    try {
      // Remove from local state immediately for better UX
      // Remove by key value to handle duplicates properly
      const updatedKeys = apiKeys.filter(key => key.key !== keyToDelete.key);

      // Reassign priorities sequentially to ensure no gaps
      const reorderedKeys = updatedKeys.map((key, index) => ({
        ...key,
        priority: index + 1,
        source: `Priority ${index + 1}`
      }));

      setApiKeys(reorderedKeys);

      // Save the updated keys to the database immediately
      const response = await fetch('/api/settings/ai-api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKeys: reorderedKeys.map(key => ({
            key: key.key,
            priority: key.priority,
            selectedModel: key.selectedModel || providerDefaultModel
          })),
          provider: selectedProvider
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete API key');
      }

      toast.success('API key deleted successfully');
    } catch (error) {
      // Revert the local state change on error
      fetchApiKeys(); // Reload from server to get correct state
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
      // Remove duplicates by key value before sending
      const seenKeys = new Map<string, typeof apiKeys[0]>();
      const keysToSave = apiKeys;

      for (const key of keysToSave) {
        const trimmedKey = key.key.trim();
        if (!seenKeys.has(trimmedKey)) {
          seenKeys.set(trimmedKey, key);
        } else {
          // If duplicate found, keep the one with lower priority
          const existing = seenKeys.get(trimmedKey)!;
          if (key.priority < existing.priority) {
            seenKeys.set(trimmedKey, key);
          }
        }
      }

      // Convert to array and sort by priority
      const deduplicatedKeys = Array.from(seenKeys.values())
        .sort((a, b) => a.priority - b.priority)
        .map(key => ({
          key: key.key,
          priority: key.priority,
          selectedModel: key.selectedModel || providerDefaultModel
        }));

      const response = await fetch('/api/settings/ai-api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKeys: deduplicatedKeys,
          provider: selectedProvider
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save API keys');
      }

      const data = await response.json();

      // Show message if duplicates were removed
      if (data.removedDuplicates && data.removedDuplicates > 0) {
        toast.success(`${data.message} (${data.removedDuplicates} duplicate(s) removed)`);
      } else {
        toast.success(data.message || 'API keys saved successfully');
      }

      await fetchApiKeys(); // Refresh data from server
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save API keys');
      console.error('Error saving API keys:', error);
      // Refresh to get correct state from server on error
      await fetchApiKeys();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (!apiKeys || apiKeys.length === 0) return;
    if (result.source.index === result.destination.index) return; // No change

    // All keys are reorderable (no environment keys)
    const reorderableKeys = apiKeys;

    // Validate that we have reorderable keys
    if (!reorderableKeys || reorderableKeys.length === 0) {
      toast.error('No API keys available to reorder');
      return;
    }

    // The drag indices are based on the apiKeys array
    const sourceKey = apiKeys[result.source.index];
    const destinationKey = apiKeys[result.destination.index];

    // Find indices in reorderableKeys array
    const sourceIndexInReorderable = reorderableKeys.findIndex(k => k.priority === sourceKey.priority);
    const destIndexInReorderable = reorderableKeys.findIndex(k => k.priority === destinationKey.priority);

    // Validate indices
    if (sourceIndexInReorderable < 0 || sourceIndexInReorderable >= reorderableKeys.length) {
      console.error('Invalid source index in reorderable keys:', sourceIndexInReorderable);
      return;
    }
    if (destIndexInReorderable < 0 || destIndexInReorderable > reorderableKeys.length) {
      console.error('Invalid destination index in reorderable keys:', destIndexInReorderable);
      return;
    }

    const items = Array.from(reorderableKeys);
    const [reorderedItem] = items.splice(sourceIndexInReorderable, 1);

    // Validate reorderedItem exists
    if (!reorderedItem) {
      console.error('Failed to get reordered item');
      return;
    }

    items.splice(destIndexInReorderable, 0, reorderedItem);

    // Update priorities based on new order (1-based priority)
    const updatedItems = items.map((item, index) => ({
      ...item,
      priority: index + 1,
      source: `Priority ${index + 1}`
    }));

    // Validate updatedItems before setting state
    if (!updatedItems || updatedItems.length === 0) {
      console.error('No items after reordering');
      return;
    }

    setApiKeys(updatedItems);

    // Prepare API keys for the request
    const apiKeysForRequest = updatedItems
      .filter(item => item)
      .map(item => ({
        key: item.key,
        priority: item.priority,
        selectedModel: item.selectedModel || providerDefaultModel
      }));

    // Validate we have keys to send
    if (!apiKeysForRequest || apiKeysForRequest.length === 0) {
      toast.error('No API keys to reorder');
      fetchApiKeys(); // Revert to original order
      return;
    }

    try {
      const response = await fetch('/api/settings/ai-api-keys/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeys: apiKeysForRequest,
          provider: selectedProvider
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
      <Accordion type="multiple" defaultValue={['add', 'list', 'info']} className="w-full">
        {/* Add New API Key */}
        <AccordionItem value="add" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Add New API Key</div>
                <div className="text-xs text-muted-foreground font-normal">{`Add a new ${providerLabel} API key with priority. Lower priority numbers are used first.`}</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4 pt-2">
            <div className="mb-4 grid gap-2 max-w-xs">
              <Label htmlFor="ai-provider">AI Provider</Label>
              <Select value={selectedProvider} onValueChange={(value: 'gemini' | 'openai') => updateProviderSelection(value)}>
                <SelectTrigger id="ai-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="new-api-key">API Key</Label>
                <Input
                  id="new-api-key"
                  type="password"
                  placeholder={`Enter your ${providerLabel} API Key`}
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
                <Button onClick={addApiKey} disabled={!newApiKey.trim() || isSaving}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isSaving ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* API Keys List */}
        <AccordionItem value="list" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Configured API Keys</div>
                <div className="text-xs text-muted-foreground font-normal">Manage your API keys. Drag and drop to reorder by priority (1 = highest priority). Click edit to modify API keys.</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4 pt-2">
            {!apiKeys || !Array.isArray(apiKeys) || apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {`No ${providerLabel} API keys configured. Add your first API key above.`}
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
                      {apiKeys.map((apiKey, index) => {
                        if (!apiKey) return null;
                        // Use a unique key that includes both priority and key value to handle duplicates
                        const uniqueKey = `${apiKey.priority}-${apiKey.key.substring(0, 8)}`;
                        return (
                          <Draggable
                            key={uniqueKey}
                            draggableId={uniqueKey}
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
                                    <div className="mt-2">
                                      <Label htmlFor={`model-${apiKey.priority}`} className="text-xs">
                                        AI Model
                                      </Label>
                                      <Select
                                        value={apiKey.selectedModel || providerDefaultModel}
                                        onValueChange={async (value) => {
                                          // Capture previous state for potential revert
                                          const previousKeys = [...apiKeys];

                                          // Update local state immediately
                                          const updatedKeys = apiKeys.map(key =>
                                            key.priority === apiKey.priority
                                              ? { ...key, selectedModel: value }
                                              : key
                                          );
                                          setApiKeys(updatedKeys);

                                          // Save to database immediately
                                          try {
                                            const response = await fetch('/api/settings/ai-api-keys', {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                              },
                                              body: JSON.stringify({
                                                apiKeys: updatedKeys.map(key => ({
                                                  key: key.key,
                                                  priority: key.priority,
                                                  selectedModel: key.selectedModel || providerDefaultModel
                                                })),
                                                provider: selectedProvider
                                              })
                                            });

                                            if (!response.ok) {
                                              const errorData = await response.json();
                                              throw new Error(errorData.error || 'Failed to save model selection');
                                            }

                                            // Refresh from server to get the correct state
                                            await fetchApiKeys();
                                          } catch (error) {
                                            // Revert on error
                                            setApiKeys(previousKeys);
                                            toast.error(error instanceof Error ? error.message : 'Failed to save model selection');
                                            console.error('Error saving model selection:', error);
                                          }
                                        }}
                                      >
                                        <SelectTrigger id={`model-${apiKey.priority}`} className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {isFetchingModels ? (
                                            <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading models...</div>
                                          ) : availableModels && availableModels.length > 0 ? (
                                            availableModels.map((model) => (
                                              <SelectItem key={model.name} value={model.name}>
                                                {model.displayName}
                                              </SelectItem>
                                            ))
                                          ) : (
                                            <div className="px-2 py-1.5 text-sm text-muted-foreground">{`No ${providerLabel} models available. Please configure valid API keys.`}</div>
                                          )}
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
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Information */}
        <AccordionItem value="info" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <div className="font-semibold text-blue-900">How Fallback Works</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4 pt-2">
            <div className="space-y-2">
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• API keys are used in priority order (1 = highest priority)</li>
                <li>• If a key fails, the system automatically tries the next key</li>
                <li>• Error counts and last error messages are tracked for each key</li>
                <li>• All attempts and failures are logged for monitoring</li>
                <li>• Drag and drop to reorder priorities, or click edit to modify keys</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
          disabled={isSaving || !apiKeys || !Array.isArray(apiKeys) || apiKeys.length === 0}
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
    </div>
  );
}
