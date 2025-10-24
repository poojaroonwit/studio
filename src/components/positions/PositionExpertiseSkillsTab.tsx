"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, AlertCircle, CheckCircle, BrainCircuit, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ExpertiseGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  skills: ExpertiseSkill[];
}

interface ExpertiseSkill {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  skillType: string;
  isActive: boolean;
  groupId?: string;
  group?: {
    id: string;
    name: string;
    color: string;
  };
}

interface PositionAssignment {
  id: string;
  isRequired: boolean;
  weight: number;
  minScore?: number;
  group?: ExpertiseGroup;
  skill?: ExpertiseSkill;
}

interface PositionExpertiseSkillsTabProps {
  positionId: string;
  positionTitle: string;
}

export function PositionExpertiseSkillsTab({ positionId, positionTitle }: PositionExpertiseSkillsTabProps) {
  const [groups, setGroups] = useState<ExpertiseGroup[]>([]);
  const [skills, setSkills] = useState<ExpertiseSkill[]>([]);
  const [assignedGroups, setAssignedGroups] = useState<PositionAssignment[]>([]);
  const [assignedSkills, setAssignedSkills] = useState<PositionAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssignGroupDialogOpen, setIsAssignGroupDialogOpen] = useState(false);
  const [isAssignSkillDialogOpen, setIsAssignSkillDialogOpen] = useState(false);
  const [isEditAssignmentDialogOpen, setIsEditAssignmentDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<PositionAssignment | null>(null);

  // Form states
  const [groupFormData, setGroupFormData] = useState({
    groupId: '',
    isRequired: false,
    weight: 1.0
  });

  const [skillFormData, setSkillFormData] = useState({
    skillId: '',
    isRequired: false,
    weight: 1.0,
    minScore: undefined as number | undefined
  });

  const [editFormData, setEditFormData] = useState({
    isRequired: false,
    weight: 1.0,
    minScore: undefined as number | undefined
  });

  useEffect(() => {
    fetchData();
  }, [positionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [evaluationData, groupsData, skillsData] = await Promise.all([
        fetch(`/api/v1/positions/${positionId}/evaluation`).then(res => res.json()),
        fetch('/api/v1/evaluation/expertise-groups').then(res => res.json()),
        fetch('/api/v1/evaluation/expertise-skills').then(res => res.json())
      ]);

      setAssignedGroups(evaluationData.expertiseGroups || []);
      setAssignedSkills(evaluationData.expertiseSkills || []);
      setGroups(groupsData || []);
      setSkills(skillsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch evaluation data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignGroup = async () => {
    try {
      const response = await fetch(`/api/v1/positions/${positionId}/evaluation/expertise-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData)
      });

      if (response.ok) {
        toast.success('Expertise group assigned successfully');
        setIsAssignGroupDialogOpen(false);
        setGroupFormData({ groupId: '', isRequired: false, weight: 1.0 });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to assign expertise group');
      }
    } catch (error) {
      console.error('Error assigning expertise group:', error);
      toast.error('Failed to assign expertise group');
    }
  };

  const handleAssignSkill = async () => {
    try {
      const response = await fetch(`/api/v1/positions/${positionId}/evaluation/expertise-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillFormData)
      });

      if (response.ok) {
        toast.success('Expertise skill assigned successfully');
        setIsAssignSkillDialogOpen(false);
        setSkillFormData({ skillId: '', isRequired: false, weight: 1.0, minScore: undefined });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to assign expertise skill');
      }
    } catch (error) {
      console.error('Error assigning expertise skill:', error);
      toast.error('Failed to assign expertise skill');
    }
  };

  const handleUpdateAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      const endpoint = selectedAssignment.group 
        ? `/api/v1/positions/${positionId}/evaluation/expertise-groups/${selectedAssignment.id}`
        : `/api/v1/positions/${positionId}/evaluation/expertise-skills/${selectedAssignment.id}`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        toast.success('Assignment updated successfully');
        setIsEditAssignmentDialogOpen(false);
        setSelectedAssignment(null);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, isGroup: boolean) => {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      const endpoint = isGroup 
        ? `/api/v1/positions/${positionId}/evaluation/expertise-groups/${assignmentId}`
        : `/api/v1/positions/${positionId}/evaluation/expertise-skills/${assignmentId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Assignment removed successfully');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to remove assignment');
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const openEditDialog = (assignment: PositionAssignment) => {
    setSelectedAssignment(assignment);
    setEditFormData({
      isRequired: assignment.isRequired,
      weight: assignment.weight,
      minScore: assignment.minScore
    });
    setIsEditAssignmentDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <BrainCircuit className="h-6 w-6 text-primary" />
            Expertise Skills
          </h2>
          <p className="text-muted-foreground">
            Assign expertise skills and groups to {positionTitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAssignGroupDialogOpen} onOpenChange={setIsAssignGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Assign Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Expertise Group</DialogTitle>
                <DialogDescription>
                  Assign an expertise group to this position
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-select">Expertise Group</Label>
                  <Select
                    value={groupFormData.groupId}
                    onValueChange={(value) => setGroupFormData({ ...groupFormData, groupId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups
                        .filter(group => !assignedGroups.some(assigned => assigned.group?.id === group.id))
                        .map((group) => (
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
                <div className="flex items-center space-x-2">
                  <Switch
                    id="required"
                    checked={groupFormData.isRequired}
                    onCheckedChange={(checked) => setGroupFormData({ ...groupFormData, isRequired: checked })}
                  />
                  <Label htmlFor="required">Required</Label>
                </div>
                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={groupFormData.weight}
                    onChange={(e) => setGroupFormData({ ...groupFormData, weight: parseFloat(e.target.value) || 1.0 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignGroupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignGroup}>Assign Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAssignSkillDialogOpen} onOpenChange={setIsAssignSkillDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Assign Skill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Expertise Skill</DialogTitle>
                <DialogDescription>
                  Assign an individual expertise skill to this position
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="skill-select">Expertise Skill</Label>
                  <Select
                    value={skillFormData.skillId}
                    onValueChange={(value) => setSkillFormData({ ...skillFormData, skillId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {skills
                        .filter(skill => !assignedSkills.some(assigned => assigned.skill?.id === skill.id))
                        .map((skill) => (
                          <SelectItem key={skill.id} value={skill.id}>
                            <div className="flex items-center gap-2">
                              {skill.group && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: skill.group.color }}
                                />
                              )}
                              {skill.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="required-skill"
                    checked={skillFormData.isRequired}
                    onCheckedChange={(checked) => setSkillFormData({ ...skillFormData, isRequired: checked })}
                  />
                  <Label htmlFor="required-skill">Required</Label>
                </div>
                <div>
                  <Label htmlFor="weight-skill">Weight</Label>
                  <Input
                    id="weight-skill"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={skillFormData.weight}
                    onChange={(e) => setSkillFormData({ ...skillFormData, weight: parseFloat(e.target.value) || 1.0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="min-score">Minimum Score (Optional)</Label>
                  <Input
                    id="min-score"
                    type="number"
                    min="0"
                    value={skillFormData.minScore || ''}
                    onChange={(e) => setSkillFormData({ ...skillFormData, minScore: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Leave empty for no minimum"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignSkillDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignSkill}>Assign Skill</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="groups" className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Groups ({assignedGroups.length})
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            Individual Skills ({assignedSkills.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Expertise Groups</CardTitle>
              <CardDescription>
                Expertise groups assigned to this position
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignedGroups.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No expertise groups assigned to this position yet.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Skills Count</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedGroups.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: assignment.group?.color }}
                            />
                            <div>
                              <div className="font-medium">{assignment.group?.name}</div>
                              {assignment.group?.description && (
                                <div className="text-sm text-muted-foreground">
                                  {assignment.group.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.isRequired ? "default" : "secondary"}>
                            {assignment.isRequired ? "Required" : "Optional"}
                          </Badge>
                        </TableCell>
                        <TableCell>{assignment.weight}</TableCell>
                        <TableCell>{assignment.group?.skills?.length || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(assignment)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveAssignment(assignment.id, true)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Individual Skills</CardTitle>
              <CardDescription>
                Individual expertise skills assigned to this position
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignedSkills.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No individual skills assigned to this position yet.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Min Score</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedSkills.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.skill?.name}</div>
                            {assignment.skill?.description && (
                              <div className="text-sm text-muted-foreground">
                                {assignment.skill.description}
                              </div>
                            )}
                            {assignment.skill?.group && (
                              <div className="flex items-center gap-1 mt-1">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: assignment.skill.group.color }}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {assignment.skill.group.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.skill?.skillType === 'hard_skill' ? 'default' : 'secondary'}>
                            {assignment.skill?.skillType === 'hard_skill' ? 'Hard Skill' : 'Test Score'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.isRequired ? "default" : "secondary"}>
                            {assignment.isRequired ? "Required" : "Optional"}
                          </Badge>
                        </TableCell>
                        <TableCell>{assignment.weight}</TableCell>
                        <TableCell>
                          {assignment.minScore ? `${assignment.minScore}/${assignment.skill?.maxScore}` : 'No minimum'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(assignment)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveAssignment(assignment.id, false)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditAssignmentDialogOpen} onOpenChange={setIsEditAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update the assignment details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-required"
                checked={editFormData.isRequired}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, isRequired: checked })}
              />
              <Label htmlFor="edit-required">Required</Label>
            </div>
            <div>
              <Label htmlFor="edit-weight">Weight</Label>
              <Input
                id="edit-weight"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={editFormData.weight}
                onChange={(e) => setEditFormData({ ...editFormData, weight: parseFloat(e.target.value) || 1.0 })}
              />
            </div>
            {selectedAssignment?.skill && (
              <div>
                <Label htmlFor="edit-min-score">Minimum Score (Optional)</Label>
                <Input
                  id="edit-min-score"
                  type="number"
                  min="0"
                  max={selectedAssignment.skill.maxScore}
                  value={editFormData.minScore || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, minScore: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Leave empty for no minimum"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAssignmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAssignment}>Update Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
