"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  Loader2, 
  Mail,
  Calendar,
  Check
} from 'lucide-react';
import type { UserGroup } from '@/lib/types';

interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface GroupMembersDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  group: UserGroup | null;
  onMembersChange?: () => void;
}

export function GroupMembersDrawer({ 
  isOpen, 
  onOpenChange, 
  group, 
  onMembersChange 
}: GroupMembersDrawerProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRemovingUser, setIsRemovingUser] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Load group members when drawer opens
  useEffect(() => {
    if (isOpen && group) {
      loadGroupMembers();
    }
  }, [isOpen, group]);

  // Load available users when add user modal opens
  useEffect(() => {
    if (isAddUserModalOpen && group) {
      loadAvailableUsers();
    }
  }, [isAddUserModalOpen, group, searchTerm]);

  const loadGroupMembers = async () => {
    if (!group) return;
    
    setIsLoadingMembers(true);
    try {
      const response = await fetch(`/api/settings/user-groups/${group.id}/members`);
      if (!response.ok) {
        throw new Error('Failed to load group members');
      }
      const data = await response.json();
      setMembers(data.users || []);
    } catch (error) {
      console.error('Error loading group members:', error);
      toast.error('Failed to load group members');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!group) return;
    
    setIsLoadingAvailable(true);
    try {
      // Load all users instead of just available users
      const url = new URL('/api/users', window.location.origin);
      if (searchTerm) {
        url.searchParams.set('search', searchTerm);
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      const data = await response.json();
      setAvailableUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId || !group) return;
    
    setIsAddingUser(true);
    try {
      const response = await fetch(`/api/settings/user-groups/${group.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add user to group');
      }
      
      toast.success('User added to group successfully');
      setIsAddUserModalOpen(false);
      setSelectedUserId('');
      loadGroupMembers();
      onMembersChange?.();
    } catch (error) {
      console.error('Error adding user to group:', error);
      toast.error((error as Error).message);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!group) return;
    
    setIsRemovingUser(userId);
    try {
      const response = await fetch(`/api/settings/user-groups/${group.id}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove user from group');
      }
      
      toast.success(`User ${userName} removed from group successfully`);
      loadGroupMembers();
      onMembersChange?.();
    } catch (error) {
      console.error('Error removing user from group:', error);
      toast.error((error as Error).message);
    } finally {
      setIsRemovingUser(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!group) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full max-w-[85vw] sm:max-w-[70vw] md:max-w-[65vw] lg:max-w-[60vw] xl:max-w-[800px] flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {group.name} - Group Members
            </SheetTitle>
            <SheetDescription>
              Manage users in the {group.name} group. Currently {members.length} member{members.length !== 1 ? 's' : ''}.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 flex flex-col gap-4 mt-6">
            {/* Add User Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Current Members</h3>
              <Button 
                onClick={() => setIsAddUserModalOpen(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </div>

            {/* Members Table */}
            <div className="flex-1 min-h-0">
              {isLoadingMembers ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No members in this group</p>
                  <Button 
                    onClick={() => setIsAddUserModalOpen(true)}
                    variant="outline"
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First Member
                  </Button>
                </div>
              ) : (
                                 <ScrollArea className="h-full">
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead className="w-[40%] min-w-[200px]">User</TableHead>
                         <TableHead className="w-[20%] min-w-[100px] hidden sm:table-cell">Role</TableHead>
                         <TableHead className="w-[25%] min-w-[120px] hidden md:table-cell">Joined</TableHead>
                         <TableHead className="w-[15%] text-right">Actions</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {members.map((member) => (
                         <TableRow key={member.id}>
                           <TableCell className="w-[40%] min-w-[200px]">
                             <div className="flex items-center gap-3">
                               <Avatar className="h-8 w-8 flex-shrink-0 rounded-full">
                                 <AvatarFallback className="text-xs rounded-full">
                                   {getInitials(member.name)}
                                 </AvatarFallback>
                               </Avatar>
                               <div className="min-w-0 flex-1">
                                 <div className="font-medium truncate">{member.name}</div>
                                 <div className="text-sm text-muted-foreground flex items-center gap-1">
                                   <Mail className="h-3 w-3 flex-shrink-0" />
                                   <span className="truncate">{member.email}</span>
                                 </div>
                               </div>
                             </div>
                           </TableCell>
                           <TableCell className="w-[20%] min-w-[100px] hidden sm:table-cell">
                             <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                           </TableCell>
                           <TableCell className="w-[25%] min-w-[120px] hidden md:table-cell">
                             <div className="flex items-center gap-1 text-sm text-muted-foreground">
                               <Calendar className="h-3 w-3 flex-shrink-0" />
                               <span className="truncate">{formatDate(member.createdAt)}</span>
                             </div>
                           </TableCell>
                           <TableCell className="w-[15%] text-right">
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => handleRemoveUser(member.id, member.name)}
                               disabled={isRemovingUser === member.id}
                               className="text-destructive hover:text-destructive"
                             >
                               {isRemovingUser === member.id ? (
                                 <Loader2 className="h-4 w-4 animate-spin" />
                               ) : (
                                 <UserMinus className="h-4 w-4" />
                               )}
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 </ScrollArea>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full z-[100]">
          <DialogHeader>
            <DialogTitle>Add User to {group.name}</DialogTitle>
            <DialogDescription>
              Select a user to add to this group.
            </DialogDescription>
          </DialogHeader>

                     <div className="space-y-4">
             {/* User Selection */}
             <div className="space-y-2">
               <label className="text-sm font-medium">Select User</label>
               <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                 <SelectTrigger>
                   <SelectValue placeholder="Choose a user to add" />
                 </SelectTrigger>
                 <SelectContent className="z-[100003]">
                   {/* Search inside dropdown */}
                   <div className="relative p-2 border-b">
                     <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Input
                       placeholder="Search users..."
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="pl-10 h-8 text-sm"
                     />
                   </div>
                   
                   {isLoadingAvailable ? (
                     <div className="flex items-center justify-center p-4">
                       <Loader2 className="h-4 w-4 animate-spin" />
                     </div>
                   ) : availableUsers.length === 0 ? (
                     <div className="p-4 text-center text-muted-foreground">
                       {searchTerm ? 'No users found matching your search' : 'No users available'}
                     </div>
                   ) : (
                     <div className="max-h-[200px] overflow-y-auto">
                       {availableUsers.map((user) => {
                         const isAlreadyMember = members.some(member => member.id === user.id);
                         return (
                           <SelectItem 
                             key={user.id} 
                             value={user.id}
                             disabled={isAlreadyMember}
                             className={isAlreadyMember ? 'opacity-60 cursor-not-allowed' : ''}
                           >
                             <div className="flex items-center gap-2 w-full">
                               <Avatar className="h-6 w-6 flex-shrink-0 rounded-full">
                                 <AvatarFallback className="text-xs rounded-full">
                                   {getInitials(user.name)}
                                 </AvatarFallback>
                               </Avatar>
                               <div className="flex-1 min-w-0">
                                 <div className="font-medium truncate">{user.name}</div>
                                 <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                               </div>
                               {isAlreadyMember && (
                                 <Check className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                               )}
                             </div>
                           </SelectItem>
                         );
                       })}
                     </div>
                   )}
                 </SelectContent>
               </Select>
             </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddUserModalOpen(false);
                  setSelectedUserId('');
                  setSearchTerm('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={!selectedUserId || isAddingUser}
                className="flex items-center gap-2"
              >
                {isAddingUser ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Add User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
