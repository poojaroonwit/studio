import { NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { normalizePayloadTypes } from '@/lib/apiUtils';
import { candidateInfoSchema, structuredEducationSchema, structuredExperienceSchema } from '../schemas';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createValidationError 
} from '@/lib/apiErrorHandler';

const createCandidateSchema = z.object({
  candidate_info: candidateInfoSchema.optional(),
  educationData: z.array(structuredEducationSchema).optional(),
  experienceData: z.array(structuredExperienceSchema).optional(),
}).strict();

// Helper function to recursively normalize boolean strings and numeric strings
function normalizeDataTypes(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(normalizeDataTypes);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = normalizeDataTypes(value);
    }
    return result;
  }
  if (typeof obj === 'string') {
    const lower = obj.toLowerCase();
    // Handle boolean strings
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    
    // Handle numeric strings for common fields
    const numericFields = ['startMonth', 'startYear', 'endMonth', 'endYear', 'gpa'];
    if (numericFields.some(field => obj.includes(field) || obj.match(/^\d+$/))) {
      const num = parseInt(obj);
      if (!isNaN(num)) return num;
    }
  }
  return obj;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(request, createUnauthorizedError('Authentication required'));
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return handleApiError(request, createValidationError('Invalid JSON body'));
  }

  // Log original body
  
  
  // Apply normalization
  const normalizedBody = normalizePayloadTypes(body);
  const finalBody = normalizeDataTypes(normalizedBody);
  
  

  // Test validation
  const validationResult = createCandidateSchema.safeParse(finalBody);
  
  if (!validationResult.success) {
    console.error('Validation errors:', JSON.stringify(validationResult.error.flatten(), null, 2));
    return handleApiError(request, createValidationError('Validation failed', {
      errors: validationResult.error.flatten().fieldErrors,
      originalBody: body,
      normalizedBody: finalBody
    }));
  }

  return createSuccessResponse(request, {
    message: 'Validation successful',
    data: {
      originalBody: body,
      normalizedBody: finalBody,
      validatedData: validationResult.data
    }
  }, 200);
} 