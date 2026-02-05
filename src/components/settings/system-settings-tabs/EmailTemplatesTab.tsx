"use client";

import React from 'react';
import { Mail, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';

interface EmailTemplatesTabProps {
    emailTemplateInterviewInvitationSubject: string;
    setEmailTemplateInterviewInvitationSubject: (val: string) => void;
    emailTemplateInterviewInvitation: string;
    setEmailTemplateInterviewInvitation: (val: string) => void;
    emailTemplateInterviewInvitationEditorMode: 'wysiwyg' | 'html';
    setEmailTemplateInterviewInvitationEditorMode: (val: 'wysiwyg' | 'html') => void;
    icsDescriptionTemplate: string;
    setIcsDescriptionTemplate: (val: string) => void;
    emailEditorMode: 'wysiwyg' | 'html';
    setEmailEditorMode: (val: 'wysiwyg' | 'html') => void;
    isSaving: boolean;
    isEditorReady: boolean;
}

export default function EmailTemplatesTab({
    emailTemplateInterviewInvitationSubject,
    setEmailTemplateInterviewInvitationSubject,
    emailTemplateInterviewInvitation,
    setEmailTemplateInterviewInvitation,
    emailTemplateInterviewInvitationEditorMode,
    setEmailTemplateInterviewInvitationEditorMode,
    icsDescriptionTemplate,
    setIcsDescriptionTemplate,
    emailEditorMode,
    setEmailEditorMode,
    isSaving,
    isEditorReady,
}: EmailTemplatesTabProps) {

    const handleResetToDefault = () => {
        const defaultTemplate = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333; margin-bottom: 20px;">Interview Invitation</h2>
  
  <p>Dear {{interviewerName}},</p>
  
  <p>You have been assigned to conduct an interview with <strong>{{ApplicantName}}</strong> for the <strong>{{positionTitle}}</strong> position.</p>
  
  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Date:</strong> {{interviewDate}}</p>
    <p style="margin: 5px 0;"><strong>Time:</strong> {{interviewTime}}</p>
    <p style="margin: 5px 0;"><strong>Location:</strong> {{interviewLocation}}</p>
  </div>
  
  <p>Please review the Applicant's profile and prepare your evaluation questions accordingly.</p>
  
  <!-- Evaluation Access Section -->
  <div style="margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center;">
    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Evaluation Access</h3>
    
    <!-- Button -->
    <a href="{{evaluationLink}}" style="display: inline-block; padding: 14px 32px; background: #0066cc; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-bottom: 20px;">
      Open Evaluation Form
    </a>
    
    <p style="margin: 15px 0 10px 0; color: #666; font-size: 14px;">Or scan this QR code with your mobile device:</p>
    
    <!-- QR Code -->
    {{evaluationQrcodeImage}}
  </div>
  
  <p style="margin-top: 30px;">Best regards,<br/>Recruitment Team</p>
</div>`;
        setEmailTemplateInterviewInvitation(defaultTemplate);
        setEmailTemplateInterviewInvitationSubject('Interview Invitation: {{ApplicantName}} - {{positionTitle}}');
    };

    return (
        <ScrollArea className="h-full">
            <Accordion type="multiple" defaultValue={['email-templates']} className="w-full">
                <AccordionItem value="email-templates" className="border-b">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">Email Templates</div>
                                <div className="text-xs text-muted-foreground font-normal">Configure email templates for interview invitations. Use template variables: {'{'}ApplicantName{'}'}, {'{'}positionTitle{'}'}, {'{'}interviewDate{'}'}, {'{'}interviewTime{'}'}, {'{'}interviewLocation{'}'}, {'{'}evaluationLink{'}'}, {'{'}interviewerName{'}'}</div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email-template-subject">Email Subject</Label>
                                <Input
                                    id="email-template-subject"
                                    type="text"
                                    placeholder="Interview Invitation: {{ApplicantName}} - {{positionTitle}}"
                                    value={emailTemplateInterviewInvitationSubject}
                                    onChange={(e) => setEmailTemplateInterviewInvitationSubject(e.target.value)}
                                    disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Subject line for interview invitation emails. Use template variables as needed.
                                </p>
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="email-template-body">Email Body</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={emailEditorMode === 'wysiwyg' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setEmailEditorMode('wysiwyg')}
                                        disabled={isSaving}
                                    >
                                        WYSIWYG
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={emailEditorMode === 'html' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setEmailEditorMode('html')}
                                        disabled={isSaving}
                                    >
                                        HTML
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleResetToDefault}
                                        disabled={isSaving}
                                    >
                                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                        Reset to Default
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <Label htmlFor="default-editor-mode">Default Editor Mode for Interview Session</Label>
                                <Select
                                    value={emailTemplateInterviewInvitationEditorMode}
                                    onValueChange={(value: 'wysiwyg' | 'html') => setEmailTemplateInterviewInvitationEditorMode(value)}
                                    disabled={isSaving}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Select mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="wysiwyg">WYSIWYG (Visual)</SelectItem>
                                        <SelectItem value="html">HTML (Read-Only Preview)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Select the default editor mode when creating a new interview session. "HTML" mode shows a read-only preview of the template.
                                </p>
                            </div>

                            {emailEditorMode === 'wysiwyg' ? (
                                isEditorReady ? (
                                    <TiptapEditor
                                        value={emailTemplateInterviewInvitation}
                                        onChange={setEmailTemplateInterviewInvitation}
                                        placeholder="Enter email template HTML here..."
                                        className="min-h-[300px]"
                                    />
                                ) : (
                                    <div className="min-h-[300px] border rounded-md p-4 flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                )
                            ) : (
                                <textarea
                                    className="w-full min-h-[400px] p-3 border rounded-md font-mono text-sm bg-background"
                                    value={emailTemplateInterviewInvitation}
                                    onChange={(e) => setEmailTemplateInterviewInvitation(e.target.value)}
                                    placeholder="Enter full HTML email template here..."
                                    disabled={isSaving}
                                />
                            )}
                            <p className="text-xs text-muted-foreground">
                                {emailEditorMode === 'html' ? 'Full HTML email template. ' : 'HTML email template. '}Available variables: {'{'}ApplicantName{'}'}, {'{'}positionTitle{'}'}, {'{'}interviewDate{'}'}, {'{'}interviewTime{'}'}, {'{'}interviewLocation{'}'}, {'{'}evaluationLink{'}'}, {'{'}interviewerName{'}'}
                            </p>

                            <div className="space-y-2">
                                <Label htmlFor="ics-description-template">ICS Calendar Description Template</Label>
                                <textarea
                                    id="ics-description-template"
                                    className="w-full min-h-[120px] p-3 border rounded-md font-mono text-sm bg-background"
                                    value={icsDescriptionTemplate}
                                    onChange={(e) => setIcsDescriptionTemplate(e.target.value)}
                                    placeholder="Interview with {{ApplicantName}} for position {{positionTitle}}.&#10;&#10;Location: {{interviewLocation}}&#10;Interviewer: {{interviewerName}}"
                                    disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Template for the ICS calendar file description. Available variables: {'{'}ApplicantName{'}'}, {'{'}positionTitle{'}'}, {'{'}interviewDate{'}'}, {'{'}interviewTime{'}'}, {'{'}interviewLocation{'}'}, {'{'}evaluationLink{'}'}, {'{'}interviewerName{'}'}. Use \n for line breaks.
                                </p>
                            </div>

                            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                                <p className="text-xs text-blue-900 dark:text-blue-100">
                                    <strong>Template Variables:</strong>
                                    <br />
                                    • {'{'}ApplicantName{'}'} - Applicant's full name
                                    <br />
                                    • {'{'}positionTitle{'}'} - Job position title
                                    <br />
                                    • {'{'}interviewDate{'}'} - Formatted interview date
                                    <br />
                                    • {'{'}interviewTime{'}'} - Formatted interview time
                                    <br />
                                    • {'{'}interviewLocation{'}'} - Interview location
                                    <br />
                                    • {'{'}evaluationLink{'}'} - Link to Applicant evaluation
                                    <br />
                                    • {'{'}interviewerName{'}'} - Interviewer's name
                                </p>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>
    );
}
