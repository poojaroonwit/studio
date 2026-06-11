"use client";

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { UserGroup } from '@/lib/types';
import {
  UserGroupActionsMenu,
  UserGroupsEmptyRow,
  UserGroupsLoadingRow,
} from './UserGroupsPageTableParts';

export function UserGroupsTable({
  roles,
  selectedRole,
  isLoading,
  isResettingRoleId,
  onCreateRole,
  onSelectRole,
  onConfirmDelete,
  onConfirmResetPermissions,
}: {
  roles: UserGroup[];
  selectedRole: UserGroup | null;
  isLoading: boolean;
  isResettingRoleId: string | null;
  onCreateRole: () => void;
  onSelectRole: (role: UserGroup) => void;
  onConfirmDelete: (role: UserGroup) => void;
  onConfirmResetPermissions: (role: UserGroup) => void;
}) {
  return (
    <div className="flex-1 bg-card border rounded-lg shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && roles.length === 0 ? (
            <UserGroupsLoadingRow />
          ) : roles.length === 0 ? (
            <UserGroupsEmptyRow onCreateRole={onCreateRole} />
          ) : (
            roles.map((role) => (
              <UserGroupsTableRow
                key={role.id}
                role={role}
                isSelected={selectedRole?.id === role.id}
                isResetting={isResettingRoleId === role.id}
                onSelectRole={onSelectRole}
                onConfirmDelete={onConfirmDelete}
                onConfirmResetPermissions={onConfirmResetPermissions}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function UserGroupsTableRow({
  role,
  isSelected,
  isResetting,
  onSelectRole,
  onConfirmDelete,
  onConfirmResetPermissions,
}: {
  role: UserGroup;
  isSelected: boolean;
  isResetting: boolean;
  onSelectRole: (role: UserGroup) => void;
  onConfirmDelete: (role: UserGroup) => void;
  onConfirmResetPermissions: (role: UserGroup) => void;
}) {
  return (
    <TableRow
      className={cn(
        'cursor-pointer hover:bg-muted/50 transition-colors',
        isSelected && 'bg-primary/5',
      )}
      onClick={() => onSelectRole(role)}
    >
      <TableCell>
        <div className="flex items-center space-x-2">
          <span className="font-medium">{role.name}</span>
          {role.isDefault && (
            <Badge variant="secondary" className="text-xs">Default</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground text-sm">
          {role.description || 'No description'}
        </span>
      </TableCell>
      <TableCell>
        {role.isSystemRole ? (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
            System
          </Badge>
        ) : (
          <Badge variant="outline">Custom</Badge>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {role.user_count || 0} users
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {role.isSystemRole && role.name === 'Admin' ? 'All' : `${(role.permissions || []).length} permissions`}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <UserGroupActionsMenu
            isResetting={isResetting}
            role={role}
            onConfirmDelete={onConfirmDelete}
            onConfirmResetPermissions={onConfirmResetPermissions}
            onSelectRole={onSelectRole}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
