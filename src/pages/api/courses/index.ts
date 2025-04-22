import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/utils/auth';
import { CourseService } from '@/services/course/courseService';
import { 
  sendSuccess, 
  sendError, 
  sendMethodNotAllowed,
  sendAuthError
} from '@/services/api/apiResponse';

const courseService = new CourseService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify JWT token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : req.cookies?.token;

  if (!token) {
    return sendAuthError(res, 'Authentication required');
  }

  try {
    // Verify token with better error handling
    if (!verifyToken(token, res)) {
      return; // Response already sent by verifyToken
    }
    
    if (req.method === 'GET') {
      // Get all courses
      const courses = await courseService.getAllCourses();
      // Wrap courses in a "courses" property for backward compatibility
      return sendSuccess(res, { courses });
    } else if (req.method === 'POST') {
      // Create a new course
      const { name, tournamentId, holes } = req.body;

      if (!name || !tournamentId) {
        return sendError(res, 'Name and tournament ID are required', 400);
      }

      try {
        // Create course with optional holes and safe number parsing
        const course = await courseService.createCourse({
          name,
          tournament: {
            connect: { id: tournamentId }
          },
          holes: holes && Array.isArray(holes) ? holes : undefined
        });
        
        return sendSuccess(res, course, 201);
      } catch (error) {
        console.error('Error creating course:', error);
        return sendError(res, 'Failed to create course', 500, {
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // For other methods, return 405 Method Not Allowed
    return sendMethodNotAllowed(res, ['GET', 'POST']);
  } catch (error) {
    console.error('API error:', error);
    return sendError(res, 'Internal server error', 500, {
      details: error instanceof Error ? error.message : String(error)
    });
  }
}