"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

/**
 * Example component demonstrating dynamic z-index management
 * 
 * This component shows how the z-index system automatically handles
 * the layering order based on the sequence of opening modals/drawers.
 * 
 * Opening sequence examples:
 * 1. Page -> Drawer -> Modal -> AlertDialog (each gets higher z-index)
 * 2. Page -> Modal -> Drawer -> AlertDialog (drawer appears above modal)
 * 3. Any combination will work correctly
 */
export function DynamicZIndexExample() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">Dynamic Z-Index Example</h2>
      <p className="text-muted-foreground">
        Open these components in different orders to see how the z-index automatically adjusts.
        The last opened component will always appear on top.
      </p>
      
      <div className="flex gap-4">
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">Open Drawer</Button>
          </SheetTrigger>
          <SheetContent sheetId="example-drawer">
            <SheetHeader>
              <SheetTitle>Example Drawer</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <p>This is a drawer. It will get a z-index based on when it was opened.</p>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button>Open Modal from Drawer</Button>
                </DialogTrigger>
                <DialogContent dialogId="example-modal">
                  <DialogHeader>
                    <DialogTitle>Modal from Drawer</DialogTitle>
                  </DialogHeader>
                  <p>This modal was opened from within the drawer.</p>
                  <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Open Alert</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dialogId="example-alert">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Alert Dialog</AlertDialogTitle>
                        <AlertDialogDescription>
                          This alert dialog should appear above everything else.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DialogContent>
              </Dialog>
            </div>
          </SheetContent>
        </Sheet>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Open Modal</Button>
          </DialogTrigger>
          <DialogContent dialogId="example-modal-standalone">
            <DialogHeader>
              <DialogTitle>Standalone Modal</DialogTitle>
            </DialogHeader>
            <p>This modal was opened directly from the page.</p>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Open Alert</Button>
          </AlertDialogTrigger>
          <AlertDialogContent dialogId="example-alert-standalone">
            <AlertDialogHeader>
              <AlertDialogTitle>Standalone Alert</AlertDialogTitle>
              <AlertDialogDescription>
                This alert dialog was opened directly from the page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
