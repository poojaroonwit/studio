import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Briefcase, Building2 } from 'lucide-react';
import type { Candidate } from '@/lib/types';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { CustomFieldDisplay } from '../CustomFieldDisplay';
import { CustomFieldEdit } from '../CustomFieldEdit';

interface ExperienceTabProps {
  candidate: Candidate;
  isEditing: boolean;
  control?: any;
  register?: any;
  errors?: any;
  watch?: any;
  setValue?: any;
  experienceFields?: any[];
  appendExperience?: (value: any) => void;
  removeExperience?: (index: number) => void;
  calculateTotalExperienceDuration?: (experience: any[]) => string;
  onCustomFieldChange?: (fieldCode: string, value: any) => void;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const yearRange = Array.from({ length: 50 }, (_, i) => (currentYear - i).toString());

// Helper functions from the original page
const formatTimelinePeriod = (startMonth: any, startYear: any, endMonth: any, endYear: any, isCurrent: boolean) => {
  if (!startYear) return '';
  
  const start = `${months[Number(startMonth) - 1] || ''} ${startYear}`;
  if (isCurrent) {
    return `${start} - Present`;
  }
  
  if (endYear) {
    const end = `${months[Number(endMonth) - 1] || ''} ${endYear}`;
    return `${start} - ${end}`;
  }
  
  return start;
};

const formatTimelineDuration = (startMonth: any, startYear: any, endMonth: any, endYear: any, isCurrent: boolean) => {
  if (!startYear) return '';
  
  const startDate = new Date(Number(startYear), Number(startMonth) - 1);
  const endDate = isCurrent ? new Date() : new Date(Number(endYear), Number(endMonth) - 1);
  
  const diffInMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
  const years = Math.floor(diffInMonths / 12);
  const months = diffInMonths % 12;
  
  if (years > 0 && months > 0) {
    return `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}`;
  } else if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  } else {
    return `${months} month${months > 1 ? 's' : ''}`;
  }
};

const hasFitScore = (item: any) => {
  return item.fitScore !== undefined && item.fitScore !== null;
};



export const ExperienceTab: React.FC<ExperienceTabProps> = ({ 
  candidate, 
  isEditing, 
  control,
  register, 
  errors, 
  watch, 
  setValue,
  experienceFields = [],
  appendExperience,
  removeExperience,
  calculateTotalExperienceDuration,
  onCustomFieldChange
}) => {
  const experience = (candidate.parsedData && 'experience' in (candidate.parsedData as any))
    ? ((candidate.parsedData as any).experience || [])
    : [];
  const totalDuration = calculateTotalExperienceDuration ? calculateTotalExperienceDuration(experience) : '';

  const handleAddExperience = () => {
    if (appendExperience) {
      appendExperience({ 
        company: '', 
        position: '', 
        description: '', 
        startMonth: '', 
        startYear: '', 
        endMonth: '', 
        endYear: '', 
        isCurrent: false, 
        duration: '', 
        positionLevel: '' 
      });
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <Card className="bg-transparent">
          <CardHeader>
            <CardTitle>Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {experienceFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No work experience entries yet.</p>
                <p className="text-sm">Click "Add Experience" to add your first entry.</p>
              </div>
            ) : (
              experienceFields.map((field, index) => (
                <div key={field.id} className="p-3 border rounded-md space-y-2 bg-muted/30 relative">
                  <Input placeholder="Company" {...register(`parsedData.experience.${index}.company`)} />
                  <Input placeholder="Position" {...register(`parsedData.experience.${index}.position`)} />
                  <Textarea placeholder="Description" {...register(`parsedData.experience.${index}.description`)} />
                  
                  {/* Experience Edit Fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Start Month</Label>
                      <Select
                        value={watch(`parsedData.experience.${index}.startMonth`)?.toString() || ''}
                        onValueChange={(value) => setValue(`parsedData.experience.${index}.startMonth`, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <SelectItem key={month} value={month.toString()}>
                              {months[month - 1]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Start Year</Label>
                      <Select
                        value={watch(`parsedData.experience.${index}.startYear`)?.toString() || ''}
                        onValueChange={(value) => setValue(`parsedData.experience.${index}.startYear`, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearRange.map((y: string) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">End Month</Label>
                      <Select
                        value={watch(`parsedData.experience.${index}.endMonth`)?.toString() || ''}
                        onValueChange={(value) => setValue(`parsedData.experience.${index}.endMonth`, value)}
                        disabled={!!watch(`parsedData.experience.${index}.isCurrent`)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <SelectItem key={month} value={month.toString()}>
                              {months[month - 1]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">End Year</Label>
                      <Select
                        value={watch(`parsedData.experience.${index}.endYear`)?.toString() || ''}
                        onValueChange={(value) => setValue(`parsedData.experience.${index}.endYear`, value)}
                        disabled={!!watch(`parsedData.experience.${index}.isCurrent`)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearRange.map((y: string) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <label>
                    <input type="checkbox" {...register(`parsedData.experience.${index}.isCurrent`)} /> Present
                  </label>
                  <Input placeholder="Position Level" {...register(`parsedData.experience.${index}.positionLevel`)} />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-7 w-7" 
                    onClick={() => removeExperience?.(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
            <Button 
              type="button" 
              variant="outline" 
              className="mt-2" 
              onClick={handleAddExperience}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Experience
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-transparent">
        <CardHeader>
          <CardTitle>
            Experience
            {totalDuration && ` (${totalDuration})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-8">
            {(experience.length === 0) && (
              <div className="text-sm text-muted-foreground text-center py-4">No experience details provided.</div>
            )}
            {experience.map((exp: any, index: number) => {
              const isCurrent = !exp.endYear && !exp.endMonth;
              const periodDisplay = formatTimelinePeriod(exp.startMonth, exp.startYear, exp.endMonth, exp.endYear, isCurrent);
              const duration = formatTimelineDuration(exp.startMonth, exp.startYear, exp.endMonth, exp.endYear, isCurrent);
              return (
                <div key={`exp-${index}-${exp.company || index}`} className="relative">
                  <div className="grid grid-cols-[12rem_4rem_1fr] gap-x-2 items-stretch h-full">
                    <div className="text-right h-full flex flex-col items-end justify-start">
                      {periodDisplay && (
                        <div className="text-xs text-muted-foreground mb-1" dangerouslySetInnerHTML={{ __html: periodDisplay }} />
                      )}
                      {duration && (
                        <div className="text-xs text-muted-foreground">{duration}</div>
                      )}
                    </div>
                    {/* Timeline icon and vertical line */}
                    <div className="flex flex-col items-center h-full">
                      <div className="w-10 h-10 bg-muted rounded-full bg-card flex items-center justify-center z-10 border-border relative">
                        <Briefcase className="w-6 h-6 text-foreground" />
                      </div>
                      {index < experience.length - 1 && (
                        <div className="w-px bg-border flex-grow" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="bg-muted/50 rounded-lg p-4 flex-1 flex items-center min-w-0 mb-8">
                      <div className="flex-1">
                        <div className="mb-2">
                          <span className="text-sm text-primary font-semibold">
                            {exp.position || 'Position not specified'}
                          </span>
                          {exp.positionLevel && exp.positionLevel !== 'undefined' && exp.positionLevel !== undefined && (
                            <span className="text-sm text-foreground font-semibold">
                              {' '}({exp.positionLevel})
                            </span>
                          )}
                        </div>
                        {exp.company && (
                          <div className="mb-3 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-foreground">
                              {exp.company}
                            </span>
                          </div>
                        )}
                        {exp.description && (
                          <div className="mt-3">
                            <h4 className="text-xs font-medium text-muted-foreground mb-2">Description:</h4>
                            <p className="text-xs text-foreground whitespace-pre-wrap bg-card p-3 rounded border">
                              {exp.description}
                            </p>
                          </div>
                        )}
                      </div>
                      {hasFitScore(exp) && (
                        <div className="flex flex-col items-center justify-center ml-6">
                          <span className="text-4xl font-extrabold text-primary leading-none">{formatScoreWithGrade(exp.fitScore)}</span>
                          <span className="text-lg text-muted-foreground font-semibold mt-1">
                            {exp.fitScore === null || exp.fitScore === undefined ? 'Not scored' : formatScoreWithGrade(exp.fitScore)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Custom Fields for Experience Section */}
      {isEditing ? (
        <CustomFieldEdit
          modelName="Candidate"
          section="experience"
          entityId={candidate.id}
          customFields={candidate.customFields || {}}
          onFieldChange={onCustomFieldChange || (() => {})}
          title="Additional Experience Information"
        />
      ) : (
        <CustomFieldDisplay
          modelName="Candidate"
          section="experience"
          entityId={candidate.id}
          customFields={candidate.customFields || {}}
          title="Additional Experience Information"
        />
      )}
    </div>
  );
};
