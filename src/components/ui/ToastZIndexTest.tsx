"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useToastManager } from '@/hooks/use-toast-manager';
import { ToastClearButton } from '@/components/ui/ToastClearButton';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Info, 
  AlertTriangle,
  TestTube
} from 'lucide-react';

export function ToastZIndexTest() {
  const { success, error, loading, show } = useToast();
  const { success: successManaged, error: errorManaged } = useToastManager();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const showTestToasts = () => {
    success('✅ Success toast - should appear above the drawer');
    error('❌ Error toast - should appear above the drawer');
    loading('⏳ Loading toast - should appear above the drawer');
    show('ℹ️ Info toast - should appear above the drawer');
  };

  const showManagedTestToasts = () => {
    successManaged('✅ Managed success toast - should appear above the drawer');
    errorManaged('❌ Managed error toast - should appear above the drawer');
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Toast Z-Index Test
          </CardTitle>
          <CardDescription>
            Test that toasts appear above everything (drawers, dropdowns, modals). Toasts now have the highest z-index priority.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Basic Toasts</h4>
              <Button onClick={showTestToasts} variant="outline" size="sm">
                Show Test Toasts
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Managed Toasts</h4>
              <Button onClick={showManagedTestToasts} variant="outline" size="sm">
                Show Managed Toasts
              </Button>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Test Components</h4>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline">
                      Open Test Drawer
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[400px] sm:max-w-[540px]">
                    <SheetHeader>
                      <SheetTitle>Test Drawer</SheetTitle>
                      <SheetDescription>
                        This drawer simulates the position drawer. Toasts should appear above this drawer.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        If the z-index fix is working correctly, toasts should appear above this drawer.
                      </p>
                      <div className="space-y-2">
                        <Button onClick={showTestToasts} variant="outline" size="sm" className="w-full">
                          Show Toasts from Inside Drawer
                        </Button>
                        <Button onClick={() => setIsSheetOpen(false)} variant="outline" size="sm" className="w-full">
                          Close Drawer
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Test Dropdown:</span>
                  <Select>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <ToastClearButton variant="outline" size="sm" showText />
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Test Instructions:</strong> Open the dropdown above, then trigger toasts. 
                  The toasts should appear above the dropdown menu, proving they have the highest z-index priority.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <h5 className="font-medium mb-2">Test Instructions:</h5>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Click "Open Test Drawer" to open the drawer</li>
              <li>Click "Show Test Toasts" to trigger toasts</li>
              <li>Verify that toasts appear above the drawer (not behind it)</li>
              <li>Try showing toasts from inside the drawer as well</li>
              <li>Use the "Clear Toasts" button to clear all toasts</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
