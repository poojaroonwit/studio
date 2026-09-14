"use client";

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Search, ServerCrash, ShieldCheck, UsersRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoadingState } from '@/components/ui/PageLoadingState';
import { PageStatusState } from '@/components/ui/PageStatusState';

interface DirectoryMember { id: string; userId: string; name: string | null; email: string | null; avatarUrl: string | null; role: string; status: 'active' | 'suspended'; }
interface DirectoryPayload { organization: { id: string; name: string; role: string } | null; members: DirectoryMember[]; error?: string; }
function initials(member: DirectoryMember) {
  const source = member.name || member.email || 'U';
  return source.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U';
}
function prettyRole(role: string) {
  return role.split(',').map(value => value.trim()).filter(Boolean).map(value => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())).join(', ');
}

export function OutbornAccountDirectoryPanel() {
  const [payload, setPayload] = useState<DirectoryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/outborn/organization-directory', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
      .then(async response => { const data = await response.json().catch(() => ({})) as DirectoryPayload; if (!response.ok) throw new Error(data.error || 'Unable to load Outborn Account members.'); return data; })
      .then(data => { setPayload(data); setError(null); })
      .catch(cause => { if (cause instanceof DOMException && cause.name === 'AbortError') return; setError(cause instanceof Error ? cause.message : 'Unable to load Outborn Account members.'); });
    return () => controller.abort();
  }, []);
  const members = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return payload?.members ?? [];
    return (payload?.members ?? []).filter(member => member.name?.toLowerCase().includes(value) || member.email?.toLowerCase().includes(value) || member.role.toLowerCase().includes(value));
  }, [payload, query]);

  if (!payload && !error) {
    return <PageLoadingState className="min-h-[280px]" message="Loading Account members..." />;
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <ServerCrash className="h-5 w-5" />
        <AlertTitle>Account directory unavailable</AlertTitle>
        <AlertDescription>
          <p>{error}</p>
          <Button asChild className="mt-3" variant="outline">
            <a href="/api/outborn/account-admin?section=members">Open Outborn Account <ExternalLink className="ml-2 h-4 w-4" /></a>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><UsersRound className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-foreground">{payload?.organization?.name || 'Outborn Account'} directory</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Membership, account status, and organization roles are authoritative in Outborn Account. Hrive keeps HR and product-profile data only.</p></div></div>
      <div className="flex gap-2"><Button asChild size="sm" variant="outline"><a href="/api/outborn/account-admin?section=roles"><ShieldCheck className="mr-2 h-4 w-4" /> Roles</a></Button><Button asChild size="sm"><a href="/api/outborn/account-admin?section=members">Manage members <ExternalLink className="ml-2 h-4 w-4" /></a></Button></div>
    </div>
    <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Account members" className="pl-9" /></div>
    <div className="overflow-hidden rounded-xl border border-border/70">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_110px] border-b bg-muted/35 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><span>Member</span><span>Role</span><span>Status</span></div>
      {members.map(member => <div key={member.id} className="grid grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_110px] items-center border-b px-4 py-3 last:border-b-0"><div className="flex min-w-0 items-center gap-3"><Avatar className="h-8 w-8">{member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}<AvatarFallback className="text-xs">{initials(member)}</AvatarFallback></Avatar><div className="min-w-0"><div className="truncate text-sm font-medium text-foreground">{member.name || member.email || 'Unnamed member'}</div>{member.email ? <div className="truncate text-xs text-muted-foreground">{member.email}</div> : null}</div></div><span className="truncate text-sm text-foreground">{prettyRole(member.role)}</span><Badge variant={member.status === 'active' ? 'secondary' : 'outline'} className="w-fit capitalize">{member.status}</Badge></div>)}
      {members.length === 0 ? (
        <PageStatusState
          description={query.trim() ? 'Try a different search term.' : 'Members will appear here when they are available in Outborn Account.'}
          icon={UsersRound}
          size="embedded"
          title={query.trim() ? 'No matching Account members' : 'No Account members found'}
        />
      ) : null}
    </div>
  </div>;
}
