"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import type { UseFormReturn } from 'react-hook-form';
import * as z from 'zod';

import { ColorPicker } from '@/components/ui/color-picker';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export const teamFormSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type TeamFormValues = z.infer<typeof teamFormSchema>;

export const teamFormResolver = zodResolver(teamFormSchema);

export const EMPTY_TEAM_FORM_VALUES: TeamFormValues = {
  name: '',
  description: '',
  color: '#3B82F6',
  isActive: true,
};

export function TeamFormFields({
  form,
  showActiveStatus = false,
}: {
  form: UseFormReturn<TeamFormValues>;
  showActiveStatus?: boolean;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Team Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Enter team name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ''} placeholder="Enter team description" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="color"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Team Color</FormLabel>
            <FormControl>
              <ColorPicker
                value={field.value ?? '#3B82F6'}
                onChange={field.onChange}
                className="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {showActiveStatus && (
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Enable or disable this team
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </>
  );
}
