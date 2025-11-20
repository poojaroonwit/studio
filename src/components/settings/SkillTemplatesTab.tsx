"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical, 
  Users, 
  Brain, 
  AlertCircle,
  CheckCircle,
  FileText,
  Settings,
  Check,
  ChevronDown,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface SkillTemplate {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  templateGroups: Array<{
    id: string;
    group: {
      id: string;
      name: string;
      description?: string;
      color: string;
    };
  }>;
  templateSkills: Array<{
    id: string;
    skill: {
      id: string;
      name: string;
      description?: string;
      skillType: string;
    };
  }>;
  templatePersonalityGroups: Array<{
    id: string;
    group: {
      id: string;
      name: string;
      description?: string;
      color: string;
    };
  }>;
  templatePersonalityTraits: Array<{
    id: string;
    trait: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
}

interface ExpertiseGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
}

interface ExpertiseSkill {
  id: string;
  name: string;
  description?: string;
  skillType: string;
  isActive: boolean;
  groupId?: string;
}

interface PersonalityGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
}

interface PersonalityTrait {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  groupId?: string;
}

export default function SkillTemplatesTab() {
  const [templates, setTemplates] = useState<SkillTemplate[]>([]);
  const [groups, setGroups] = useState<ExpertiseGroup[]>([]);
  const [skills, setSkills] = useState<ExpertiseSkill[]>([]);
  const [personalityGroups, setPersonalityGroups] = useState<PersonalityGroup[]>([]);
  const [personalityTraits, setPersonalityTraits] = useState<PersonalityTrait[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<SkillTemplate | null>(null);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Refs to ensure popovers portal inside the corresponding dialog
  const createDialogContainerRef = useRef<HTMLDivElement | null>(null);
  const editDialogContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Dropdown states (separate for create vs edit to avoid interaction issues)
  const [isCreateGroupsOpen, setIsCreateGroupsOpen] = useState(false);
  const [isCreatePersonalityOpen, setIsCreatePersonalityOpen] = useState(false);
  const [isEditGroupsOpen, setIsEditGroupsOpen] = useState(false);
  const [isEditPersonalityOpen, setIsEditPersonalityOpen] = useState(false);
  const [expertiseSearch, setExpertiseSearch] = useState('');
  const [personalitySearch, setPersonalitySearch] = useState('');
  
  // Form states
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    groupIds: [] as string[],
    skillIds: [] as string[],
    personalityGroupIds: [] as string[],
    personalityTraitIds: [] as string[]
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('Starting data fetch...');
      setLoading(true);
      const [templatesRes, groupsRes, skillsRes, personalityGroupsRes, personalityTraitsRes] = await Promise.all([
        fetch('/api/v1/evaluation/skill-templates'),
        fetch('/api/v1/evaluation/expertise-groups'),
        fetch('/api/v1/evaluation/expertise-skills'),
        fetch('/api/v1/evaluation/personality-groups'),
        fetch('/api/v1/evaluation/personality-traits')
      ]);

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      } else {
        console.error('Failed to fetch templates:', templatesRes.status);
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData);
        console.log('Loaded groups:', groupsData);
      } else {
        console.error('Failed to fetch groups:', groupsRes.status);
      }

      if (skillsRes.ok) {
        const skillsData = await skillsRes.json();
        setSkills(skillsData);
        console.log('Loaded skills:', skillsData);
      } else {
        console.error('Failed to fetch skills:', skillsRes.status);
      }

      if (personalityGroupsRes.ok) {
        const personalityGroupsData = await personalityGroupsRes.json();
        setPersonalityGroups(personalityGroupsData);
        console.log('Loaded personality groups:', personalityGroupsData);
      } else {
        console.error('Failed to fetch personality groups:', personalityGroupsRes.status);
      }

      if (personalityTraitsRes.ok) {
        const personalityTraitsData = await personalityTraitsRes.json();
        setPersonalityTraits(personalityTraitsData);
        console.log('Loaded personality traits:', personalityTraitsData);
      } else {
        console.error('Failed to fetch personality traits:', personalityTraitsRes.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set some dummy data if API fails
      setGroups([
        { id: '1', name: 'Frontend Development', description: 'Frontend skills', color: '#3B82F6', isActive: true },
        { id: '2', name: 'Backend Development', description: 'Backend skills', color: '#10B981', isActive: true }
      ]);
      setSkills([
        { id: '1', name: 'React', description: 'React framework', skillType: 'technical', groupId: '1', isActive: true },
        { id: '2', name: 'Node.js', description: 'Node.js runtime', skillType: 'technical', groupId: '2', isActive: true }
      ]);
      setPersonalityGroups([
        { id: '1', name: 'Communication', description: 'Communication skills', color: '#F59E0B', isActive: true },
        { id: '2', name: 'Leadership', description: 'Leadership skills', color: '#EF4444', isActive: true }
      ]);
      setPersonalityTraits([
        { id: '1', name: 'Team Player', description: 'Works well in teams', groupId: '1', isActive: true },
        { id: '2', name: 'Confident', description: 'Shows confidence', groupId: '2', isActive: true }
      ]);
    } finally {
      console.log('Data fetch completed, setting loading to false');
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    // Validate name
    if (!templateFormData.name || templateFormData.name.trim() === '') {
      toast.error('Template name is required');
      return;
    }

    try {
      const response = await fetch('/api/v1/evaluation/skill-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateFormData),
      });

      if (response.ok) {
        toast.success('Skill template created successfully');
        // Close all popovers first
        setIsCreateGroupsOpen(false);
        setIsCreatePersonalityOpen(false);
        await fetchData();
        setIsCreateDialogOpen(false);
        setTemplateFormData({ name: '', description: '', groupIds: [], skillIds: [], personalityGroupIds: [], personalityTraitIds: [] });
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({ error: 'Failed to create skill template' }));
        toast.error(errorData.error || `Failed to create template: ${response.status} ${response.statusText}`);
        console.error('Error creating template:', errorData);
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(`/api/v1/evaluation/skill-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateFormData),
      });

      if (response.ok) {
        toast.success('Skill template updated successfully');
        // Close all popovers first
        setIsEditGroupsOpen(false);
        setIsEditPersonalityOpen(false);
        await fetchData();
        setIsEditDialogOpen(false);
        setSelectedTemplate(null);
        setTemplateFormData({ name: '', description: '', groupIds: [], skillIds: [], personalityGroupIds: [], personalityTraitIds: [] });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update template' }));
        console.error('Error updating template:', errorData);
        toast.error(errorData.error || `Failed to update template: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert(`Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/v1/evaluation/skill-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Skill template deleted successfully');
        await fetchData();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete template' }));
        toast.error(errorData.error || `Failed to delete template: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const openEditDialog = (template: SkillTemplate) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      name: template.name,
      description: template.description || '',
      groupIds: template.templateGroups.map(tg => tg.group.id),
      skillIds: template.templateSkills.map(ts => ts.skill.id),
      personalityGroupIds: template.templatePersonalityGroups?.map(tg => tg.group.id) || [],
      personalityTraitIds: template.templatePersonalityTraits?.map(tt => tt.trait.id) || []
    });
    setIsEditDialogOpen(true);
  };

  const openDetailsDialog = (template: SkillTemplate) => {
    setSelectedTemplate(template);
    setIsDetailsDialogOpen(true);
  };

  const handleGroupToggle = (groupId: string) => {
    const groupSkills = skills.filter(s => s.groupId === groupId);
    const isGroupSelected = templateFormData.groupIds.includes(groupId);
    
    setTemplateFormData(prev => ({
      ...prev,
      groupIds: isGroupSelected 
        ? prev.groupIds.filter(id => id !== groupId)
        : [...prev.groupIds, groupId],
      skillIds: isGroupSelected
        ? prev.skillIds.filter(id => !groupSkills.some(s => s.id === id))
        : [...prev.skillIds, ...groupSkills.map(s => s.id)]
    }));
  };

  const handleSkillToggle = (skillId: string) => {
    setTemplateFormData(prev => ({
      ...prev,
      skillIds: prev.skillIds.includes(skillId)
        ? prev.skillIds.filter(id => id !== skillId)
        : [...prev.skillIds, skillId]
    }));
  };

  const handlePersonalityGroupToggle = (groupId: string) => {
    const groupTraits = personalityTraits.filter(t => t.groupId === groupId);
    const isGroupSelected = templateFormData.personalityGroupIds.includes(groupId);
    
    setTemplateFormData(prev => ({
      ...prev,
      personalityGroupIds: isGroupSelected 
        ? prev.personalityGroupIds.filter(id => id !== groupId)
        : [...prev.personalityGroupIds, groupId],
      personalityTraitIds: isGroupSelected
        ? prev.personalityTraitIds.filter(id => !groupTraits.some(t => t.id === id))
        : [...prev.personalityTraitIds, ...groupTraits.map(t => t.id)]
    }));
  };

  const handlePersonalityTraitToggle = (traitId: string) => {
    setTemplateFormData(prev => ({
      ...prev,
      personalityTraitIds: prev.personalityTraitIds.includes(traitId)
        ? prev.personalityTraitIds.filter(id => id !== traitId)
        : [...prev.personalityTraitIds, traitId]
    }));
  };

  // Reusable renderers
  const renderExpertisePopover = (
    isOpen: boolean,
    setOpen: (v: boolean) => void,
    popoverId: string,
    containerEl?: HTMLElement | null
  ) => (
    <Popover open={isOpen} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between mt-2"
        >
          {(templateFormData.groupIds.length + templateFormData.skillIds.length) > 0 
            ? `${templateFormData.groupIds.length + templateFormData.skillIds.length} items selected`
            : "Select expertise groups and skills..."
          }
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        popoverId={popoverId}
        zIndexType="modal"
        align="start"
        side="bottom"
        sideOffset={4}
        container={containerEl || undefined}
      >
        <div className="p-2 max-h-[400px]">
          <div className="flex items-center border-b border-border px-2 pb-2">
            <input
              className="flex h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search expertise groups and skills..."
              value={expertiseSearch}
              onChange={(e) => setExpertiseSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Expertise Groups</div>
            {groups
              .filter(g => g.name.toLowerCase().includes(expertiseSearch.toLowerCase()))
              .map((group) => {
                const groupSkills = skills.filter(s => s.groupId === group.id && s.name.toLowerCase().includes(expertiseSearch.toLowerCase()));
                return (
                  <div key={`${popoverId}-group-${group.id}`} className="px-2">
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                        templateFormData.groupIds.includes(group.id) ? "" : ""
                      )}
                      onClick={() => handleGroupToggle(group.id)}
                    >
                      <Check className={cn("h-4 w-4", templateFormData.groupIds.includes(group.id) ? "opacity-100" : "opacity-0")} />
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                          <span className="font-medium">{group.name}</span>
                          <span className="text-xs text-muted-foreground">({groupSkills.length} skills)</span>
                        </div>
                        <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary hover:text-primary">
                          <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGroupToggle(group.id); }}>Select All</span>
                        </Button>
                      </div>
                    </button>
                    {groupSkills.map((skill) => (
                      <button
                        type="button"
                        key={`${popoverId}-skill-${skill.id}`}
                        className="ml-6 w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleSkillToggle(skill.id)}
                      >
                        <Check className={cn("h-4 w-4", templateFormData.skillIds.includes(skill.id) ? "opacity-100" : "opacity-0")} />
                        <Brain className="h-4 w-4 text-muted-foreground" />
                        {skill.name}
                      </button>
                    ))}
                  </div>
                );
              })}
            <div className="px-2 pt-2 text-xs font-medium text-muted-foreground">Individual Skills</div>
            <div className="px-2">
              <button
                type="button"
                className="w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent"
                onClick={() => handleSelectAllExpertiseSkills()}
              >
                <span className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Select All Individual Skills
                </span>
                <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary hover:text-primary">
                  <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectAllExpertiseSkills(); }}>Select All</span>
                </Button>
              </button>
              {skills
                .filter(s => !s.groupId && s.name.toLowerCase().includes(expertiseSearch.toLowerCase()))
                .map((skill) => (
                  <button
                    type="button"
                    key={`${popoverId}-skill-solo-${skill.id}`}
                    className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleSkillToggle(skill.id)}
                  >
                    <Check className={cn("h-4 w-4", templateFormData.skillIds.includes(skill.id) ? "opacity-100" : "opacity-0")} />
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    {skill.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderPersonalityPopover = (
    isOpen: boolean,
    setOpen: (v: boolean) => void,
    popoverId: string,
    containerEl?: HTMLElement | null
  ) => (
    <Popover open={isOpen} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between mt-2"
        >
          {(templateFormData.personalityGroupIds.length + templateFormData.personalityTraitIds.length) > 0 
            ? `${templateFormData.personalityGroupIds.length + templateFormData.personalityTraitIds.length} items selected`
            : "Select personality groups and traits..."
          }
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        popoverId={popoverId}
        zIndexType="modal"
        align="start"
        side="bottom"
        sideOffset={4}
        container={containerEl || undefined}
      >
        <div className="p-2 max-h-[400px]">
          <div className="flex items-center border-b border-border px-2 pb-2">
            <input
              className="flex h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search personality groups and traits..."
              value={personalitySearch}
              onChange={(e) => setPersonalitySearch(e.target.value)}
            />
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Personality Groups</div>
            {personalityGroups
              .filter(g => g.name.toLowerCase().includes(personalitySearch.toLowerCase()))
              .map((group) => {
                const groupTraits = personalityTraits.filter(t => t.groupId === group.id && t.name.toLowerCase().includes(personalitySearch.toLowerCase()));
                return (
                  <div key={`${popoverId}-pers-group-${group.id}`} className="px-2">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handlePersonalityGroupToggle(group.id)}
                    >
                      <Check className={cn("h-4 w-4", templateFormData.personalityGroupIds.includes(group.id) ? "opacity-100" : "opacity-0")} />
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                          <span className="font-medium">{group.name}</span>
                          <span className="text-xs text-muted-foreground">({groupTraits.length} traits)</span>
                        </div>
                        <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary hover:text-primary">
                          <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePersonalityGroupToggle(group.id); }}>Select All</span>
                        </Button>
                      </div>
                    </button>
                    {groupTraits.map((trait) => (
                      <button
                        type="button"
                        key={`${popoverId}-pers-trait-${trait.id}`}
                        className="ml-6 w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handlePersonalityTraitToggle(trait.id)}
                      >
                        <Check className={cn("h-4 w-4", templateFormData.personalityTraitIds.includes(trait.id) ? "opacity-100" : "opacity-0")} />
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        {trait.name}
                      </button>
                    ))}
                  </div>
                );
              })}
            <div className="px-2 pt-2 text-xs font-medium text-muted-foreground">Individual Personality Traits</div>
            <div className="px-2">
              <button
                type="button"
                className="w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent"
                onClick={() => handleSelectAllPersonalityTraits()}
              >
                <span className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  Select All Individual Traits
                </span>
                <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary hover:text-primary">
                  <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectAllPersonalityTraits(); }}>Select All</span>
                </Button>
              </button>
              {personalityTraits
                .filter(t => !t.groupId && t.name.toLowerCase().includes(personalitySearch.toLowerCase()))
                .map((trait) => (
                  <button
                    type="button"
                    key={`${popoverId}-pers-trait-solo-${trait.id}`}
                    className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handlePersonalityTraitToggle(trait.id)}
                  >
                    <Check className={cn("h-4 w-4", templateFormData.personalityTraitIds.includes(trait.id) ? "opacity-100" : "opacity-0")} />
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    {trait.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  // Helper functions to get selected names
  const getSelectedGroupNames = () => {
    return groups
      .filter(g => templateFormData.groupIds.includes(g.id))
      .map(g => g.name);
  };

  const getSelectedSkillNames = () => {
    return skills
      .filter(s => templateFormData.skillIds.includes(s.id))
      .map(s => s.name);
  };

  const getSelectedPersonalityGroupNames = () => {
    return personalityGroups
      .filter(g => templateFormData.personalityGroupIds.includes(g.id))
      .map(g => g.name);
  };

  const getSelectedPersonalityTraitNames = () => {
    return personalityTraits
      .filter(t => templateFormData.personalityTraitIds.includes(t.id))
      .map(t => t.name);
  };

  // Select all handlers
  const handleSelectAllExpertiseGroups = () => {
    const allGroupIds = groups.map(g => g.id);
    const allSkillIds = skills.map(s => s.id);
    setTemplateFormData(prev => ({
      ...prev,
      groupIds: allGroupIds,
      skillIds: allSkillIds
    }));
  };

  const handleSelectAllExpertiseSkills = () => {
    const allSkillIds = skills.filter(s => !s.groupId).map(s => s.id);
    setTemplateFormData(prev => ({
      ...prev,
      skillIds: [...prev.skillIds, ...allSkillIds.filter(id => !prev.skillIds.includes(id))]
    }));
  };

  const handleSelectAllPersonalityGroups = () => {
    const allGroupIds = personalityGroups.map(g => g.id);
    const allTraitIds = personalityTraits.map(t => t.id);
    setTemplateFormData(prev => ({
      ...prev,
      personalityGroupIds: allGroupIds,
      personalityTraitIds: allTraitIds
    }));
  };

  const handleSelectAllPersonalityTraits = () => {
    const allTraitIds = personalityTraits.filter(t => !t.groupId).map(t => t.id);
    setTemplateFormData(prev => ({
      ...prev,
      personalityTraitIds: [...prev.personalityTraitIds, ...allTraitIds.filter(id => !prev.personalityTraitIds.includes(id))]
    }));
  };

  if (loading) {
    console.log('Component is loading, groups:', groups.length, 'skills:', skills.length);
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Skill Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage skill templates for evaluation
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            // Close all popovers when dialog closes
            if (!open) {
              setIsCreateGroupsOpen(false);
              setIsCreatePersonalityOpen(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl" dialogId="skill-template-create-dialog">
            <DialogHeader>
              <DialogTitle>Create Skill Template</DialogTitle>
              <DialogDescription>
                Create a new template with selected groups and skills
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4" ref={createDialogContainerRef}>
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                  placeholder="e.g., Frontend Developer Template"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={templateFormData.description}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              
              {/* Expertise Groups & Skills Selection */}
              <div>
                <Label>Expertise Groups & Skills</Label>
                {renderExpertisePopover(
                  isCreateGroupsOpen,
                  setIsCreateGroupsOpen,
                  'skill-templates-expertise-create',
                  createDialogContainerRef.current
                )}
                {(templateFormData.groupIds.length + templateFormData.skillIds.length) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {getSelectedGroupNames().map((name, index) => (
                      <Badge key={`exp-group-${index}`} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                    {getSelectedSkillNames().map((name, index) => (
                      <Badge key={`exp-skill-${index}`} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Personality Groups & Traits Selection */}
              <div>
                <Label>Personality Groups & Traits</Label>
                {renderPersonalityPopover(
                  isCreatePersonalityOpen,
                  setIsCreatePersonalityOpen,
                  'skill-templates-personality-create',
                  createDialogContainerRef.current
                )}
                {(templateFormData.personalityGroupIds.length + templateFormData.personalityTraitIds.length) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {getSelectedPersonalityGroupNames().map((name, index) => (
                      <Badge key={`pers-group-${index}`} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                    {getSelectedPersonalityTraitNames().map((name, index) => (
                      <Badge key={`pers-trait-${index}`} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateGroupsOpen(false);
                setIsCreatePersonalityOpen(false);
                setIsCreateDialogOpen(false);
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription className="mt-1">
                      {template.description}
                    </CardDescription>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-transparent hover:bg-transparent"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openDetailsDialog(template)}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(template)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Template
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {template.templateGroups.length} groups
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {template.templateSkills.length} skills
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {template.isActive ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Active</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-orange-600">Inactive</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Templates Created</h3>
          <p className="text-muted-foreground mb-4">
            Create your first skill template to get started
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        // Close all popovers when dialog closes
        if (!open) {
          setIsEditGroupsOpen(false);
          setIsEditPersonalityOpen(false);
        }
      }}>
        <DialogContent className="max-w-2xl" dialogId="skill-template-edit-dialog">
          <DialogHeader>
            <DialogTitle>Edit Skill Template</DialogTitle>
            <DialogDescription>
              Update the template with selected groups and skills
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4" ref={editDialogContainerRef}>
            <div>
              <Label htmlFor="edit-name">Template Name</Label>
              <Input
                id="edit-name"
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                placeholder="e.g., Frontend Developer Template"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={templateFormData.description}
                onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            
            {/* Expertise Groups & Skills Selection */}
            <div>
              <Label>Expertise Groups & Skills</Label>
              {renderExpertisePopover(
                isEditGroupsOpen,
                setIsEditGroupsOpen,
                'skill-templates-expertise-edit',
                editDialogContainerRef.current
              )}
              {(templateFormData.groupIds.length + templateFormData.skillIds.length) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {getSelectedGroupNames().map((name, index) => (
                    <Badge key={`edit-exp-group-${index}`} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                  {getSelectedSkillNames().map((name, index) => (
                    <Badge key={`edit-exp-skill-${index}`} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Personality Groups & Traits Selection */}
            <div>
              <Label>Personality Groups & Traits</Label>
              {renderPersonalityPopover(
                isEditPersonalityOpen,
                setIsEditPersonalityOpen,
                'skill-templates-personality-edit',
                editDialogContainerRef.current
              )}
              {(templateFormData.personalityGroupIds.length + templateFormData.personalityTraitIds.length) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {getSelectedPersonalityGroupNames().map((name, index) => (
                    <Badge key={`edit-pers-group-${index}`} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                  {getSelectedPersonalityTraitNames().map((name, index) => (
                    <Badge key={`edit-pers-trait-${index}`} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditGroupsOpen(false);
              setIsEditPersonalityOpen(false);
              setIsEditDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate}>
              Update Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description || 'Template details and assigned groups/skills'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Groups */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assigned Groups ({selectedTemplate?.templateGroups.length || 0})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedTemplate?.templateGroups.map((templateGroup) => (
                  <Card key={templateGroup.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: templateGroup.group.color }}
                        />
                        <span className="font-medium">{templateGroup.group.name}</span>
                      </div>
                      {templateGroup.group.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {templateGroup.group.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Assigned Skills ({selectedTemplate?.templateSkills.length || 0})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedTemplate?.templateSkills.map((templateSkill) => (
                  <Card key={templateSkill.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{templateSkill.skill.name}</span>
                      </div>
                      {templateSkill.skill.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {templateSkill.skill.description}
                        </p>
                      )}
                      <Badge variant="outline" className="mt-2">
                        {templateSkill.skill.skillType}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsDetailsDialogOpen(false);
              if (selectedTemplate) {
                openEditDialog(selectedTemplate);
              }
            }}>
              Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
