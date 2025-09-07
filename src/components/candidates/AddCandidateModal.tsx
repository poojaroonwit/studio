"use client";

import React, { useEffect, useRef } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, UserPlus } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import type { PersonalInfo, ContactInfo, EducationEntry, ExperienceEntry, SkillEntry, JobSuitableEntry, Position, CandidateStatus, positionLevel, RecruitmentStage } from '@/lib/types';
import { PositionSelectDropdown } from "@/components/candidates/PositionSelectDropdown";
import { usePositionLevels } from '@/hooks/use-position-levels';


// Zod Schemas for form validation (mirroring types and API schemas)
const personalInfoFormSchema = z.object({
  title_honorific: z.string().optional(),
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  nickname: z.string().optional(),
  location: z.string().optional(),
  introduction_aboutme: z.string().optional(),
});

const contactInfoFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
});

// Updated Zod schemas for structured date fields
const educationEntryFormSchema = z.object({
  university: z.string().min(1, "University is required"),
  major: z.string().optional().nullable(),
  field: z.string().optional().nullable(),
  campus: z.string().optional().nullable(),
  startMonth: z.number().min(1).max(12, "Start month must be 1-12"),
  startYear: z.number().min(1900).max(2100, "Start year must be between 1900-2100"),
  endMonth: z.number().min(1).max(12).optional().nullable(),
  endYear: z.number().min(1900).max(2100).optional().nullable(),
  isCurrent: z.boolean().default(false),
  GPA: z.string().optional().nullable(),
});

const experienceEntryFormSchema = z.object({
  company: z.string().min(1, "Company is required"),
  position: z.string().min(1, "Position is required"),
  description: z.string().optional().nullable(),
  startMonth: z.number().min(1).max(12, "Start month must be 1-12"),
  startYear: z.number().min(1900).max(2100, "Start year must be between 1900-2100"),
  endMonth: z.number().min(1).max(12).optional().nullable(),
  endYear: z.number().min(1900).max(2100).optional().nullable(),
  isCurrent: z.boolean().default(false),
  positionLevel: z.string().optional().nullable(),
});

const skillEntryFormSchema = z.object({
  segment_skill: z.string().optional(),
  skill_string: z.string().optional(), 
});

const jobSuitableEntryFormSchema = z.object({
  suitable_career: z.string().optional(),
  suitable_job_position: z.string().optional(),
  suitable_job_level: z.string().optional(),
  suitable_salary_bath_month: z.string().optional(),
});

// Main form schema updated
const addCandidateFormSchema = z.object({
  cv_language: z.string().optional(),
  personal_info: personalInfoFormSchema,
  contact_info: contactInfoFormSchema,
  education: z.array(educationEntryFormSchema).optional(),
  experience: z.array(experienceEntryFormSchema).optional(),
  skills: z.array(skillEntryFormSchema).optional(),
  job_suitable: z.array(jobSuitableEntryFormSchema).optional(),
  positionId: z.union([z.string().uuid(), z.null()]).optional(),
  status: z.string().uuid("Status must be a valid UUID").min(1, "Status is required"),
  fitScore: z.number().min(0).max(100).optional().default(0),
  job_matches: z.any().optional(),
  job_applied: z.any().optional(),
  applicationDate: z.string().min(1, "Application date is required"),
});

export type AddCandidateFormValues = z.infer<typeof addCandidateFormSchema>;

interface AddCandidateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddCandidate: (data: AddCandidateFormValues) => Promise<void>;
  availableStages: RecruitmentStage[]; // Remove availablePositions prop
}

const PLACEHOLDER_VALUE_NONE = "___NOT_SPECIFIED___";

export function AddCandidateModal({ isOpen, onOpenChange, onAddCandidate, availableStages }: AddCandidateModalProps) {
  const { levels: positionLevels, isLoading: isLoadingLevels } = usePositionLevels();
  const form = useForm<AddCandidateFormValues>({
    resolver: zodResolver(addCandidateFormSchema),
    defaultValues: {
      cv_language: '',
      personal_info: { firstname: '', lastname: '' },
      contact_info: { email: '', phone: '' },
      education: [],
      experience: [],
      skills: [{ segment_skill: '', skill_string: '' }],
      job_suitable: [{ suitable_career: '', suitable_job_position: '', suitable_job_level: '', suitable_salary_bath_month: ''}],
      positionId: null,
              status: availableStages.find(s => s.name.toLowerCase() === 'applied')?.id || availableStages[0]?.id || '',
      fitScore: 0,
      applicationDate: new Date().toISOString().slice(0, 10),
    },
  });

  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
    control: form.control,
    name: "education",
  });

  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
    control: form.control,
    name: "experience",
  });

  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({
    control: form.control,
    name: "skills",
  });

  const { fields: jobSuitableFields, append: appendJobSuitable, remove: removeJobSuitable } = useFieldArray({
    control: form.control,
    name: "job_suitable",
  });


  // Only reset when modal transitions from closed to open
  const prevIsOpen = useRef(isOpen);
  useEffect(() => {
    if (!prevIsOpen.current && isOpen) {
      form.reset({
        cv_language: '',
        personal_info: { firstname: '', lastname: '' },
        contact_info: { email: '', phone: '' },
        education: [],
        experience: [{
          company: '',
          position: '',
          startMonth: new Date().getMonth() + 1,
          startYear: new Date().getFullYear(),
          endMonth: null,
          endYear: null,
          isCurrent: true,
          description: '',
          positionLevel: null
        }],
        skills: [{ segment_skill: '', skill_string: '' }],
        job_suitable: [{ suitable_career: '', suitable_job_position: '', suitable_job_level: '', suitable_salary_bath_month: ''}],
        positionId: null,
        status: availableStages.find(s => s.name.toLowerCase() === 'applied')?.id || availableStages[0]?.id || '',
        fitScore: 0,
        applicationDate: new Date().toISOString().slice(0, 10),
      });
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, form, availableStages]);

  const onSubmit = async (data: AddCandidateFormValues) => {
    try {
      const processedData = {
        ...data,
        // Convert fitScore from percentage (0-100) to decimal (0-1) for database storage
        fitScore: data.fitScore ? data.fitScore / 100 : 0,
        experience: data.experience?.map(exp => ({
          ...exp,
          positionLevel: exp.positionLevel === PLACEHOLDER_VALUE_NONE ? null : exp.positionLevel,
        }))
      };
      await onAddCandidate(processedData);
      // Close the modal after successful submission
      onOpenChange(false);
    } catch (error) {
      // If there's an error, don't close the modal so user can fix and retry
      console.error('Error adding candidate:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0" dialogId="add-candidate-modal">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center"><UserPlus className="mr-2 h-6 w-6 text-primary" /> Add New Candidate</DialogTitle>
          <DialogDescription>
            Enter the details for the new candidate. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
                          <ScrollArea className="flex-grow p-6 pt-4">
            <div className="space-y-6">
              <div>
                <Label htmlFor="cv_language">CV Language</Label>
                <Input id="cv_language" {...form.register('cv_language')} className="mt-1" />
              </div>

              <fieldset className="space-y-3 border p-4 rounded-md">
                <legend className="text-lg font-semibold">Personal Information</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="personal_info.title_honorific">Title</Label>
                    <Input id="personal_info.title_honorific" {...form.register('personal_info.title_honorific')} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="personal_info.firstname">First Name *</Label>
                    <Input id="personal_info.firstname" {...form.register('personal_info.firstname')} className="mt-1" />
                    {form.formState.errors.personal_info?.firstname && <p className="text-sm text-destructive mt-1">{form.formState.errors.personal_info.firstname.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="personal_info.lastname">Last Name *</Label>
                    <Input id="personal_info.lastname" {...form.register('personal_info.lastname')} className="mt-1" />
                     {form.formState.errors.personal_info?.lastname && <p className="text-sm text-destructive mt-1">{form.formState.errors.personal_info.lastname.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="personal_info.nickname">Nickname</Label>
                    <Input id="personal_info.nickname" {...form.register('personal_info.nickname')} className="mt-1" />
                  </div>
                </div>
                <div>
                    <Label htmlFor="personal_info.location">Location</Label>
                    <Input id="personal_info.location" {...form.register('personal_info.location')} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="personal_info.introduction_aboutme">About Me</Label>
                  <Textarea
                    id="personal_info.introduction_aboutme"
                    {...form.register('personal_info.introduction_aboutme')}
                    placeholder="Tell us about yourself..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-3 border p-4 rounded-md">
                <legend className="text-lg font-semibold">Contact Information</legend>
                <div>
                  <Label htmlFor="contact_info.email">Email *</Label>
                  <Input id="contact_info.email" type="email" {...form.register('contact_info.email')} className="mt-1" />
                  {form.formState.errors.contact_info?.email && <p className="text-sm text-destructive mt-1">{form.formState.errors.contact_info.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="contact_info.phone">Phone</Label>
                  <Input id="contact_info.phone" type="tel" {...form.register('contact_info.phone')} className="mt-1" />
                </div>
              </fieldset>

               <fieldset className="space-y-3 border p-4 rounded-md">
                <legend className="text-lg font-semibold">Application Details</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="positionId">Applying for Position *</Label>
                        <Controller
                            name="positionId"
                            control={form.control}
                            render={({ field }) => (
                                <PositionSelectDropdown
                                  value={field.value || ""}
                                  onValueChange={(value) => field.onChange(value || null)}
                                  placeholder="Select position..."
                                  showOpenStatus={true}
                                  filterOpenOnly={false}
                                />
                            )}
                        />
                        {form.formState.errors.positionId && <p className="text-sm text-destructive mt-1">{form.formState.errors.positionId.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="status">Initial Status</Label>
                        <Controller
                            name="status"
                            control={form.control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value} >
                                <SelectTrigger id="status" className="mt-1">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                                                 <SelectContent>
                                     {availableStages.map(s => (
                                     <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                     ))}
                                 </SelectContent>
                                </Select>
                            )}
                        />
                         {form.formState.errors.status && <p className="text-sm text-destructive mt-1">{form.formState.errors.status.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="applicationDate">Application Date *</Label>
                        <Input
                          id="applicationDate"
                          type="date"
                          {...form.register('applicationDate', { required: true })}
                          className="mt-1"
                        />
                        {form.formState.errors.applicationDate && (
                          <p className="text-sm text-destructive mt-1">{form.formState.errors.applicationDate.message}</p>
                        )}
                    </div>
                </div>
                <div>
                    <Label htmlFor="fitScore">Initial Fit Score (0-100)</Label>
                    <Controller
                        name="fitScore"
                        control={form.control}
                        render={({ field }) => (
                            <div className="space-y-2">
                                <Input
                                    id="fitScore"
                                    type="number"
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                                    className="mt-1"
                                />
                                {field.value > 0 && (
                                    <div className={`text-sm px-2 py-1 rounded ${getScoreBgColor(field.value)} ${getScoreColor(field.value)}`}>
                                        Grade: {formatScoreWithGrade(field.value)}
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>
              </fieldset>

              <fieldset className="space-y-3 border p-4 rounded-md">
                <legend className="text-lg font-semibold">Education</legend>
                {educationFields.map((field, index) => (
                  <div key={field.id} className="p-3 border rounded-md space-y-2 bg-muted/30 relative">
                    <Input placeholder="University" {...form.register(`education.${index}.university`)} />
                    <Input placeholder="Major" {...form.register(`education.${index}.major`)} />
                    <Input placeholder="Field of Study" {...form.register(`education.${index}.field`)} />
                    <Input placeholder="Campus" {...form.register(`education.${index}.campus`)} />
                    
                    {/* Structured date inputs */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Start Month</Label>
                        <Select
                          value={form.watch(`education.${index}.startMonth`)?.toString() || ''}
                          onValueChange={(value) => form.setValue(`education.${index}.startMonth`, parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                              <SelectItem key={month} value={month.toString()}>
                                {new Date(2000, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Start Year</Label>
                        <Input
                          type="number"
                          min="1900"
                          max="2100"
                          placeholder="Year"
                          {...form.register(`education.${index}.startYear`, { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Controller
                        name={`education.${index}.isCurrent`}
                        control={form.control}
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label>Currently studying</Label>
                    </div>
                    
                    {!form.watch(`education.${index}.isCurrent`) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">End Month</Label>
                          <Select
                            value={form.watch(`education.${index}.endMonth`)?.toString() || ''}
                            onValueChange={(value) => form.setValue(`education.${index}.endMonth`, parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <SelectItem key={month} value={month.toString()}>
                                  {new Date(2000, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">End Year</Label>
                          <Input
                            type="number"
                            min="1900"
                            max="2100"
                            placeholder="Year"
                            {...form.register(`education.${index}.endYear`, { valueAsNumber: true })}
                          />
                        </div>
                      </div>
                    )}
                    
                    <Input placeholder="GPA" {...form.register(`education.${index}.GPA`)} />
                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeEducation(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendEducation({
                  university: '',
                  major: '',
                  field: '',
                  campus: '',
                  startMonth: new Date().getMonth() + 1,
                  startYear: new Date().getFullYear(),
                  endMonth: null,
                  endYear: null,
                  isCurrent: false,
                  GPA: ''
                })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Education
                </Button>
              </fieldset>

              <fieldset className="space-y-3 border p-4 rounded-md">
                <legend className="text-lg font-semibold">Experience</legend>
                {experienceFields.map((field, index) => (
                  <div key={field.id} className="p-3 border rounded-md space-y-2 relative bg-muted/30">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input placeholder="Company" {...form.register(`experience.${index}.company`)} />
                        <Input placeholder="Position" {...form.register(`experience.${index}.position`)} />
                         <Controller
                            name={`experience.${index}.positionLevel`}
                            control={form.control}
                            render={({ field: controllerField }) => (
                                <Select
                                  onValueChange={(value) => controllerField.onChange(value === PLACEHOLDER_VALUE_NONE ? null : value)}
                                  value={controllerField.value ?? PLACEHOLDER_VALUE_NONE}
                                >
                                <SelectTrigger id={`experience.${index}.positionLevel`}><SelectValue placeholder="Position Level" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={PLACEHOLDER_VALUE_NONE}>N/A / Not Specified</SelectItem>
                                    {positionLevels.map(level => (
                                      <SelectItem key={level.id} value={level.name}>
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: level.color || '#6B7280' }}
                                          />
                                          {level.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            )}
                        />
                     </div>
                     
                     {/* Structured date inputs */}
                     <div className="grid grid-cols-2 gap-2">
                       <div>
                         <Label className="text-xs">Start Month</Label>
                         <Select
                           value={form.watch(`experience.${index}.startMonth`)?.toString() || ''}
                           onValueChange={(value) => form.setValue(`experience.${index}.startMonth`, parseInt(value))}
                         >
                           <SelectTrigger>
                             <SelectValue placeholder="Month" />
                           </SelectTrigger>
                           <SelectContent>
                             {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                               <SelectItem key={month} value={month.toString()}>
                                 {new Date(2000, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       <div>
                         <Label className="text-xs">Start Year</Label>
                         <Input
                           type="number"
                           min="1900"
                           max="2100"
                           placeholder="Year"
                           {...form.register(`experience.${index}.startYear`, { valueAsNumber: true })}
                         />
                       </div>
                     </div>
                     
                     <div className="flex items-center space-x-2">
                       <Controller
                         name={`experience.${index}.isCurrent`}
                         control={form.control}
                         render={({ field }) => (
                           <Checkbox
                             checked={field.value}
                             onCheckedChange={field.onChange}
                           />
                         )}
                       />
                       <Label>Currently working</Label>
                     </div>
                     
                     {!form.watch(`experience.${index}.isCurrent`) && (
                       <div className="grid grid-cols-2 gap-2">
                         <div>
                           <Label className="text-xs">End Month</Label>
                           <Select
                             value={form.watch(`experience.${index}.endMonth`)?.toString() || ''}
                             onValueChange={(value) => form.setValue(`experience.${index}.endMonth`, parseInt(value))}
                           >
                             <SelectTrigger>
                               <SelectValue placeholder="Month" />
                             </SelectTrigger>
                             <SelectContent>
                               {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                 <SelectItem key={month} value={month.toString()}>
                                   {new Date(2000, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </div>
                         <div>
                           <Label className="text-xs">End Year</Label>
                           <Input
                             type="number"
                             min="1900"
                             max="2100"
                             placeholder="Year"
                             {...form.register(`experience.${index}.endYear`, { valueAsNumber: true })}
                           />
                         </div>
                       </div>
                     )}
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        {...form.register(`experience.${index}.description`)}
                        placeholder="Describe your role and responsibilities..."
                        className="mt-1 min-h-[80px]"
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeExperience(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendExperience({ company: '', position: '', startMonth: new Date().getMonth() + 1, startYear: new Date().getFullYear(), endMonth: null, endYear: null, isCurrent: false, description: '', positionLevel: null })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Experience
                </Button>
              </fieldset>

                <fieldset className="space-y-3 border p-4 rounded-md">
                    <legend className="text-lg font-semibold">Skills</legend>
                    {skillFields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded-md space-y-2 relative bg-muted/30">
                        <Input placeholder="Skill Segment (e.g., Programming Languages, Software)" {...form.register(`skills.${index}.segment_skill`)} />
                        <Textarea placeholder="Skills (comma-separated, e.g., Excel, Photoshop, Python)" {...form.register(`skills.${index}.skill_string`)} />
                        {skillFields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeSkill(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        )}
                    </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendSkill({ segment_skill: '', skill_string: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Skill Segment
                    </Button>
                </fieldset>

                <fieldset className="space-y-3 border p-4 rounded-md">
                    <legend className="text-lg font-semibold">Job Suitability</legend>
                     {jobSuitableFields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-md space-y-2 relative bg-muted/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input placeholder="Suitable Career Path" {...form.register(`job_suitable.${index}.suitable_career`)} />
                                <Input placeholder="Suitable Job Position" {...form.register(`job_suitable.${index}.suitable_job_position`)} />
                                <Input placeholder="Suitable Job Level" {...form.register(`job_suitable.${index}.suitable_job_level`)} />
                                <Input placeholder="Desired Salary (Bath/Month)" {...form.register(`job_suitable.${index}.suitable_salary_bath_month`)} />
                            </div>
                             {jobSuitableFields.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeJobSuitable(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendJobSuitable({ suitable_career: '', suitable_job_position: '', suitable_job_level: '', suitable_salary_bath_month: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Job Suitability Profile
                    </Button>
                </fieldset>

            </div>
          </ScrollArea>
          <DialogFooter className="p-6 pt-4 sticky bottom-0 bg-card border-t z-10">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Adding Candidate...' : 'Add Candidate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
