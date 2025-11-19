"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ui/color-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Edit, Trash2, AlertCircle, CheckCircle, X, ChevronDown, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ExpertiseGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

interface ExpertiseSkill {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  skillType: string;
  isActive: boolean;
  sortOrder: number;
  groupId?: string;
  group?: {
    id: string;
    name: string;
    color: string;
  };
}

export default function ExpertiseGroupsAndSkillsTab() {
  const [groups, setGroups] = useState<ExpertiseGroup[]>([]);
  const [skills, setSkills] = useState<ExpertiseSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  
  // Dialog states
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [isCreateSkillDialogOpen, setIsCreateSkillDialogOpen] = useState(false);
  const [isEditSkillDialogOpen, setIsEditSkillDialogOpen] = useState(false);
  const [isAddSkillDialogOpen, setIsAddSkillDialogOpen] = useState(false);
  
  // Selected items
  const [selectedGroup, setSelectedGroup] = useState<ExpertiseGroup | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<ExpertiseSkill | null>(null);
  
  // Skill search states
  const [skillSearchOpen, setSkillSearchOpen] = useState(false);
  const [skillSearchValue, setSkillSearchValue] = useState('');
  const [newSkillName, setNewSkillName] = useState('');

  // Form states
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const [skillFormData, setSkillFormData] = useState({
    name: '',
    description: '',
    maxScore: 100,
    skillType: 'hard_skill',
    groupId: ''
  });

  useEffect(() => {
    fetchGroups();
    fetchSkills();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/expertise-groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching expertise groups:', error);
      toast.error('Failed to fetch expertise groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/expertise-skills');
      if (response.ok) {
        const data = await response.json();
        setSkills(data);
      }
    } catch (error) {
      console.error('Error fetching expertise skills:', error);
    }
  };

  // Group handlers
  const handleCreateGroup = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/expertise-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData)
      });

      if (response.ok) {
        toast.success('Expertise group created successfully');
        setIsCreateGroupDialogOpen(false);
        setGroupFormData({ name: '', description: '', color: '#3B82F6' });
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create expertise group');
      }
    } catch (error) {
      console.error('Error creating expertise group:', error);
      toast.error('Failed to create expertise group');
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/v1/evaluation/expertise-groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData)
      });

      if (response.ok) {
        toast.success('Expertise group updated successfully');
        setIsEditGroupDialogOpen(false);
        setSelectedGroup(null);
        setGroupFormData({ name: '', description: '', color: '#3B82F6' });
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update expertise group');
      }
    } catch (error) {
      console.error('Error updating expertise group:', error);
      toast.error('Failed to update expertise group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this expertise group? This will also remove all associated skills.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/evaluation/expertise-groups/${groupId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Expertise group deleted successfully');
        fetchGroups();
        fetchSkills();
        if (selectedGroupId === groupId) {
          setSelectedGroupId('all');
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete expertise group');
      }
    } catch (error) {
      console.error('Error deleting expertise group:', error);
      toast.error('Failed to delete expertise group');
    }
  };

  // Skill handlers
  const handleCreateSkill = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/expertise-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...skillFormData,
          groupId: skillFormData.groupId || null
        })
      });

      if (response.ok) {
        toast.success('Expertise skill created successfully');
        setIsCreateSkillDialogOpen(false);
        setSkillFormData({ name: '', description: '', maxScore: 100, skillType: 'hard_skill', groupId: '' });
        fetchSkills();
      } else {
        const error = await response.json().catch(() => ({ error: 'Failed to create expertise skill' }));
        const errorMessage = error.message || error.error || 'Failed to create expertise skill';
        console.error('Error creating expertise skill:', error);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating expertise skill:', error);
      toast.error('Failed to create expertise skill');
    }
  };

  const handleUpdateSkill = async () => {
    if (!selectedSkill) return;

    try {
      const response = await fetch(`/api/v1/evaluation/expertise-skills/${selectedSkill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...skillFormData,
          groupId: skillFormData.groupId || null
        })
      });

      if (response.ok) {
        toast.success('Expertise skill updated successfully');
        setIsEditSkillDialogOpen(false);
        setSelectedSkill(null);
        setSkillFormData({ name: '', description: '', maxScore: 100, skillType: 'hard_skill', groupId: '' });
        fetchSkills();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update expertise skill');
      }
    } catch (error) {
      console.error('Error updating expertise skill:', error);
      toast.error('Failed to update expertise skill');
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm('Are you sure you want to delete this expertise skill?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/evaluation/expertise-skills/${skillId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Expertise skill deleted successfully');
        fetchSkills();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete expertise skill');
      }
    } catch (error) {
      console.error('Error deleting expertise skill:', error);
      toast.error('Failed to delete expertise skill');
    }
  };

  const handleToggleActive = async (skillId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/v1/evaluation/expertise-skills/${skillId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        toast.success(`Skill ${!isActive ? 'activated' : 'deactivated'} successfully`);
        fetchSkills();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update skill status');
      }
    } catch (error) {
      console.error('Error updating skill status:', error);
      toast.error('Failed to update skill status');
    }
  };

  const handleAddExistingSkillToGroup = async (skillId: string) => {
    if (selectedGroupId === 'all') return;

    try {
      const response = await fetch(`/api/v1/evaluation/expertise-skills/${skillId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroupId })
      });

      if (response.ok) {
        toast.success('Skill added to group successfully');
        setSkillSearchOpen(false);
        setSkillSearchValue('');
        fetchSkills();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add skill to group');
      }
    } catch (error) {
      console.error('Error adding skill to group:', error);
      toast.error('Failed to add skill to group');
    }
  };

  const handleCreateNewSkillForGroup = async () => {
    if (selectedGroupId === 'all') return;

    try {
      const response = await fetch('/api/v1/evaluation/expertise-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSkillName,
          description: '',
          maxScore: 100,
          skillType: 'hard_skill',
          groupId: selectedGroupId
        })
      });

      if (response.ok) {
        toast.success('New skill created and added to group successfully');
        setSkillSearchOpen(false);
        setSkillSearchValue('');
        setNewSkillName('');
        fetchSkills();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create new skill');
      }
    } catch (error) {
      console.error('Error creating new skill:', error);
      toast.error('Failed to create new skill');
    }
  };

  const handleRemoveSkillFromGroup = async (skillId: string) => {
    try {
      const response = await fetch(`/api/v1/evaluation/expertise-skills/${skillId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: null })
      });

      if (response.ok) {
        toast.success('Skill removed from group successfully');
        fetchSkills();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to remove skill from group');
      }
    } catch (error) {
      console.error('Error removing skill from group:', error);
      toast.error('Failed to remove skill from group');
    }
  };

  // Dialog openers
  const openEditGroupDialog = (group: ExpertiseGroup) => {
    setSelectedGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description || '',
      color: group.color
    });
    setIsEditGroupDialogOpen(true);
  };

  const openEditSkillDialog = (skill: ExpertiseSkill) => {
    setSelectedSkill(skill);
    setSkillFormData({
      name: skill.name,
      description: skill.description || '',
      maxScore: skill.maxScore,
      skillType: skill.skillType,
      groupId: skill.groupId || ''
    });
    setIsEditSkillDialogOpen(true);
  };

  // Filter skills based on selected group
  const filteredSkills = selectedGroupId === 'all' 
    ? skills 
    : skills.filter(skill => skill.groupId === selectedGroupId);

  // Get available skills for search (skills not in current group)
  const availableSkills = selectedGroupId === 'all' 
    ? [] 
    : skills.filter(skill => skill.groupId !== selectedGroupId);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Groups */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Expertise Groups</h3>
          <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Expertise Group</DialogTitle>
                <DialogDescription>
                  Create a new group to organize related expertise skills
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                    placeholder="e.g., Technical Skills"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <ColorPicker
                    value={groupFormData.color || '#3B82F6'}
                    onChange={(color) => setGroupFormData({ ...groupFormData, color })}
                    className="w-full"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateGroupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup}>Create Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {/* All Groups option */}
          <Card 
            className={cn(
              "cursor-pointer transition-colors",
              selectedGroupId === 'all' ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
            )}
            onClick={() => setSelectedGroupId('all')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-gray-400" />
                  <div>
                    <div className="font-medium">All Groups</div>
                    <div className="text-sm text-muted-foreground">
                      View all skills across all groups
                    </div>
                  </div>
                </div>
                <Badge variant="outline">
                  {skills.length} skills
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Individual Groups */}
          {groups.map((group) => {
            const groupSkills = skills.filter(skill => skill.groupId === group.id);
            return (
              <Card 
                key={group.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedGroupId === group.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                )}
                onClick={() => setSelectedGroupId(group.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: group.color }}
                      />
                      <div>
                        <div className="font-medium">{group.name}</div>
                        {group.description && (
                          <div className="text-sm text-muted-foreground">{group.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {groupSkills.length} skills
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditGroupDialog(group);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(group.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Right Column - Skills */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">
              {selectedGroupId === 'all' ? 'All Skills' : 
               groups.find(g => g.id === selectedGroupId)?.name + ' Skills'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedGroupId === 'all' 
                ? 'All expertise skills across all groups'
                : 'Skills in the selected group'
              }
            </p>
          </div>
          <div className="flex gap-2">
            {selectedGroupId === 'all' && (
              <Dialog open={isCreateSkillDialogOpen} onOpenChange={(open) => {
                setIsCreateSkillDialogOpen(open);
                if (!open) {
                  setSkillFormData({ name: '', description: '', maxScore: 100, skillType: 'hard_skill', groupId: '' });
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Skill
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Expertise Skill</DialogTitle>
                    <DialogDescription>
                      Create a new expertise skill and assign it to a category
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="create-skill-name">Name</Label>
                      <Input
                        id="create-skill-name"
                        value={skillFormData.name}
                        onChange={(e) => setSkillFormData({ ...skillFormData, name: e.target.value })}
                        placeholder="e.g., JavaScript Programming"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-skill-description">Description</Label>
                      <Textarea
                        id="create-skill-description"
                        value={skillFormData.description}
                        onChange={(e) => setSkillFormData({ ...skillFormData, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-skill-max-score">Max Score</Label>
                      <Input
                        id="create-skill-max-score"
                        type="number"
                        min="1"
                        max="1000"
                        value={skillFormData.maxScore}
                        onChange={(e) => setSkillFormData({ ...skillFormData, maxScore: parseInt(e.target.value) || 100 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-skill-type">Skill Type</Label>
                      <Select
                        value={skillFormData.skillType}
                        onValueChange={(value) => setSkillFormData({ ...skillFormData, skillType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hard_skill">Hard Skill</SelectItem>
                          <SelectItem value="test_score">Test Score</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="create-skill-group">Category</Label>
                      <Select
                        value={skillFormData.groupId}
                        onValueChange={(value) => setSkillFormData({ ...skillFormData, groupId: value })}
                      >
                        <SelectTrigger id="create-skill-group">
                          <SelectValue placeholder="Select a category (optional)" />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)]">
                          <SelectItem value="">No Category</SelectItem>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: group.color }}
                                />
                                {group.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateSkillDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSkill}>Create Skill</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {selectedGroupId !== 'all' && (
              <Popover open={skillSearchOpen} onOpenChange={setSkillSearchOpen}>
              <PopoverTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Skill
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <Command>
                  <CommandInput 
                    placeholder="Search existing skills or type new skill name..."
                    value={skillSearchValue}
                    onValueChange={setSkillSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="p-2">
                        <div className="text-sm text-muted-foreground mb-2">
                          No existing skills found. Create a new skill:
                        </div>
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter new skill name"
                            value={newSkillName}
                            onChange={(e) => setNewSkillName(e.target.value)}
                          />
                          <Button 
                            size="sm" 
                            onClick={handleCreateNewSkillForGroup}
                            disabled={!newSkillName.trim()}
                            className="w-full"
                          >
                            Create {newSkillName}
                          </Button>
                        </div>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {availableSkills
                        .filter(skill => 
                          skill.name.toLowerCase().includes(skillSearchValue.toLowerCase())
                        )
                        .map((skill) => (
                          <CommandItem
                            key={skill.id}
                            onSelect={() => handleAddExistingSkillToGroup(skill.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{skill.name}</div>
                              <Badge variant="outline" className="text-xs">
                                {skill.skillType === 'hard_skill' ? 'Hard Skill' : 'Test Score'}
                              </Badge>
                            </div>
                          </CommandItem>
                        ))}
                      {skillSearchValue && (
                        <CommandItem onSelect={() => setNewSkillName(skillSearchValue)}>
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span>Create {skillSearchValue}</span>
                          </div>
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
        </div>

        {filteredSkills.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {selectedGroupId === 'all' 
                ? 'No expertise skills found. Create your first skill to get started.'
                : 'No skills in this group. Add skills using the "Add Skill" button.'
              }
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {filteredSkills.map((skill) => (
              <Card key={skill.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{skill.name}</div>
                        {skill.description && (
                          <div className="text-sm text-muted-foreground">{skill.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={skill.skillType === 'hard_skill' ? 'default' : 'secondary'}>
                            {skill.skillType === 'hard_skill' ? 'Hard Skill' : 'Test Score'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Max Score: {skill.maxScore}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(skill.id, skill.isActive)}
                      >
                        {skill.isActive ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Inactive
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditSkillDialog(skill)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {selectedGroupId !== 'all' && skill.groupId === selectedGroupId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveSkillFromGroup(skill.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSkill(skill.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expertise Group</DialogTitle>
            <DialogDescription>
              Update the expertise group details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={groupFormData.name}
                onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={groupFormData.description}
                onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Color</Label>
              <ColorPicker
                value={groupFormData.color || '#3B82F6'}
                onChange={(color) => setGroupFormData({ ...groupFormData, color })}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGroup}>Update Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Skill Dialog */}
      <Dialog open={isEditSkillDialogOpen} onOpenChange={setIsEditSkillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expertise Skill</DialogTitle>
            <DialogDescription>
              Update the expertise skill details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-skill-name">Name</Label>
              <Input
                id="edit-skill-name"
                value={skillFormData.name}
                onChange={(e) => setSkillFormData({ ...skillFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-skill-description">Description</Label>
              <Textarea
                id="edit-skill-description"
                value={skillFormData.description}
                onChange={(e) => setSkillFormData({ ...skillFormData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-skill-type">Skill Type</Label>
              <Select
                value={skillFormData.skillType}
                onValueChange={(value) => setSkillFormData({ ...skillFormData, skillType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hard_skill">Hard Skill</SelectItem>
                  <SelectItem value="test_score">Test Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-skill-max-score">Max Score</Label>
              <Input
                id="edit-skill-max-score"
                type="number"
                min="1"
                max="1000"
                value={skillFormData.maxScore}
                onChange={(e) => setSkillFormData({ ...skillFormData, maxScore: parseInt(e.target.value) || 100 })}
              />
            </div>
            <div>
              <Label htmlFor="edit-skill-group">Category</Label>
              <Select
                value={skillFormData.groupId}
                onValueChange={(value) => setSkillFormData({ ...skillFormData, groupId: value })}
              >
                <SelectTrigger id="edit-skill-group">
                  <SelectValue placeholder="Select a category (optional)" />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="">No Category</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSkillDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSkill}>Update Skill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
