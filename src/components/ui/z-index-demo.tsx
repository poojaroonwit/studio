"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { zIndexManager } from '@/lib/z-index-manager';

/**
 * Demo component to test the dynamic z-index system
 * This shows how modals stack properly based on opening order
 */
export function ZIndexDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [stack, setStack] = useState<any[]>([]);

  const updateStack = () => {
    setStack(zIndexManager.getStack());
  };

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">Dynamic Z-Index Demo</h2>
      <p className="text-muted-foreground">
        Open modals in different orders to see how z-index values are dynamically assigned.
        The most recently opened modal will always appear on top.
      </p>

      <div className="flex gap-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={updateStack}>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent modalId="demo-dialog">
            <DialogHeader>
              <DialogTitle>Dialog Modal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>This is a dialog modal. Try opening other modals while this is open.</p>
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button onClick={updateStack}>Open Sheet from Dialog</Button>
                </SheetTrigger>
                <SheetContent modalId="demo-sheet-from-dialog">
                  <SheetHeader>
                    <SheetTitle>Sheet from Dialog</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4">
                    <p>This sheet was opened from within the dialog.</p>
                    <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
                      <AlertDialogTrigger asChild>
                        <Button onClick={updateStack}>Open Alert from Sheet</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent modalId="demo-alert-from-sheet">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Alert from Sheet</AlertDialogTitle>
                        </AlertDialogHeader>
                        <p>This alert was opened from within the sheet, which was opened from the dialog.</p>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </DialogContent>
        </Dialog>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button onClick={updateStack}>Open Sheet</Button>
          </SheetTrigger>
          <SheetContent modalId="demo-sheet">
            <SheetHeader>
              <SheetTitle>Sheet Modal</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <p>This is a sheet modal. Try opening other modals while this is open.</p>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={updateStack}>Open Dialog from Sheet</Button>
                </DialogTrigger>
                <DialogContent modalId="demo-dialog-from-sheet">
                  <DialogHeader>
                    <DialogTitle>Dialog from Sheet</DialogTitle>
                  </DialogHeader>
                  <p>This dialog was opened from within the sheet.</p>
                </DialogContent>
              </Dialog>
            </div>
          </SheetContent>
        </Sheet>

        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialogTrigger asChild>
            <Button onClick={updateStack}>Open Alert</Button>
          </AlertDialogTrigger>
          <AlertDialogContent modalId="demo-alert">
            <AlertDialogHeader>
              <AlertDialogTitle>Alert Dialog</AlertDialogTitle>
            </AlertDialogHeader>
            <p>This is an alert dialog. It should appear on top of other modals.</p>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Current Modal Stack:</h3>
        <div className="bg-muted p-4 rounded-lg">
          {stack.length === 0 ? (
            <p className="text-muted-foreground">No modals open</p>
          ) : (
            <div className="space-y-2">
              {stack.map((modal, index) => (
                <div key={modal.id} className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="font-mono text-sm">
                    {index + 1}. {modal.type}: {modal.id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    z-index: {modal.overlayZIndex}/{modal.contentZIndex}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Button 
          variant="outline" 
          onClick={() => {
            zIndexManager.clearAll();
            setStack([]);
            setDialogOpen(false);
            setSheetOpen(false);
            setAlertOpen(false);
          }}
        >
          Clear All Modals
        </Button>
      </div>
    </div>
  );
}
