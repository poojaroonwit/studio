import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Controller } from 'react-hook-form';
import type { Applicant } from '@/lib/types';
import { formatApplicantNameWithLang } from '@/lib/applicantUtils';

interface ApplicantInfoTabProps {
  applicant: Applicant;
  isEditing: boolean;
  register?: any;
  errors?: any;
  watch?: any;
  setValue?: any;
  control?: any;
}

export const ApplicantInfoTab: React.FC<ApplicantInfoTabProps> = ({
  applicant, 
  isEditing, 
  register, 
  errors, 
  watch, 
  setValue,
  control
}) => {
  // Debug logging
  console.log('ApplicantInfoTab render:', { isEditing, applicant: !!Applicant, control: !!control, register: !!register });
  
  // Debug form values
  const watchedEmail = watch?.('email');
  const watchedFirstName = watch?.('parsedData.personal_info.firstname');
  console.log('Form values:', { watchedEmail, watchedFirstName });
  
  const nameInfo = formatApplicantNameWithLang(applicant);
  const personalInfo = (() => {
    // Handle parsedData - it might be a string that needs parsing
    let parsedDataObj: any = {};
    
    if (applicant.parsedData) {
      if (typeof applicant.parsedData === 'string') {
        try {
          parsedDataObj = JSON.parse(applicant.parsedData);
        } catch (e) {
          console.warn('Failed to parse parsedData string:', e);
          parsedDataObj = {};
        }
      } else {
        parsedDataObj = applicant.parsedData;
      }
    }
    
    return parsedDataObj?.personal_info || undefined;
  })();



  // Function to compose full name from title, first name, and last name
  const composeFullName = (title: string, firstName: string, lastName: string) => {
    const parts = [title, firstName, lastName].filter(Boolean);
    return parts.join(' ').trim();
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Basic Information Card */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                {control ? (
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        {...field}
                        type="email"
                        placeholder="Enter email address"
                        className="mt-1" 
                      />
                    )}
                  />
                ) : (
                  <Input 
                    {...register('email')} 
                    type="email"
                    placeholder="Enter email address"
                    className="mt-1" 
                  />
                )}
                {errors?.email && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                {control ? (
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        {...field}
                        type="tel"
                        placeholder="Enter phone number"
                        className="mt-1" 
                      />
                    )}
                  />
                ) : (
                  <Input 
                    {...register('phone')} 
                    type="tel"
                    placeholder="Enter phone number"
                    className="mt-1" 
                  />
                )}
                {errors?.phone && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information Card */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Display-only Full Name */}
            <div>
              <Label>Full Name (Auto-generated)</Label>
              <div className="mt-1 p-3 bg-muted rounded-md border">
                <span className="text-sm font-medium">
                  {composeFullName(
                    watch?.('parsedData.personal_info.title_honorific') || '',
                    watch?.('parsedData.personal_info.firstname') || '',
                    watch?.('parsedData.personal_info.lastname') || ''
                  ) || 'Enter title, first name, and last name to see full name'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parsedData.personal_info.title_honorific">Title</Label>
                {control ? (
                  <Controller
                    name="parsedData.personal_info.title_honorific"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        {...field}
                        placeholder="e.g., Mr., Ms., Dr."
                        className="mt-1" 
                      />
                    )}
                  />
                ) : (
                  <Input 
                    {...register('parsedData.personal_info.title_honorific')} 
                    placeholder="e.g., Mr., Ms., Dr."
                    className="mt-1" 
                  />
                )}

              </div>
              <div>
                <Label htmlFor="parsedData.personal_info.firstname">First Name *</Label>
                {control ? (
                  <Controller
                    name="parsedData.personal_info.firstname"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        {...field}
                        placeholder="Enter first name"
                        className="mt-1" 
                      />
                    )}
                  />
                ) : (
                  <Input 
                    {...register('parsedData.personal_info.firstname')} 
                    placeholder="Enter first name"
                    className="mt-1" 
                  />
                )}

                {errors?.parsedData?.personal_info?.firstname && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.parsedData.personal_info.firstname.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="parsedData.personal_info.lastname">Last Name *</Label>
                {control ? (
                  <Controller
                    name="parsedData.personal_info.lastname"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        {...field}
                        placeholder="Enter last name"
                        className="mt-1" 
                      />
                    )}
                  />
                ) : (
                  <Input 
                    {...register('parsedData.personal_info.lastname')} 
                    placeholder="Enter last name"
                    className="mt-1" 
                  />
                )}

                {errors?.parsedData?.personal_info?.lastname && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.parsedData.personal_info.lastname.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="parsedData.personal_info.nickname">Nickname</Label>
                {control ? (
                  <Controller
                    name="parsedData.personal_info.nickname"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        {...field}
                        placeholder="Enter nickname"
                        className="mt-1" 
                      />
                    )}
                  />
                ) : (
                  <Input 
                    {...register('parsedData.personal_info.nickname')} 
                    placeholder="Enter nickname"
                    className="mt-1" 
                  />
                )}

              </div>
            </div>
            <div>
              <Label htmlFor="parsedData.personal_info.location">Location</Label>
              {control ? (
                <Controller
                  name="parsedData.personal_info.location"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      {...field}
                      placeholder="e.g., Bangkok, Thailand"
                      className="mt-1" 
                    />
                  )}
                />
              ) : (
                <Input 
                  {...register('parsedData.personal_info.location')} 
                  placeholder="e.g., Bangkok, Thailand"
                  className="mt-1" 
                />
              )}
            </div>
            <div>
              <Label htmlFor="parsedData.personal_info.introduction_aboutme">About Me</Label>
              {control ? (
                <Controller
                  name="parsedData.personal_info.introduction_aboutme"
                  control={control}
                  render={({ field }) => (
                    <Textarea 
                      {...field}
                      placeholder="Tell us about yourself..."
                      className="mt-1 min-h-[100px]" 
                    />
                  )}
                />
              ) : (
                <Textarea 
                  {...register('parsedData.personal_info.introduction_aboutme')} 
                  placeholder="Tell us about yourself..."
                  className="mt-1 min-h-[100px]" 
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personalInfo?.title_honorific && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Title</span>
                <p className="text-sm">{personalInfo.title_honorific}</p>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-muted-foreground">Name</span>
              <p 
                className={`text-sm ${nameInfo.fontClass}`}
                lang={nameInfo.lang}
              >
                {nameInfo.name}
              </p>
            </div>
            {personalInfo?.nickname && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Nickname</span>
                <p className="text-sm">{personalInfo.nickname}</p>
              </div>
            )}
            {personalInfo?.location && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Location</span>
                <p className="text-sm">{personalInfo.location}</p>
              </div>
            )}
          </div>
          {personalInfo?.introduction_aboutme && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">About Me</span>
              <p className="text-sm mt-1">{personalInfo.introduction_aboutme}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
    </div>
  );
};
