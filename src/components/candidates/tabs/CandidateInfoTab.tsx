import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Candidate } from '@/lib/types';
import { formatCandidateNameWithLang } from '@/lib/candidateUtils';

interface CandidateInfoTabProps {
  candidate: Candidate;
  isEditing: boolean;
  register?: any;
  errors?: any;
  watch?: any;
  setValue?: any;
}

export const CandidateInfoTab: React.FC<CandidateInfoTabProps> = ({ 
  candidate, 
  isEditing, 
  register, 
  errors, 
  watch, 
  setValue
}) => {
  const nameInfo = formatCandidateNameWithLang(candidate);
  const personalInfo = (candidate.parsedData && 'personal_info' in (candidate.parsedData as any))
    ? (candidate.parsedData as any).personal_info
    : undefined;

  // Debug logging
  React.useEffect(() => {
    if (isEditing) {
      console.log('CandidateInfoTab - isEditing:', isEditing);
      console.log('CandidateInfoTab - candidate:', candidate);
      console.log('CandidateInfoTab - personalInfo:', personalInfo);
      console.log('CandidateInfoTab - register function:', !!register);
      
      // Watch form values to see what's in the form
      if (watch) {
        const watchedValues = watch();
        console.log('CandidateInfoTab - watched form values:', watchedValues);
      }
    }
  }, [isEditing, candidate, personalInfo, register, watch]);

  if (isEditing) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parsedData.personal_info.title_honorific">Title</Label>
                <Input 
                  id="parsedData.personal_info.title_honorific" 
                  {...register('parsedData.personal_info.title_honorific')} 
                  placeholder="e.g., Mr., Ms., Dr."
                  className="mt-1" 
                  defaultValue={personalInfo?.title_honorific || ''}
                />
              </div>
              <div>
                <Label htmlFor="parsedData.personal_info.firstname">First Name *</Label>
                <Input 
                  id="parsedData.personal_info.firstname" 
                  {...register('parsedData.personal_info.firstname')} 
                  placeholder="Enter first name"
                  className="mt-1" 
                  defaultValue={personalInfo?.firstname || ''}
                />
                {errors?.parsedData?.personal_info?.firstname && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.parsedData.personal_info.firstname.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="parsedData.personal_info.lastname">Last Name *</Label>
                <Input 
                  id="parsedData.personal_info.lastname" 
                  {...register('parsedData.personal_info.lastname')} 
                  placeholder="Enter last name"
                  className="mt-1" 
                  defaultValue={personalInfo?.lastname || ''}
                />
                {errors?.parsedData?.personal_info?.lastname && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.parsedData.personal_info.lastname.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="parsedData.personal_info.nickname">Nickname</Label>
                <Input 
                  id="parsedData.personal_info.nickname" 
                  {...register('parsedData.personal_info.nickname')} 
                  placeholder="Enter nickname"
                  className="mt-1" 
                  defaultValue={personalInfo?.nickname || ''}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="parsedData.personal_info.location">Location</Label>
              <Input 
                id="parsedData.personal_info.location" 
                {...register('parsedData.personal_info.location')} 
                placeholder="e.g., Bangkok, Thailand"
                className="mt-1" 
                defaultValue={personalInfo?.location || ''}
              />
            </div>
            <div>
              <Label htmlFor="parsedData.personal_info.introduction_aboutme">About Me</Label>
              <Textarea 
                id="parsedData.personal_info.introduction_aboutme" 
                {...register('parsedData.personal_info.introduction_aboutme')} 
                placeholder="Tell us about yourself..."
                className="mt-1 min-h-[100px]" 
                defaultValue={personalInfo?.introduction_aboutme || ''}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personalInfo?.title_honorific && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                <p className="text-sm">{personalInfo.title_honorific}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
              <p 
                className={`text-sm ${nameInfo.fontClass}`}
                lang={nameInfo.lang}
              >
                {nameInfo.name}
              </p>
            </div>
            {personalInfo?.nickname && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nickname</Label>
                <p className="text-sm">{personalInfo.nickname}</p>
              </div>
            )}
            {personalInfo?.location && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                <p className="text-sm">{personalInfo.location}</p>
              </div>
            )}
          </div>
          {personalInfo?.introduction_aboutme && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">About Me</Label>
              <p className="text-sm whitespace-pre-wrap">{personalInfo.introduction_aboutme}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
