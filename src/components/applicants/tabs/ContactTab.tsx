import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon as PlusCircle, TrashIcon as Trash2 } from '@heroicons/react/24/outline';
import type { Applicant } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { CustomFieldDisplay } from '../CustomFieldDisplay';
import { CustomFieldEdit } from '../CustomFieldEdit';

interface ContactTabProps {
  applicant: Applicant;
  isEditing: boolean;
  register?: any;
  errors?: any;
  watch?: any;
  setValue?: any;
  skillsFields?: any[];
  appendSkill?: (value: any) => void;
  removeSkill?: (index: number) => void;
  onCustomFieldChange?: (fieldCode: string, value: any) => void;
  customFieldsRefreshTrigger?: number;
}

export const ContactTab: React.FC<ContactTabProps> = ({
  applicant,
  isEditing,
  register,
  errors,
  watch,
  setValue,
  skillsFields = [],
  appendSkill,
  removeSkill,
  onCustomFieldChange,
  customFieldsRefreshTrigger
}) => {
  const contactInfo = (applicant.parsedData && 'contact_info' in (applicant.parsedData as any))
    ? (applicant.parsedData as any).contact_info
    : undefined;
  const skills = (applicant.parsedData && 'skills' in (applicant.parsedData as any))
    ? ((applicant.parsedData as any).skills || [])
    : [];

  const handleAddSkill = () => {
    if (appendSkill) {
      appendSkill({
        segment_skill: '',
        skill_string: ''
      });
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Skills Section */}
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Skills</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSkill}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add Skill
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {skillsFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No skills entries yet.</p>
                <p className="text-sm">Click "Add Skill" to add your first entry.</p>
              </div>
            ) : (
              skillsFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Skill #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSkill?.(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`parsedData.skills.${index}.segment_skill`}>Skill Category</Label>
                      <Input
                        id={`parsedData.skills.${index}.segment_skill`}
                        {...register(`parsedData.skills.${index}.segment_skill`)}
                        placeholder="e.g., Programming Languages, Soft Skills"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`parsedData.skills.${index}.skill_string`}>Skills</Label>
                      <Input
                        id={`parsedData.skills.${index}.skill_string`}
                        {...register(`parsedData.skills.${index}.skill_string`)}
                        placeholder="e.g., JavaScript, React, Node.js"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Custom Fields for Additional Information Section */}
        <CustomFieldEdit
          modelName="Candidate"
          section="Applicant-info"
          entityId={applicant.id}
          customFields={applicant.customFields || {}}
          onFieldChange={onCustomFieldChange || (() => { })}
          title="Additional Information"
          refreshTrigger={customFieldsRefreshTrigger}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contactInfo?.email && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Email</span>
                <p className="text-sm">{contactInfo.email}</p>
              </div>
            )}
            {contactInfo?.phone && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Phone</span>
                <p className="text-sm">{contactInfo.phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skills Section */}
      {skills.length > 0 && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {skills.map((skill: any, index: number) => (
              <div key={index} className="space-y-2">
                {skill.segment_skill && (
                  <h4 className="text-xs font-bold text-foreground/80 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-1 bg-black rounded-full" />
                    {skill.segment_skill}
                  </h4>
                )}
                <div className="flex flex-wrap gap-2">
                  {(skill.skill_string || '').split(',').map((s: string, i: number) => {
                    const trimmedSkill = s.trim();
                    if (!trimmedSkill) return null;
                    return (
                      <Badge key={i} variant="secondary" className="px-3 py-1 rounded-full font-medium bg-black text-white hover:bg-black/90 border-none transition-transform hover:scale-105">
                        {trimmedSkill}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Custom Fields for Additional Information Section */}
      {isEditing ? (
        <CustomFieldEdit
          modelName="Candidate"
          section="Applicant-info"
          entityId={applicant.id}
          customFields={applicant.customFields || {}}
          onFieldChange={onCustomFieldChange || (() => { })}
          title="Additional Information"
          refreshTrigger={customFieldsRefreshTrigger}
        />
      ) : (
        <CustomFieldDisplay
          modelName="Candidate"
          section="Applicant-info"
          entityId={applicant.id}
          customFields={applicant.customFields || {}}
          title="Additional Information"
          refreshTrigger={customFieldsRefreshTrigger}
        />
      )}
    </div>
  );
};
