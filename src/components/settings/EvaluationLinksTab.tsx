"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EvalLinkItem {
  id: string;
  candidate: { id: string; name: string; email: string };
  createdBy: { id: string; name: string; email: string };
  token: string;
  url: string;
  expiresAt: string;
  revokedAt?: string | null;
  requireLogin: boolean;
  createdAt: string;
}

export default function EvaluationLinksTab() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EvalLinkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const res = await fetch(`/api/v1/evaluation/links?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        let serverMsg = 'Failed to load links';
        try {
          const details = await res.json();
          serverMsg = details?.message || details?.error || serverMsg;
          if (details?.hint) serverMsg += ` - ${details.hint}`;
        } catch {}
        throw new Error(serverMsg);
      }
      const data = await res.json();
      setItems(data.data || []);
      setTotal(data.total || 0);
      setLimit(data.limit || 20);
      setOffset(data.offset || 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, limit, offset]);

  const formatCountdown = (expiresAt: string, revokedAt?: string | null) => {
    if (revokedAt) return 'revoked';
    const end = new Date(expiresAt).getTime();
    const now = Date.now();
    const diff = Math.max(0, end - now);
    const sec = Math.floor(diff / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (diff <= 0) return 'expired';
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  const revoke = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/evaluation/links/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to disable link');
      toast.success('Link disabled');
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to disable link');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by token, candidate name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-80"
        />
        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setOffset(0); fetchData(); }}>Refresh</Button>
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="grid grid-cols-12 bg-muted px-3 py-2 text-xs font-medium">
          <div className="col-span-3">Candidate</div>
          <div className="col-span-3">Link</div>
          <div className="col-span-2">Expires</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No links found.</div>
        ) : (
          items.map((it) => {
            const countdown = formatCountdown(it.expiresAt, it.revokedAt)
            const isExpired = countdown === 'expired'
            const isRevoked = countdown === 'revoked'
            const statusBadge = isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'
            const badgeVariant: any = isRevoked ? 'secondary' : isExpired ? 'outline' : 'default'
            return (
              <div key={it.id} className="grid grid-cols-12 px-3 py-3 border-t text-sm items-center">
                <div className="col-span-3">
                  <div className="font-medium">{it.candidate?.name || 'Unknown'}</div>
                  <div className="text-xs text-muted-foreground">{it.candidate?.email}</div>
                </div>
                <div className="col-span-3 truncate">
                  <a className="text-primary underline" href={it.url} target="_blank" rel="noreferrer">{it.url}</a>
                  <div className="text-xs text-muted-foreground break-all">{it.token}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">{new Date(it.expiresAt).toLocaleString()}</div>
                  <div className="text-xs">{countdown}</div>
                </div>
                <div className="col-span-2">
                  <Badge variant={badgeVariant}>{statusBadge}</Badge>
                  {it.requireLogin && (
                    <span className="ml-2 text-xs text-muted-foreground">Login required</span>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  <Button variant="outline" className="mr-2" onClick={() => navigator.clipboard.writeText(it.url).then(()=>toast.success('Copied'))}>Copy</Button>
                  <Button variant="destructive" disabled={isRevoked} onClick={() => revoke(it.id)}>
                    {isRevoked ? 'Disabled' : 'Disable'}
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing {items.length} of {total}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Prev</Button>
          <Button variant="outline" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>Next</Button>
        </div>
      </div>
    </div>
  );
}


