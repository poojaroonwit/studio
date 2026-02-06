"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Copy, QrCode, Download, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { sanitizeUrl } from '@/lib/utils';

interface EvalLinkItem {
  id: string;
  applicant: { id: string; name: string; email: string };
  createdBy: { id: string; name: string; email: string };
  token: string;
  url: string;
  expiresAt: string;
  revokedAt?: string | null;
  requireLogin: boolean;
  createdAt: string;
}

export default function EvaluationLinksTab() {
  const isMobile = useIsMobile();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EvalLinkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [tick, setTick] = useState(0);
  const [updatingRequireLogin, setUpdatingRequireLogin] = useState<Set<string>>(new Set());

  // QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<{ name: string, url: string, expiresAt?: string } | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    // Fetch QR code logo (prefer qrCodeLogo, fallback to appLogoDataUrl)
    fetch('/api/settings/system-settings?keys=qrCodeLogo,appLogoDataUrl')
      .then(res => res.json())
      .then(data => {
        // Prefer dedicated QR code logo, fallback to app logo
        if (data.qrCodeLogo) setAppLogoUrl(data.qrCodeLogo);
        else if (data.appLogoDataUrl) setAppLogoUrl(data.appLogoDataUrl);
      })
      .catch(err => console.error('Failed to fetch QR code logo', err));
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
        } catch { }
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

  const updateRequireLogin = async (id: string, requireLogin: boolean) => {
    try {
      setUpdatingRequireLogin(prev => new Set(prev).add(id));
      const res = await fetch(`/api/v1/evaluation/links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requireLogin }),
      });
      if (!res.ok) throw new Error('Failed to update login requirement');
      toast.success(`Login requirement ${requireLogin ? 'enabled' : 'disabled'}`);
      // Update local state immediately for better UX
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, requireLogin } : item
      ));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update login requirement');
    } finally {
      setUpdatingRequireLogin(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Render QR Code Content Helper
  const renderQrCodeContent = () => {
    if (!qrData) return null;
    return (
      <div className="flex flex-col items-center py-6 space-y-6">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <QRCodeCanvas
            id="settings-qr-code"
            value={qrData.url}
            size={240}
            level={"H"}
            imageSettings={appLogoUrl ? {
              src: appLogoUrl,
              x: undefined,
              y: undefined,
              height: 48,
              width: 48,
              excavate: true,
            } : undefined}
          />
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">applicant</p>
          <h3 className="font-semibold text-lg">{qrData.name}</h3>
          {qrData.expiresAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Expires: {new Date(qrData.expiresAt).toLocaleDateString()} ({formatCountdown(qrData.expiresAt)})
            </p>
          )}
        </div>

        <div className="flex flex-col w-full gap-3 px-4">
          <Button
            className="w-full"
            onClick={() => {
              const canvas = document.getElementById('settings-qr-code') as HTMLCanvasElement;
              if (canvas) {
                canvas.toBlob((blob) => {
                  if (blob) {
                    const url = URL.createObjectURL(blob);
                    const safeUrl = sanitizeUrl(url);
                    if (safeUrl) {
                      const downloadLink = document.createElement("a");
                      downloadLink.href = safeUrl;
                      downloadLink.download = `evaluation-qr-${qrData.name.replace(/\s+/g, '_')}.png`;
                      document.body.appendChild(downloadLink);
                      downloadLink.click();
                      document.body.removeChild(downloadLink);
                      URL.revokeObjectURL(url);
                    }
                  }
                }, 'image/png');
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download QR Code
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const safeUrl = sanitizeUrl(qrData.url);
                if (safeUrl) {
                  window.open(safeUrl, '_blank');
                } else {
                  toast.error('Invalid URL');
                }
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Go to Link
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(qrData.url);
                toast.success('Link copied');
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="w-full px-8 text-center">
          <p className="text-xs text-muted-foreground break-all bg-muted p-2 rounded">
            {qrData.url}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by token, applicant name or email"
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
          <div className="col-span-2">applicant</div>
          <div className="col-span-3">Link</div>
          <div className="col-span-2">Expires</div>
          <div className="col-span-1">Owner</div>
          <div className="col-span-1 text-center">Login</div>
          <div className="col-span-1 text-center">Status</div>
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
            const badgeVariant: any = isRevoked ? 'secondary' : isExpired ? 'outline' : undefined
            const badgeClassName = !isRevoked && !isExpired ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' : undefined
            return (
              <div key={it.id} className="grid grid-cols-12 px-3 py-3 border-t text-sm items-center">
                <div className="col-span-2">
                  <div className="font-medium">{it.applicant?.name || 'Unknown'}</div>
                  <div className="text-xs text-muted-foreground">{it.applicant?.email}</div>
                </div>
                <div className="col-span-3 truncate flex items-center gap-2">
                  <div className="truncate flex-1">
                    {/* Link is sanitized via sanitizeUrl */}
                    <a className="text-primary underline block truncate" href={sanitizeUrl(it.url) || '#'} onClick={(e) => !sanitizeUrl(it.url) && e.preventDefault()} target="_blank" rel="noreferrer">{it.url}</a>
                    <div className="text-xs text-muted-foreground break-all">{it.token}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => navigator.clipboard.writeText(it.url).then(() => toast.success('Copied'))}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">{new Date(it.expiresAt).toLocaleString()}</div>
                  <div className="text-xs">{countdown}</div>
                </div>
                <div className="col-span-1">
                  <div className="font-medium text-xs truncate" title={it.createdBy?.name}>{it.createdBy?.name || 'Unknown'}</div>
                </div>
                <div className="col-span-1 flex justify-center">
                  <Switch
                    checked={it.requireLogin}
                    onCheckedChange={(checked) => updateRequireLogin(it.id, checked)}
                    disabled={updatingRequireLogin.has(it.id) || isRevoked}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <Switch
                    checked={!isRevoked && !isExpired}
                    onCheckedChange={(c) => {
                      if (!c) revoke(it.id);
                    }}
                    disabled={isRevoked || isExpired}
                    title={isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                    className={isRevoked || isExpired ? "opacity-50" : ""}
                  />
                </div>
                <div className="col-span-2 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setQrData({
                        name: it.applicant?.name || 'applicant',
                        url: it.url,
                        expiresAt: it.expiresAt
                      });
                      setQrModalOpen(true);
                    }}
                  >
                    <QrCode className="h-4 w-4" />
                    QR Code
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


      {/* QR Code Modal - Responsive */}
      {isMobile ? (
        <Sheet open={qrModalOpen} onOpenChange={setQrModalOpen}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-center">Evaluation Link QR Code</SheetTitle>
            </SheetHeader>
            {renderQrCodeContent()}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Evaluation Link QR Code</DialogTitle>
            </DialogHeader>
            {renderQrCodeContent()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


