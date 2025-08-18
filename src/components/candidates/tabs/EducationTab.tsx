import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, GraduationCap } from 'lucide-react';
import type { Candidate } from '@/lib/types';

interface EducationTabProps {
  candidate: Candidate;
  isEditing: boolean;
  control?: any;
  register?: any;
  errors?: any;
  watch?: any;
  setValue?: any;
  educationFields?: any[];
  appendEducation?: (value: any) => void;
  removeEducation?: (index: number) => void;
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
    return `${start}<br/>Present`;
  }
  
  if (endYear) {
    const end = `${months[Number(endMonth) - 1] || ''} ${endYear}`;
    return `${start}<br/>${end}`;
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

const formatScoreWithGrade = (score: number) => {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  return 'D';
};

// Calculate total education duration
const calculateTotalEducationDuration = (educationArray: any[]) => {
  let totalMonths = 0;
  
  educationArray.forEach((edu: any) => {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    // Get start date
    if (edu.startYear && edu.startMonth) {
      startDate = new Date(edu.startYear, edu.startMonth - 1);
    }
    
    // Get end date
    const hasValidEndDate = edu.endYear && edu.endMonth && 
      edu.endYear <= new Date().getFullYear() + 1 && 
      edu.endYear >= 1900;
    
    if (hasValidEndDate && edu.endYear && edu.endMonth) {
      endDate = new Date(edu.endYear, edu.endMonth - 1);
    } else if (edu.isCurrent === true || !edu.endMonth || !edu.endYear) {
      endDate = new Date(); // Current date for current education
    }
    
    // Calculate duration for this education
    if (startDate && endDate) {
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
      if (months > 0) {
        totalMonths += months;
      }
    }
  });
  
  // Convert total months to years and months
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  
  if (years === 0 && months === 0) {
    return '';
  }
  
  const parts = [];
  if (years > 0) {
    parts.push(`${years} year${years > 1 ? 's' : ''}`);
  }
  if (months > 0) {
    parts.push(`${months} month${months > 1 ? 's' : ''}`);
  }
  
  return parts.join(' ');
};

export const EducationTab: React.FC<EducationTabProps> = ({ 
  candidate, 
  isEditing, 
  control,
  register, 
  errors, 
  watch, 
  setValue,
  educationFields = [],
  appendEducation,
  removeEducation
}) => {
  const education = (candidate.parsedData && 'education' in (candidate.parsedData as any))
    ? ((candidate.parsedData as any).education || [])
    : [];
  const totalDuration = calculateTotalEducationDuration(education);

  const handleAddEducation = () => {
    if (appendEducation) {
      appendEducation({ 
        university: '', 
        major: '', 
        field: '', 
        campus: '', 
        startMonth: '', 
        startYear: '', 
        endMonth: '', 
        endYear: '', 
        isCurrent: false, 
        duration: '', 
        GPA: '' 
      });
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {educationFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No education entries yet.</p>
                <p className="text-sm">Click "Add Education" to add your first entry.</p>
              </div>
            ) : (
              educationFields.map((field, index) => (
                <div key={field.id} className="p-3 border rounded-md space-y-2 bg-muted/30 relative">
                  <Input placeholder="University" {...register(`parsedData.education.${index}.university`)} />
                  <Input placeholder="Major" {...register(`parsedData.education.${index}.major`)} />
                  <Input placeholder="Field" {...register(`parsedData.education.${index}.field`)} />
                  <Input placeholder="Campus" {...register(`parsedData.education.${index}.campus`)} />
                  
                  {/* Education Edit Fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Start Month</Label>
                      <Select
                        value={watch(`parsedData.education.${index}.startMonth`)?.toString() || ''}
                        onValueChange={(value) => setValue(`parsedData.education.${index}.startMonth`, value)}
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
                        value={watch(`parsedData.education.${index}.startYear`)?.toString() || ''}
                        onValueChange={(value) => setValue(`parsedData.education.${index}.startYear`, value)}
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
                        value={watch(`parsedData.education.${index}.endMonth`)?.toString() || ''}
                        onValueChange={(value) => setValue(`parsedData.education.${index}.endMonth`, value)}
                        disabled={!!watch(`parsedData.education.${index}.isCurrent`)}
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
                        value={watch(`parsedData.education.${index}.endYear`)?.toString() || ''}
                        onValueChange={(value) => setValue(`parsedData.education.${index}.endYear`, value)}
                        disabled={!!watch(`parsedData.education.${index}.isCurrent`)}
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
                    <input type="checkbox" {...register(`parsedData.education.${index}.isCurrent`)} /> Present
                  </label>
                  <Input placeholder="GPA" {...register(`parsedData.education.${index}.GPA`)} />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-7 w-7" 
                    onClick={() => removeEducation?.(index)}
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
              onClick={handleAddEducation}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Education
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Education
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-8">
            {education.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">No education details provided.</div>
            )}
            {education.map((edu: any, index: number) => {
              const isCurrent = !edu.endYear && !edu.endMonth;
              const periodDisplay = formatTimelinePeriod(edu.startMonth, edu.startYear, edu.endMonth, edu.endYear, isCurrent);
              const duration = formatTimelineDuration(edu.startMonth, edu.startYear, edu.endMonth, edu.endYear, isCurrent);
              return (
                <div key={`edu-${index}-${edu.university || index}`} className="relative">
                  <div className="grid grid-cols-[12rem_4rem_1fr] gap-x-2 items-stretch h-full">
                    <div className="text-right h-full flex flex-col items-end justify-start">
                      {periodDisplay && (
                        <div className="text-xs text-muted-foreground whitespace-pre-line mb-1" dangerouslySetInnerHTML={{ __html: periodDisplay }} />
                      )}
                      {duration && (
                        <div className="text-xs text-muted-foreground">{duration}</div>
                      )}
                    </div>
                    {/* Timeline icon and vertical line */}
                    <div className="flex flex-col items-center h-full">
                      <div className="w-10 h-10 bg-muted rounded-full bg-card flex items-center justify-center z-10 border-border relative">
                        <GraduationCap className="w-6 h-6 text-foreground" />
                      </div>
                      {index < education.length - 1 && (
                        <div className="w-px bg-border flex-grow" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="bg-muted/50 rounded-lg p-4 flex-1 flex items-center min-w-0 mb-8">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                          {edu.major && edu.field ? `${edu.major} - ${edu.field}` : edu.major || edu.field || 'Field of study not specified'}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {edu.university || 'University not specified'}
                          {edu.campus && ` (${edu.campus})`}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {edu.GPA && (
                            <span className="text-xs">GPA: {edu.GPA}</span>
                          )}
                        </div>
                      </div>
                      {hasFitScore(edu) && (
                        <div className="flex flex-col items-center justify-center ml-6">
                          <span className="text-4xl font-extrabold text-primary leading-none">{formatScoreWithGrade(edu.fitScore)}</span>
                          <span className="text-lg text-muted-foreground font-semibold mt-1">{edu.fitScore}%</span>
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
    </div>
  );
};
