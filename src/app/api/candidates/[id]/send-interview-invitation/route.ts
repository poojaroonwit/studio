import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { z } from 'zod';
import { getSystemSetting } from '@/lib/systemSettings';
import { sendEmail, EmailAttachment } from '@/lib/emailService';
import { generateCalendarInvite } from '@/lib/calendarUtils';
import { createCalendarEvent } from '@/lib/graphClient';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

const sendInvitationSchema = z.object({
  interviewerIds: z.array(z.string().uuid()).optional(),
  interviewDate: z.string().datetime(),
  interviewTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration: z.number().int().min(15).max(480).default(60),
  location: z.string().optional(),
  locationEmail: z.string().email().optional(),
  notes: z.string().optional(),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
});

/**
 * Replace template variables in email template
 */
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  return result;
}

/**
 * Get or create evaluation link for candidate
 */
async function getOrCreateEvaluationLink(
  candidateId: string,
  userId: string
): Promise<string | null> {
  try {
    // Check for existing active link
    const existingLink = await prisma.candidateEvaluationLink.findFirst({
      where: {
        candidateId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingLink) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:8021';
      return `${baseUrl}/candidates/${encodeURIComponent(candidateId)}/evaluate?token=${encodeURIComponent(existingLink.token)}`;
    }

    // Create new link
    const token = require('crypto').randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.candidateEvaluationLink.create({
      data: {
        candidateId,
        token,
        expiresAt,
        createdById: userId,
        requireLogin: true,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:8021';
    return `${baseUrl}/candidates/${encodeURIComponent(candidateId)}/evaluate?token=${encodeURIComponent(token)}`;
  } catch (error) {
    console.error('[Send Interview Invitation] Error getting evaluation link:', error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if feature is enabled
  const featureEnabled = await getSystemSetting('interviewInvitationFeatureEnabled');
  if (featureEnabled === 'false') {
    return NextResponse.json(
      { message: 'Interview invitation feature is disabled' },
      { status: 403 }
    );
  }

  // Check permissions - user needs to be able to view candidates at minimum
  if (!hasPermission(session.user, 'CANDIDATES_VIEW')) {
    return NextResponse.json(
      { message: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    );
  }

  const { id: candidateId } = await params;

  // Validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const validationResult = sendInvitationSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      {
        message: 'Invalid request data',
        errors: validationResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const {
    interviewerIds,
    interviewDate,
    interviewTime,
    duration = 60,
    location,
    locationEmail,
    notes,
    emailSubject: customEmailSubject,
    emailBody: customEmailBody,
  } = validationResult.data;

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Get candidate information
    const candidateResult = await client.query(
      'SELECT id, name, email, "positionId" FROM "Candidate" WHERE id = $1',
      [candidateId]
    );

    if (candidateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { message: 'Candidate not found' },
        { status: 404 }
      );
    }

    const candidate = candidateResult.rows[0];
    const positionId = candidate.positionId;

    if (!positionId) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { message: 'Candidate is not associated with a position' },
        { status: 400 }
      );
    }

    // Get position information
    const positionResult = await client.query(
      'SELECT id, title FROM "Position" WHERE id = $1',
      [positionId]
    );

    if (positionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { message: 'Position not found' },
        { status: 404 }
      );
    }

    const position = positionResult.rows[0];

    // Get interviewers for the position
    let interviewersQuery = `
      SELECT 
        pi.id,
        pi."userId",
        u.name as "userName",
        u.email as "userEmail"
      FROM "PositionInterviewer" pi
      JOIN "User" u ON pi."userId" = u.id
      WHERE pi."positionId" = $1
    `;

    const queryParams: any[] = [positionId];

    if (interviewerIds && interviewerIds.length > 0) {
      interviewersQuery += ` AND pi."userId" = ANY($2)`;
      queryParams.push(interviewerIds);
    }

    const interviewersResult = await client.query(interviewersQuery, queryParams);

    if (interviewersResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { message: 'No interviewers found for this position' },
        { status: 400 }
      );
    }

    interface InterviewerRow {
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
    }
    const interviewers: InterviewerRow[] = interviewersResult.rows;

    // Get email template (use custom if provided, otherwise use system default)
    const emailTemplate = customEmailBody || await getSystemSetting('emailTemplateInterviewInvitation');
    const emailSubjectTemplate = customEmailSubject ||
      (await getSystemSetting('emailTemplateInterviewInvitationSubject')) ||
      'Interview Invitation: {{candidateName}} - {{positionTitle}}';

    // Get ICS description template
    const icsDescriptionTemplate = await getSystemSetting('icsDescriptionTemplate') ||
      'Interview with {{candidateName}} for position {{positionTitle}}.\n\nLocation: {{interviewLocation}}\nInterviewer: {{interviewerName}}';

    if (!emailTemplate) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { message: 'Email template not configured' },
        { status: 500 }
      );
    }

    // Get or create evaluation link
    const evaluationLink = await getOrCreateEvaluationLink(
      candidateId,
      session.user.id
    );

    // Parse interview date and time
    const interviewDateTime = new Date(interviewDate);
    const [hours, minutes] = interviewTime.split(':').map(Number);
    interviewDateTime.setHours(hours, minutes, 0, 0);
    const endDateTime = new Date(interviewDateTime.getTime() + duration * 60 * 1000);

    // Get organizer info (current user)
    const organizerResult = await client.query(
      'SELECT name, email FROM "User" WHERE id = $1',
      [session.user.id]
    );
    const organizer =
      organizerResult.rows.length > 0
        ? {
          name: organizerResult.rows[0].name,
          email: organizerResult.rows[0].email,
        }
        : { name: 'Recruitment System', email: 'noreply@system' };

    // Format dates for template
    const interviewDateFormatted = interviewDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const interviewTimeFormatted = interviewDateTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const results = [];
    const errors = [];

    // Send email to each interviewer
    for (const interviewer of interviewers) {
      try {
        // Generate calendar invite
        // Prepare description from template
        const icsDescription = icsDescriptionTemplate
          .replace(/{{candidateName}}/g, candidate.name)
          .replace(/{{positionTitle}}/g, position.title)
          .replace(/{{interviewDate}}/g, interviewDateFormatted)
          .replace(/{{interviewTime}}/g, interviewTimeFormatted)
          .replace(/{{interviewLocation}}/g, location || '')
          .replace(/{{evaluationLink}}/g, evaluationLink || '')
          .replace(/{{interviewerName}}/g, interviewer.userName);

        const calendarContent = generateCalendarInvite({
          title: `Interview: ${candidate.name} - ${position.title}`,
          description: icsDescription,
          startDate: interviewDateTime,
          endDate: endDateTime,
          location: location || '',
          organizer: organizer,
          attendees: [
            {
              name: interviewer.userName,
              email: interviewer.userEmail,
            },
            ...(locationEmail ? [{
              name: location || 'Meeting Room',
              email: locationEmail,
              rsvp: true,
              role: 'REQ-PARTICIPANT',
              cutype: 'RESOURCE'
            }] : [])
          ],
        });

        // Replace template variables
        const emailSubject = replaceTemplateVariables(emailSubjectTemplate, {
          candidateName: candidate.name,
          positionTitle: position.title,
          interviewDate: interviewDateFormatted,
          interviewTime: interviewTimeFormatted,
          interviewLocation: location || 'TBD',
          evaluationLink: evaluationLink || '',
          interviewerName: interviewer.userName,
        });

        // Generate QR code for evaluation link
        let qrCodeDataUrl = '';
        if (evaluationLink) {
          try {
            qrCodeDataUrl = await QRCode.toDataURL(evaluationLink, {
              width: 200,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
          } catch (qrError) {
            console.error('[SendInvitation] Failed to generate QR code:', qrError);
          }
        }

        // Prepare QR code image HTML for template variable
        const qrCodeImageHtml = qrCodeDataUrl
          ? `<img src="${qrCodeDataUrl}" alt="QR Code" style="display: block; margin: 10px auto; max-width: 200px; border: 2px solid #ddd; border-radius: 8px; padding: 10px; background: white;" />`
          : '';

        // Replace template variables including QR code
        const enhancedEmailBody = replaceTemplateVariables(emailTemplate, {
          candidateName: candidate.name,
          positionTitle: position.title,
          interviewDate: interviewDateFormatted,
          interviewTime: interviewTimeFormatted,
          interviewLocation: location || 'TBD',
          evaluationLink: evaluationLink || '',
          evaluationQrcodeImage: qrCodeImageHtml,
          interviewerName: interviewer.userName,
        });

        // Create calendar attachment
        const attachment: EmailAttachment = {
          filename: 'interview.ics',
          content: calendarContent,
          contentType: 'text/calendar; charset=utf-8',
        };

        // Send email
        const emailResult = await sendEmail(
          interviewer.userEmail,
          emailSubject,
          enhancedEmailBody,
          [attachment]
        );

        if (emailResult.success) {
          results.push({
            interviewerId: interviewer.userId,
            interviewerName: interviewer.userName,
            interviewerEmail: interviewer.userEmail,
            success: true,
          });

          // Automatically create calendar event in Outlook (if Graph API is configured)
          try {
            const calendarResult = await createCalendarEvent({
              attendeeEmail: interviewer.userEmail,
              subject: `Interview: ${candidate.name} - ${position.title}`,
              body: `<p>${notes || `Interview with ${candidate.name} for position ${position.title}.`}</p>${evaluationLink ? `<p><strong>Evaluation Link:</strong> <a href="${evaluationLink}">${evaluationLink}</a></p>` : ''}`,
              startDateTime: interviewDateTime,
              endDateTime: endDateTime,
              location: location || '',
              organizerName: organizer.name,
              organizerEmail: organizer.email,
            });

            if (calendarResult.success) {
              // console.log(`[SendInvitation] Calendar event created for ${interviewer.userEmail}`);
            } else {
              console.warn(`[SendInvitation] Failed to create calendar event: ${calendarResult.error}`);
            }
          } catch (calError) {
            // Don't fail the whole process if calendar creation fails
            console.error(`[SendInvitation] Error creating calendar event:`, calError);
          }

          // Log audit
          await logAudit(
            'AUDIT',
            `Interview invitation sent to ${interviewer.userName} (${interviewer.userEmail}) for candidate ${candidate.name} by ${session.user.name || session.user.email}`,
            'API:Candidates:SendInterviewInvitation',
            session.user.id,
            {
              candidateId,
              interviewerId: interviewer.userId,
              interviewDate: interviewDateTime.toISOString(),
              interviewTime,
              duration,
              location,
            }
          );
        } else {
          errors.push({
            interviewerId: interviewer.userId,
            interviewerName: interviewer.userName,
            interviewerEmail: interviewer.userEmail,
            error: emailResult.error || 'Unknown error',
          });
        }
      } catch (error: any) {
        errors.push({
          interviewerId: interviewer.userId,
          interviewerName: interviewer.userName,
          interviewerEmail: interviewer.userEmail,
          error: error.message || 'Unknown error',
        });
      }
    }

    // Book the meeting room if a location email is provided
    if (locationEmail) {
      try {
        const roomBookingResult = await createCalendarEvent({
          attendeeEmail: locationEmail,
          subject: `Interview: ${candidate.name} - ${position.title}`,
          body: `<p>Interview with ${candidate.name} for position ${position.title}.</p><p><strong>Interviewer(s):</strong> ${interviewers.map(i => i.userName).join(', ')}</p>`,
          startDateTime: interviewDateTime,
          endDateTime: endDateTime,
          location: location || '',
          organizerName: organizer.name,
          organizerEmail: organizer.email,
        });

        if (roomBookingResult.success) {
          // console.log(`[SendInvitation] Room booked successfully: ${locationEmail}`);
        } else {
          console.warn(`[SendInvitation] Failed to book room ${locationEmail}: ${roomBookingResult.error}`);
          // We do not fail the whole process if room booking fails, but we log it.
          // You might want to notify the recruiter or add it to "errors" or warnings.
        }
      } catch (roomError) {
        console.error(`[SendInvitation] Error booking room ${locationEmail}:`, roomError);
      }
    }

    await client.query('COMMIT');

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(
        {
          message: 'Failed to send all invitations',
          results,
          errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message:
        errors.length > 0
          ? `Sent ${results.length} invitation(s), ${errors.length} failed`
          : `Successfully sent ${results.length} invitation(s)`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => { });
    console.error('[Send Interview Invitation] Error:', error);
    await logAudit(
      'ERROR',
      `Failed to send interview invitations for candidate ${candidateId} by ${session.user.name || session.user.email}. Error: ${error.message}`,
      'API:Candidates:SendInterviewInvitation',
      session.user.id,
      { candidateId, error: error.message }
    );
    return NextResponse.json(
      {
        message: 'Error sending interview invitations',
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
