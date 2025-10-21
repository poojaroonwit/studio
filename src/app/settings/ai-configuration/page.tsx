"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Brain } from 'lucide-react';
import AiConfigurationTab from '@/components/settings/AiConfigurationTab';

export default function AiConfigurationPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Configuration</h1>
          <p className="text-muted-foreground">
            Configure AI models and system prompts for enhanced functionality
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>AI Configuration:</strong> Configure which Gemini model to use for AI-powered features like content generation, candidate search, and job description creation. 
          You can also customize the system prompt for AI-powered candidate search.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>AI Model & Prompt Configuration</CardTitle>
          <CardDescription>
            Select your preferred Gemini model and customize AI behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiConfigurationTab />
        </CardContent>
      </Card>
    </div>
  );
}
