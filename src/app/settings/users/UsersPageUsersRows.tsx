import { Edit3, MoreHorizontal, ShieldAlert, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { UserAvatarCompact } from '@/components/ui/user-avatar';
import type { UserProfile } from '@/lib/types';
import { getUserAccountStatus, getUserRoleBadgeLabel } from './users-page-utils';
import type { UsersPageUsersTabProps } from './UsersPageUsersTabTypes';

type UsersPageUserRowProps = Pick<
  UsersPageUsersTabProps,
  | 'selectedUserIds'
  | 'onSelectUser'
  | 'onOpenUserModal'
  | 'onToggleUserStatus'
  | 'onConfirmDeleteUser'
> & {
  user: UserProfile;
};

export function UsersPageUserRow({
  user,
  selectedUserIds,
  onSelectUser,
  onOpenUserModal,
  onToggleUserStatus,
  onConfirmDeleteUser,
}: UsersPageUserRowProps) {
  const accountStatus = getUserAccountStatus(user);
  const statusPresentation = {
    active: { label: 'Active', variant: 'default' as const },
    invited: { label: 'Invited', variant: 'secondary' as const },
    disabled: { label: 'Disabled', variant: 'destructive' as const },
  }[accountStatus];

  return (
    <TableRow>
      <TableCell className="px-2">
        <Checkbox checked={selectedUserIds.has(user.id)} onCheckedChange={(checked) => onSelectUser(user.id, checked as boolean)} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <UserAvatarCompact user={user} size="md" />
          <span className="font-medium">{user.name}</span>
        </div>
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell><Badge variant="secondary">{getUserRoleBadgeLabel(user)}</Badge></TableCell>
      <TableCell>
        {user.teams?.map((team) => <Badge key={team.id} variant="outline" className="mr-1">{team.name}</Badge>)}
      </TableCell>
      <TableCell>
        <Badge variant={statusPresentation.variant}>
          {statusPresentation.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <UsersPageUserActions
          user={user}
          onOpenUserModal={onOpenUserModal}
          onToggleUserStatus={onToggleUserStatus}
          onConfirmDeleteUser={onConfirmDeleteUser}
        />
      </TableCell>
    </TableRow>
  );
}

function UsersPageUserActions({
  user,
  onOpenUserModal,
  onToggleUserStatus,
  onConfirmDeleteUser,
}: Pick<UsersPageUserRowProps, 'user' | 'onOpenUserModal' | 'onToggleUserStatus' | 'onConfirmDeleteUser'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name || user.email}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpenUserModal('edit', user)}><Edit3 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleUserStatus(user)}><ShieldAlert className="mr-2 h-4 w-4" /> Toggle Status</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onConfirmDeleteUser(user)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
