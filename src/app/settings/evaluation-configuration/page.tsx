"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Target, Brain, Users, Settings } from 'lucide-react';
import ExpertiseGroupsAndSkillsTabV2 from '@/components/settings/ExpertiseGroupsAndSkillsTabV2';
import PersonalityGroupsAndTraitsTabV2 from '@/components/settings/PersonalityGroupsAndTraitsTabV2';
import { cn } from '@/lib/utils';

export default function EvaluationConfigurationPage() {
  const [activeTab, setActiveTab] = useState('expertise-groups-skills');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Evaluation Configuration</h1>
          <p className="text-muted-foreground">
            Configure evaluation modules, expertise skills, and personality assessments
          </p>
        </div>
      </div>

    

      <div className="space-y-6">
        <div className="flex w-full border-b border-border/50 mb-6">
          <div
            onClick={() => setActiveTab('expertise-groups-skills')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'expertise-groups-skills'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Brain className="h-4 w-4" />
            Expertise Groups & Skills
          </div>
          <div
            onClick={() => setActiveTab('personality-groups-traits')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'personality-groups-traits'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Users className="h-4 w-4" />
            Personality Groups & Traits
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'expertise-groups-skills' && (
            <ExpertiseGroupsAndSkillsTabV2 />
          )}

          {activeTab === 'personality-groups-traits' && (
            <PersonalityGroupsAndTraitsTabV2 />
          )}
        </div>
      </div>
    </div>
  );
}
