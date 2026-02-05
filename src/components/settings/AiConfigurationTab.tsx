"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Settings, Brain, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GeminiModel {
  name: string;
  displayName: string;
  description: string;
  supportedGenerationMethods: string[];
}

interface AiConfigurationData {
  geminiModelSelection?: string;
  aiPowerSearchSystemPrompt?: string;
}

export default function AiConfigurationTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Default models as fallback
  const defaultModels: GeminiModel[] = [
    {
      name: 'gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
      description: 'Most capable model for complex tasks',
      supportedGenerationMethods: ['generateContent']
    },
    {
      name: 'gemini-1.5-flash',
      displayName: 'Gemini 1.5 Flash',
      description: 'Fast and efficient model for quick responses',
      supportedGenerationMethods: ['generateContent']
    }
  ];

  const fetchAvailableModels = async () => {
    setIsFetchingModels(true);
    setError('');
    
    try {
      const response = await fetch('/api/ai/available-models');
      if (!response.ok) {
        throw new Error('Failed to fetch available models');
      }
      
      const data = await response.json();
      if (data.success && data.models) {
        setAvailableModels(data.models);
        toast.success(`Found ${data.models.length} available models`);
      } else {
        throw new Error(data.error || 'No models returned');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch models');
      setAvailableModels(defaultModels);
      toast.error('Using default models - API fetch failed');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const loadConfiguration = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/settings/system-settings');
      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }
      
      const data = await response.json();
      setSelectedModel(data.geminiModelSelection || 'gemini-1.5-pro');
      setSystemPrompt(data.aiPowerSearchSystemPrompt || '');
      
      // If no models are loaded yet, fetch them
      if (availableModels.length === 0) {
        await fetchAvailableModels();
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      setError(error instanceof Error ? error.message : 'Failed to load configuration');
      toast.error('Failed to load AI configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    setError('');
    
    try {
      const settingsToSave = [
        { key: 'geminiModelSelection', value: selectedModel },
        { key: 'aiPowerSearchSystemPrompt', value: systemPrompt }
      ];

      const response = await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save configuration');
      }

      toast.success('AI configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
      toast.error('Failed to save AI configuration');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  const currentModel = availableModels.find(model => model.name === selectedModel) || availableModels[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure AI model selection and system prompts
          </p>
        </div>
        <Button
          onClick={fetchAvailableModels}
          disabled={isFetchingModels}
          variant="outline"
          size="sm"
        >
          {isFetchingModels ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh Models
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Model Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Model Selection
            </CardTitle>
            <CardDescription>
              Choose the Gemini model for AI-powered features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-select">AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.name} value={model.name}>
                      <div className="flex items-center gap-2">
                        <span>{model.displayName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {model.name}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentModel && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{currentModel.displayName}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {currentModel.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {currentModel.supportedGenerationMethods.map((method) => (
                    <Badge key={method} variant="outline" className="text-xs">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Prompt Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              AI Search System Prompt
            </CardTitle>
            <CardDescription>
              Customize the system prompt for AI-powered Applicant search
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                placeholder="Enter the system prompt for AI search..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This prompt will be used to guide the AI when searching for Applicants.
                Leave empty to use the default prompt.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={saveConfiguration}
            disabled={isSaving || isLoading}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
