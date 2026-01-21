"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, Copy, Eye, EyeOff, Key, Shield, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface SystemApiKey {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  maskedKey: string;
  permissions: string[];
  role: string;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  usageCount: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AvailablePermission {
  value: string;
  label: string;
  description: string;
}

interface AvailableRole {
  value: string;
  label: string;
}

interface ApiKeysResponse {
  success: boolean;
  data: {
    apiKeys: SystemApiKey[];
    availablePermissions: AvailablePermission[];
    availableRoles: AvailableRole[];
  };
}

export default function SystemApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<SystemApiKey[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<AvailablePermission[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyRole, setNewKeyRole] = useState('api_user');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [newKeyExpiration, setNewKeyExpiration] = useState<'never' | '30days' | '90days' | '1year' | 'custom'>('never');
  const [newKeyCustomExpiration, setNewKeyCustomExpiration] = useState('');
  
  // Created key display state
  const [showCreatedKeyDialog, setShowCreatedKeyDialog] = useState(false);
  const [createdKey, setCreatedKey] = useState('');
  const [createdKeyName, setCreatedKeyName] = useState('');
  const [showCreatedKey, setShowCreatedKey] = useState(false);
  
  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/system-api-keys');
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      const data: ApiKeysResponse = await response.json();
      
      if (data.success && data.data) {
        setApiKeys(data.data.apiKeys || []);
        setAvailablePermissions(data.data.availablePermissions || []);
        setAvailableRoles(data.data.availableRoles || []);
      }
    } catch (error) {
      toast.error('Failed to load API keys');
      console.error('Error fetching API keys:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const calculateExpirationDate = (): Date | null => {
    const now = new Date();
    switch (newKeyExpiration) {
      case 'never':
        return null;
      case '30days':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case '90days':
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      case '1year':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      case 'custom':
        return newKeyCustomExpiration ? new Date(newKeyCustomExpiration) : null;
      default:
        return null;
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }
    
    setIsSaving(true);
    try {
      const expiresAt = calculateExpirationDate();
      
      const response = await fetch('/api/settings/system-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          description: newKeyDescription.trim() || null,
          role: newKeyRole,
          permissions: newKeyPermissions,
          expiresAt: expiresAt?.toISOString() || null,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create API key');
      }
      
      // Show the created key
      setCreatedKey(data.apiKey);
      setCreatedKeyName(newKeyName);
      setShowCreateDialog(false);
      setShowCreatedKeyDialog(true);
      
      // Reset form
      setNewKeyName('');
      setNewKeyDescription('');
      setNewKeyRole('api_user');
      setNewKeyPermissions([]);
      setNewKeyExpiration('never');
      setNewKeyCustomExpiration('');
      
      // Refresh list
      await fetchApiKeys();
      
      toast.success('API key created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(createdKey);
      toast.success('API key copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleToggleActive = async (apiKey: SystemApiKey) => {
    setTogglingId(apiKey.id);
    try {
      const response = await fetch(`/api/settings/system-api-keys/${apiKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !apiKey.isActive }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update API key');
      }
      
      await fetchApiKeys();
      toast.success(`API key ${apiKey.isActive ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update API key');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteKey = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/settings/system-api-keys/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }
      
      await fetchApiKeys();
      toast.success('API key deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete API key');
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  const getStatusIcon = (apiKey: SystemApiKey) => {
    if (!apiKey.isActive) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    if (apiKey.lastUsedAt) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (apiKey: SystemApiKey) => {
    return apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={['create', 'list', 'usage']} className="w-full">
        {/* Create New API Key */}
        <AccordionItem value="create" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Create API Key</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Create a new API key for external system integration (e.g., n8n, Zapier)
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4 pt-2">
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-4">
                  API keys allow external systems to authenticate with this platform using the v2 API.
                  Each key can have specific permissions and an optional expiration date.
                </p>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New API Key
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* API Keys List */}
        <AccordionItem value="list" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Configured API Keys ({apiKeys.length})</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Manage your system API keys for v2 API authentication
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4 pt-2">
            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No API keys configured yet.</p>
                <p className="text-sm mt-1">Create your first API key to enable external integrations.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className={cn(
                      "p-4 border rounded-lg",
                      !apiKey.isActive ? "border-red-200 bg-red-50/50" : 
                      isExpired(apiKey) ? "border-yellow-200 bg-yellow-50/50" : "border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(apiKey)}
                          <span className="font-medium truncate">{apiKey.name}</span>
                          <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                            {apiKey.isActive ? 'Active' : 'Disabled'}
                          </Badge>
                          {isExpired(apiKey) && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                          <Badge variant="outline">{apiKey.role}</Badge>
                        </div>
                        
                        {apiKey.description && (
                          <p className="text-sm text-muted-foreground mb-2">{apiKey.description}</p>
                        )}
                        
                        <div className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                          {apiKey.maskedKey}
                        </div>
                        
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {formatDate(apiKey.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last used: {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : 'Never'}
                          </span>
                          <span>
                            Usage: {apiKey.usageCount} requests
                          </span>
                          {apiKey.expiresAt && (
                            <span className={cn(isExpired(apiKey) && "text-red-600 font-medium")}>
                              Expires: {formatDate(apiKey.expiresAt)}
                            </span>
                          )}
                        </div>
                        
                        {apiKey.permissions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {apiKey.permissions.map((perm) => (
                              <Badge key={perm} variant="secondary" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`toggle-${apiKey.id}`} className="text-xs text-muted-foreground">
                            {apiKey.isActive ? 'Enabled' : 'Disabled'}
                          </Label>
                          <Switch
                            id={`toggle-${apiKey.id}`}
                            checked={apiKey.isActive}
                            onCheckedChange={() => handleToggleActive(apiKey)}
                            disabled={togglingId === apiKey.id}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmId(apiKey.id)}
                          disabled={deletingId === apiKey.id}
                        >
                          {deletingId === apiKey.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Usage Information */}
        <AccordionItem value="usage" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Usage Guide</div>
                <div className="text-xs text-muted-foreground font-normal">
                  How to use API keys for authentication
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4 pt-2">
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">V2 API Login Endpoint</h4>
                <code className="block bg-muted p-3 rounded text-xs">
                  POST /api/v2/auth/login
                </code>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Authentication Methods</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    <strong>Header (Recommended for n8n):</strong>
                    <code className="block bg-muted p-2 rounded text-xs mt-1">
                      Authorization: Bearer sk_live_your_api_key_here
                    </code>
                  </li>
                  <li>
                    <strong>X-API-Key Header:</strong>
                    <code className="block bg-muted p-2 rounded text-xs mt-1">
                      X-API-Key: sk_live_your_api_key_here
                    </code>
                  </li>
                  <li>
                    <strong>Request Body:</strong>
                    <code className="block bg-muted p-2 rounded text-xs mt-1">
                      {`{ "apiKey": "sk_live_your_api_key_here" }`}
                    </code>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Response Format</h4>
                <p className="text-muted-foreground">
                  The response matches V1 login format with an additional <code>isSystemUser: true</code> flag.
                  Use the returned JWT token for subsequent API calls.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Create an API key for external system integration. The key will only be shown once after creation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name *</Label>
              <Input
                id="key-name"
                placeholder="e.g., n8n Integration"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                maxLength={100}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="key-description">Description</Label>
              <Textarea
                id="key-description"
                placeholder="Optional description of what this key is used for"
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="key-role">Role</Label>
              <Select value={newKeyRole} onValueChange={setNewKeyRole}>
                <SelectTrigger id="key-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Expiration</Label>
              <Select 
                value={newKeyExpiration} 
                onValueChange={(v: 'never' | '30days' | '90days' | '1year' | 'custom') => setNewKeyExpiration(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expires</SelectItem>
                  <SelectItem value="30days">30 days</SelectItem>
                  <SelectItem value="90days">90 days</SelectItem>
                  <SelectItem value="1year">1 year</SelectItem>
                  <SelectItem value="custom">Custom date</SelectItem>
                </SelectContent>
              </Select>
              {newKeyExpiration === 'custom' && (
                <Input
                  type="datetime-local"
                  value={newKeyCustomExpiration}
                  onChange={(e) => setNewKeyCustomExpiration(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Permissions (optional)</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded">
                {availablePermissions.map((perm) => (
                  <label key={perm.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={newKeyPermissions.includes(perm.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewKeyPermissions([...newKeyPermissions, perm.value]);
                        } else {
                          setNewKeyPermissions(newKeyPermissions.filter(p => p !== perm.value));
                        }
                      }}
                    />
                    <span>{perm.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for role-based default permissions.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={isSaving || !newKeyName.trim()}>
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create API Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created Key Display Dialog */}
      <Dialog open={showCreatedKeyDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreatedKey(false);
          setCreatedKey('');
        }
        setShowCreatedKeyDialog(open);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Save this key now — it will only be shown once!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">{createdKeyName}</Label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 p-2 bg-background border rounded text-sm font-mono break-all">
                  {showCreatedKey ? createdKey : '•'.repeat(40)}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreatedKey(!showCreatedKey)}
                >
                  {showCreatedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <strong>Important:</strong> This is the only time you'll see this key. Copy it now and store it securely.
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => {
              setShowCreatedKeyDialog(false);
              setShowCreatedKey(false);
              setCreatedKey('');
            }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any integrations using this API key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteKey(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
