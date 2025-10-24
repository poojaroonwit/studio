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
import { Plus, Edit, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
  skillType: string;
  isActive: boolean;
  sortOrder: number;
  groupId?: string;
}

export default function ExpertiseGroupsTab() {
  const [groups, setGroups] = useState<ExpertiseGroup[]>([]);
  const [skills, setSkills] = useState<ExpertiseSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddSkillDialogOpen, setIsAddSkillDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ExpertiseGroup | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<ExpertiseSkill | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const [skillFormData, setSkillFormData] = useState({
    name: '',
    description: '',
    maxScore: 100,
    skillType: 'hard_skill'
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

  const handleCreateGroup = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/expertise-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Expertise group created successfully');
        setIsCreateDialogOpen(false);
        setFormData({ name: '', description: '', color: '#3B82F6' });
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
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Expertise group updated successfully');
        setIsEditDialogOpen(false);
        setSelectedGroup(null);
        setFormData({ name: '', description: '', color: '#3B82F6' });
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
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete expertise group');
      }
    } catch (error) {
      console.error('Error deleting expertise group:', error);
      toast.error('Failed to delete expertise group');
    }
  };

  const handleAddSkillToGroup = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch('/api/v1/evaluation/expertise-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...skillFormData,
          groupId: selectedGroup.id
        })
      });

      if (response.ok) {
        toast.success('Skill added to group successfully');
        setIsAddSkillDialogOpen(false);
        setSelectedGroup(null);
        setSkillFormData({ name: '', description: '', maxScore: 100, skillType: 'hard_skill' });
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

  const openEditDialog = (group: ExpertiseGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color
    });
    setIsEditDialogOpen(true);
  };

  const openAddSkillDialog = (group: ExpertiseGroup) => {
    setSelectedGroup(group);
    setIsAddSkillDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Expertise Skill Groups</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage groups of expertise skills for evaluation
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Technical Skills"
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
            No expertise groups found. Create your first group to get started.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => {
            const groupSkills = skills.filter(skill => skill.groupId === group.id);
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
                        onClick={() => openAddSkillDialog(group)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Skill
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
                  {groupSkills.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No skills in this group</p>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Skills in this group:</h4>
                      <div className="flex flex-wrap gap-2">
                        {groupSkills.map((skill) => (
                          <Badge key={skill.id} variant="outline" className="flex items-center gap-1">
                            {skill.name}
                            <button
                              onClick={() => handleRemoveSkillFromGroup(skill.id)}
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

      {/* Add Skill Dialog */}
      <Dialog open={isAddSkillDialogOpen} onOpenChange={setIsAddSkillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Skill to Group</DialogTitle>
            <DialogDescription>
              Add a new skill to the "{selectedGroup?.name}" group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="skill-name">Skill Name</Label>
              <Input
                id="skill-name"
                value={skillFormData.name}
                onChange={(e) => setSkillFormData({ ...skillFormData, name: e.target.value })}
                placeholder="e.g., JavaScript"
              />
            </div>
            <div>
              <Label htmlFor="skill-description">Description</Label>
              <Textarea
                id="skill-description"
                value={skillFormData.description}
                onChange={(e) => setSkillFormData({ ...skillFormData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label htmlFor="skill-type">Skill Type</Label>
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
              <Label htmlFor="max-score">Max Score</Label>
              <Input
                id="max-score"
                type="number"
                min="1"
                max="1000"
                value={skillFormData.maxScore}
                onChange={(e) => setSkillFormData({ ...skillFormData, maxScore: parseInt(e.target.value) || 100 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSkillDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSkillToGroup}>Add Skill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
