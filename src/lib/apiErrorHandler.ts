// DEPRECATED: This complex error handler has been replaced with simplified modules
// Use the new SimpleErrorHandler instead:
// import { SimpleErrorHandler } from '@/lib/errors';
//
// Migration guide:
// 1. Replace createErrorResponse with SimpleErrorHandler.createErrorResponse
// 2. Replace createSuccessResponse with SimpleErrorHandler.createSuccessResponse
// 3. Replace handleApiError with SimpleErrorHandler.handleApiError
// 4. Import from '@/lib/errors' instead of this file

import { NextRequest } from 'next/server';
import { handleCors } from './cors';

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: any;
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  requestId?: string;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  requestId?: string;
}

export class ApiError extends Error {
  public statusCode: number;
  public details?: any;
  public requestId?: string;

  constructor(message: string, statusCode: number = 500, details?: any, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.requestId = requestId;
  }
}

export function createErrorResponse(
  req: NextRequest,
  error: Error | ApiError | string,
  statusCode: number = 500,
  details?: any
): Response {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorDetails = details || (error instanceof ApiError ? error.details : undefined);
  const requestId = error instanceof ApiError ? error.requestId : undefined;

  const errorResponse: ApiErrorResponse = {
    error: errorMessage,
    timestamp: new Date().toISOString(),
    path: req.nextUrl?.pathname || req.url,
    method: req.method,
    statusCode,
    requestId,
  };

  if (errorDetails) {
    errorResponse.details = errorDetails;
  }

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      ...handleCors(req),
      'Content-Type': 'application/json',
    },
  });
}

export function createSuccessResponse<T>(
  req: NextRequest,
  data: T,
  statusCode: number = 200,
  requestId?: string
): Response {
  const successResponse: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    path: req.nextUrl?.pathname || req.url,
    method: req.method,
    statusCode,
    requestId,
  };

  return new Response(JSON.stringify(successResponse), {
    status: statusCode,
    headers: {
      ...handleCors(req),
      'Content-Type': 'application/json',
    },
  });
}

export function handleApiError(req: NextRequest, error: unknown): Response {
  if (error instanceof ApiError) {
    return createErrorResponse(req, error, error.statusCode, error.details);
  }

  if (error instanceof Error) {
    // Handle common error types
    if (error.name === 'ValidationError') {
      return createErrorResponse(req, 'Validation Error', 400, { validationErrors: error.message });
    }
    
    if (error.name === 'UnauthorizedError') {
      return createErrorResponse(req, 'Unauthorized', 401);
    }
    
    if (error.name === 'ForbiddenError') {
      return createErrorResponse(req, 'Forbidden', 403);
    }
    
    if (error.name === 'NotFoundError') {
      return createErrorResponse(req, 'Not Found', 404);
    }
    
    if (error.name === 'ConflictError') {
      return createErrorResponse(req, 'Conflict', 409);
    }

    // Default error handling
    return createErrorResponse(req, error, 500);
  }

  // Handle unknown errors
  const errorMessage = typeof error === 'string' ? error : 'An unexpected error occurred';
  return createErrorResponse(req, errorMessage, 500);
}

// Helper functions for common error scenarios
export function createValidationError(message: string, details?: any): ApiError {
  return new ApiError(message, 400, details);
}

export function createUnauthorizedError(message: string = 'Unauthorized'): ApiError {
  return new ApiError(message, 401);
}

export function createForbiddenError(message: string = 'Forbidden'): ApiError {
  return new ApiError(message, 403);
}

export function createNotFoundError(message: string = 'Not Found'): ApiError {
  return new ApiError(message, 404);
}

export function createConflictError(message: string = 'Conflict'): ApiError {
  return new ApiError(message, 409);
}

export function createInternalServerError(message: string = 'Internal Server Error', details?: any): ApiError {
  return new ApiError(message, 500, details);
} 
