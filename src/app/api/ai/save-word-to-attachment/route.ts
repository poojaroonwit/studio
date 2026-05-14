import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { v4 as uuidv4 } from 'uuid';
import { hasAnyPermission, canEditApplicant } from '@/lib/permissions';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Initial permission check - we'll do detailed ownership check after retrieving Applicant data
  const hasGlobalEditPermission = hasAnyPermission(session.user, ['applicantS_EDIT_BASIC', 'applicantS_EDIT_SENSITIVE']);
  const hasOwnEditPermission = hasAnyPermission(session.user, ['applicantS_EDIT_BASIC_OWN', 'applicantS_EDIT_SENSITIVE_OWN']);
  
  if (!hasGlobalEditPermission && !hasOwnEditPermission) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage Applicant attachments' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const targetApplicantId = body.applicantId;
    const content = body.content;
    const fileName = body.fileName;
    const promptName = body.promptName;

    if (!targetApplicantId || !content) {
      return NextResponse.json({ error: 'Missing required fields: applicantId and content' }, { status: 400 });
    }

    // Validate Applicant exists and get recruiter info for ownership check
    const applicant = await prisma.applicant.findUnique({
      where: { id: targetApplicantId },
      select: { id: true, name: true, recruiterId: true }
    });

    if (!applicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }
    
    // Check ownership-based permissions for attachment management
    if (!hasGlobalEditPermission) {
      const editPermission = canEditApplicant(session.user, applicant.recruiterId, session.user.id);
      if (!editPermission.canEdit) {
        return NextResponse.json({ error: `Forbidden: ${editPermission.reason}` }, { status: 403 });
      }
    }

    // Generate Word document content
    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${fileName || 'Generated Content'}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>90</w:Zoom>
            <w:DoNotPromptForConvert/>
            <w:DoNotShowRevisions/>
            <w:DoNotPrintRevisions/>
            <w:DisplayHorizontalDrawingGridEvery>0</w:DisplayHorizontalDrawingGridEvery>
            <w:DisplayVerticalDrawingGridEvery>2</w:DisplayVerticalDrawingGridEvery>
            <w:UseMarginsForDrawingGridOrigin/>
            <w:ValidateAgainstSchemas/>
            <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
            <w:IgnoreMixedContent>false</w:IgnoreMixedContent>
            <w:AlwaysShowPlaceholderText>false</w:AlwaysShowPlaceholderText>
            <w:Compatibility>
              <w:BreakWrappedTables/>
              <w:SnapToGridInCell/>
              <w:WrapTextWithPunct/>
              <w:UseAsianBreakRules/>
              <w:DontGrowAutofit/>
            </w:Compatibility>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'IBM Plex Sans Thai', 'Inter', Arial, Helvetica, sans-serif; line-height: 1.6; font-size: 11pt; }
          h1, h2, h3 { color: #333; font-weight: 600; }
          h1 { font-size: 18pt; margin: 20px 0 10px 0; }
          h2 { font-size: 16pt; margin: 18px 0 8px 0; }
          h3 { font-size: 14pt; margin: 16px 0 6px 0; }
          ul, ol { margin: 10px 0; padding-left: 20px; }
          li { margin: 5px 0; }
          p { margin: 10px 0; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 10pt; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: 600; }
          blockquote { border-left: 4px solid #ddd; margin: 10px 0; padding-left: 20px; font-style: italic; }
          code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; }
          strong { font-weight: 600; }
          em { font-style: italic; }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFileName = fileName || `AI-Generated-${promptName || 'Content'}-${timestamp}.doc`;
    const objectName = `attachments/${targetApplicantId}/${uuidv4()}.doc`;

    // Upload to MinIO
    const buffer = Buffer.from(wordContent, 'utf-8');
    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      buffer,
      undefined,
      { 'Content-Type': 'application/msword' }
    );

    // Check if this is the first attachment
    const count = await prisma.attachment.count({ where: { applicantId: targetApplicantId } });
    const isPrimary = count === 0;

    // Store in DB
    const newAttachment = await prisma.attachment.create({
      data: {
        applicantId: targetApplicantId,
        uploadedById: session.user.id,
        filePath: objectName,
        fileName: finalFileName,
        isPrimary,
        label: 'ai-generated',
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...newAttachment,
        url: await (await import('@/lib/fileUrls')).buildServerFileUrl(objectName, { strategy: 'stream' })
      },
      message: 'Word document saved to Applicant attachments successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error saving Word document to attachment:', error);
    return NextResponse.json({ 
      error: 'Failed to save Word document to attachment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

