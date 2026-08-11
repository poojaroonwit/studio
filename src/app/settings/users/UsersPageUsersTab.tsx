import { useEffect, useMemo, useState } from 'react';

import { CheckCircle2, Clock3, ShieldAlert, UserRoundX, UsersRound } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { SortableTableHead, type SortDirection, sortRowsByColumn, type SortValueResolverMap } from '@/components/ui/sortable-table';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { UserProfile } from '@/lib/types';
import { UserAccountInspector } from './UserAccountInspector';
import { UsersPageUsersFilters } from './UsersPageUsersFilters';
import { UsersPageUserRow } from './UsersPageUsersRows';
import { getUserAccountStatus, getUserRoleBadgeLabel } from './users-page-utils';
import type { UsersPageUsersTabProps } from './UsersPageUsersTabTypes';
import { UsersBulkActionsBar } from './UsersBulkActionsBar';

type StatusFilter = 'all' | 'active' | 'invited' | 'disabled' | 'no-role';

export function UsersPageUsersTab(props: UsersPageUsersTabProps) {
  const {
    users,
    selectedUserIds,
    isAllSelectedOnPage,
    isBulkUpdating,
    canEditUsers,
    onSelectAllOnPage,
    onSelectUser,
    onBulkUpdateStatus,
    onClearSelection,
    onOpenUserModal,
    onEditUser,
    onToggleUserStatus,
    onConfirmDeleteUser,
  } = props;

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (inspectedUserId && !users.some(user => user.id === inspectedUserId)) setInspectedUserId(null);
  }, [users, inspectedUserId]);

  const counts = useMemo(() => ({
    all: users.length,
    active: users.filter(user => getUserAccountStatus(user) === 'active').length,
    invited: users.filter(user => getUserAccountStatus(user) === 'invited').length,
    disabled: users.filter(user => getUserAccountStatus(user) === 'disabled').length,
    'no-role': users.filter(user => !user.role && !user.userGroupName).length,
  }), [users]);

  const statusFilteredUsers = useMemo(() => users.filter(user => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'no-role') return !user.role && !user.userGroupName;
    return getUserAccountStatus(user) === statusFilter;
  }), [statusFilter, users]);

  const sortResolvers = useMemo<SortValueResolverMap<UserProfile>>(() => ({
    name: user => user.name || '',
    department: user => user.department || user.teams?.[0]?.name || '',
    role: user => getUserRoleBadgeLabel(user),
    status: user => getUserAccountStatus(user),
    security: user => user.twoFactorEnabled ? 'mfa' : 'password',
    lastLogin: user => user.lastLogin || '',
  }), []);

  const sortedUsers = useMemo(
    () => sortRowsByColumn(statusFilteredUsers, sortColumn, sortDirection, sortResolvers),
    [statusFilteredUsers, sortColumn, sortDirection, sortResolvers],
  );

  const inspectedUser = users.find(user => user.id === inspectedUserId) || null;

  return (
    <div className="min-h-[620px] overflow-hidden rounded-md border border-border bg-background">
      <div className="min-w-0">
        <div className="grid grid-cols-2 border-b border-border md:grid-cols-5">
          <StatusSummary label="All" value={counts.all} active={statusFilter === 'all'} icon={UsersRound} onClick={() => setStatusFilter('all')} />
          <StatusSummary label="Active" value={counts.active} active={statusFilter === 'active'} icon={CheckCircle2} tone="success" onClick={() => setStatusFilter('active')} />
          <StatusSummary label="Invited" value={counts.invited} active={statusFilter === 'invited'} icon={Clock3} tone="warning" onClick={() => setStatusFilter('invited')} />
          <StatusSummary label="Suspended" value={counts.disabled} active={statusFilter === 'disabled'} icon={ShieldAlert} tone="danger" onClick={() => setStatusFilter('disabled')} />
          <StatusSummary label="No role" value={counts['no-role']} active={statusFilter === 'no-role'} icon={UserRoundX} onClick={() => setStatusFilter('no-role')} />
        </div>

        <UsersPageUsersFilters {...props} />

        {users.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <UsersRound className="h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium">No user accounts found</p>
            <p className="mt-1 text-xs text-muted-foreground">Try changing your filters or add a new account.</p>
          </div>
        ) : (
          <>
            <UsersBulkActionsBar selectedCount={selectedUserIds.size} isUpdating={isBulkUpdating} canUpdate={canEditUsers} onUpdateStatus={onBulkUpdateStatus} onClear={onClearSelection} />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-10 px-3"><Checkbox checked={isAllSelectedOnPage} onCheckedChange={onSelectAllOnPage} /></TableHead>
                    <SortableTableHead column="name" label="Account" sortColumn={sortColumn} sortDirection={sortDirection} onSort={(column, direction) => { setSortColumn(column); setSortDirection(direction); }} />
                    <SortableTableHead column="department" label="Employee / Department" sortColumn={sortColumn} sortDirection={sortDirection} onSort={(column, direction) => { setSortColumn(column); setSortDirection(direction); }} />
                    <SortableTableHead column="role" label="Role" sortColumn={sortColumn} sortDirection={sortDirection} onSort={(column, direction) => { setSortColumn(column); setSortDirection(direction); }} />
                    <SortableTableHead column="status" label="Status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={(column, direction) => { setSortColumn(column); setSortDirection(direction); }} />
                    <SortableTableHead column="security" label="Security" sortColumn={sortColumn} sortDirection={sortDirection} onSort={(column, direction) => { setSortColumn(column); setSortDirection(direction); }} />
                    <SortableTableHead column="lastLogin" label="Last login" sortColumn={sortColumn} sortDirection={sortDirection} onSort={(column, direction) => { setSortColumn(column); setSortDirection(direction); }} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUsers.map(user => (
                    <UsersPageUserRow
                      key={user.id}
                      user={user}
                      selectedUserIds={selectedUserIds}
                      onSelectUser={onSelectUser}
                      onOpenUserModal={onOpenUserModal}
                      onToggleUserStatus={onToggleUserStatus}
                      onConfirmDeleteUser={onConfirmDeleteUser}
                      isInspected={inspectedUserId === user.id}
                      onInspectUser={(selectedUser) => setInspectedUserId(selectedUser.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
              <span>Showing {sortedUsers.length} of {users.length} accounts</span>
              <span>Page 1</span>
            </div>
          </>
        )}
      </div>

      <UserAccountInspector
        user={inspectedUser}
        roles={props.roles}
        teams={props.teams}
        canEditUsers={canEditUsers}
        onSave={onEditUser}
        onToggleStatus={onToggleUserStatus}
        onClose={() => setInspectedUserId(null)}
      />
    </div>
  );
}

function StatusSummary({ label, value, icon: Icon, active, tone = 'neutral', onClick }: {
  label: string;
  value: number;
  icon: typeof UsersRound;
  active: boolean;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  onClick: () => void;
}) {
  const toneClass = { neutral: 'text-foreground', success: 'text-emerald-500', warning: 'text-amber-500', danger: 'text-red-500' }[tone];
  return (
    <button type="button" onClick={onClick} className={`border-r border-border p-3 text-left transition-colors last:border-r-0 hover:bg-muted/30 ${active ? 'bg-primary/10 shadow-[inset_0_-2px_0_hsl(var(--primary))]' : ''}`}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>{label}</span><Icon className={`h-3.5 w-3.5 ${toneClass}`} /></div>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </button>
  );
}
