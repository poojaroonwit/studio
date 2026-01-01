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
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import type { Headcount, HeadcountType, HeadcountStatus, Candidate, CustomFieldDefinition } from '@/lib/types';
import { HeadcountModal } from './HeadcountModal';
import { HeadcountAttachmentModal } from './HeadcountAttachmentModal';

interface HeadcountTabProps {
  positionId: string;
  candidates: Candidate[];
  onHeadcountChange?: () => void;
}

const HEADCOUNT_STATUS_OPTIONS: { value: HeadcountStatus; label: string; color: string }[] = [
  { value: 'vacant', label: 'Vacant', color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800' },
  { value: 'filled', label: 'Filled', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' },
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
  const [headcountSLA, setHeadcountSLA] = useState<Record<string, any>>({});

  useEffect(() => {
    if (positionId) {
      fetchHeadcounts();
      fetchHeadcountTypeOptions();
      fetchCustomFieldDefinitions();
    }
  }, [positionId]);

  useEffect(() => {
    if (headcounts.length > 0) {
      fetchHeadcountSLA();
    }
  }, [headcounts]);

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
        { value: 'promote', label: 'Promote', color: 'bg-primary/10 text-primary' },
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

  const fetchHeadcountSLA = async () => {
    const slaData: Record<string, any> = {};
    
    for (const headcount of headcounts) {
      try {
        const response = await fetch(`/api/headcount/${headcount.id}/sla`);
        if (response.ok) {
          const data = await response.json();
          slaData[headcount.id] = data;
          // console.log(`SLA data for headcount ${headcount.id}:`, data);
        } else {
          console.error(`Failed to fetch SLA for headcount ${headcount.id}:`, response.status, response.statusText);
          slaData[headcount.id] = { error: `HTTP ${response.status}` };
        }
      } catch (error) {
        console.error(`Error fetching SLA for headcount ${headcount.id}:`, error);
        slaData[headcount.id] = { error: 'Network error' };
      }
    }
    
    setHeadcountSLA(slaData);
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
      // console.log('Fetched headcounts:', data);
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


  const handleManageAttachments = (headcount: Headcount) => {
    setSelectedHeadcount(headcount);
    setIsAttachmentModalOpen(true);
  };

  const handleAttachmentUpdate = async () => {
    // Refresh the headcounts list
    await fetchHeadcounts();
    
    // Update the selectedHeadcount with the latest data
    if (selectedHeadcount) {
      try {
        const res = await fetch(`/api/headcount?positionId=${positionId}`);
        if (res.ok) {
          const updatedHeadcounts = await res.json();
          const updatedHeadcount = updatedHeadcounts.find((h: Headcount) => h.id === selectedHeadcount.id);
          if (updatedHeadcount) {
            setSelectedHeadcount(updatedHeadcount);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching headcount data:', error);
        }
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
      <Badge className={option?.color || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800'}>
        {option?.label || actualStatus}
      </Badge>
    );
  };

  const getSLABadge = (headcountId: string) => {
    const slaData = headcountSLA[headcountId];
    
    // Check if we have SLA data
    if (!slaData) {
      return <div className="text-sm text-muted-foreground">Loading...</div>;
    }
    
    // Check if there's an error (no grade, no request date, etc.)
    if (slaData.error) {
      // console.log(`SLA error for headcount ${headcountId}:`, slaData.error);
      return (
        <div className="text-sm text-muted-foreground" title={slaData.error}>
          No SLA
        </div>
      );
    }
    
    // Check if we have violation data
    if (!slaData.violation) {
      // console.log(`No violation data for headcount ${headcountId}:`, slaData);
      return <div className="text-sm text-muted-foreground">No SLA</div>;
    }

    const { violation } = slaData;
    
    if (violation.isViolated) {
      return (
        <Badge className="text-xs bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
          {violation.daysOverdue} days overdue
        </Badge>
      );
    } else {
      return (
        <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
          {violation.daysRemaining} days left
        </Badge>
      );
    }
  };

  // Group headcounts by request date
  const groupedHeadcounts = headcounts.reduce((groups, headcount) => {
    const requestDate = headcount.requestDate 
      ? format(new Date(headcount.requestDate), 'yyyy-MM-dd')
      : 'No Date';
    
    if (!groups[requestDate]) {
      groups[requestDate] = [];
    }
    groups[requestDate].push(headcount);
    return groups;
  }, {} as Record<string, Headcount[]>);

  // Sort groups by date (newest first, then "No Date" last)
  const sortedGroups = Object.entries(groupedHeadcounts).sort(([a], [b]) => {
    if (a === 'No Date') return 1;
    if (b === 'No Date') return -1;
    return b.localeCompare(a); // Newest first
  });

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
          {null}
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
    
            <Table>
                           <TableHeader>
               <TableRow>
                 <TableHead>Type</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead>Request Date</TableHead>
                 <TableHead>Onboarding Date</TableHead>
                 <TableHead>SLA</TableHead>
                 <TableHead>Candidate</TableHead>
                 <TableHead>Memo</TableHead>
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
                {sortedGroups.map(([requestDate, groupHeadcounts]) => (
                  <React.Fragment key={requestDate}>
                    {/* Group Header Row */}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={7 + customFieldDefinitions.length + 2} className="font-medium py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Request Date: {requestDate === 'No Date' ? 'Not Set' : format(new Date(requestDate), 'MMM dd, yyyy')}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {groupHeadcounts.length} headcount{groupHeadcounts.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Headcount Rows for this group */}
                    {groupHeadcounts.map((headcount) => (
                  <TableRow key={headcount.id}>
                    <TableCell>
                      {getTypeBadge(headcount.type)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(headcount)}
                    </TableCell>
                    <TableCell>
                      {headcount.requestDate ? (
                        <div className="text-sm">{format(new Date(headcount.requestDate), 'MMM dd, yyyy')}</div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Not set</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {headcount.onboardingDate ? (
                        <div className="text-sm">{format(new Date(headcount.onboardingDate), 'MMM dd, yyyy')}</div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Not set</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getSLABadge(headcount.id)}
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
                      {headcount.memoId ? (
                        <div className="flex items-center gap-1 max-w-xs">
                          <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{headcount.memoId}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No memo</span>
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
                          title="Edit headcount"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageAttachments(headcount)}
                          title="Manage attachments"
                          className="h-8 w-8 p-0"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteHeadcount(headcount.id)}
                          title="Delete headcount"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
       
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

    </div>
  );
}
