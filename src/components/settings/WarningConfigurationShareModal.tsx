"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Share2, Users, X, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
}

interface SharedUser {
  id: string;
  userId: string;
  canEdit: boolean;
  canDelete: boolean;
  user: User;
}

interface WarningConfigurationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  configurationId: string;
  configurationName: string;
  sharedUsers: SharedUser[];
  onUpdate: () => void;
}

export function WarningConfigurationShareModal({
  isOpen,
  onClose,
  configurationId,
  configurationName,
  sharedUsers,
  onUpdate,
}: WarningConfigurationShareModalProps) {
  const { error: showError, success: showSuccess } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleShare = async () => {
    if (!selectedUserId) {
      showError('Please select a user to share with');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/settings/warning-configurations/${configurationId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          canEdit,
          canDelete,
        }),
      });

      if (response.ok) {
        showSuccess('Configuration shared successfully');
        setSelectedUserId('');
        setCanEdit(false);
        setCanDelete(false);
        onUpdate();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to share configuration');
      }
    } catch (error) {
      console.error('Error sharing configuration:', error);
      showError((error as Error).message || 'Failed to share configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async (userId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/settings/warning-configurations/${configurationId}/share?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess('User access removed successfully');
        onUpdate();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove user access');
      }
    } catch (error) {
      console.error('Error removing user access:', error);
      showError((error as Error).message || 'Failed to remove user access');
    } finally {
      setIsLoading(false);
    }
  };

  const availableUsers = users.filter(user => 
    !sharedUsers.some(shared => shared.userId === user.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-500" />
            Share Warning Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuration Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium mb-2">Configuration: {configurationName}</h3>
            <p className="text-sm text-muted-foreground">
              Share this configuration with other users to allow them to view, edit, or manage it.
            </p>
          </div>

          {/* Share with New User */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Share with User</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user">Select User</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="canEdit"
                      checked={canEdit}
                      onCheckedChange={setCanEdit}
                    />
                    <Label htmlFor="canEdit">Can Edit</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="canDelete"
                      checked={canDelete}
                      onCheckedChange={setCanDelete}
                    />
                    <Label htmlFor="canDelete">Can Delete</Label>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleShare}
              disabled={isLoading || !selectedUserId}
              className="w-full"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {isLoading ? 'Sharing...' : 'Share Configuration'}
            </Button>
          </div>

          {/* Currently Shared Users */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Currently Shared With</h3>
            
            {sharedUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No users have access to this configuration yet.
              </p>
            ) : (
              <div className="space-y-3">
                {sharedUsers.map((sharedUser) => (
                  <div
                    key={sharedUser.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{sharedUser.user.name}</div>
                      <div className="text-sm text-muted-foreground">{sharedUser.user.email}</div>
                      <div className="flex gap-2 mt-1">
                        {sharedUser.canEdit && (
                          <Badge variant="secondary" className="text-xs">
                            Can Edit
                          </Badge>
                        )}
                        {sharedUser.canDelete && (
                          <Badge variant="secondary" className="text-xs">
                            Can Delete
                          </Badge>
                        )}
                        {!sharedUser.canEdit && !sharedUser.canDelete && (
                          <Badge variant="outline" className="text-xs">
                            View Only
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnshare(sharedUser.userId)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
