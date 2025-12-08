"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Search, BrainCircuit, Target, Settings, X, Edit, Trash2, Heart, CheckCircle, Circle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileTemplateSelector } from './MobileTemplateSelector';

interface ExpertiseGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  skills: ExpertiseSkill[];
}

interface ExpertiseSkill {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  skillType: 'hard_skill' | 'test_score';
  isActive: boolean;
  sortOrder: number;
  groupId?: string;
  group?: ExpertiseGroup;
}

interface PersonalityGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  traits: PersonalityTrait[];
}

interface PersonalityTrait {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  groupId?: string;
  group?: PersonalityGroup;
}

interface PositionExpertiseSkill {
  id: string;
  positionId: string;
  skillId: string;
  isRequired: boolean;
  weight: number;
  minScore?: number;
  skill: ExpertiseSkill;
}

interface PositionPersonalityTrait {
  id: string;
  positionId: string;
  traitId: string;
  isRequired: boolean;
  weight: number;
  trait: PersonalityTrait;
}

interface EvaluationConfigTabProps {
  positionId: string;
  positionTitle: string;
}

export function EvaluationConfigTab({ positionId, positionTitle }: EvaluationConfigTabProps) {
  const isMobile = useIsMobile();
  const [activeSubTab, setActiveSubTab] = useState('template');

  // Expertise Skills State
  const [expertiseGroups, setExpertiseGroups] = useState<ExpertiseGroup[]>([]);
  const [expertiseSkills, setExpertiseSkills] = useState<ExpertiseSkill[]>([]);
  const [positionExpertiseSkills, setPositionExpertiseSkills] = useState<PositionExpertiseSkill[]>([]);
  const [isLoadingExpertise, setIsLoadingExpertise] = useState(true);

  // Personality Traits State
  const [personalityGroups, setPersonalityGroups] = useState<PersonalityGroup[]>([]);
  const [personalityTraits, setPersonalityTraits] = useState<PersonalityTrait[]>([]);
  const [positionPersonalityTraits, setPositionPersonalityTraits] = useState<PositionPersonalityTrait[]>([]);
  const [isLoadingPersonality, setIsLoadingPersonality] = useState(true);

  // Modal States
  const [isAddExpertiseModalOpen, setIsAddExpertiseModalOpen] = useState(false);
  const [isAddPersonalityModalOpen, setIsAddPersonalityModalOpen] = useState(false);
  const [selectedExpertiseSkillId, setSelectedExpertiseSkillId] = useState('');
  const [expertiseSearchTerm, setExpertiseSearchTerm] = useState('');
  const [personalitySearchTerm, setPersonalitySearchTerm] = useState('');

  // Form States
  const [isAddingExpertise, setIsAddingExpertise] = useState(false);
  const [isAddingPersonality, setIsAddingPersonality] = useState(false);
  const [isRemovingExpertise, setIsRemovingExpertise] = useState<string | null>(null);
  const [isRemovingPersonality, setIsRemovingPersonality] = useState<string | null>(null);

  // Modal search states
  const [modalExpertiseSearchTerm, setModalExpertiseSearchTerm] = useState('');
  const [modalPersonalitySearchTerm, setModalPersonalitySearchTerm] = useState('');
  const [isExpertiseDropdownOpen, setIsExpertiseDropdownOpen] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<Array<{ id: string, name: string }>>([]);
  const [selectedTraits, setSelectedTraits] = useState<Array<{ id: string, name: string }>>([]);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Template/Custom selection states
  const [isAddMethodModalOpen, setIsAddMethodModalOpen] = useState(false);
  const [selectedAddMethod, setSelectedAddMethod] = useState<'template' | 'custom' | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Templates state (for indicating skills already in template)
  const [templates, setTemplates] = useState<Array<{
    id: string;
    name: string;
    templateGroups?: Array<{ id: string; group: { id: string; name: string } }>;
    templateSkills?: Array<{ id: string; skill: { id: string; name: string } }>;
    templatePersonalityGroups?: Array<{ id: string; group: { id: string; name: string } }>;
    templatePersonalityTraits?: Array<{ id: string; trait: { id: string; name: string } }>;
  }>>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;
  const templateSkillIds = (selectedTemplate?.templateSkills || []).map(ts => ts.skill.id);
  const templateTraitIds = (selectedTemplate?.templatePersonalityTraits || []).map(tt => tt.trait.id);
  const [templateSearch, setTemplateSearch] = useState('');

  // Determine if the selected template is already fully applied to this position
  const isTemplateFullyApplied = React.useMemo(() => {
    if (!selectedTemplate) return false;
    const skillIds = new Set((selectedTemplate.templateSkills || []).map((ts: any) => ts.skill.id));
    const traitIds = new Set((selectedTemplate.templatePersonalityTraits || []).map((tt: any) => tt.trait.id));
    const hasAllSkills = Array.from(skillIds).every(id => positionExpertiseSkills.some(p => p.skillId === id));
    const hasAllTraits = Array.from(traitIds).every(id => positionPersonalityTraits.some(p => p.traitId === id));
    return hasAllSkills && hasAllTraits;
  }, [selectedTemplate, positionExpertiseSkills, positionPersonalityTraits]);

  // Refs for click outside detection
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load expertise skills
  const loadExpertiseSkills = async () => {
    try {
      const response = await fetch('/api/evaluation/expertise-skills');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load expertise skills:', response.status, response.statusText, errorData);
        throw new Error(`Failed to load expertise skills: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setExpertiseSkills(data.skills || []);
      setExpertiseGroups(data.groups || []);
    } catch (error) {
      console.error('Error loading expertise skills:', error);
      toast.error('Failed to load expertise skills');
    }
  };

  const loadPositionExpertiseSkills = async () => {
    try {
      const response = await fetch(`/api/positions/${positionId}/expertise-skills`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load position expertise skills:', response.status, response.statusText, errorData);
        throw new Error(`Failed to load position expertise skills: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setPositionExpertiseSkills(data || []);
    } catch (error) {
      console.error('Error loading position expertise skills:', error);
      toast.error('Failed to load position expertise skills');
    }
  };

  // Load personality traits
  const loadPersonalityTraits = async () => {
    try {
      const response = await fetch('/api/evaluation/personality-traits');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load personality traits:', response.status, response.statusText, errorData);
        throw new Error(`Failed to load personality traits: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setPersonalityTraits(data.traits || []);
      setPersonalityGroups(data.groups || []);
    } catch (error) {
      console.error('Error loading personality traits:', error);
      toast.error('Failed to load personality traits');
    }
  };

  const loadPositionPersonalityTraits = async () => {
    try {
      const response = await fetch(`/api/positions/${positionId}/personality-traits`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load position personality traits:', response.status, response.statusText, errorData);
        throw new Error(`Failed to load position personality traits: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setPositionPersonalityTraits(data || []);
    } catch (error) {
      console.error('Error loading position personality traits:', error);
      toast.error('Failed to load position personality traits');
    }
  };

  // Add expertise skills to position
  const handleAddExpertiseSkills = async () => {
    if (selectedSkills.length === 0) return;

    setIsAddingExpertise(true);
    try {
      // Add all selected skills
      const promises = selectedSkills.map(skill =>
        fetch(`/api/positions/${positionId}/expertise-skills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillId: skill.id }),
        })
      );

      const responses = await Promise.all(promises);

      // Check if all requests were successful
      const failedResponses = responses.filter(response => !response.ok);
      if (failedResponses.length > 0) {
        throw new Error('Some skills failed to add');
      }

      toast.success(`${selectedSkills.length} skill${selectedSkills.length > 1 ? 's' : ''} added successfully`);
      setIsAddExpertiseModalOpen(false);
      setSelectedSkills([]);
      setModalExpertiseSearchTerm('');
      setIsExpertiseDropdownOpen(false);
      loadPositionExpertiseSkills();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsAddingExpertise(false);
    }
  };

  // Handle skill selection from search
  const handleSkillSelect = (skillId: string) => {
    const existing = selectedSkills.find(s => s.id === skillId);
    if (existing) {
      // Toggle off if already selected
      setSelectedSkills(prev => prev.filter(s => s.id !== skillId));
      return;
    }
    const skill = expertiseSkills.find(s => s.id === skillId);
    if (skill) {
      setSelectedSkills(prev => [...prev, { id: skill.id, name: skill.name }]);
    }
  };

  const handleToggleSelectAllInGroup = (groupId: string | 'ungrouped') => {
    const assignedIds = new Set(positionExpertiseSkills.map(p => p.skillId));
    const groupSkills = expertiseSkills
      .filter(s => !assignedIds.has(s.id))
      .filter(s => (groupId === 'ungrouped' ? !s.groupId : s.groupId === groupId))
      .filter(s =>
        s.name.toLowerCase().includes(modalExpertiseSearchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(modalExpertiseSearchTerm.toLowerCase())
      );
    if (groupSkills.length === 0) return;
    const selectedIds = new Set(selectedSkills.map(s => s.id));
    const allSelected = groupSkills.every(s => selectedIds.has(s.id));
    if (allSelected) {
      // Deselect all in group
      setSelectedSkills(prev => prev.filter(s => !groupSkills.some(gs => gs.id === s.id)));
    } else {
      // Select all missing in group
      const toAdd = groupSkills.filter(s => !selectedIds.has(s.id)).map(s => ({ id: s.id, name: s.name }));
      if (toAdd.length > 0) setSelectedSkills(prev => [...prev, ...toAdd]);
    }
  };

  // Remove skill from selected list
  const handleRemoveSelectedSkill = (skillId: string) => {
    setSelectedSkills(prev => prev.filter(s => s.id !== skillId));
  };

  // Handle add method selection
  const handleAddMethodSelect = (method: 'template' | 'custom') => {
    setSelectedAddMethod(method);
    setIsAddMethodModalOpen(false);

    if (method === 'template') {
      setIsTemplateModalOpen(true);
    } else {
      // Open the existing custom modal
      setIsAddExpertiseModalOpen(true);
    }
  };

  // Apply selected template to this position
  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !positionId) return;
    setIsApplyingTemplate(true);
    try {
      // Save template ID first
      await saveTemplateId(selectedTemplate.id);

      const alreadySkillIds = new Set(positionExpertiseSkills.map(p => p.skillId));
      const alreadyTraitIds = new Set(positionPersonalityTraits.map(p => p.traitId));

      const templateGroupIds = (selectedTemplate.templateGroups || []).map((tg: any) => tg.group.id);
      const templateSkillIds = (selectedTemplate.templateSkills || []).map((ts: any) => ts.skill.id);
      const templatePersonalityGroupIds = (selectedTemplate.templatePersonalityGroups || []).map((tpg: any) => tpg.group.id);
      const templateTraitIds = (selectedTemplate.templatePersonalityTraits || []).map((tt: any) => tt.trait.id);

      const toAddGroupIds = templateGroupIds.filter((id: string) => {
        // Check if group is already assigned (we need to check positionExpertiseGroups if it exists)
        // For now, we'll add all groups and let the API handle duplicates
        return true;
      });
      const toAddSkillIds = templateSkillIds.filter((id: string) => !alreadySkillIds.has(id));
      const toAddPersonalityGroupIds = templatePersonalityGroupIds.filter((id: string) => {
        // Check if personality group is already assigned
        // For now, we'll add all groups and let the API handle duplicates
        return true;
      });
      const toAddTraitIds = templateTraitIds.filter((id: string) => !alreadyTraitIds.has(id));

      if (toAddGroupIds.length === 0 && toAddSkillIds.length === 0 && toAddPersonalityGroupIds.length === 0 && toAddTraitIds.length === 0) {
        toast.success('Template already applied');
      } else {
        const failedNames: string[] = [];
        let addedCount = 0;

        // Map id -> name for clearer errors
        const groupIdToName = new Map<string, string>(expertiseGroups.map(g => [g.id, g.name]));
        const skillIdToName = new Map<string, string>(expertiseSkills.map(s => [s.id, s.name]));
        const personalityGroupIdToName = new Map<string, string>(personalityGroups.map(g => [g.id, g.name]));
        const traitIdToName = new Map<string, string>(personalityTraits.map(t => [t.id, t.name]));

        // Build tasks with type to keep messages clear
        const tasks: Array<() => Promise<{ ok: boolean; status?: number; id: string; name: string }>> = [];

        // Add expertise groups
        toAddGroupIds.forEach((groupId: string) => {
          const name = groupIdToName.get(groupId) || groupId;
          tasks.push(async () => {
            try {
              const res = await fetch(`/api/v1/positions/${positionId}/evaluation/expertise-groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, isRequired: false, weight: 1.0 })
              });
              return { ok: res.ok || res.status === 400, status: res.status, id: groupId, name };
            } catch (_) {
              return { ok: false, id: groupId, name };
            }
          });
        });

        // Add expertise skills
        toAddSkillIds.forEach((skillId: string) => {
          const name = skillIdToName.get(skillId) || skillId;
          tasks.push(async () => {
            try {
              const res = await fetch(`/api/positions/${positionId}/expertise-skills`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skillId })
              });
              return { ok: res.ok || res.status === 409, status: res.status, id: skillId, name };
            } catch (_) {
              return { ok: false, id: skillId, name };
            }
          });
        });

        // Add personality groups
        toAddPersonalityGroupIds.forEach((groupId: string) => {
          const name = personalityGroupIdToName.get(groupId) || groupId;
          tasks.push(async () => {
            try {
              const res = await fetch(`/api/v1/positions/${positionId}/evaluation/personality-groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, isRequired: false, weight: 1.0 })
              });
              return { ok: res.ok || res.status === 400, status: res.status, id: groupId, name };
            } catch (_) {
              return { ok: false, id: groupId, name };
            }
          });
        });

        // Add personality traits
        toAddTraitIds.forEach((traitId: string) => {
          const name = traitIdToName.get(traitId) || traitId;
          tasks.push(async () => {
            try {
              const res = await fetch(`/api/positions/${positionId}/personality-traits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ traitId })
              });
              return { ok: res.ok || res.status === 409, status: res.status, id: traitId, name };
            } catch (_) {
              return { ok: false, id: traitId, name };
            }
          });
        });

        // Run with limited concurrency for speed without overloading
        const concurrency = 8;
        let index = 0;
        async function runNext(): Promise<void> {
          if (index >= tasks.length) return;
          const currentIndex = index++;
          const result = await tasks[currentIndex]();
          if (result.ok) {
            // Count only successful creates (status 200/201); 409/400 is treated as ok but not added
            if (!result.status || (result.status >= 200 && result.status < 300)) {
              addedCount += 1;
            }
          } else {
            failedNames.push(result.name);
          }
          return runNext();
        }

        const runners = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext());
        await Promise.all(runners);

        if (failedNames.length > 0) {
          toast.error(`Some items failed to add: ${failedNames.slice(0, 5).join(', ')}${failedNames.length > 5 ? '…' : ''}`);
        }
        if (addedCount > 0 && failedNames.length === 0) {
          toast.success(`Template applied successfully (${addedCount} items added)`);
        } else if (addedCount > 0) {
          toast.success(`${addedCount} items added`);
        }
      }

      // Refresh assigned lists
      await Promise.all([loadPositionExpertiseSkills(), loadPositionPersonalityTraits()]);
    } catch (e) {
      toast.error('Failed to apply template');
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  // Add personality traits to position
  const handleAddPersonalityTraits = async () => {
    if (selectedTraits.length === 0) return;

    setIsAddingPersonality(true);
    try {
      // Add all selected traits
      const promises = selectedTraits.map(trait =>
        fetch(`/api/positions/${positionId}/personality-traits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ traitId: trait.id }),
        })
      );

      const responses = await Promise.all(promises);

      // Check if all requests were successful
      const failedResponses = responses.filter(response => !response.ok);
      if (failedResponses.length > 0) {
        throw new Error('Some traits failed to add');
      }

      toast.success(`${selectedTraits.length} trait${selectedTraits.length > 1 ? 's' : ''} added successfully`);
      setIsAddPersonalityModalOpen(false);
      setSelectedTraits([]);
      setModalPersonalitySearchTerm('');
      loadPositionPersonalityTraits();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsAddingPersonality(false);
    }
  };

  // Handle trait selection from search
  const handleTraitSelect = (traitId: string) => {
    const existing = selectedTraits.find(t => t.id === traitId);
    if (existing) {
      // Toggle off if already selected
      setSelectedTraits(prev => prev.filter(t => t.id !== traitId));
      return;
    }
    const trait = personalityTraits.find(t => t.id === traitId);
    if (trait) {
      setSelectedTraits(prev => [...prev, { id: trait.id, name: trait.name }]);
    }
  };

  const handleToggleSelectAllInGroupPersonality = (groupId: string | 'ungrouped') => {
    const assignedIds = new Set(positionPersonalityTraits.map(p => p.traitId));
    const groupTraits = personalityTraits
      .filter(t => !assignedIds.has(t.id))
      .filter(t => (groupId === 'ungrouped' ? !t.groupId : t.groupId === groupId))
      .filter(t =>
        t.name.toLowerCase().includes(modalPersonalitySearchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(modalPersonalitySearchTerm.toLowerCase())
      );
    if (groupTraits.length === 0) return;
    const selectedIds = new Set(selectedTraits.map(t => t.id));
    const allSelected = groupTraits.every(t => selectedIds.has(t.id));
    if (allSelected) {
      // Deselect all in group
      setSelectedTraits(prev => prev.filter(t => !groupTraits.some(gt => gt.id === t.id)));
    } else {
      // Select all missing in group
      const toAdd = groupTraits.filter(t => !selectedIds.has(t.id)).map(t => ({ id: t.id, name: t.name }));
      if (toAdd.length > 0) setSelectedTraits(prev => [...prev, ...toAdd]);
    }
  };

  // Remove trait from selected list
  const handleRemoveSelectedTrait = (traitId: string) => {
    setSelectedTraits(prev => prev.filter(t => t.id !== traitId));
  };

  // Remove expertise skill from position
  const handleRemoveExpertiseSkill = async (assignmentId: string, skillName: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setIsRemovingExpertise(assignmentId);
    try {
      const response = await fetch(`/api/positions/${positionId}/expertise-skills/${assignmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `Failed to remove expertise skill (${response.status})`;
        throw new Error(errorMessage);
      }

      toast.success(`${skillName} removed successfully`);
      await loadPositionExpertiseSkills();
    } catch (error) {
      console.error('Error removing expertise skill:', error);
      toast.error((error as Error).message || 'Failed to remove expertise skill');
    } finally {
      setIsRemovingExpertise(null);
    }
  };

  // Remove personality trait from position
  const handleRemovePersonalityTrait = async (assignmentId: string, traitName: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setIsRemovingPersonality(assignmentId);
    try {
      const response = await fetch(`/api/positions/${positionId}/personality-traits/${assignmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `Failed to remove personality trait (${response.status})`;
        throw new Error(errorMessage);
      }

      toast.success(`${traitName} removed successfully`);
      await loadPositionPersonalityTraits();
    } catch (error) {
      console.error('Error removing personality trait:', error);
      toast.error((error as Error).message || 'Failed to remove personality trait');
    } finally {
      setIsRemovingPersonality(null);
    }
  };

  // Load saved template ID from position
  const loadSavedTemplateId = async () => {
    try {
      const response = await fetch(`/api/positions/${positionId}`);
      if (response.ok) {
        const position = await response.json();
        const savedTemplateId = position.custom_attributes?.evaluationTemplateId;
        if (savedTemplateId) {
          setSelectedTemplateId(savedTemplateId);
        }
      }
    } catch (error) {
      console.error('Error loading saved template ID:', error);
    }
  };

  // Save template ID to position
  const saveTemplateId = async (templateId: string | null) => {
    try {
      // Get current position data
      const positionResponse = await fetch(`/api/positions/${positionId}`);
      if (!positionResponse.ok) return;

      const position = await positionResponse.json();
      const currentCustomAttributes = position.custom_attributes || {};

      // Update customAttributes with templateId
      const updatedCustomAttributes = {
        ...currentCustomAttributes,
        evaluationTemplateId: templateId || undefined
      };

      // Remove the key if templateId is null
      if (!templateId) {
        delete updatedCustomAttributes.evaluationTemplateId;
      }

      // Save to position
      await fetch(`/api/positions/${positionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_attributes: updatedCustomAttributes })
      });
    } catch (error) {
      console.error('Error saving template ID:', error);
      // Don't show error toast as this is a background operation
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!positionId || positionId === 'null' || positionId === 'undefined') {
        console.warn('Invalid positionId:', positionId);
        return;
      }

      setIsLoadingExpertise(true);
      setIsLoadingPersonality(true);
      setIsLoadingTemplates(true);
      try {
        function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T | void> {
          return Promise.race([
            p,
            new Promise<void>((resolve) => setTimeout(resolve, ms))
          ]);
        }
        await Promise.all([
          withTimeout(loadExpertiseSkills()),
          withTimeout(loadPositionExpertiseSkills()),
          withTimeout(loadPersonalityTraits()),
          withTimeout(loadPositionPersonalityTraits())
        ]);
        // Load templates (used for display and indicator in add-skill)
        try {
          const res = await fetch('/api/v1/evaluation/skill-templates');
          if (res.ok) {
            const data = await res.json();
            setTemplates(Array.isArray(data) ? data : []);
          } else {
            setTemplates([]);
          }
        } catch {
          setTemplates([]);
        }
        // Load saved template ID
        await loadSavedTemplateId();
      } finally {
        setIsLoadingExpertise(false);
        setIsLoadingPersonality(false);
        setIsLoadingTemplates(false);
      }
    };

    loadData();
  }, [positionId]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpertiseDropdownOpen(false);
      }
    };

    if (isExpertiseDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpertiseDropdownOpen]);

  // Filter available expertise skills (exclude already assigned)
  const assignedExpertiseSkillIds = positionExpertiseSkills.map(p => p.skillId);
  const filteredAvailableExpertiseSkills = expertiseSkills.filter(skill =>
    !assignedExpertiseSkillIds.includes(skill.id) &&
    (skill.name.toLowerCase().includes(expertiseSearchTerm.toLowerCase()) ||
      skill.description?.toLowerCase().includes(expertiseSearchTerm.toLowerCase()))
  );

  // Filter skills for modal search
  const filteredModalExpertiseSkills = expertiseSkills.filter(skill =>
    !assignedExpertiseSkillIds.includes(skill.id) &&
    (skill.name.toLowerCase().includes(modalExpertiseSearchTerm.toLowerCase()) ||
      skill.description?.toLowerCase().includes(modalExpertiseSearchTerm.toLowerCase()))
  );

  // Filter available personality traits (exclude already assigned)
  const assignedPersonalityTraitIds = positionPersonalityTraits.map(p => p.traitId);
  const filteredAvailablePersonalityTraits = personalityTraits.filter(trait =>
    !assignedPersonalityTraitIds.includes(trait.id) &&
    (trait.name.toLowerCase().includes(personalitySearchTerm.toLowerCase()) ||
      trait.description?.toLowerCase().includes(personalitySearchTerm.toLowerCase()))
  );

  // Filter traits for modal search
  const filteredModalPersonalityTraits = personalityTraits.filter(trait =>
    !assignedPersonalityTraitIds.includes(trait.id) &&
    (trait.name.toLowerCase().includes(modalPersonalitySearchTerm.toLowerCase()) ||
      trait.description?.toLowerCase().includes(modalPersonalitySearchTerm.toLowerCase()))
  );

  // Filter assigned skills/traits based on search
  const filteredPositionExpertiseSkills = positionExpertiseSkills.filter(posSkill =>
    posSkill.skill.name.toLowerCase().includes(expertiseSearchTerm.toLowerCase()) ||
    posSkill.skill.description?.toLowerCase().includes(expertiseSearchTerm.toLowerCase())
  );

  const filteredPositionPersonalityTraits = positionPersonalityTraits.filter(posTrait =>
    posTrait.trait.name.toLowerCase().includes(personalitySearchTerm.toLowerCase()) ||
    posTrait.trait.description?.toLowerCase().includes(personalitySearchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-6">
      {/* Sub-tabs */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex w-full border-b border-border/50 mb-6">
          <div
            onClick={() => setActiveSubTab('template')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeSubTab === 'template'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Settings className="h-4 w-4" />
            Template
          </div>
          <div
            onClick={() => setActiveSubTab('expertise')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeSubTab === 'expertise'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <BrainCircuit className="h-4 w-4" />
            Expertise Skills
          </div>
          <div
            onClick={() => setActiveSubTab('personality')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeSubTab === 'personality'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Target className="h-4 w-4" />
            Personality Traits
          </div>
        </div>

        {/* Template Tab */}
        {activeSubTab === 'template' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Template</h3>
              </div>
            </div>
            <ScrollArea className="flex-1 h-full">
              <div className="space-y-4 pr-4">
                <div className="w-full">
                  <Label>Select Template</Label>
                  <Select
                    value={selectedTemplateId || undefined}
                    onValueChange={async (v) => {
                      const newTemplateId = v === 'none' ? '' : v;
                      setSelectedTemplateId(newTemplateId);
                      // Save template selection immediately
                      await saveTemplateId(newTemplateId || null);
                    }}
                  >
                    <SelectTrigger className="w-full h-12 text-base px-4">
                      <SelectValue placeholder={isLoadingTemplates ? 'Loading templates...' : 'Choose a template (optional)'} />
                    </SelectTrigger>
                    <SelectContent className="w-[--radix-select-trigger-width] min-w-[420px] p-0" selectId="evaluation-template-select">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search templates..."
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <SelectItem value="none" className="py-4 px-3 text-muted-foreground">None (Clear selection)</SelectItem>
                      {templates
                        .filter(t => {
                          const q = templateSearch.toLowerCase();
                          const name = t.name?.toLowerCase() || '';
                          const desc = ((t as any).description || '').toLowerCase();
                          return !q || name.includes(q) || desc.includes(q);
                        })
                        .map(t => (
                          <SelectItem key={t.id} value={t.id} className="py-4 px-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{t.name}</span>
                              {/** @ts-ignore description may exist from API */}
                              <span className="text-xs text-muted-foreground line-clamp-2">{(t as any).description || 'No description'}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTemplate && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">Selected: {selectedTemplate.name}</CardTitle>
                          <CardDescription>
                            <span className="text-sm">
                              {(selectedTemplate.templateSkills?.length || 0)} expertise skills · {(selectedTemplate.templatePersonalityTraits?.length || 0)} personality traits
                            </span>
                          </CardDescription>
                        </div>
                        {isTemplateFullyApplied ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground -mt-1"
                            onClick={async () => {
                              setSelectedTemplateId('');
                              await saveTemplateId(null);
                            }}
                            title="Unlink template"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Unlink
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!selectedTemplate || isApplyingTemplate}
                            onClick={handleApplyTemplate}
                            title="Apply template"
                          >
                            {isApplyingTemplate ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                Saving
                              </>
                            ) : (
                              'Save'
                            )}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Expertise Tree */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <BrainCircuit className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Expertise</span>
                          </div>
                          <div className="space-y-2">
                            {expertiseGroups.map((group) => {
                              const groupSkills = (selectedTemplate.templateSkills || []).filter((ts: any) => ts.skill?.groupId === group.id);
                              if (groupSkills.length === 0) return null;
                              return (
                                <div key={`exp-group-${group.id}`} className="">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                                    <span className="text-sm font-semibold">{group.name}</span>
                                    <span className="text-xs text-muted-foreground">({groupSkills.length})</span>
                                  </div>
                                  <div className="mt-1 ml-5 space-y-1">
                                    {groupSkills.map((ts: any) => (
                                      <div key={ts.id} className="flex items-center gap-2 text-sm">
                                        <BrainCircuit className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>{ts.skill.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            {/* Ungrouped expertise skills */}
                            {(() => {
                              const groupedSkillIds = new Set(expertiseGroups.flatMap((g) =>
                                (selectedTemplate.templateSkills || []).filter((ts: any) => ts.skill?.groupId === g.id).map((ts: any) => ts.skill.id)
                              )) as Set<string>;
                              const ungrouped = (selectedTemplate.templateSkills || []).filter((ts: any) => !ts.skill?.groupId || !groupedSkillIds.has(ts.skill.id));
                              if (ungrouped.length === 0) return null;
                              return (
                                <div>
                                  <div className="text-sm font-semibold">Other Skills</div>
                                  <div className="mt-1 ml-5 space-y-1">
                                    {ungrouped.map((ts: any) => (
                                      <div key={`exp-ungrouped-${ts.id}`} className="flex items-center gap-2 text-sm">
                                        <BrainCircuit className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>{ts.skill.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <Separator />

                        {/* Personality Tree */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Heart className="h-4 w-4 text-pink-500" />
                            <span className="text-sm font-medium">Personality</span>
                          </div>
                          <div className="space-y-2">
                            {personalityGroups.map((group) => {
                              const groupTraits = (selectedTemplate.templatePersonalityTraits || []).filter((tt: any) => tt.trait?.groupId === group.id);
                              if (groupTraits.length === 0) return null;
                              return (
                                <div key={`pers-group-${group.id}`} className="">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                                    <span className="text-sm font-semibold">{group.name}</span>
                                    <span className="text-xs text-muted-foreground">({groupTraits.length})</span>
                                  </div>
                                  <div className="mt-1 ml-5 space-y-1">
                                    {groupTraits.map((tt: any) => (
                                      <div key={tt.id} className="flex items-center gap-2 text-sm">
                                        <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>{tt.trait.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            {/* Ungrouped personality traits */}
                            {(() => {
                              const groupedTraitIds = new Set(personalityGroups.flatMap((g) =>
                                (selectedTemplate.templatePersonalityTraits || []).filter((tt: any) => tt.trait?.groupId === g.id).map((tt: any) => tt.trait.id)
                              )) as Set<string>;
                              const ungrouped = (selectedTemplate.templatePersonalityTraits || []).filter((tt: any) => !tt.trait?.groupId || !groupedTraitIds.has(tt.trait.id));
                              if (ungrouped.length === 0) return null;
                              return (
                                <div>
                                  <div className="text-sm font-semibold">Other Traits</div>
                                  <div className="mt-1 ml-5 space-y-1">
                                    {ungrouped.map((tt: any) => (
                                      <div key={`pers-ungrouped-${tt.id}`} className="flex items-center gap-2 text-sm">
                                        <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>{tt.trait.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      {/* Removed bottom-right Save area; action shown in header */}
                    </CardContent>
                  </Card>
                )}
                {!selectedTemplate && (
                  <Card>
                    <CardContent className="py-6 text-sm text-muted-foreground">
                      Optionally pick a template to guide your skill selection.
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Expertise Skills Tab */}
        {activeSubTab === 'expertise' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Expertise Skills</h3>
                <Badge variant="secondary">{positionExpertiseSkills.length} assigned</Badge>
              </div>

              <Sheet open={isAddExpertiseModalOpen} onOpenChange={setIsAddExpertiseModalOpen}>
                <Button onClick={() => setIsAddExpertiseModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Skill
                </Button>
                <SheetContent side="right" className="w-[50vw] min-w-[800px] max-w-none p-0" sheetId="add-expertise-skill-drawer">
                  <div className="h-full flex flex-col">
                    <SheetHeader className="p-4 border-b">
                      <SheetTitle>Add Expertise Skills</SheetTitle>
                      <SheetDescription>Select multiple skills to add to "{positionTitle}"</SheetDescription>
                    </SheetHeader>
                    <div className="p-4 space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search skills..."
                          value={modalExpertiseSearchTerm}
                          onChange={(e) => setModalExpertiseSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {selectedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedSkills.map((skill) => (
                            <Badge key={skill.id} variant="secondary" className="flex items-center gap-1">
                              {skill.name}
                              <button onClick={() => handleRemoveSelectedSkill(skill.id)} className="ml-1 hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="border rounded-md max-h-[60vh] overflow-y-auto">
                        {(() => {
                          const content: React.ReactNode[] = [];
                          const selectedIds = new Set(selectedSkills.map(s => s.id));
                          // Render grouped skills by expertiseGroups order
                          expertiseGroups.forEach(group => {
                            const groupItems = filteredModalExpertiseSkills.filter(s => s.groupId === group.id);
                            if (groupItems.length === 0) return;
                            const allSelected = groupItems.every(s => selectedIds.has(s.id));
                            content.push(
                              <div key={`group-${group.id}`} className="border-b last:border-b-0">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                                    <span className="text-sm font-medium">{group.name}</span>
                                    <Badge variant="secondary" className="text-xs">{groupItems.length}</Badge>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleToggleSelectAllInGroup(group.id)}>
                                    {allSelected ? 'Deselect All' : 'Select All'}
                                  </Button>
                                </div>
                                <div>
                                  {groupItems.map(skill => {
                                    const inTemplate = templateSkillIds.includes(skill.id);
                                    const isSelected = selectedIds.has(skill.id);
                                    return (
                                      <div
                                        key={skill.id}
                                        className={cn(
                                          "p-3 cursor-pointer hover:bg-muted/50 border-t first:border-t-0",
                                          isSelected && "bg-primary/10 border-primary/20"
                                        )}
                                        onClick={() => handleSkillSelect(skill.id)}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-start gap-3">
                                            {isSelected ? (
                                              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                                            ) : (
                                              <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            )}
                                            <div className={cn("flex flex-col", inTemplate && "opacity-60")}>
                                              <span className="font-medium">{skill.name}</span>
                                              <span className="text-sm text-muted-foreground">{skill.description || 'No description'}</span>
                                              <span className="text-xs text-muted-foreground">Max Score: {skill.maxScore} | Type: {skill.skillType}</span>
                                            </div>
                                          </div>
                                          {inTemplate && (
                                            <Badge variant="outline" className="h-5 text-[10px] mt-0.5">already add on template</Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });

                          // Ungrouped
                          const ungroupedItems = filteredModalExpertiseSkills.filter(s => !s.groupId);
                          if (ungroupedItems.length > 0) {
                            const allUngroupedSelected = ungroupedItems.every(s => selectedIds.has(s.id));
                            content.push(
                              <div key={`group-ungrouped`} className="border-b last:border-b-0">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Other Skills</span>
                                    <Badge variant="secondary" className="text-xs">{ungroupedItems.length}</Badge>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleToggleSelectAllInGroup('ungrouped')}>
                                    {allUngroupedSelected ? 'Deselect All' : 'Select All'}
                                  </Button>
                                </div>
                                <div>
                                  {ungroupedItems.map(skill => {
                                    const inTemplate = templateSkillIds.includes(skill.id);
                                    const isSelected = selectedIds.has(skill.id);
                                    return (
                                      <div
                                        key={skill.id}
                                        className={cn(
                                          "p-3 cursor-pointer hover:bg-muted/50 border-t first:border-t-0",
                                          isSelected && "bg-primary/10 border-primary/20"
                                        )}
                                        onClick={() => handleSkillSelect(skill.id)}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-start gap-3">
                                            {isSelected ? (
                                              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                                            ) : (
                                              <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            )}
                                            <div className={cn("flex flex-col", inTemplate && "opacity-60")}>
                                              <span className="font-medium">{skill.name}</span>
                                              <span className="text-sm text-muted-foreground">{skill.description || 'No description'}</span>
                                              <span className="text-xs text-muted-foreground">Max Score: {skill.maxScore} | Type: {skill.skillType}</span>
                                            </div>
                                          </div>
                                          {inTemplate && (
                                            <Badge variant="outline" className="h-5 text-[10px] mt-0.5">already add on template</Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }

                          if (content.length === 0) {
                            return <div className="p-3 text-muted-foreground text-center">No skills found matching "{modalExpertiseSearchTerm}"</div>;
                          }

                          return <>{content}</>;
                        })()}
                      </div>
                    </div>
                    <div className="mt-auto p-4 border-t flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddExpertiseModalOpen(false);
                          setSelectedSkills([]);
                          setModalExpertiseSearchTerm('');
                          setIsExpertiseDropdownOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddExpertiseSkills} disabled={selectedSkills.length === 0 || isAddingExpertise}>
                        {isAddingExpertise && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Add {selectedSkills.length > 0 ? `${selectedSkills.length} ` : ''}Skill{selectedSkills.length > 1 ? 's' : ''}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assigned skills..."
                  value={expertiseSearchTerm}
                  onChange={(e) => setExpertiseSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Skills Table */}
            <ScrollArea className="flex-1 h-full">
              {isLoadingExpertise ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPositionExpertiseSkills.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BrainCircuit className="h-16 w-16 text-muted-foreground mb-6" />
                    <h3 className="text-xl font-semibold mb-2">No Skills Assigned</h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                      {expertiseSearchTerm ? 'No skills match your search.' : 'No expertise skills have been assigned to this position yet.'}
                    </p>
                    {!expertiseSearchTerm && (
                      <Button
                        size="lg"
                        onClick={() => setIsAddExpertiseModalOpen(true)}
                        className="px-8 py-3"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Add Skills
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Group Skills by Group */}
                  {expertiseGroups
                    .filter(group =>
                      filteredPositionExpertiseSkills.some(posSkill => posSkill.skill.groupId === group.id)
                    )
                    .map(group => {
                      const groupSkills = filteredPositionExpertiseSkills.filter(posSkill => posSkill.skill.groupId === group.id);
                      return (
                        <Card key={group.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                              <CardTitle className="text-base">{group.name}</CardTitle>
                              <Badge variant="secondary" className="text-xs">
                                {groupSkills.length} skill{groupSkills.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            {group.description && (
                              <CardDescription className="text-sm">{group.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-1">
                              {groupSkills.map((posSkill) => (
                                <div key={posSkill.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="text-sm font-medium">{posSkill.skill.name}</h4>
                                    {posSkill.isRequired && (
                                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                        Required
                                      </Badge>
                                    )}
                                  </div>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleRemoveExpertiseSkill(posSkill.id, posSkill.skill.name, e)}
                                    disabled={isRemovingExpertise === posSkill.id}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    {isRemovingExpertise === posSkill.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                  {/* Ungrouped Skills */}
                  {(() => {
                    const ungroupedSkills = filteredPositionExpertiseSkills.filter(posSkill => !posSkill.skill.groupId);
                    if (ungroupedSkills.length > 0) {
                      return (
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 rounded-full bg-gray-400" />
                              <CardTitle className="text-base">Ungrouped Skills</CardTitle>
                              <Badge variant="secondary" className="text-xs">
                                {ungroupedSkills.length} skill{ungroupedSkills.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-1">
                              {ungroupedSkills.map((posSkill) => (
                                <div key={posSkill.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="text-sm font-medium">{posSkill.skill.name}</h4>
                                    {posSkill.isRequired && (
                                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                        Required
                                      </Badge>
                                    )}
                                  </div>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleRemoveExpertiseSkill(posSkill.id, posSkill.skill.name, e)}
                                    disabled={isRemovingExpertise === posSkill.id}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    {isRemovingExpertise === posSkill.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Personality Traits Tab */}
        {activeSubTab === 'personality' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Personality Traits</h3>
                <Badge variant="secondary">{positionPersonalityTraits.length} assigned</Badge>
              </div>

              <Sheet open={isAddPersonalityModalOpen} onOpenChange={setIsAddPersonalityModalOpen}>
                <Button onClick={() => setIsAddPersonalityModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trait
                </Button>
                <SheetContent side="right" className="w-[50vw] min-w-[800px] max-w-none p-0" sheetId="add-personality-trait-drawer">
                  <div className="h-full flex flex-col">
                    <SheetHeader className="p-4 border-b">
                      <SheetTitle>Add Personality Traits</SheetTitle>
                      <SheetDescription>Select multiple traits to add to "{positionTitle}"</SheetDescription>
                    </SheetHeader>
                    <div className="p-4 space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search traits..."
                          value={modalPersonalitySearchTerm}
                          onChange={(e) => setModalPersonalitySearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {selectedTraits.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedTraits.map((trait) => (
                            <Badge key={trait.id} variant="secondary" className="flex items-center gap-1">
                              {trait.name}
                              <button onClick={() => handleRemoveSelectedTrait(trait.id)} className="ml-1 hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="border rounded-md max-h-[60vh] overflow-y-auto">
                        {(() => {
                          const content: React.ReactNode[] = [];
                          const selectedIds = new Set(selectedTraits.map(t => t.id));
                          // Render grouped traits by personalityGroups order
                          personalityGroups.forEach(group => {
                            const groupItems = filteredModalPersonalityTraits.filter(t => t.groupId === group.id);
                            if (groupItems.length === 0) return;
                            const allSelected = groupItems.every(t => selectedIds.has(t.id));
                            content.push(
                              <div key={`group-${group.id}`} className="border-b last:border-b-0">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                                    <span className="text-sm font-medium">{group.name}</span>
                                    <Badge variant="secondary" className="text-xs">{groupItems.length}</Badge>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleToggleSelectAllInGroupPersonality(group.id)}>
                                    {allSelected ? 'Deselect All' : 'Select All'}
                                  </Button>
                                </div>
                                <div>
                                  {groupItems.map(trait => {
                                    const inTemplate = templateTraitIds.includes(trait.id);
                                    const isSelected = selectedIds.has(trait.id);
                                    return (
                                      <div
                                        key={trait.id}
                                        className={cn(
                                          "p-3 cursor-pointer hover:bg-muted/50 border-t first:border-t-0",
                                          isSelected && "bg-primary/10 border-primary/20"
                                        )}
                                        onClick={() => handleTraitSelect(trait.id)}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-start gap-3">
                                            {isSelected ? (
                                              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                                            ) : (
                                              <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            )}
                                            <div className={cn("flex flex-col", inTemplate && "opacity-60")}>
                                              <span className="font-medium">{trait.name}</span>
                                              <span className="text-sm text-muted-foreground">{trait.description || 'No description'}</span>
                                            </div>
                                          </div>
                                          {inTemplate && (
                                            <Badge variant="outline" className="h-5 text-[10px] mt-0.5">already add on template</Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });

                          // Ungrouped
                          const ungroupedItems = filteredModalPersonalityTraits.filter(t => !t.groupId);
                          if (ungroupedItems.length > 0) {
                            const allUngroupedSelected = ungroupedItems.every(t => selectedIds.has(t.id));
                            content.push(
                              <div key={`group-ungrouped`} className="border-b last:border-b-0">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Other Traits</span>
                                    <Badge variant="secondary" className="text-xs">{ungroupedItems.length}</Badge>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleToggleSelectAllInGroupPersonality('ungrouped')}>
                                    {allUngroupedSelected ? 'Deselect All' : 'Select All'}
                                  </Button>
                                </div>
                                <div>
                                  {ungroupedItems.map(trait => {
                                    const inTemplate = templateTraitIds.includes(trait.id);
                                    const isSelected = selectedIds.has(trait.id);
                                    return (
                                      <div
                                        key={trait.id}
                                        className={cn(
                                          "p-3 cursor-pointer hover:bg-muted/50 border-t first:border-t-0",
                                          isSelected && "bg-primary/10 border-primary/20"
                                        )}
                                        onClick={() => handleTraitSelect(trait.id)}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-start gap-3">
                                            {isSelected ? (
                                              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                                            ) : (
                                              <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            )}
                                            <div className={cn("flex flex-col", inTemplate && "opacity-60")}>
                                              <span className="font-medium">{trait.name}</span>
                                              <span className="text-sm text-muted-foreground">{trait.description || 'No description'}</span>
                                            </div>
                                          </div>
                                          {inTemplate && (
                                            <Badge variant="outline" className="h-5 text-[10px] mt-0.5">already add on template</Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }

                          if (content.length === 0) {
                            return <div className="p-3 text-muted-foreground text-center">No traits found matching "{modalPersonalitySearchTerm}"</div>;
                          }

                          return <>{content}</>;
                        })()}
                      </div>
                    </div>
                    <div className="mt-auto p-4 border-t flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddPersonalityModalOpen(false);
                          setSelectedTraits([]);
                          setModalPersonalitySearchTerm('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddPersonalityTraits} disabled={selectedTraits.length === 0 || isAddingPersonality}>
                        {isAddingPersonality && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Add {selectedTraits.length > 0 ? `${selectedTraits.length} ` : ''}Trait{selectedTraits.length > 1 ? 's' : ''}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assigned traits..."
                  value={personalitySearchTerm}
                  onChange={(e) => setPersonalitySearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Traits Table */}
            <ScrollArea className="flex-1 h-full">
              {isLoadingPersonality ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPositionPersonalityTraits.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Traits Assigned</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {personalitySearchTerm ? 'No traits match your search.' : 'No personality traits have been assigned to this position yet.'}
                    </p>
                    {!personalitySearchTerm && (
                      <Button onClick={() => setIsAddPersonalityModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Trait
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Group Traits by Group */}
                  {personalityGroups
                    .filter(group =>
                      filteredPositionPersonalityTraits.some(posTrait => posTrait.trait.groupId === group.id)
                    )
                    .map(group => {
                      const groupTraits = filteredPositionPersonalityTraits.filter(posTrait => posTrait.trait.groupId === group.id);
                      return (
                        <Card key={group.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                              <CardTitle className="text-base">{group.name}</CardTitle>
                              <Badge variant="secondary" className="text-xs">
                                {groupTraits.length} trait{groupTraits.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            {group.description && (
                              <CardDescription className="text-sm">{group.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-1">
                              {groupTraits.map((posTrait) => (
                                <div key={posTrait.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="text-sm font-medium">{posTrait.trait.name}</h4>
                                    {posTrait.isRequired && (
                                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                        Required
                                      </Badge>
                                    )}
                                  </div>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleRemovePersonalityTrait(posTrait.id, posTrait.trait.name, e)}
                                    disabled={isRemovingPersonality === posTrait.id}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    {isRemovingPersonality === posTrait.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                  {/* Ungrouped Traits */}
                  {(() => {
                    const ungroupedTraits = filteredPositionPersonalityTraits.filter(posTrait => !posTrait.trait.groupId);
                    if (ungroupedTraits.length > 0) {
                      return (
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 rounded-full bg-gray-400" />
                              <CardTitle className="text-base">Ungrouped Traits</CardTitle>
                              <Badge variant="secondary" className="text-xs">
                                {ungroupedTraits.length} trait{ungroupedTraits.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-1">
                              {ungroupedTraits.map((posTrait) => (
                                <div key={posTrait.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="text-sm font-medium">{posTrait.trait.name}</h4>
                                    {posTrait.isRequired && (
                                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                        Required
                                      </Badge>
                                    )}
                                  </div>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleRemovePersonalityTrait(posTrait.id, posTrait.trait.name, e)}
                                    disabled={isRemovingPersonality === posTrait.id}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    {isRemovingPersonality === posTrait.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Mobile Template Selector Drawer */}
        {isMobile && (
          <MobileTemplateSelector
            isOpen={false} // Will be controlled by a state
            onOpenChange={() => { }}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelect={async (templateId) => {
              const newTemplateId = templateId === '' ? '' : templateId;
              setSelectedTemplateId(newTemplateId);
              await saveTemplateId(newTemplateId || null);
            }}
            isLoading={isLoadingTemplates}
          />
        )}
      </div>

      {/* Add Method Selection Modal */}
      <Dialog open={isAddMethodModalOpen} onOpenChange={setIsAddMethodModalOpen}>
        <DialogContent className="sm:max-w-lg" dialogId="add-method-modal">
          <DialogHeader>
            <DialogTitle>Add Skills</DialogTitle>
            <DialogDescription>
              Choose how you want to add skills to "{positionTitle}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Option */}
            <Card
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleAddMethodSelect('template')}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <BrainCircuit className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">Use Template</h3>
                    <p className="text-muted-foreground">
                      Select from predefined skill templates for common roles
                    </p>
                  </div>
                  <div className="text-muted-foreground">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Option */}
            <Card
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleAddMethodSelect('custom')}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <Settings className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">Custom Selection</h3>
                    <p className="text-muted-foreground">
                      Manually select individual skills from all available options
                    </p>
                  </div>
                  <div className="text-muted-foreground">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
