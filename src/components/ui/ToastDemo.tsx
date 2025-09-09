"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useToastManager } from '@/hooks/use-toast-manager';
import { ToastClearButton } from '@/components/ui/ToastClearButton';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Info, 
  Trash2, 
  RefreshCw,
  AlertTriangle 
} from 'lucide-react';

export function ToastDemo() {
  const { 
    show, 
    success, 
    error, 
    loading, 
    dismiss, 
    dismissById,
    showWithId,
    successWithId,
    errorWithId,
    loadingWithId
  } = useToast();
  
  const { 
    success: successManaged, 
    error: errorManaged, 
    loading: loadingManaged,
    clearAll,
    showToastWithId 
  } = useToastManager();
  
  const [activeToastId, setActiveToastId] = useState<string | null>(null);

  const showBasicToasts = () => {
    show('This is a basic toast message');
    success('Operation completed successfully!');
    error('Something went wrong!');
    loading('Processing your request...');
  };

  const showManagedToasts = () => {
    successManaged('Managed success toast (prevents duplicates)');
    errorManaged('Managed error toast (prevents duplicates)');
    loadingManaged('Managed loading toast (prevents duplicates)');
  };

  const showToastsWithIds = () => {
    const successId = successWithId('Success toast with ID');
    const errorId = errorWithId('Error toast with ID');
    const loadingId = loadingWithId('Loading toast with ID');
    
    setActiveToastId(successId || null);
  };

  const showManagedToastsWithIds = () => {
    const toastId = showToastWithId('Managed toast with ID', 'info');
    setActiveToastId(toastId || null);
  };

  const dismissSpecificToast = () => {
    if (activeToastId) {
      dismissById(activeToastId);
      setActiveToastId(null);
    }
  };

  const showLongToasts = () => {
    success('This is a very long success message that demonstrates how the toast system handles longer text content and wraps it appropriately within the toast container.');
    error('This is a very long error message that demonstrates how the toast system handles longer text content and wraps it appropriately within the toast container.');
  };

  const showToastsWithIcons = () => {
    success('Success with custom icon', { icon: <CheckCircle className="h-4 w-4" /> });
    error('Error with custom icon', { icon: <XCircle className="h-4 w-4" /> });
    loading('Loading with custom icon', { icon: <Loader2 className="h-4 w-4 animate-spin" /> });
    show('Info with custom icon', { icon: <Info className="h-4 w-4" /> });
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Toast System Demo
          </CardTitle>
          <CardDescription>
            Test the enhanced toast system with clearing functionality and improved error handling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Basic Toasts</h4>
              <Button onClick={showBasicToasts} variant="outline" size="sm">
                Show Basic Toasts
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Managed Toasts</h4>
              <Button onClick={showManagedToasts} variant="outline" size="sm">
                Show Managed Toasts
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Toasts with IDs</h4>
              <Button onClick={showToastsWithIds} variant="outline" size="sm">
                Show Toasts with IDs
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Managed with IDs</h4>
              <Button onClick={showManagedToastsWithIds} variant="outline" size="sm">
                Show Managed with IDs
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Long Messages</h4>
              <Button onClick={showLongToasts} variant="outline" size="sm">
                Show Long Toasts
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Custom Icons</h4>
              <Button onClick={showToastsWithIcons} variant="outline" size="sm">
                Show Toasts with Icons
              </Button>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Toast Controls</h4>
            <div className="flex flex-wrap gap-2">
              <ToastClearButton variant="outline" size="sm" showText />
              <Button 
                onClick={dismiss} 
                variant="outline" 
                size="sm"
                disabled={!activeToastId}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Dismiss All
              </Button>
              <Button 
                onClick={dismissSpecificToast} 
                variant="outline" 
                size="sm"
                disabled={!activeToastId}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Dismiss Specific
              </Button>
              <Button 
                onClick={clearAll} 
                variant="destructive" 
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All (Managed)
              </Button>
            </div>
            {activeToastId && (
              <p className="text-sm text-muted-foreground mt-2">
                Active toast ID: {activeToastId}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
