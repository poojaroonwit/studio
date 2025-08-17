import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Candidate } from '@/lib/types';

interface ContactTabProps {
  candidate: Candidate;
  isEditing: boolean;
  register?: any;
  errors?: any;
  watch?: any;
  setValue?: any;
  skillsFields?: any[];
  appendSkill?: (value: any) => void;
  removeSkill?: (index: number) => void;
}

export const ContactTab: React.FC<ContactTabProps> = ({ 
  candidate, 
  isEditing, 
  register, 
  errors, 
  watch, 
  setValue,
  skillsFields = [],
  appendSkill,
  removeSkill
}) => {
  const contactInfo = candidate.parsedData?.contact_info;
  const skills = candidate.parsedData?.skills || [];

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
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parsedData.contact_info.email">Email *</Label>
                <Input 
                  id="parsedData.contact_info.email" 
                  {...register('parsedData.contact_info.email')} 
                  type="email"
                  placeholder="Enter email address"
                  className="mt-1" 
                />
                {errors?.parsedData?.contact_info?.email && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.parsedData.contact_info.email.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="parsedData.contact_info.phone">Phone</Label>
                <Input 
                  id="parsedData.contact_info.phone" 
                  {...register('parsedData.contact_info.phone')} 
                  type="tel"
                  placeholder="Enter phone number"
                  className="mt-1" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills Section */}
        <Card>
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <p className="text-sm">
                <a 
                  href={`mailto:${contactInfo?.email || candidate.email}`}
                  className="text-primary hover:underline"
                >
                  {contactInfo?.email || candidate.email}
                </a>
              </p>
            </div>
            {(contactInfo?.phone || candidate.phone) && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                <p className="text-sm">
                  <a 
                    href={`tel:${contactInfo?.phone || candidate.phone}`}
                    className="text-primary hover:underline"
                  >
                    {contactInfo?.phone || candidate.phone}
                  </a>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skills Section */}
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {skills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No skills information available.</p>
            </div>
          ) : (
            skills.map((skill, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                {skill.segment_skill && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                    <p className="text-sm font-medium">{skill.segment_skill}</p>
                  </div>
                )}
                {(skill.skill && skill.skill.length > 0) && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Skills</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {skill.skill.map((s: string, skillIndex: number) => (
                        <span 
                          key={skillIndex} 
                          className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {skill.skill_string && !skill.skill && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Skills</Label>
                    <p className="text-sm">{skill.skill_string}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
