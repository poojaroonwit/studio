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

interface ExpertiseGroup {
  id: string;
  name: string;
  color: string;
}

export default function ExpertiseSkillsTab() {
  const [skills, setSkills] = useState<ExpertiseSkill[]>([]);
  const [groups, setGroups] = useState<ExpertiseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<ExpertiseSkill | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxScore: 100,
    skillType: 'hard_skill',
    groupId: ''
  });

  useEffect(() => {
    fetchSkills();
    fetchGroups();
  }, []);

  const fetchSkills = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/expertise-skills');
      if (response.ok) {
        const data = await response.json();
        setSkills(data);
      }
    } catch (error) {
      console.error('Error fetching expertise skills:', error);
      toast.error('Failed to fetch expertise skills');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/expertise-groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching expertise groups:', error);
    }
  };

  const handleCreateSkill = async () => {
    try {
      const response = await fetch('/api/v1/evaluation/expertise-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          groupId: formData.groupId || null
        })
      });

      if (response.ok) {
        toast.success('Expertise skill created successfully');
        setIsCreateDialogOpen(false);
        setFormData({ name: '', description: '', maxScore: 100, skillType: 'hard_skill', groupId: '' });
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
          ...formData,
          groupId: formData.groupId || null
        })
      });

      if (response.ok) {
        toast.success('Expertise skill updated successfully');
        setIsEditDialogOpen(false);
        setSelectedSkill(null);
        setFormData({ name: '', description: '', maxScore: 100, skillType: 'hard_skill', groupId: '' });
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

  const openEditDialog = (skill: ExpertiseSkill) => {
    setSelectedSkill(skill);
    setFormData({
      name: skill.name,
      description: skill.description || '',
      maxScore: skill.maxScore,
      skillType: skill.skillType,
      groupId: skill.groupId || ''
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Expertise Skills</h3>
          <p className="text-sm text-muted-foreground">
            Manage individual expertise skills with scoring and categorization
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Skill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Expertise Skill</DialogTitle>
              <DialogDescription>
                Create a new expertise skill for evaluation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., JavaScript Programming"
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
                <Label htmlFor="max-score">Max Score</Label>
                <Input
                  id="max-score"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 100 })}
                />
              </div>
              <div>
                <Label htmlFor="skill-type">Skill Type</Label>
                <Select
                  value={formData.skillType}
                  onValueChange={(value) => setFormData({ ...formData, skillType: value })}
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
                <Label htmlFor="create-skill-category">Category</Label>
                <Select
                  value={formData.groupId}
                  onValueChange={(value) => setFormData({ ...formData, groupId: value })}
                >
                  <SelectTrigger id="create-skill-category">
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
              <Button onClick={handleCreateSkill}>Create Skill</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {skills.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No expertise skills found. Create your first skill to get started.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Expertise Skills</CardTitle>
            <CardDescription>
              Manage all expertise skills and their configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Max Score</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{skill.name}</div>
                        {skill.description && (
                          <div className="text-sm text-muted-foreground">{skill.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{skill.maxScore}</TableCell>
                    <TableCell>
                      {skill.group ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: skill.group.color }}
                          />
                          {skill.group.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No group</span>
                      )}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(skill)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSkill(skill.id)}
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
            <DialogTitle>Edit Expertise Skill</DialogTitle>
            <DialogDescription>
              Update the expertise skill details
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
              <Label htmlFor="edit-max-score">Max Score</Label>
              <Input
                id="edit-max-score"
                type="number"
                min="1"
                max="1000"
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 100 })}
              />
            </div>
            <div>
              <Label htmlFor="edit-skill-type">Skill Type</Label>
              <Select
                value={formData.skillType}
                onValueChange={(value) => setFormData({ ...formData, skillType: value })}
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
              <Label htmlFor="edit-skill-category">Category</Label>
              <Select
                value={formData.groupId}
                onValueChange={(value) => setFormData({ ...formData, groupId: value })}
              >
                <SelectTrigger id="edit-skill-category">
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
            <Button onClick={handleUpdateSkill}>Update Skill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
