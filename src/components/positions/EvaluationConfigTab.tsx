"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Search, BrainCircuit, Target, Settings, X, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

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
  const [activeSubTab, setActiveSubTab] = useState('expertise');
  
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
  const [selectedPersonalityTraitId, setSelectedPersonalityTraitId] = useState('');
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
  const [selectedSkills, setSelectedSkills] = useState<Array<{id: string, name: string}>>([]);
  
  // Template/Custom selection states
  const [isAddMethodModalOpen, setIsAddMethodModalOpen] = useState(false);
  const [selectedAddMethod, setSelectedAddMethod] = useState<'template' | 'custom' | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  
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
    const skill = filteredModalExpertiseSkills.find(s => s.id === skillId);
    if (skill && !selectedSkills.find(s => s.id === skillId)) {
      setSelectedSkills(prev => [...prev, { id: skill.id, name: skill.name }]);
    }
    setModalExpertiseSearchTerm('');
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

  // Add personality trait to position
  const handleAddPersonalityTrait = async () => {
    if (!selectedPersonalityTraitId) return;
    
    setIsAddingPersonality(true);
    try {
      const response = await fetch(`/api/positions/${positionId}/personality-traits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traitId: selectedPersonalityTraitId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add personality trait');
      }
      
      toast.success('Personality trait added successfully');
      setIsAddPersonalityModalOpen(false);
      setSelectedPersonalityTraitId('');
      setPersonalitySearchTerm('');
      loadPositionPersonalityTraits();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsAddingPersonality(false);
    }
  };

  // Remove expertise skill from position
  const handleRemoveExpertiseSkill = async (assignmentId: string, skillName: string) => {
    setIsRemovingExpertise(assignmentId);
    try {
      const response = await fetch(`/api/positions/${positionId}/expertise-skills/${assignmentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to remove expertise skill');
      }
      
      toast.success(`${skillName} removed successfully`);
      loadPositionExpertiseSkills();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsRemovingExpertise(null);
    }
  };

  // Remove personality trait from position
  const handleRemovePersonalityTrait = async (assignmentId: string, traitName: string) => {
    setIsRemovingPersonality(assignmentId);
    try {
      const response = await fetch(`/api/positions/${positionId}/personality-traits/${assignmentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to remove personality trait');
      }
      
      toast.success(`${traitName} removed successfully`);
      loadPositionPersonalityTraits();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsRemovingPersonality(null);
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
      try {
        await Promise.all([
          loadExpertiseSkills(),
          loadPositionExpertiseSkills(),
          loadPersonalityTraits(),
          loadPositionPersonalityTraits()
        ]);
      } finally {
        setIsLoadingExpertise(false);
        setIsLoadingPersonality(false);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Settings className="h-6 w-6" />
            Evaluation Configuration
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure expertise skills and personality traits for candidate evaluation
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex-1 flex flex-col">
        <div className="flex w-full border-b border-border/50 mb-6">
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

        {/* Expertise Skills Tab */}
        {activeSubTab === 'expertise' && (
          <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Expertise Skills</h3>
              <Badge variant="secondary">{positionExpertiseSkills.length} assigned</Badge>
            </div>
            
            <Dialog open={isAddExpertiseModalOpen} onOpenChange={setIsAddExpertiseModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Skill
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dialogId="add-expertise-skill-modal">
                <DialogHeader>
                  <DialogTitle>Add Expertise Skill</DialogTitle>
                  <DialogDescription>
                    Select multiple skills to add to "{positionTitle}" evaluation criteria
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="modal-expertise-search">Select Skills</Label>
                    <div className="relative" ref={dropdownRef}>
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="modal-expertise-search"
                        placeholder="Click to search skills..."
                        value={modalExpertiseSearchTerm}
                        readOnly
                        onClick={() => setIsExpertiseDropdownOpen(true)}
                        className="pl-10 cursor-pointer"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isExpertiseDropdownOpen && "rotate-180"
                          )}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Selected Skills Tags */}
                    {selectedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedSkills.map((skill) => (
                          <Badge key={skill.id} variant="secondary" className="flex items-center gap-1">
                            {skill.name}
                            <button
                              onClick={() => handleRemoveSelectedSkill(skill.id)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Dropdown */}
                    {isExpertiseDropdownOpen && (
                      <div className="border rounded-md max-h-48 overflow-y-auto bg-background shadow-lg">
                        <div className="p-2 border-b">
                          <Input
                            placeholder="Search skills..."
                            value={modalExpertiseSearchTerm}
                            onChange={(e) => {
                              setModalExpertiseSearchTerm(e.target.value);
                            }}
                            className="h-8"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {filteredModalExpertiseSkills.length > 0 ? (
                            filteredModalExpertiseSkills.map((skill) => (
                              <div
                                key={skill.id}
                                className={cn(
                                  "p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0",
                                  selectedSkills.find(s => s.id === skill.id) && "bg-primary/10 border-primary/20"
                                )}
                                onClick={() => handleSkillSelect(skill.id)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{skill.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {skill.description || 'No description'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Max Score: {skill.maxScore} | Type: {skill.skillType}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-muted-foreground text-center">
                              No skills found matching "{modalExpertiseSearchTerm}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2">
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
                    <Button
                      onClick={handleAddExpertiseSkills}
                      disabled={selectedSkills.length === 0 || isAddingExpertise}
                    >
                      {isAddingExpertise && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add {selectedSkills.length > 0 ? `${selectedSkills.length} ` : ''}Skill{selectedSkills.length > 1 ? 's' : ''}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
          <ScrollArea className="flex-1">
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
                      onClick={() => setIsAddMethodModalOpen(true)}
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
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveExpertiseSkill(posSkill.id, posSkill.skill.name)}
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
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveExpertiseSkill(posSkill.id, posSkill.skill.name)}
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
          <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Personality Traits</h3>
              <Badge variant="secondary">{positionPersonalityTraits.length} assigned</Badge>
            </div>
            
            <Dialog open={isAddPersonalityModalOpen} onOpenChange={setIsAddPersonalityModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trait
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dialogId="add-personality-trait-modal">
                <DialogHeader>
                  <DialogTitle>Add Personality Trait</DialogTitle>
                  <DialogDescription>
                    Select a trait to add to "{positionTitle}" evaluation criteria
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="personality-search">Search Traits</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="personality-search"
                        placeholder="Search by name or description..."
                        value={personalitySearchTerm}
                        onChange={(e) => setPersonalitySearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Select Trait</Label>
                    <Select value={selectedPersonalityTraitId} onValueChange={setSelectedPersonalityTraitId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a trait..." />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-48">
                          {filteredAvailablePersonalityTraits.map((trait) => (
                            <SelectItem key={trait.id} value={trait.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{trait.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {trait.description || 'No description'}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddPersonalityModalOpen(false);
                        setSelectedPersonalityTraitId('');
                        setPersonalitySearchTerm('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddPersonalityTrait}
                      disabled={!selectedPersonalityTraitId || isAddingPersonality}
                    >
                      {isAddingPersonality && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Trait
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
          <ScrollArea className="flex-1">
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
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemovePersonalityTrait(posTrait.id, posTrait.trait.name)}
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
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemovePersonalityTrait(posTrait.id, posTrait.trait.name)}
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
