"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Target, Brain, Users, Settings, FileText } from 'lucide-react';
import TreeView from '@/components/settings/TreeView';
import SkillTemplatesTab from '@/components/settings/SkillTemplatesTab';
import EvaluationLinksTab from '@/components/settings/EvaluationLinksTab';
import { cn } from '@/lib/utils';

export default function EvaluationConfigurationPage() {
  const [activeTab, setActiveTab] = useState('expertise-groups-skills');

  return (
    <div className="container mx-auto p-6 space-y-6">
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
           role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
            <Brain className="h-4 w-4" />
            Expertise Categories & Skills
          </div>
          <div
            onClick={() => setActiveTab('personality-groups-traits')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'personality-groups-traits'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
           role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
            <Users className="h-4 w-4" />
            Personality Categories & Traits
          </div>
          <div
            onClick={() => setActiveTab('skill-templates')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'skill-templates'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
           role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
            <FileText className="h-4 w-4" />
            Skill Templates
          </div>
          <div
            onClick={() => setActiveTab('evaluation-links')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'evaluation-links'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
           role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
            <Settings className="h-4 w-4" />
            Evaluation Links
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6 bg-background rounded-lg border">
          {activeTab === 'expertise-groups-skills' && (
            <TreeView
              title="Expertise Categories & Skills"
              categoryTitle="Expertise Categories"
              itemTitle="Expertise Skills"
              categoriesEndpoint="/api/v1/evaluation/expertise-groups"
              itemsEndpoint="/api/v1/evaluation/expertise-skills"
            />
          )}

          {activeTab === 'personality-groups-traits' && (
            <TreeView
              title="Personality Categories & Traits"
              categoryTitle="Personality Categories"
              itemTitle="Personality Traits"
              categoriesEndpoint="/api/v1/evaluation/personality-groups"
              itemsEndpoint="/api/v1/evaluation/personality-traits"
              isPersonalityTraits={true}
            />
          )}

          {activeTab === 'skill-templates' && (
            <SkillTemplatesTab />
          )}

          {activeTab === 'evaluation-links' && (
            <EvaluationLinksTab />
          )}
        </div>
      </div>
    </div>
  );
}
