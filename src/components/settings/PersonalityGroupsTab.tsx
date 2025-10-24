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
import { Plus, Edit, Trash2, AlertCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
}

export default function PersonalityGroupsTab() {
  const [groups, setGroups] = useState<PersonalityGroup[]>([]);
  const [traits, setTraits] = useState<PersonalityTrait[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddTraitDialogOpen, setIsAddTraitDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PersonalityGroup | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#10B981'
  });

  const [traitFormData, setTraitFormData] = useState({
    name: '',
    description: ''
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

  const handleCreateGroup = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/personality-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Personality group created successfully');
        setIsCreateDialogOpen(false);
        setFormData({ name: '', description: '', color: '#10B981' });
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
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Personality group updated successfully');
        setIsEditDialogOpen(false);
        setSelectedGroup(null);
        setFormData({ name: '', description: '', color: '#10B981' });
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
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete personality group');
      }
    } catch (error) {
      console.error('Error deleting personality group:', error);
      toast.error('Failed to delete personality group');
    }
  };

  const handleAddTraitToGroup = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch('/api/v1/evaluation/personality-traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...traitFormData,
          groupId: selectedGroup.id
        })
      });

      if (response.ok) {
        toast.success('Trait added to group successfully');
        setIsAddTraitDialogOpen(false);
        setSelectedGroup(null);
        setTraitFormData({ name: '', description: '' });
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

  const openEditDialog = (group: PersonalityGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color
    });
    setIsEditDialogOpen(true);
  };

  const openAddTraitDialog = (group: PersonalityGroup) => {
    setSelectedGroup(group);
    setIsAddTraitDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Personality Groups</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage groups of personality traits (soft skills) for evaluation
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Communication Skills"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup}>Create Group</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No personality groups found. Create your first group to get started.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => {
            const groupTraits = traits.filter(trait => trait.groupId === group.id);
            return (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: group.color }}
                      />
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        {group.description && (
                          <CardDescription>{group.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={group.isActive ? "default" : "secondary"}>
                        {group.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddTraitDialog(group)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Trait
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(group)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {groupTraits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No traits in this group</p>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Traits in this group:</h4>
                      <div className="flex flex-wrap gap-2">
                        {groupTraits.map((trait) => (
                          <Badge key={trait.id} variant="outline" className="flex items-center gap-1">
                            {trait.name}
                            <button
                              onClick={() => handleRemoveTraitFromGroup(trait.id)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Color</Label>
              <Input
                id="edit-color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGroup}>Update Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Trait Dialog */}
      <Dialog open={isAddTraitDialogOpen} onOpenChange={setIsAddTraitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Trait to Group</DialogTitle>
            <DialogDescription>
              Add a new personality trait to the "{selectedGroup?.name}" group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="trait-name">Trait Name</Label>
              <Input
                id="trait-name"
                value={traitFormData.name}
                onChange={(e) => setTraitFormData({ ...traitFormData, name: e.target.value })}
                placeholder="e.g., Leadership"
              />
            </div>
            <div>
              <Label htmlFor="trait-description">Description</Label>
              <Textarea
                id="trait-description"
                value={traitFormData.description}
                onChange={(e) => setTraitFormData({ ...traitFormData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTraitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTraitToGroup}>Add Trait</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
