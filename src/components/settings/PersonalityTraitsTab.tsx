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
import { Plus, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PersonalityTrait {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  isActive: boolean;
  sortOrder: number;
  groupId?: string;
  group?: {
    id: string;
    name: string;
    color: string;
  };
}

interface PersonalityGroup {
  id: string;
  name: string;
  color: string;
}

export default function PersonalityTraitsTab() {
  const [traits, setTraits] = useState<PersonalityTrait[]>([]);
  const [groups, setGroups] = useState<PersonalityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTrait, setSelectedTrait] = useState<PersonalityTrait | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shortDescription: '',
    groupId: ''
  });

  useEffect(() => {
    fetchTraits();
    fetchGroups();
  }, []);

  const fetchTraits = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/personality-traits');
      if (response.ok) {
        const data = await response.json();
        setTraits(data);
      }
    } catch (error) {
      console.error('Error fetching personality traits:', error);
      toast.error('Failed to fetch personality traits');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/personality-groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching personality groups:', error);
    }
  };

  const handleCreateTrait = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/personality-traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          groupId: formData.groupId || null
        })
      });

      if (response.ok) {
        toast.success('Personality trait created successfully');
        setIsCreateDialogOpen(false);
        setFormData({ name: '', description: '', shortDescription: '', groupId: '' });
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
          ...formData,
          groupId: formData.groupId || null
        })
      });

      if (response.ok) {
        toast.success('Personality trait updated successfully');
        setIsEditDialogOpen(false);
        setSelectedTrait(null);
        setFormData({ name: '', description: '', shortDescription: '', groupId: '' });
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

  const openEditDialog = (trait: PersonalityTrait) => {
    setSelectedTrait(trait);
    setFormData({
      name: trait.name,
      description: trait.description || '',
      shortDescription: trait.shortDescription || '',
      groupId: trait.groupId || ''
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold">Personality Traits</h3>
          <p className="text-sm text-muted-foreground">
            Manage individual personality traits (soft skills) for evaluation
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Trait
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Personality Trait</DialogTitle>
              <DialogDescription>
                Create a new personality trait for evaluation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Leadership"
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
                <Label htmlFor="shortDescription">Short Description</Label>
                <Input
                  id="shortDescription"
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="Optional short description (shown in navigation)"
                />
              </div>
              <div>
                <Label htmlFor="create-trait-category">Category</Label>
                <Select
                  value={formData.groupId}
                  onValueChange={(value) => setFormData({ ...formData, groupId: value })}
                >
                  <SelectTrigger id="create-trait-category">
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
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTrait}>Create Trait</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {traits.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No personality traits found. Create your first trait to get started.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Personality Traits</CardTitle>
            <CardDescription>
              Manage all personality traits and their configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {traits.map((trait) => (
                  <TableRow key={trait.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{trait.name}</div>
                        {trait.description && (
                          <div className="text-sm text-muted-foreground">{trait.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {trait.group ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: trait.group.color }}
                          />
                          {trait.group.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No category</span>
                      )}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(trait)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTrait(trait.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Personality Trait</DialogTitle>
            <DialogDescription>
              Update the personality trait details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
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
              <Label htmlFor="edit-shortDescription">Short Description</Label>
              <Input
                id="edit-shortDescription"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="Optional short description (shown in navigation)"
              />
            </div>
            <div>
              <Label htmlFor="edit-trait-category">Category</Label>
              <Select
                value={formData.groupId}
                onValueChange={(value) => setFormData({ ...formData, groupId: value })}
              >
                <SelectTrigger id="edit-trait-category">
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
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTrait}>Update Trait</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
