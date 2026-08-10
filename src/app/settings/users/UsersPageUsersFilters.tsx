import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  normalizeUsersPageRoleFilter,
} from './users-page-utils';
import type { UsersPageUsersTabProps } from './UsersPageUsersTabTypes';

type UsersPageUsersFiltersProps = Pick<
  UsersPageUsersTabProps,
  | 'teams'
  | 'roles'
  | 'nameFilter'
  | 'emailFilter'
  | 'roleFilter'
  | 'teamFilter'
  | 'onNameFilterChange'
  | 'onEmailFilterChange'
  | 'onRoleFilterChange'
  | 'onTeamFilterChange'
  | 'onApplyFilters'
>;

export function UsersPageUsersFilters({
  teams,
  roles,
  nameFilter,
  emailFilter,
  roleFilter,
  teamFilter,
  onNameFilterChange,
  onEmailFilterChange,
  onRoleFilterChange,
  onTeamFilterChange,
  onApplyFilters,
}: UsersPageUsersFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end mb-4">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input placeholder="Filter by name..." value={nameFilter} onChange={(event) => onNameFilterChange(event.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input placeholder="Filter by email..." value={emailFilter} onChange={(event) => onEmailFilterChange(event.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Role</Label>
        <Select value={roleFilter} onValueChange={(value) => onRoleFilterChange(normalizeUsersPageRoleFilter(value))}>
          <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_ROLES">All Roles</SelectItem>
            {roles.map((role) => <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Team</Label>
        <Select value={teamFilter} onValueChange={onTeamFilterChange}>
          <SelectTrigger><SelectValue placeholder="Select team..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_TEAMS">All Teams</SelectItem>
            {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onApplyFilters}><Search className="mr-2 h-4 w-4" /> Apply</Button>
    </div>
  );
}
