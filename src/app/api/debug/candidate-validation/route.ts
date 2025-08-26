import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Import the same schema used in the main candidate update route
const updateCandidateSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.union([z.string().email(), z.literal(''), z.literal(null)]).optional(),
  phone: z.string().optional().nullable(),
  positionId: z.string().uuid().nullable().optional(),
  recruiterId: z.string().uuid().nullable().optional(),
  fitScore: z.number().min(0).max(1).nullable().optional(),
  status: z.string().optional().nullable(),
  assignmentJustification: z.array(z.string()).optional(),
  parsedData: z.record(z.any()).optional().nullable(),
  custom_attributes: z.record(z.any()).optional().nullable(),
  resumePath: z.string().optional().nullable(),
  transitionNotes: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  sourceId: z.string().uuid().nullable().optional(),
  subSource: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin permissions
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Validate the data
    const validationResult = updateCandidateSchema.safeParse(body);
    
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const formErrors = validationResult.error.flatten().formErrors;
      
      return NextResponse.json({
        valid: false,
        message: 'Validation failed',
        errors: fieldErrors,
        formErrors: formErrors,
        details: validationResult.error.errors,
        receivedData: body
      }, { status: 400 });
    }

    // Additional custom validations
    const { name, email, status, positionId, recruiterId, sourceId } = validationResult.data;
    const customErrors: Record<string, string[]> = {};

    // Helper to check UUID
    function isValidUUID(val: string) {
      return typeof val === 'string' && /^[0-9a-fA-F-]{36}$/.test(val);
    }

    // Custom validations
    if (status !== undefined && status !== null && (!status || typeof status !== 'string' || status.trim() === '')) {
      customErrors.status = ['Status must be a non-empty string if provided'];
    }
    
    if (name !== undefined && (!name || typeof name !== 'string' || name.trim() === '')) {
      customErrors.name = ['Name is required and must be a non-empty string'];
    }
    
    if (email !== undefined && (!email || typeof email !== 'string' || email.trim() === '')) {
      customErrors.email = ['Email is required and must be a non-empty string'];
    }
    
    if (positionId !== undefined && positionId !== null && !isValidUUID(positionId)) {
      customErrors.positionId = ['Position ID must be a valid UUID format'];
    }
    
    if (recruiterId !== undefined && recruiterId !== null && !isValidUUID(recruiterId)) {
      customErrors.recruiterId = ['Recruiter ID must be a valid UUID format'];
    }
    
    if (sourceId !== undefined && sourceId !== null && !isValidUUID(sourceId)) {
      customErrors.sourceId = ['Source ID must be a valid UUID format'];
    }

    if (Object.keys(customErrors).length > 0) {
      return NextResponse.json({
        valid: false,
        message: 'Custom validation failed',
        errors: customErrors,
        receivedData: body
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      message: 'Data is valid',
      receivedData: body,
      validatedData: validationResult.data
    });

  } catch (error) {
    console.error('Error in candidate validation debug endpoint:', error);
    return NextResponse.json({
      valid: false,
      message: 'Error processing request',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
