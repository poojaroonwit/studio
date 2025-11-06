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

interface Interviewer {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface InterviewerTabProps {
  positionId: string;
  positionTitle: string;
}

export function InterviewerTab({ positionId, positionTitle }: InterviewerTabProps) {
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

  // Load available users
  const loadAvailableUsers = async () => {
    try {
      const response = await fetch('/api/users');
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

  // Add multiple interviewers
  const handleAddInterviewers = async () => {
    if (selectedUserIds.size === 0) return;
    
    setIsAddingUser(true);
    const userIdsArray = Array.from(selectedUserIds);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    try {
      // Add all selected interviewers in parallel
      const promises = userIdsArray.map(async (userId) => {
        try {
          const response = await fetch(`/api/positions/${positionId}/interviewers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to add interviewer');
          }
          successCount++;
          return { success: true, userId };
        } catch (error) {
          errorCount++;
          const user = availableUsers.find(u => u.id === userId);
          errors.push(`${user?.name || userId}: ${(error as Error).message}`);
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
      
      setSelectedUserIds(new Set());
      setDropdownOpen(false);
      setDropdownSearchTerm('');
      loadInterviewers();
    } catch (error) {
      toast.error((error as Error).message);
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
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Users className="h-6 w-6" />
            Interviewers
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage users assigned to interview candidates for this position
          </p>
        </div>
        
        <div className="flex items-center gap-2">
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
              className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border-border shadow-lg max-h-[400px] overflow-y-auto" 
              align="start"
              zIndexType="dropdown"
            >
              <div className="p-2">
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
                
                {filteredAvailableUsers.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">
                    {dropdownSearchTerm ? 'No users match your search.' : 'No available users.'}
                  </div>
                ) : (
                  <ScrollArea className="max-h-[250px]">
                    <div className="space-y-0.5">
                      {filteredAvailableUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleToggleUser(user.id)}
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
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-medium">{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                
                {selectedUserIds.size > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <Button
                      onClick={handleAddInterviewers}
                      disabled={isAddingUser}
                      className="w-full"
                      size="sm"
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
        <div className="space-y-3">
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
        <div className="mt-4 pt-4 border-t">
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
    </div>
  );
}
