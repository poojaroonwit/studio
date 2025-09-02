import { NextRequest } from 'next/server';

export interface SimpleErrorResponse {
  error: string;
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
}

export interface SimpleSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
}

/**
 * Simple error handler - focused on essential error handling
 */
export class SimpleErrorHandler {
  /**
   * Create error response
   */
  static createErrorResponse(
    req: NextRequest,
    error: Error | string,
    statusCode: number = 500
  ): Response {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    const errorResponse: SimpleErrorResponse = {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      path: req.nextUrl?.pathname || req.url,
      method: req.method,
      statusCode,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  /**
   * Create success response
   */
  static createSuccessResponse<T>(
    req: NextRequest,
    data: T,
    statusCode: number = 200
  ): Response {
    const successResponse: SimpleSuccessResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      path: req.nextUrl?.pathname || req.url,
      method: req.method,
      statusCode,
    };

    return new Response(JSON.stringify(successResponse), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  /**
   * Handle API errors with common error types
   */
  static handleApiError(req: NextRequest, error: unknown): Response {
    if (error instanceof Error) {
      // Handle common error types
      if (error.name === 'ValidationError') {
        return this.createErrorResponse(req, 'Validation Error', 400);
      }
      
      if (error.name === 'UnauthorizedError') {
        return this.createErrorResponse(req, 'Unauthorized', 401);
      }
      
      if (error.name === 'ForbiddenError') {
        return this.createErrorResponse(req, 'Forbidden', 403);
      }
      
      if (error.name === 'NotFoundError') {
        return this.createErrorResponse(req, 'Not Found', 404);
      }
      
      if (error.name === 'ConflictError') {
        return this.createErrorResponse(req, 'Conflict', 409);
      }

      // Default error handling
      return this.createErrorResponse(req, error, 500);
    }

    // Handle unknown errors
    const errorMessage = typeof error === 'string' ? error : 'An unexpected error occurred';
    return this.createErrorResponse(req, errorMessage, 500);
  }
}

// Convenience functions for common error types
export const createValidationError = (message: string = 'Validation Error') => 
  new Error(message);

export const createUnauthorizedError = (message: string = 'Unauthorized') => {
  const error = new Error(message);
  error.name = 'UnauthorizedError';
  return error;
};

export const createForbiddenError = (message: string = 'Forbidden') => {
  const error = new Error(message);
  error.name = 'ForbiddenError';
  return error;
};

export const createNotFoundError = (message: string = 'Not Found') => {
  const error = new Error(message);
  error.name = 'NotFoundError';
  return error;
};

export const createConflictError = (message: string = 'Conflict') => {
  const error = new Error(message);
  error.name = 'ConflictError';
  return error;
};
