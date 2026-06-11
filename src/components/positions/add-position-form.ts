import * as z from 'zod';

export const addPositionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean().default(true),
  positionLevel: z.string().optional().nullable(),
  gradeId: z.string().uuid().optional().nullable(),
  recruiterId: z.string().uuid().optional().nullable(),
});

export type AddPositionFormValues = z.infer<typeof addPositionFormSchema>;

export const ADD_POSITION_DEFAULT_VALUES: AddPositionFormValues = {
  title: '',
  department: '',
  description: '',
  matchCriteria: '',
  isOpen: true,
  positionLevel: '',
  gradeId: null,
  recruiterId: null,
};
