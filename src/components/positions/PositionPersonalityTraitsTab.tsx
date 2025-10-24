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
import { Plus, Edit, Trash2, AlertCircle, Users, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PersonalityGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  traits: PersonalityTrait[];
}

interface PersonalityTrait {
  id: string;
  name: string;
  description?: string;
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
  group?: PersonalityGroup;
  trait?: PersonalityTrait;
}

interface PositionPersonalityTraitsTabProps {
  positionId: string;
  positionTitle: string;
}

export function PositionPersonalityTraitsTab({ positionId, positionTitle }: PositionPersonalityTraitsTabProps) {
  const [groups, setGroups] = useState<PersonalityGroup[]>([]);
  const [traits, setTraits] = useState<PersonalityTrait[]>([]);
  const [assignedGroups, setAssignedGroups] = useState<PositionAssignment[]>([]);
  const [assignedTraits, setAssignedTraits] = useState<PositionAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssignGroupDialogOpen, setIsAssignGroupDialogOpen] = useState(false);
  const [isAssignTraitDialogOpen, setIsAssignTraitDialogOpen] = useState(false);
  const [isEditAssignmentDialogOpen, setIsEditAssignmentDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<PositionAssignment | null>(null);

  // Form states
  const [groupFormData, setGroupFormData] = useState({
    groupId: '',
    isRequired: false,
    weight: 1.0
  });

  const [traitFormData, setTraitFormData] = useState({
    traitId: '',
    isRequired: false,
    weight: 1.0
  });

  const [editFormData, setEditFormData] = useState({
    isRequired: false,
    weight: 1.0
  });

  useEffect(() => {
    fetchData();
  }, [positionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [evaluationData, groupsData, traitsData] = await Promise.all([
        fetch(`/api/v1/positions/${positionId}/evaluation`).then(res => res.json()),
        fetch('/api/v1/evaluation/personality-groups').then(res => res.json()),
        fetch('/api/v1/evaluation/personality-traits').then(res => res.json())
      ]);

      setAssignedGroups(evaluationData.personalityGroups || []);
      setAssignedTraits(evaluationData.personalityTraits || []);
      setGroups(groupsData || []);
      setTraits(traitsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch evaluation data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignGroup = async () => {
    try {
      const response = await fetch(`/api/v1/positions/${positionId}/evaluation/personality-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData)
      });

      if (response.ok) {
        toast.success('Personality group assigned successfully');
        setIsAssignGroupDialogOpen(false);
        setGroupFormData({ groupId: '', isRequired: false, weight: 1.0 });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to assign personality group');
      }
    } catch (error) {
      console.error('Error assigning personality group:', error);
      toast.error('Failed to assign personality group');
    }
  };

  const handleAssignTrait = async () => {
    try {
      const response = await fetch(`/api/v1/positions/${positionId}/evaluation/personality-traits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(traitFormData)
      });

      if (response.ok) {
        toast.success('Personality trait assigned successfully');
        setIsAssignTraitDialogOpen(false);
        setTraitFormData({ traitId: '', isRequired: false, weight: 1.0 });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to assign personality trait');
      }
    } catch (error) {
      console.error('Error assigning personality trait:', error);
      toast.error('Failed to assign personality trait');
    }
  };

  const handleUpdateAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      const endpoint = selectedAssignment.group 
        ? `/api/v1/positions/${positionId}/evaluation/personality-groups/${selectedAssignment.id}`
        : `/api/v1/positions/${positionId}/evaluation/personality-traits/${selectedAssignment.id}`;

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
        ? `/api/v1/positions/${positionId}/evaluation/personality-groups/${assignmentId}`
        : `/api/v1/positions/${positionId}/evaluation/personality-traits/${assignmentId}`;

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
      weight: assignment.weight
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
            <Target className="h-6 w-6 text-primary" />
            Personality Traits
          </h2>
          <p className="text-muted-foreground">
            Assign personality traits and groups to {positionTitle}
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
                <DialogTitle>Assign Personality Group</DialogTitle>
                <DialogDescription>
                  Assign a personality group to this position
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-select">Personality Group</Label>
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

          <Dialog open={isAssignTraitDialogOpen} onOpenChange={setIsAssignTraitDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Assign Trait
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Personality Trait</DialogTitle>
                <DialogDescription>
                  Assign an individual personality trait to this position
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="trait-select">Personality Trait</Label>
                  <Select
                    value={traitFormData.traitId}
                    onValueChange={(value) => setTraitFormData({ ...traitFormData, traitId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a trait" />
                    </SelectTrigger>
                    <SelectContent>
                      {traits
                        .filter(trait => !assignedTraits.some(assigned => assigned.trait?.id === trait.id))
                        .map((trait) => (
                          <SelectItem key={trait.id} value={trait.id}>
                            <div className="flex items-center gap-2">
                              {trait.group && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: trait.group.color }}
                                />
                              )}
                              {trait.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="required-trait"
                    checked={traitFormData.isRequired}
                    onCheckedChange={(checked) => setTraitFormData({ ...traitFormData, isRequired: checked })}
                  />
                  <Label htmlFor="required-trait">Required</Label>
                </div>
                <div>
                  <Label htmlFor="weight-trait">Weight</Label>
                  <Input
                    id="weight-trait"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={traitFormData.weight}
                    onChange={(e) => setTraitFormData({ ...traitFormData, weight: parseFloat(e.target.value) || 1.0 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignTraitDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignTrait}>Assign Trait</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="groups" className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Groups ({assignedGroups.length})
          </TabsTrigger>
          <TabsTrigger value="traits" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Individual Traits ({assignedTraits.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Personality Groups</CardTitle>
              <CardDescription>
                Personality groups assigned to this position
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignedGroups.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No personality groups assigned to this position yet.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Traits Count</TableHead>
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
                        <TableCell>{assignment.group?.traits?.length || 0}</TableCell>
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

        <TabsContent value="traits" className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Individual Traits</CardTitle>
              <CardDescription>
                Individual personality traits assigned to this position
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignedTraits.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No individual traits assigned to this position yet.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trait</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedTraits.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.trait?.name}</div>
                            {assignment.trait?.description && (
                              <div className="text-sm text-muted-foreground">
                                {assignment.trait.description}
                              </div>
                            )}
                            {assignment.trait?.group && (
                              <div className="flex items-center gap-1 mt-1">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: assignment.trait.group.color }}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {assignment.trait.group.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.isRequired ? "default" : "secondary"}>
                            {assignment.isRequired ? "Required" : "Optional"}
                          </Badge>
                        </TableCell>
                        <TableCell>{assignment.weight}</TableCell>
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
