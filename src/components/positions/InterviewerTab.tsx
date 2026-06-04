"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Search, User, Mail, Calendar, X, Users, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileInterviewerSelector } from './MobileInterviewerSelector';

interface Interviewer {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  positionTitle?: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  positionTitle?: string;
}

interface InterviewerTabProps {
  positionId: string;
  positionTitle: string;
}

export function InterviewerTab({ positionId, positionTitle }: InterviewerTabProps) {
  const isMobile = useIsMobile();
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isRemovingUser, setIsRemovingUser] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Load interviewers
  const loadInterviewers = async () => {
    if (!positionId || positionId === 'null' || positionId === 'undefined') {
      console.warn('[InterviewerTab] Cannot load interviewers: positionId is invalid', positionId);
      return;
    }

    try {
      const response = await fetch(`/api/positions/${positionId}/interviewers`);
      if (!response.ok) {
        throw new Error('Failed to load interviewers');
      }
      const data = await response.json();
      setInterviewers(data);
    } catch (error) {
      console.error('Error loading interviewers:', error);
      toast.error('Failed to load interviewers');
    }
  };

  // Load available users - all users can be interviewers
  const loadAvailableUsers = async () => {
    try {
      // Request a large pageSize to get all users
      const response = await fetch('/api/users?pageSize=9999');
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      const data = await response.json();
      setAvailableUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  // Simple UUID validation
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Add multiple interviewers
  const handleAddInterviewers = async () => {
    if (selectedUserIds.size === 0) {
      console.warn('[InterviewerTab] Attempted to add interviewers but no users selected');
      return;
    }

    if (!positionId || positionId === 'null' || positionId === 'undefined') {
      console.error('[InterviewerTab] Invalid position ID:', positionId);
      toast.error('Invalid position. Please refresh the page and try again.');
      return;
    }

    // Validate position ID is a UUID
    if (!isValidUUID(positionId)) {
      console.error('[InterviewerTab] Position ID is not a valid UUID:', positionId);
      toast.error('Invalid position ID format. Please refresh the page and try again.');
      return;
    }

    setIsAddingUser(true);
    const userIdsArray = Array.from(selectedUserIds);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Debug: Adding interviewers (remove in production)

      // Add all selected interviewers in parallel
      const promises = userIdsArray.map(async (userId) => {
        try {
          if (!userId || userId === 'null' || userId === 'undefined') {
            throw new Error('Invalid user ID');
          }

          // Validate user ID is a UUID
          if (!isValidUUID(userId)) {
            throw new Error('Invalid user ID format (must be UUID)');
          }

          // Debug: Adding interviewer (remove in production)

          const response = await fetch(`/api/positions/${positionId}/interviewers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });

          const responseData = await response.json().catch(() => ({}));

          if (!response.ok) {
            console.error('[InterviewerTab] Failed to add interviewer:', {
              status: response.status,
              statusText: response.statusText,
              error: responseData
            });
            throw new Error(responseData.message || `Failed to add interviewer (${response.status})`);
          }

          // Debug: Successfully added interviewer (remove in production)
          successCount++;
          return { success: true, userId };
        } catch (error) {
          errorCount++;
          const user = availableUsers.find(u => u.id === userId);
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[InterviewerTab] Error adding interviewer:', { userId, user: user?.name, error: errorMessage });
          errors.push(`${user?.name || userId}: ${errorMessage}`);
          return { success: false, userId, error };
        }
      });

      await Promise.all(promises);

      if (successCount > 0) {
        toast.success(`${successCount} interviewer${successCount > 1 ? 's' : ''} added successfully`);
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} failed: ${errors.join('; ')}`);
      }

      // Only clear selection and close dropdown if at least one succeeded
      if (successCount > 0) {
        setSelectedUserIds(new Set());
        setDropdownOpen(false);
        setDropdownSearchTerm('');
        loadInterviewers();
      }
    } catch (error) {
      console.error('[InterviewerTab] Unexpected error adding interviewers:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsAddingUser(false);
    }
  };

  // Toggle user selection
  const handleToggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  // Remove user from selection
  const handleRemoveFromSelection = (userId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newSelected = new Set(selectedUserIds);
    newSelected.delete(userId);
    setSelectedUserIds(newSelected);
  };

  // Remove interviewer
  const handleRemoveInterviewer = async (userId: string, userName: string) => {
    if (!positionId || positionId === 'null' || positionId === 'undefined') {
      toast.error('Invalid position. Please refresh the page and try again.');
      return;
    }

    if (!userId || userId === 'null' || userId === 'undefined') {
      toast.error('Invalid user ID');
      return;
    }

    setIsRemovingUser(userId);
    try {
      const response = await fetch(`/api/positions/${positionId}/interviewers/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to remove interviewer');
      }

      toast.success(`${userName} removed as interviewer successfully`);
      loadInterviewers();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsRemovingUser(null);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (!positionId || positionId === 'null' || positionId === 'undefined') {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadInterviewers(), loadAvailableUsers()]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [positionId]);

  // Filter available users (exclude already assigned interviewers)
  const assignedUserIds = interviewers.map(i => i.userId);
  const filteredAvailableUsers = availableUsers.filter(user =>
    !assignedUserIds.includes(user.id) &&
    (user.name.toLowerCase().includes(dropdownSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(dropdownSearchTerm.toLowerCase()))
  );

  // Get selected users for display
  const selectedUsers = availableUsers.filter(user => selectedUserIds.has(user.id));


  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col px-4 py-6")}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Users className="h-6 w-6" />
            Interviewers
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage users assigned to interview Applicants for this position
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* On mobile, use button to open drawer */}
          {isMobile ? (
            <Button
              variant="outline"
              onClick={() => setDropdownOpen(true)}
              className="min-w-[300px] justify-between min-h-[40px] h-auto py-2"
            >
              <div className="flex flex-wrap gap-1 flex-1">
                {selectedUserIds.size === 0 ? (
                  <span className="text-muted-foreground">Select interviewers...</span>
                ) : (
                  <span className="text-sm">
                    {selectedUserIds.size} interviewer{selectedUserIds.size > 1 ? 's' : ''} selected
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          ) : (
            <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="min-w-[300px] justify-between min-h-[40px] h-auto py-2"
                >
                  <div className="flex flex-wrap gap-1 flex-1">
                    {selectedUserIds.size === 0 ? (
                      <span className="text-muted-foreground">Select interviewers...</span>
                    ) : (
                      selectedUsers.map((user) => (
                        <Badge
                          key={user.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {user.name}
                          <button
                            type="button"
                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleRemoveFromSelection(user.id);
                              }
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={() => handleRemoveFromSelection(user.id)}
                          >
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border-border shadow-lg"
                align="start"
                zIndexType="dropdown"
              >
                <div
                  className="flex flex-col max-h-[450px]"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                 role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
                  <div className="p-2 flex-shrink-0">
                    <div className="text-sm font-medium mb-2">Select Interviewers</div>

                    {/* Search Input */}
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={dropdownSearchTerm}
                        onChange={(e) => setDropdownSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden min-h-0">
                    {filteredAvailableUsers.length === 0 ? (
                      <div className="p-2">
                        <div className="text-sm text-muted-foreground py-2">
                          {dropdownSearchTerm ? 'No users match your search.' : 'No available users.'}
                        </div>
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px]" type="always">
                        <div className="p-2 pt-0">
                          <div className="space-y-0.5">
                            {filteredAvailableUsers.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleToggleUser(user.id);
                                }}
                                className={cn(
                                  "w-full text-left px-2 py-2 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm",
                                  selectedUserIds.has(user.id) && "bg-accent text-accent-foreground"
                                )}
                              >
                                <div className="flex items-center">
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedUserIds.has(user.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col flex-1 leading-tight">
                                    <span className="text-sm font-medium">{user.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">{user.email}</span>
                                      {user.positionTitle && (
                                        <>
                                          <span className="text-[10px] text-muted-foreground/50">•</span>
                                          <span className="text-xs text-muted-foreground font-medium italic">{user.positionTitle}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  {selectedUserIds.size > 0 && (
                    <div className="p-2 pt-2 border-t flex-shrink-0 bg-popover">
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddInterviewers();
                        }}
                        disabled={isAddingUser}
                        className="w-full"
                        size="sm"
                        type="button"
                      >
                        {isAddingUser ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add {selectedUserIds.size} Interviewer{selectedUserIds.size > 1 ? 's' : ''}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search interviewers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Interviewers List */}
      <ScrollArea className="flex-1">
        <div className={cn("space-y-3", isMobile && interviewers.length === 0 && "pb-40")}>
          {interviewers.filter(interviewer =>
            interviewer.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            interviewer.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
          ).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Interviewers Assigned</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm ? 'No interviewers match your search.' : 'No users have been assigned as interviewers for this position yet.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setDropdownOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Interviewer
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            interviewers.filter(interviewer =>
              interviewer.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              interviewer.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((interviewer) => (
              <Card key={interviewer.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium truncate">{interviewer.userName}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {interviewer.userRole}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground truncate">{interviewer.userEmail}</p>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Added {format(new Date(interviewer.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveInterviewer(interviewer.userId, interviewer.userName)}
                      disabled={isRemovingUser === interviewer.userId}
                      className="text-destructive hover:text-destructive"
                    >
                      {isRemovingUser === interviewer.userId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Summary */}
      {interviewers.length > 0 && (
        <div className={cn("mt-4 pt-4 border-t", isMobile && "pb-40")}>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {interviewers.filter(interviewer =>
                interviewer.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                interviewer.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
              ).length} of {interviewers.length} interviewer{interviewers.length !== 1 ? 's' : ''}
              {searchTerm && ' (filtered)'}
            </span>
          </div>
        </div>
      )}

      {/* Mobile Interviewer Selector Drawer */}
      {isMobile && (
        <MobileInterviewerSelector
          isOpen={dropdownOpen}
          onOpenChange={setDropdownOpen}
          availableUsers={availableUsers}
          selectedUserIds={selectedUserIds}
          onSelectionChange={setSelectedUserIds}
          onConfirm={handleAddInterviewers}
          isLoading={isAddingUser}
        />
      )}
    </div>
  );
}
