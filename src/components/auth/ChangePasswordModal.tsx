"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { KeyRound, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const changePasswordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmNewPassword: z.string().min(8, "Please confirm your new password"),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords do not match",
  path: ["confirmNewPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

interface ChangePasswordModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

export function ChangePasswordModal({ isOpen, onOpenChange }: ChangePasswordModalProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to change password.");
      }
      toast.success('Your password has been successfully updated.');
      onOpenChange(false); // Close modal on success
      form.reset();
    } catch (error) {
      setApiError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      form.reset();
      setApiError(null);
    }
  };

  const content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 py-2", isMobile && "px-4")}>
        {apiError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="currentPassword">Current Password</FormLabel>
              <FormControl>
                <Input id="currentPassword" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="newPassword">New Password</FormLabel>
              <FormControl>
                <Input id="newPassword" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmNewPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="confirmNewPassword">Confirm New Password</FormLabel>
              <FormControl>
                <Input id="confirmNewPassword" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isMobile ? (
          <DrawerFooter className="pt-4 px-0">
            <Button type="submit" disabled={isSubmitting} className="btn-primary-gradient w-full">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        ) : (
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="btn-primary-gradient">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        )}
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center">
              <KeyRound className="mr-2 h-5 w-5 text-primary" /> Change Password
            </DrawerTitle>
            <DrawerDescription>
              Update your account password. Make sure it&apos;s strong and memorable.
            </DrawerDescription>
          </DrawerHeader>
          <div className="pb-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <KeyRound className="mr-2 h-5 w-5 text-primary" /> Change Password
          </DialogTitle>
          <DialogDescription>
            Update your account password. Make sure it&apos;s strong and memorable.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
