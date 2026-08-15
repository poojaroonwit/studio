"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  CircleUserRound,
  Plus,
  Search,
  ShieldCheck,
  Folder,
  UsersRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PLATFORM_MODULES, type PlatformModuleId, type UserGroup } from '@/lib/types';
import { cn } from '@/lib/utils';
import { loadRoleMembers, updateRolePermissions } from '@/components/settings/unified-role-drawer-api';
import type { UnifiedRoleMember } from '@/components/settings/UnifiedRoleMembersTab';
import { fetchUserGroupsList, saveUserGroupRole } from './user-groups/user-groups-page-api';
import {
  buildPermissionFamilyGroups,
  havePermissionsChanged,
  setPermissionFamilyLevel,
  type PermissionAccessLevel,
} from './roles-permissions-workspace-model';

type WorkspaceTab = 'permissions' | 'members';

export function RolesPermissionsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [roles, setRoles] = useState<UserGroup[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const selectedRoleIdRef = useRef(selectedRoleId);
  selectedRoleIdRef.current = selectedRoleId;
  const [draftPermissions, setDraftPermissions] = useState<PlatformModuleId[]>([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedPermissionGroupId, setSelectedPermissionGroupId] = useState('HR Operations');
  const [tab, setTab] = useState<WorkspaceTab>('permissions');
  const [members, setMembers] = useState<UnifiedRoleMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedRole = roles.find(role => role.id === selectedRoleId) ?? null;
  const savedPermissions = useMemo(() => selectedRole?.permissions ?? [], [selectedRole]);
  const hasChanges = havePermissionsChanged(savedPermissions, draftPermissions);
  const isReadOnly = selectedRole?.isSystemRole === true;

  const loadRoles = useCallback(async (preferredRoleId?: string) => {
    setIsLoading(true);
    const result = await fetchUserGroupsList();
    setIsLoading(false);

    if (!result.ok) {
      toastRef.current.error(result.message || 'Failed to load roles.');
      return;
    }

    setRoles(result.roles);
    const preferredRole = result.roles.find(role => role.id === preferredRoleId);
    const currentRole = result.roles.find(role => role.id === selectedRoleIdRef.current);
    const nextRole = preferredRole ?? currentRole ?? result.roles.find(role => /hr manager/i.test(role.name)) ?? result.roles[0];
    if (nextRole) {
      setSelectedRoleId(nextRole.id);
      setDraftPermissions(nextRole.permissions ?? []);
    }
  }, []);

  useEffect(() => { void loadRoles(); }, [loadRoles]);

  useEffect(() => {
    if (!selectedRole) return;
    setDraftPermissions(selectedRole.permissions ?? []);
    setPermissionSearch('');
    setTab('permissions');
  }, [selectedRole]);

  useEffect(() => {
    if (tab !== 'members' || !selectedRole) return;
    const controller = new AbortController();
    setIsLoadingMembers(true);
    loadRoleMembers(selectedRole.id, controller.signal)
      .then(setMembers)
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        toastRef.current.error(error instanceof Error ? error.message : 'Failed to load members.');
      })
      .finally(() => setIsLoadingMembers(false));
    return () => controller.abort();
  }, [selectedRole, tab]);

  const allPermissionGroups = buildPermissionFamilyGroups(
    PLATFORM_MODULES,
    draftPermissions,
    '',
  );
  const filteredPermissionGroups = buildPermissionFamilyGroups(PLATFORM_MODULES, draftPermissions, permissionSearch);
  const selectedPermissionGroup = allPermissionGroups.find(group => group.category === selectedPermissionGroupId) ?? allPermissionGroups[0];
  const visiblePermissionGroup = filteredPermissionGroups.find(group => group.category === selectedPermissionGroup?.category);

  const selectRole = (role: UserGroup) => {
    if (role.id === selectedRoleId) return;
    if (hasChanges && !window.confirm('Discard unsaved permission changes?')) return;
    setSelectedRoleId(role.id);
  };

  const savePermissions = async () => {
    if (!selectedRole || isReadOnly || !hasChanges) return;
    setIsSaving(true);
    try {
      const response = await updateRolePermissions({ roleId: selectedRole.id, permissions: draftPermissions });
      const saved = response.permissions ?? draftPermissions;
      setRoles(current => current.map(role => role.id === selectedRole.id ? { ...role, permissions: saved } : role));
      setDraftPermissions(saved);
      toast.success(`Permissions for ${selectedRole.name} were updated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const createRole = async () => {
    const name = newRoleName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      await saveUserGroupRole(null, {
        name,
        description: newRoleDescription.trim(),
        permissions: [],
        is_default: false,
      });
      setIsCreateOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      await loadRoles();
      toast.success(`${name} was created.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create role.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6f9] text-[#20242c] dark:bg-zinc-950 dark:text-zinc-100">
      <header className="shrink-0 border-b border-[#d9dde5] bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-semibold leading-6 tracking-[-0.02em]">Roles &amp; Permissions</h1>
            <p className="mt-1 text-xs text-[#777c86] dark:text-zinc-400">Define reusable access policies for your workforce.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push('/settings/user-teams')}>
              <UsersRound className="mr-1.5 h-4 w-4" />
              Manage user teams
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Create role
            </Button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto bg-white dark:bg-zinc-950 xl:grid-cols-[300px_minmax(0,1fr)] xl:overflow-hidden">
        <aside className="flex min-h-[460px] flex-col overflow-hidden border-b border-[#d9dde5] bg-transparent dark:border-zinc-800 xl:min-h-0 xl:border-b-0 xl:border-r">
          <div className="border-b border-[#e5e8ec] p-4 dark:border-zinc-800"><p className="text-[13px] font-semibold">Permission groups</p><p className="mt-1 text-[10px] text-[#858c97]">Choose an area to configure.</p></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {allPermissionGroups.map(group => (
              <button key={group.category} type="button" onClick={() => { setSelectedPermissionGroupId(group.category); setPermissionSearch(''); }} className={cn('flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-left transition-colors', group.category === selectedPermissionGroup?.category ? 'bg-[#eaf1fa] text-[#285e9d] dark:bg-blue-950/50 dark:text-blue-200' : 'text-[#49515c] hover:bg-[#f3f5f8] dark:text-zinc-300 dark:hover:bg-zinc-800')}>
                <Folder className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{group.category}</span><span className="mt-0.5 block text-[10px] text-[#858c97]">{group.grantedCount} of {group.families.length} granted</span></span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-h-[620px] min-w-0 flex-col overflow-hidden bg-transparent xl:min-h-0">
          {!selectedRole ? <EmptyRoleState /> : (
            <>
              <div className="shrink-0 border-b border-[#e0e3e8] px-4 pt-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[5px] border border-blue-500/50 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"><UsersRound className="h-5 w-5" /></span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[18px] font-semibold tracking-[-0.02em]">{selectedRole.name}</h2>
                        {isReadOnly && <Badge variant="outline" className="border-zinc-600 bg-zinc-800 text-zinc-300">System role</Badge>}
                      </div>
                      <p className="mt-1 max-w-xl text-xs leading-5 text-[#777c86]">{selectedRole.description || 'Configure the access this role grants to its members.'}</p>
                    </div>
                  </div>
                  <label className="min-w-[220px] text-[10px] font-medium uppercase tracking-[0.06em] text-[#858c97]">Editing role
                    <select value={selectedRole.id} disabled={isLoading} onChange={event => { const role = roles.find(item => item.id === event.target.value); if (role) selectRole(role); }} className="mt-1 block h-8 w-full rounded-[4px] border border-[#d7dce3] bg-white px-2.5 text-xs font-medium normal-case tracking-normal text-[#303640] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                      {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="flex gap-5">
                  {(['permissions', 'members'] as const).map(item => (
                    <button key={item} type="button" onClick={() => setTab(item)} className={cn('border-b-2 pb-2.5 text-xs font-semibold capitalize', tab === item ? 'border-[#356aa7] text-[#285e9d]' : 'border-transparent text-[#818792] hover:text-[#3f4650]')}>
                      {item} {item === 'members' && <span className="ml-1 text-[10px] font-medium">{selectedRole.user_count ?? ''}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {tab === 'permissions' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="shrink-0 border-b border-[#e8eaee] px-4 py-3 dark:border-zinc-800 sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="w-full max-w-sm"><SearchField value={permissionSearch} onChange={setPermissionSearch} placeholder="Search permissions" /></div>
                      <p className="text-[11px] text-[#858c97]">{draftPermissions.length} of {PLATFORM_MODULES.length} enabled</p>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto bg-transparent">
                    <section className="overflow-hidden bg-transparent">
                      <div className="flex items-center gap-3 border-b border-[#e8eaee] px-4 py-3 dark:border-zinc-800"><Folder className="h-[18px] w-[18px] text-[#718096]" /><div><h3 className="text-[13px] font-semibold">{selectedPermissionGroup?.category}</h3><p className="mt-0.5 text-[10px] text-[#858c97]">{visiblePermissionGroup?.families.length ?? 0} matching capabilities</p></div></div>
                      <div className="px-4">
                        {(visiblePermissionGroup?.families ?? []).map(family => (
                          <div key={family.key} className="grid items-center gap-3 border-b border-[#eef0f3] py-3 last:border-b-0 dark:border-zinc-800 md:grid-cols-[minmax(0,1fr)_320px]">
                            <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><p className="text-[12px] font-medium">{family.label}</p>{(family.riskLevel === 'HIGH' || family.riskLevel === 'CRITICAL') && <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-600">{family.riskLevel} risk</span>}</div><p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-[#858c97]">{family.description}</p></div>
                            <div className="grid h-8 grid-cols-4 overflow-hidden rounded-[4px] border border-[#d7dce3] dark:border-zinc-700">
                              {(['none', 'view', 'manage', 'approve'] as PermissionAccessLevel[]).map(level => {
                                const isSupported = level === 'none' || Boolean(family.modules[level as Exclude<PermissionAccessLevel, 'none'>]);
                                const isSelected = family.selectedLevel === level;
                                return <button key={level} type="button" disabled={isReadOnly || !isSupported} aria-pressed={isSelected} onClick={() => setDraftPermissions(current => setPermissionFamilyLevel(current, family, level))} className={cn('border-r border-[#d7dce3] px-2 text-[10px] font-medium capitalize last:border-r-0 dark:border-zinc-700', isSelected && level === 'approve' ? 'bg-amber-500 text-white' : isSelected && level !== 'none' ? 'bg-emerald-600 text-white' : isSelected ? 'bg-zinc-700 text-white' : isSupported ? 'bg-white text-[#525965] hover:bg-[#f3f5f8] dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800' : 'cursor-not-allowed bg-[#f6f7f9] text-[#c0c4ca] dark:bg-zinc-950 dark:text-zinc-700')}>{level}</button>;
                              })}
                            </div>
                          </div>
                        ))}
                        {visiblePermissionGroup?.families.length === 0 && <div className="py-12 text-center text-xs text-[#858c97]">No permissions match this search.</div>}
                      </div>
                    </section>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#d7dce3] bg-transparent px-4 py-3 dark:border-zinc-800">
                    <div className={cn('flex items-center gap-2 text-xs', hasChanges ? 'text-amber-600' : 'text-[#858c97]')}><span className={cn('h-2 w-2 rounded-full', hasChanges ? 'bg-amber-500' : 'bg-zinc-500')} /><span>{isReadOnly ? 'Protected system role' : hasChanges ? 'Unsaved permission changes' : 'No unsaved changes'}</span></div>
                    <div className="flex gap-2"><Button variant="outline" size="sm" disabled={isSaving || !hasChanges || isReadOnly} onClick={() => setDraftPermissions(savedPermissions)}>Discard</Button><Button size="sm" disabled={isSaving || !hasChanges || isReadOnly} onClick={savePermissions}>{isSaving ? 'Saving…' : 'Save role'}</Button></div>
                  </div>
                </div>
              ) : <MembersPanel members={members} isLoading={isLoadingMembers} onManage={() => router.push('/settings/user-groups')} />}
            </>
          )}
        </main>

      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create a role</DialogTitle><DialogDescription>Start with no access, then configure permissions in the workspace.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <label className="block text-xs font-medium">Role name<Input className="mt-1" value={newRoleName} onChange={event => setNewRoleName(event.target.value)} placeholder="e.g. Payroll reviewer" autoFocus /></label>
            <label className="block text-xs font-medium">Description<textarea className="mt-1 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={newRoleDescription} onChange={event => setNewRoleDescription(event.target.value)} placeholder="What is this role responsible for?" /></label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button><Button disabled={!newRoleName.trim() || isCreating} onClick={createRole}>{isCreating ? 'Creating…' : 'Create role'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#939aa4]" /><Input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="bg-white pl-8 dark:bg-zinc-900" /></div>;
}

function MembersPanel({ members, isLoading, onManage }: { members: UnifiedRoleMember[]; isLoading: boolean; onManage: () => void }) {
  return <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f8fa] p-4 dark:bg-zinc-950"><div className="mx-auto max-w-3xl rounded-[5px] border border-[#dfe3e8] bg-white dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center justify-between border-b border-[#e8eaee] px-4 py-3 dark:border-zinc-800"><div><h3 className="text-xs font-semibold">Assigned members</h3><p className="mt-0.5 text-[10px] text-[#858c97]">People who receive this role’s access.</p></div><Button size="sm" variant="outline" onClick={onManage}>Manage members</Button></div><div className="divide-y divide-[#eef0f3] dark:divide-zinc-800">{isLoading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="flex items-center gap-3 p-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-48" /></div>) : members.length ? members.map(member => <div key={member.id} className="flex items-center gap-3 px-4 py-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#eaf1fa] text-[#356aa7]"><CircleUserRound className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-xs font-medium">{member.name}</p><p className="truncate text-[10px] text-[#858c97]">{member.email}</p></div></div>) : <div className="px-4 py-10 text-center text-xs text-[#858c97]">No members are assigned to this role.</div>}</div></div></div>;
}

function EmptyRoleState() {
  return <div className="grid flex-1 place-items-center p-8 text-center"><div><ShieldCheck className="mx-auto h-8 w-8 text-[#9aa6b6]" /><h2 className="mt-3 text-sm font-semibold">No role available</h2><p className="mt-1 text-xs text-[#858c97]">Create a role to begin configuring permissions.</p></div></div>;
}
