import type { NextApiResponse } from 'next';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  statusCode: number;
};

/**
 * Standard success response
 */
export function sendSuccess<T>(res: NextApiResponse, data: T, statusCode: number = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    statusCode
  });
}

/**
 * Standard error response
 */
export function sendError(
  res: NextApiResponse, 
  message: string, 
  statusCode: number = 500, 
  details?: any
): void {
  res.status(statusCode).json({
    success: false,
    error: message,
    details,
    statusCode
  });
}

/**
 * Not found error
 */
export function sendNotFound(
  res: NextApiResponse,
  message: string = 'Resource not found'
): void {
  sendError(res, message, 404);
}

/**
 * Validation error
 */
export function sendValidationError(
  res: NextApiResponse,
  message: string = 'Validation failed',
  details?: any
): void {
  sendError(res, message, 400, details);
}

/**
 * Authentication error
 */
export function sendAuthError(
  res: NextApiResponse,
  message: string = 'Authentication required'
): void {
  sendError(res, message, 401);
}

/**
 * Method not allowed error
 */
export function sendMethodNotAllowed(
  res: NextApiResponse,
  allowedMethods: string[]
): void {
  res.setHeader('Allow', allowedMethods);
  sendError(res, `Method not allowed. Use one of: ${allowedMethods.join(', ')}`, 405);
}