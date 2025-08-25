import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Candidate } from '@/lib/types';

interface JobSuitabilityTabProps {
  candidate: Candidate;
  isEditing: boolean;
  control?: any;
  register?: any;
  errors?: any;
  watch?: any;
  setValue?: any;
  jobSuitableFields?: any[];
  appendJobSuitable?: (value: any) => void;
  removeJobSuitable?: (index: number) => void;
}

const positionLevelOptions = [
  'entry level',
  'mid level', 
  'senior level',
  'lead',
  'manager',
  'executive',
  'officer',
  'leader'
];

export const JobSuitabilityTab: React.FC<JobSuitabilityTabProps> = ({ 
  candidate, 
  isEditing, 
  control,
  register, 
  errors, 
  watch, 
  setValue,
  jobSuitableFields = [],
  appendJobSuitable,
  removeJobSuitable
}) => {
  const jobSuitable = (candidate.parsedData && 'job_suitable' in (candidate.parsedData as any))
    ? ((candidate.parsedData as any).job_suitable || [])
    : [];

  // Filter out empty entries (objects with no content)
  const filteredJobSuitable = jobSuitable.filter((job: any) => {
    const hasContent = job.suitable_career || job.suitable_job_position || 
                     job.suitable_job_level || job.suitable_salary_bath_month ||
                     job.career || job.position || job.level || job.salary ||
                     job.job_career || job.job_position || job.job_level || job.job_salary ||
                     job.title || job.role || job.expected_salary || job.salary_expectation;
    return hasContent;
  });

 

  const handleAddJobSuitable = () => {
    if (appendJobSuitable) {
      appendJobSuitable({
        suitable_career: '',
        suitable_job_position: '',
        suitable_job_level: '',
        suitable_salary_bath_month: ''
      });
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-8">
        {/* Job Suitable Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Job Suitability</CardTitle>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleAddJobSuitable}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add Job Suitability
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobSuitableFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No job suitability entries yet.</p>
                <p className="text-sm">Click "Add Job Suitability" to add your first entry.</p>
              </div>
            ) : (
              jobSuitableFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Job Suitability #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeJobSuitable?.(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`parsedData.job_suitable.${index}.suitable_career`}>Suitable Career</Label>
                      <Input 
                        id={`parsedData.job_suitable.${index}.suitable_career`}
                        {...register(`parsedData.job_suitable.${index}.suitable_career`)}
                        placeholder="e.g., Software Development"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`parsedData.job_suitable.${index}.suitable_job_position`}>Suitable Position</Label>
                      <Input 
                        id={`parsedData.job_suitable.${index}.suitable_job_position`}
                        {...register(`parsedData.job_suitable.${index}.suitable_job_position`)}
                        placeholder="e.g., Frontend Developer"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`parsedData.job_suitable.${index}.suitable_job_level`}>Position Level</Label>
                      <Select 
                        value={watch(`parsedData.job_suitable.${index}.suitable_job_level`) || ''}
                        onValueChange={(value) => setValue(`parsedData.job_suitable.${index}.suitable_job_level`, value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          {positionLevelOptions.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`parsedData.job_suitable.${index}.suitable_salary_bath_month`}>Expected Salary (THB/month)</Label>
                      <Input 
                        id={`parsedData.job_suitable.${index}.suitable_salary_bath_month`}
                        {...register(`parsedData.job_suitable.${index}.suitable_salary_bath_month`)}
                        placeholder="e.g., 50000"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Job Suitable Section */}
      <Card>
        <CardHeader>
          <CardTitle>Job Suitability</CardTitle>
        </CardHeader>
                 <CardContent className="space-y-4">
           {filteredJobSuitable.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               <p>No job suitability information available.</p>
             </div>
           ) : (
             filteredJobSuitable.map((job: any, index: number) => (
               <div key={index} className="border rounded-lg p-4 space-y-3">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {(job.suitable_career || job.career || job.job_career || job.title) && (
                     <div>
                       <Label className="text-xs font-medium text-muted-foreground">Suitable Career</Label>
                       <p className="text-sm">{job.suitable_career || job.career || job.job_career || job.title}</p>
                     </div>
                   )}
                   {(job.suitable_job_position || job.position || job.job_position || job.role) && (
                     <div>
                       <Label className="text-xs font-medium text-muted-foreground">Suitable Position</Label>
                       <p className="text-sm">{job.suitable_job_position || job.position || job.job_position || job.role}</p>
                     </div>
                   )}
                   {(job.suitable_job_level || job.level || job.job_level) && (
                     <div>
                       <Label className="text-xs font-medium text-muted-foreground">Position Level</Label>
                       <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                         {job.suitable_job_level || job.level || job.job_level}
                       </span>
                     </div>
                   )}
                   {(job.suitable_salary_bath_month || job.salary || job.job_salary || job.expected_salary || job.salary_expectation) && (
                     <div>
                       <Label className="text-xs font-medium text-muted-foreground">Expected Salary</Label>
                       <p className="text-sm">฿{job.suitable_salary_bath_month || job.salary || job.job_salary || job.expected_salary || job.salary_expectation}/month</p>
                     </div>
                   )}
                 </div>
               </div>
             ))
           )}
        </CardContent>
      </Card>
    </div>
  );
};
