import { z } from 'zod';

export const essLeaveRequestSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().max(1000).optional().nullable(),
  policyId: z.string().uuid().optional().nullable(),
  requestUnit: z.enum(['full_day', 'half_day', 'hourly']).default('full_day'),
  halfDayPeriod: z.enum(['morning', 'afternoon']).optional().nullable(),
  requestedHours: z.coerce.number().positive().max(24).optional().nullable(),
  emergencyContact: z.string().min(1).max(500),
  handoverInformation: z.string().max(2000).optional().nullable(),
  actingEmployeeId: z.string().uuid().optional().nullable(),
  saveAsDraft: z.boolean().default(false),
});

export const essLeaveSegmentSchema = essLeaveRequestSchema.pick({
  startDate: true,
  endDate: true,
  policyId: true,
  requestUnit: true,
  halfDayPeriod: true,
  requestedHours: true,
});

export const essGroupedLeaveRequestSchema = essLeaveRequestSchema.partial({
  startDate: true, endDate: true, policyId: true, requestUnit: true,
}).extend({
  segments: z.array(essLeaveSegmentSchema).min(1).max(20).optional(),
}).superRefine((value, context) => {
  if (!value.segments?.length && (!value.startDate || !value.endDate)) {
    context.addIssue({ code: 'custom', message: 'Add at least one leave type and date range.', path: ['segments'] });
  }
});

export const essProfileRequestSchema = z.object({
  field: z.enum(['preferredName', 'phone', 'location']),
  requestedValue: z.string().min(1).max(255),
  reason: z.string().max(1000).optional().nullable(),
});

export const essLeavePatchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['cancel', 'withdraw', 'resubmit', 'submit']),
  expectedVersion: z.coerce.number().int().positive().optional(),
});

export const essLearningPatchSchema = z.object({
  id: z.string().uuid(),
  progress: z.coerce.number().min(0).max(100).optional(),
  action: z.enum(['start', 'complete']).optional(),
});

export const essOnboardingPatchSchema = z.object({
  onboardingId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  action: z.enum(['start', 'complete_task', 'complete_case']),
});

export const essTeamActionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve_leave', 'reject_leave', 'return_leave']),
  comment: z.string().max(2000).optional().nullable(),
  expectedVersion: z.coerce.number().int().positive().optional(),
}).refine(
  value => value.action === 'approve_leave' || Boolean(value.comment?.trim()),
  { message: 'A comment is required when rejecting or returning a request.', path: ['comment'] },
);

export const essAttendanceActionSchema = z.object({
  action: z.enum(['clock_in', 'clock_out', 'start_break', 'end_break']),
  workLocation: z.enum(['office', 'remote', 'field']).optional(),
  note: z.string().max(1000).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  locationAccuracyMeters: z.coerce.number().min(0).max(100_000).optional().nullable(),
  idempotencyKey: z.string().min(8).max(160).optional(),
  deviceId: z.string().max(160).optional().nullable(),
});

export type EssLeaveRequestInput = z.infer<typeof essLeaveRequestSchema>;
export type EssGroupedLeaveRequestInput = z.infer<typeof essGroupedLeaveRequestSchema>;
export type EssProfileRequestInput = z.infer<typeof essProfileRequestSchema>;
export type EssAttendanceActionInput = z.infer<typeof essAttendanceActionSchema>;
export type EssLearningPatchInput = z.infer<typeof essLearningPatchSchema>;
export type EssOnboardingPatchInput = z.infer<typeof essOnboardingPatchSchema>;
export type EssTeamActionInput = z.infer<typeof essTeamActionSchema>;
