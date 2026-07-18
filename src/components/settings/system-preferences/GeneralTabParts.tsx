import React from 'react';
import { BrainCircuit, Moon, PenSquare, RotateCcw, Sun } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ThemePreference } from './constants';
import {
  APP_NAME_HELP_TEXT,
  GENERATIVE_AI_CANVAS_HELP_TEXT,
  THEME_PREFERENCE_HELP_TEXT,
  THEME_PREFERENCE_OPTIONS,
  type ThemePreferenceIconKey,
} from './general-tab-utils';

export function GeneralTabAppNameCard({
  appName,
  canEdit,
  setAppName,
}: {
  appName: string;
  canEdit: boolean;
  setAppName: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenSquare className="h-5 w-5 text-primary" />
          Application Name
        </CardTitle>
        <CardDescription>
          Set the name that appears throughout the application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="app-name-input">Application Name</Label>
          <Input
            id="app-name-input"
            type="text"
            value={appName}
            onChange={(event) => setAppName(event.target.value)}
            placeholder="e.g., HRI Pro"
            disabled={!canEdit}
          />
          <p className="text-xs text-muted-foreground">
            {APP_NAME_HELP_TEXT}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function GeneralTabThemeCard({
  canEdit,
  setThemePreference,
  themePreference,
}: {
  canEdit: boolean;
  setThemePreference: (value: ThemePreference) => void;
  themePreference: ThemePreference;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-primary" />
          Theme Settings
        </CardTitle>
        <CardDescription>
          Configure the default theme for new users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme-preference">Default Theme</Label>
            <Select
              value={themePreference}
              onValueChange={(value) => setThemePreference(value as ThemePreference)}
              disabled={!canEdit}
            >
              <SelectTrigger id="theme-preference" className="w-full">
                <SelectValue placeholder="Select default theme" />
              </SelectTrigger>
              <SelectContent>
                {THEME_PREFERENCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <ThemePreferenceIcon icon={option.icon} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {THEME_PREFERENCE_HELP_TEXT}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function GeneralTabGenerativeAiCard({
  canEdit,
  generativeAICanvasMode,
  setGenerativeAICanvasMode,
}: {
  canEdit: boolean;
  generativeAICanvasMode: boolean;
  setGenerativeAICanvasMode: (value: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          Generative AI Assistant
        </CardTitle>
        <CardDescription>
          Configure advanced features for the Generative AI Assistant
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="generative-ai-canvas-mode">Canvas Mode</Label>
              <p className="text-xs text-muted-foreground">
                {GENERATIVE_AI_CANVAS_HELP_TEXT}
              </p>
            </div>
            <Switch
              id="generative-ai-canvas-mode"
              checked={generativeAICanvasMode}
              onCheckedChange={setGenerativeAICanvasMode}
              disabled={!canEdit}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ThemePreferenceIcon({ icon }: { icon: ThemePreferenceIconKey }) {
  const themeOptionIcons: Record<ThemePreferenceIconKey, React.ReactNode> = {
    sun: <Sun className="h-4 w-4" />,
    moon: <Moon className="h-4 w-4" />,
    system: <RotateCcw className="h-4 w-4" />,
  };

  return themeOptionIcons[icon];
}
