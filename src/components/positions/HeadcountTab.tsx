"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CandidateAvatar } from '@/components/ui/candidate-avatar';
import { 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Calendar, 
  FileText, 
  Paperclip,
  Loader2,
  AlertCircle,
  UserX
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import type { Headcount, HeadcountType, HeadcountStatus, Candidate, CustomFieldDefinition } from '@/lib/types';
import { HeadcountModal } from './HeadcountModal';
import { HeadcountAttachmentModal } from './HeadcountAttachmentModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface HeadcountTabProps {
  positionId: string;
  candidates: Candidate[];
  onHeadcountChange?: () => void;
}

const HEADCOUNT_STATUS_OPTIONS: { value: HeadcountStatus; label: string; color: string }[] = [
  { value: 'vacant', label: 'Vacant', color: 'bg-gray-100 text-gray-800' },
  { value: 'filled', label: 'Filled', color: 'bg-purple-100 text-purple-800' },
];

export function HeadcountTab({ positionId, candidates, onHeadcountChange }: HeadcountTabProps) {
  // Headcount type options will be fetched from API
  const [headcountTypeOptions, setHeadcountTypeOptions] = useState<{ value: HeadcountType; label: string; color: string }[]>([]);
  const [headcounts, setHeadcounts] = useState<Headcount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [selectedHeadcount, setSelectedHeadcount] = useState<Headcount | null>(null);
  const [editingHeadcount, setEditingHeadcount] = useState<Headcount | null>(null);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [unassignWarning, setUnassignWarning] = useState<any>(null);
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);
  const [headcountToUnassign, setHeadcountToUnassign] = useState<string | null>(null);

  useEffect(() => {
    if (positionId) {
      fetchHeadcounts();
      fetchHeadcountTypeOptions();
      fetchCustomFieldDefinitions();
    }
  }, [positionId]);

  const fetchHeadcountTypeOptions = async () => {
    try {
      const response = await fetch('/api/settings/headcount-types');
      if (response.ok) {
        const options = await response.json();
        setHeadcountTypeOptions(options);
      }
    } catch (error) {
      console.error('Error fetching headcount type options:', error);
      // Set default options if API fails
      setHeadcountTypeOptions([
        { value: 'promote', label: 'Promote', color: 'bg-blue-100 text-blue-800' },
        { value: 'new', label: 'New', color: 'bg-green-100 text-green-800' },
        { value: 'replace', label: 'Replace', color: 'bg-orange-100 text-orange-800' },
      ]);
    }
  };

  const fetchCustomFieldDefinitions = async () => {
    try {
      const response = await fetch('/api/settings/custom-field-definitions?model=Headcount');
      if (response.ok) {
        const definitions = await response.json();
        setCustomFieldDefinitions(definitions.filter((def: CustomFieldDefinition) => def.showInHeadcountDetail));
      }
    } catch (error) {
      console.error('Error fetching custom field definitions:', error);
    }
  };

  const fetchHeadcounts = async () => {
    if (!positionId) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/headcount?positionId=${positionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch headcounts');
      }
      const data = await response.json();
      setHeadcounts(data);
    } catch (error) {
      console.error('Error fetching headcounts:', error);
      setError('Failed to load headcounts');
      toast.error('Failed to load headcounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHeadcount = () => {
    setEditingHeadcount(null);
    setIsModalOpen(true);
  };

  const handleEditHeadcount = (headcount: Headcount) => {
    setEditingHeadcount(headcount);
    setIsModalOpen(true);
  };

  const handleDeleteHeadcount = async (headcountId: string) => {
    if (!confirm('Are you sure you want to delete this headcount?')) {
      return;
    }

    try {
      const response = await fetch(`/api/headcount/${headcountId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete headcount');
      }

      toast.success('Headcount deleted successfully');
      fetchHeadcounts();
      onHeadcountChange?.();
    } catch (error) {
      console.error('Error deleting headcount:', error);
      toast.error('Failed to delete headcount');
    }
  };

  const handleUnassignCandidate = async (headcountId: string) => {
    try {
      // First check for warnings
      const warningResponse = await fetch(`/api/headcount/${headcountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_unassign_warning' }),
      });

      if (!warningResponse.ok) {
        throw new Error('Failed to check unassign warning');
      }

      const warning = await warningResponse.json();

      if (warning.hasWarning) {
        setUnassignWarning(warning);
        setHeadcountToUnassign(headcountId);
        setShowUnassignDialog(true);
        return;
      }

      // No warning, proceed with unassign
      await performUnassign(headcountId);
    } catch (error) {
      console.error('Error checking unassign warning:', error);
      toast.error('Failed to check unassign warning');
    }
  };

  const performUnassign = async (headcountId: string) => {
    try {
      const response = await fetch(`/api/headcount/${headcountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign_candidate' }),
      });

      if (!response.ok) {
        throw new Error('Failed to unassign candidate');
      }

      const result = await response.json();

      if (result.success) {
        toast.success('Candidate unassigned successfully');
        if (result.statusUpdateResult?.statusChanged) {
          toast.success(`Candidate status automatically changed from "${result.statusUpdateResult.oldStatus}" to "${result.statusUpdateResult.newStatus}"`);
        }
        fetchHeadcounts();
        onHeadcountChange?.();
      } else {
        toast.error(result.message || 'Failed to unassign candidate');
      }
    } catch (error) {
      console.error('Error unassigning candidate:', error);
      toast.error('Failed to unassign candidate');
    }
  };

  const handleManageAttachments = (headcount: Headcount) => {
    setSelectedHeadcount(headcount);
    setIsAttachmentModalOpen(true);
  };

  const handleAttachmentUpdate = async () => {
    // Refresh the headcounts list
    await fetchHeadcounts();
    
    // Update the selectedHeadcount with the latest data
    if (selectedHeadcount) {
      const updatedHeadcounts = await fetch(`/api/headcount?positionId=${positionId}`).then(res => res.json());
      const updatedHeadcount = updatedHeadcounts.find((h: Headcount) => h.id === selectedHeadcount.id);
      if (updatedHeadcount) {
        setSelectedHeadcount(updatedHeadcount);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingHeadcount(null);
  };

  const handleModalSave = async (headcountData: any) => {
    try {
      const url = editingHeadcount 
        ? `/api/headcount/${editingHeadcount.id}`
        : '/api/headcount';
      
      const method = editingHeadcount ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...headcountData,
          positionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save headcount');
      }

      toast.success(editingHeadcount ? 'Headcount updated successfully' : 'Headcount created successfully');
      handleModalClose();
      fetchHeadcounts();
      onHeadcountChange?.();
    } catch (error) {
      console.error('Error saving headcount:', error);
      toast.error('Failed to save headcount');
    }
  };

  const getTypeBadge = (type: HeadcountType) => {
    const option = headcountTypeOptions.find(opt => opt.value === type);
    return (
      <Badge className={option?.color || 'bg-gray-100 text-gray-800'}>
        {option?.label || type}
      </Badge>
    );
  };

  const getStatusBadge = (headcount: Headcount) => {
    // A headcount is only considered filled if it has status 'filled' AND has a candidate assigned
    const actualStatus = (headcount.status === 'filled' && headcount.candidateId !== null) ? 'filled' : 'vacant';
    const option = HEADCOUNT_STATUS_OPTIONS.find(opt => opt.value === actualStatus);
    return (
      <Badge className={option?.color || 'bg-gray-100 text-gray-800'}>
        {option?.label || actualStatus}
      </Badge>
    );
  };

  const renderCustomFieldValue = (definition: CustomFieldDefinition, value: any) => {
    if (!value) return <span className="text-muted-foreground text-sm">-</span>;

    switch (definition.field_type) {
      case 'boolean':
        return (
          <Badge variant={value ? "default" : "secondary"} className="text-xs">
            {value ? 'Yes' : 'No'}
          </Badge>
        );

      case 'date':
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(value), 'MMM dd, yyyy')}
          </span>
        );

      case 'select_single':
        const option = definition.options?.find(opt => opt.value === value);
        return (
          <Badge variant="outline" className="text-xs">
            {option?.label || value}
          </Badge>
        );

      case 'select_multiple':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((v, index) => {
                const option = definition.options?.find(opt => opt.value === v);
                return (
                  <Badge key={index} variant="outline" className="text-xs">
                    {option?.label || v}
                  </Badge>
                );
              })}
            </div>
          );
        }
        return <span className="text-muted-foreground text-sm">-</span>;

      case 'number':
        return (
          <span className="text-sm font-medium">
            {value}
          </span>
        );

      case 'textarea':
        return (
          <span className="text-sm text-muted-foreground truncate max-w-xs" title={value}>
            {value}
          </span>
        );

      default:
        return (
          <span className="text-sm text-muted-foreground truncate max-w-xs" title={value}>
            {value}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchHeadcounts} className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Headcount Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage headcount positions and assignments
          </p>
        </div>
        <Button onClick={handleCreateHeadcount}>
          <Plus className="h-4 w-4 mr-2" />
          Add Headcount
        </Button>
      </div>

      {/* Headcount List */}
      {headcounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No headcounts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first headcount position to get started
            </p>
            <Button onClick={handleCreateHeadcount}>
              <Plus className="h-4 w-4 mr-2" />
              Add Headcount
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Headcount Positions ({headcounts.length})</CardTitle>
            <CardDescription>
              Manage headcount positions and candidate assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                           <TableHeader>
               <TableRow>
                 <TableHead>Type</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead>Candidate</TableHead>
                 <TableHead>Notes</TableHead>
                 {customFieldDefinitions.map((definition) => (
                   <TableHead key={definition.id} className="min-w-[120px]">
                     {definition.label}
                   </TableHead>
                 ))}
                 <TableHead>Attachments</TableHead>
                 <TableHead>Actions</TableHead>
               </TableRow>
             </TableHeader>
              <TableBody>
                {headcounts.map((headcount) => (
                  <TableRow key={headcount.id}>
                    <TableCell>
                      {getTypeBadge(headcount.type)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(headcount)}
                    </TableCell>
                    <TableCell>
                      {headcount.candidate ? (
                        <div className="flex items-center gap-2">
                          <CandidateAvatar 
                            user={headcount.candidate}
                            size="sm"
                            className="h-6 w-6"
                          />
                          <div>
                            <div className="font-medium text-sm">{headcount.candidate.name}</div>
                            <div className="text-xs text-muted-foreground">{headcount.candidate.email}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No candidate assigned</span>
                      )}
                    </TableCell>
                                         <TableCell>
                       {headcount.notes ? (
                         <div className="flex items-center gap-1 max-w-xs">
                           <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                           <span className="text-sm truncate">{headcount.notes}</span>
                         </div>
                       ) : (
                         <span className="text-muted-foreground text-sm">No notes</span>
                       )}
                     </TableCell>
                     {customFieldDefinitions.map((definition) => (
                       <TableCell key={definition.id}>
                         {renderCustomFieldValue(definition, headcount.customFields?.[definition.field_code])}
                       </TableCell>
                     ))}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{headcount.attachments?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditHeadcount(headcount)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageAttachments(headcount)}
                        >
                          <Paperclip className="h-3 w-3" />
                        </Button>
                        {headcount.candidate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnassignCandidate(headcount.id)}
                            title="Unassign candidate"
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteHeadcount(headcount.id)}
                        >
                          <Trash2 className="h-3 w-3" />
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

      {/* Modals */}
      <HeadcountModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        headcount={editingHeadcount}
        candidates={candidates}
        positionId={positionId}
        onSave={handleModalSave}
        onClose={handleModalClose}
      />

      <HeadcountAttachmentModal
        open={isAttachmentModalOpen}
        onOpenChange={setIsAttachmentModalOpen}
        headcount={selectedHeadcount}
        onClose={() => {
          setIsAttachmentModalOpen(false);
          setSelectedHeadcount(null);
        }}
        onUpdate={handleAttachmentUpdate}
      />

      {/* Unassign Warning Dialog */}
      <AlertDialog open={showUnassignDialog} onOpenChange={setShowUnassignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Warning: Candidate Status Will Change
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unassignWarning?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (headcountToUnassign) {
                  performUnassign(headcountToUnassign);
                }
                setShowUnassignDialog(false);
                setUnassignWarning(null);
                setHeadcountToUnassign(null);
              }}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Continue with Unassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
