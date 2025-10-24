"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Search, User, Mail, Calendar, X, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
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

  // Add interviewer
  const handleAddInterviewer = async () => {
    if (!selectedUserId) return;
    
    setIsAddingUser(true);
    try {
      const response = await fetch(`/api/positions/${positionId}/interviewers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add interviewer');
      }
      
      toast.success('Interviewer added successfully');
      setIsAddModalOpen(false);
      setSelectedUserId('');
      loadInterviewers();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsAddingUser(false);
    }
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
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter interviewers based on search
  const filteredInterviewers = interviewers.filter(interviewer =>
    interviewer.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interviewer.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Interviewer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Interviewer</DialogTitle>
              <DialogDescription>
                Select a user to assign as an interviewer for "{positionTitle}"
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-48">
                      {filteredAvailableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-sm text-muted-foreground">{user.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setSelectedUserId('');
                    setSearchTerm('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddInterviewer}
                  disabled={!selectedUserId || isAddingUser}
                >
                  {isAddingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Interviewer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
          {filteredInterviewers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Interviewers Assigned</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm ? 'No interviewers match your search.' : 'No users have been assigned as interviewers for this position yet.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Interviewer
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredInterviewers.map((interviewer) => (
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
              {filteredInterviewers.length} of {interviewers.length} interviewer{interviewers.length !== 1 ? 's' : ''}
              {searchTerm && ' (filtered)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
