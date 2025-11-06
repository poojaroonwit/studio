"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface PersonalityGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

interface PersonalityTrait {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  groupId?: string;
  group?: {
    id: string;
    name: string;
    color: string;
  };
}

export default function PersonalityGroupsAndTraitsTab() {
  const [groups, setGroups] = useState<PersonalityGroup[]>([]);
  const [traits, setTraits] = useState<PersonalityTrait[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  
  // Dialog states
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [isCreateTraitDialogOpen, setIsCreateTraitDialogOpen] = useState(false);
  const [isEditTraitDialogOpen, setIsEditTraitDialogOpen] = useState(false);
  const [isAddTraitDialogOpen, setIsAddTraitDialogOpen] = useState(false);
  
  // Selected items
  const [selectedGroup, setSelectedGroup] = useState<PersonalityGroup | null>(null);
  const [selectedTrait, setSelectedTrait] = useState<PersonalityTrait | null>(null);
  
  // Trait search states
  const [traitSearchOpen, setTraitSearchOpen] = useState(false);
  const [traitSearchValue, setTraitSearchValue] = useState('');
  const [newTraitName, setNewTraitName] = useState('');

  // Form states
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    color: '#10B981'
  });

  const [traitFormData, setTraitFormData] = useState({
    name: '',
    description: '',
    groupId: ''
  });

  useEffect(() => {
    fetchGroups();
    fetchTraits();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/personality-groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching personality groups:', error);
      toast.error('Failed to fetch personality groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchTraits = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/personality-traits');
      if (response.ok) {
        const data = await response.json();
        setTraits(data);
      }
    } catch (error) {
      console.error('Error fetching personality traits:', error);
    }
  };

  // Group handlers
  const handleCreateGroup = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/personality-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData)
      });

      if (response.ok) {
        toast.success('Personality group created successfully');
        setIsCreateGroupDialogOpen(false);
        setGroupFormData({ name: '', description: '', color: '#10B981' });
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create personality group');
      }
    } catch (error) {
      console.error('Error creating personality group:', error);
      toast.error('Failed to create personality group');
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/v1/evaluation/personality-groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData)
      });

      if (response.ok) {
        toast.success('Personality group updated successfully');
        setIsEditGroupDialogOpen(false);
        setSelectedGroup(null);
        setGroupFormData({ name: '', description: '', color: '#10B981' });
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update personality group');
      }
    } catch (error) {
      console.error('Error updating personality group:', error);
      toast.error('Failed to update personality group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this personality group? This will also remove all associated traits.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/evaluation/personality-groups/${groupId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Personality group deleted successfully');
        fetchGroups();
        fetchTraits();
        if (selectedGroupId === groupId) {
          setSelectedGroupId('all');
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete personality group');
      }
    } catch (error) {
      console.error('Error deleting personality group:', error);
      toast.error('Failed to delete personality group');
    }
  };

  // Trait handlers
  const handleCreateTrait = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/personality-traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...traitFormData,
          groupId: traitFormData.groupId || null
        })
      });

      if (response.ok) {
        toast.success('Personality trait created successfully');
        setIsCreateTraitDialogOpen(false);
        setTraitFormData({ name: '', description: '', groupId: '' });
        fetchTraits();
      } else {
        const error = await response.json().catch(() => ({ error: 'Failed to create personality trait' }));
        const errorMessage = error.message || error.error || 'Failed to create personality trait';
        console.error('Error creating personality trait:', error);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating personality trait:', error);
      toast.error('Failed to create personality trait');
    }
  };

  const handleUpdateTrait = async () => {
    if (!selectedTrait) return;

    try {
      const response = await fetch(`/api/v1/evaluation/personality-traits/${selectedTrait.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...traitFormData,
          groupId: traitFormData.groupId || null
        })
      });

      if (response.ok) {
        toast.success('Personality trait updated successfully');
        setIsEditTraitDialogOpen(false);
        setSelectedTrait(null);
        setTraitFormData({ name: '', description: '', groupId: '' });
        fetchTraits();
      } else {
        const error = await response.json().catch(() => ({ error: 'Failed to update personality trait' }));
        const errorMessage = error.message || error.error || 'Failed to update personality trait';
        console.error('Error updating personality trait:', error);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error updating personality trait:', error);
      toast.error('Failed to update personality trait');
    }
  };

  const handleDeleteTrait = async (traitId: string) => {
    if (!confirm('Are you sure you want to delete this personality trait?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/evaluation/personality-traits/${traitId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Personality trait deleted successfully');
        fetchTraits();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete personality trait');
      }
    } catch (error) {
      console.error('Error deleting personality trait:', error);
      toast.error('Failed to delete personality trait');
    }
  };

  const handleToggleActive = async (traitId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/v1/evaluation/personality-traits/${traitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        toast.success(`Trait ${!isActive ? 'activated' : 'deactivated'} successfully`);
        fetchTraits();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update trait status');
      }
    } catch (error) {
      console.error('Error updating trait status:', error);
      toast.error('Failed to update trait status');
    }
  };

  const handleAddExistingTraitToGroup = async (traitId: string) => {
    if (selectedGroupId === 'all') return;

    try {
      const response = await fetch(`/api/v1/evaluation/personality-traits/${traitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroupId })
      });

      if (response.ok) {
        toast.success('Trait added to group successfully');
        setTraitSearchOpen(false);
        setTraitSearchValue('');
        fetchTraits();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add trait to group');
      }
    } catch (error) {
      console.error('Error adding trait to group:', error);
      toast.error('Failed to add trait to group');
    }
  };

  const handleCreateNewTraitForGroup = async () => {
    if (selectedGroupId === 'all') return;

    try {
      const response = await fetch('/api/v1/evaluation/personality-traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTraitName,
          description: '',
          groupId: selectedGroupId
        })
      });

      if (response.ok) {
        toast.success('New trait created and added to group successfully');
        setTraitSearchOpen(false);
        setTraitSearchValue('');
        setNewTraitName('');
        fetchTraits();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create new trait');
      }
    } catch (error) {
      console.error('Error creating new trait:', error);
      toast.error('Failed to create new trait');
    }
  };

  const handleRemoveTraitFromGroup = async (traitId: string) => {
    try {
      const response = await fetch(`/api/v1/evaluation/personality-traits/${traitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: null })
      });

      if (response.ok) {
        toast.success('Trait removed from group successfully');
        fetchTraits();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to remove trait from group');
      }
    } catch (error) {
      console.error('Error removing trait from group:', error);
      toast.error('Failed to remove trait from group');
    }
  };

  // Dialog openers
  const openEditGroupDialog = (group: PersonalityGroup) => {
    setSelectedGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description || '',
      color: group.color
    });
    setIsEditGroupDialogOpen(true);
  };

  const openEditTraitDialog = (trait: PersonalityTrait) => {
    setSelectedTrait(trait);
    setTraitFormData({
      name: trait.name,
      description: trait.description || '',
      groupId: trait.groupId || ''
    });
    setIsEditTraitDialogOpen(true);
  };

  // Filter traits based on selected group
  const filteredTraits = selectedGroupId === 'all' 
    ? traits 
    : traits.filter(trait => trait.groupId === selectedGroupId);

  // Get available traits for search (traits not in current group)
  const availableTraits = selectedGroupId === 'all' 
    ? [] 
    : traits.filter(trait => trait.groupId !== selectedGroupId);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Groups */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Personality Groups</h3>
          <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Personality Group</DialogTitle>
                <DialogDescription>
                  Create a new group to organize related personality traits
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                    placeholder="e.g., Communication Skills"
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
                  <Input
                    id="color"
                    type="color"
                    value={groupFormData.color}
                    onChange={(e) => setGroupFormData({ ...groupFormData, color: e.target.value })}
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
                      View all traits across all groups
                    </div>
                  </div>
                </div>
                <Badge variant="outline">
                  {traits.length} traits
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Individual Groups */}
          {groups.map((group) => {
            const groupTraits = traits.filter(trait => trait.groupId === group.id);
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
                        {groupTraits.length} traits
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

      {/* Right Column - Traits */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">
              {selectedGroupId === 'all' ? 'All Traits' : 
               groups.find(g => g.id === selectedGroupId)?.name + ' Traits'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedGroupId === 'all' 
                ? 'All personality traits across all groups'
                : 'Traits in the selected group'
              }
            </p>
          </div>
          {selectedGroupId !== 'all' && (
            <Popover open={traitSearchOpen} onOpenChange={setTraitSearchOpen}>
              <PopoverTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trait
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <Command>
                  <CommandInput 
                    placeholder="Search existing traits or type new trait name..."
                    value={traitSearchValue}
                    onValueChange={setTraitSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="p-2">
                        <div className="text-sm text-muted-foreground mb-2">
                          No existing traits found. Create a new trait:
                        </div>
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter new trait name"
                            value={newTraitName}
                            onChange={(e) => setNewTraitName(e.target.value)}
                          />
                          <Button 
                            size="sm" 
                            onClick={handleCreateNewTraitForGroup}
                            disabled={!newTraitName.trim()}
                            className="w-full"
                          >
                            Create "{newTraitName}"
                          </Button>
                        </div>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {availableTraits
                        .filter(trait => 
                          trait.name.toLowerCase().includes(traitSearchValue.toLowerCase())
                        )
                        .map((trait) => (
                          <CommandItem
                            key={trait.id}
                            onSelect={() => handleAddExistingTraitToGroup(trait.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{trait.name}</div>
                            </div>
                          </CommandItem>
                        ))}
                      {traitSearchValue && (
                        <CommandItem onSelect={() => setNewTraitName(traitSearchValue)}>
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span>Create "{traitSearchValue}"</span>
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

        {filteredTraits.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {selectedGroupId === 'all' 
                ? 'No personality traits found. Create your first trait to get started.'
                : 'No traits in this group. Add traits using the "Add Trait" button.'
              }
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {filteredTraits.map((trait) => (
              <Card key={trait.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{trait.name}</div>
                        {trait.description && (
                          <div className="text-sm text-muted-foreground">{trait.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(trait.id, trait.isActive)}
                      >
                        {trait.isActive ? (
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
                        onClick={() => openEditTraitDialog(trait)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {selectedGroupId !== 'all' && trait.groupId === selectedGroupId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveTraitFromGroup(trait.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTrait(trait.id)}
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
            <DialogTitle>Edit Personality Group</DialogTitle>
            <DialogDescription>
              Update the personality group details
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
              <Input
                id="edit-color"
                type="color"
                value={groupFormData.color}
                onChange={(e) => setGroupFormData({ ...groupFormData, color: e.target.value })}
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

      {/* Edit Trait Dialog */}
      <Dialog open={isEditTraitDialogOpen} onOpenChange={setIsEditTraitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Personality Trait</DialogTitle>
            <DialogDescription>
              Update the personality trait details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-trait-name">Name</Label>
              <Input
                id="edit-trait-name"
                value={traitFormData.name}
                onChange={(e) => setTraitFormData({ ...traitFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-trait-description">Description</Label>
              <Textarea
                id="edit-trait-description"
                value={traitFormData.description}
                onChange={(e) => setTraitFormData({ ...traitFormData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-trait-group">Group</Label>
              <Select
                value={traitFormData.groupId}
                onValueChange={(value) => setTraitFormData({ ...traitFormData, groupId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Group</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTraitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTrait}>Update Trait</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
