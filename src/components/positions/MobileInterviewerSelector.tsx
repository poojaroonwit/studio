"use client";

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, User, Mail, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MobileInterviewerSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availableUsers: User[];
  selectedUserIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function MobileInterviewerSelector({
  isOpen,
  onOpenChange,
  availableUsers,
  selectedUserIds,
  onSelectionChange,
  onConfirm,
  isLoading = false
}: MobileInterviewerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleUser = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    onSelectionChange(newSelection);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] p-0 rounded-t-3xl"
        sheetId="mobile-interviewer-selector"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
            <SheetTitle>Select Interviewers</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {selectedUserIds.size} selected
            </p>
          </SheetHeader>

          {/* Search */}
          <div className="px-4 py-3 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* User List */}
          <ScrollArea className="flex-1 px-4">
            <div className="py-3 space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No users found</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.has(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => handleToggleUser(user.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                        isSelected
                          ? "bg-primary/10 border-primary"
                          : "bg-card border-border hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleUser(user.id)}
                        className="flex-shrink-0"
                      />
                      
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{user.name}</p>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="px-4 py-3 border-t flex-shrink-0 bg-background">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onConfirm();
                  onOpenChange(false);
                }}
                className="flex-1"
                disabled={selectedUserIds.size === 0 || isLoading}
              >
                Add {selectedUserIds.size > 0 && `(${selectedUserIds.size})`}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
