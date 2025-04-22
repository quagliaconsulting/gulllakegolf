import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/utils/auth';
import { CourseService } from '@/services/course/courseService';
import { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendMethodNotAllowed,
  sendAuthError
} from '@/services/api/apiResponse';

const courseService = new CourseService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return sendError(res, 'Invalid course ID', 400);
  }

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
      // Get course by ID
      const course = await courseService.getCourseById(id);
      
      if (!course) {
        return sendNotFound(res, 'Course not found');
      }
      
      return sendSuccess(res, course);
    } else if (req.method === 'PUT') {
      try {
        // Debug the incoming data
        console.log('PUT Request data:', JSON.stringify(req.body, null, 2));
        
        // Update course
        const { name, tournamentId, holes } = req.body;
        
        // Validate required fields
        if (!name) {
          return sendError(res, 'Course name is required', 400);
        }
        
        console.log('Looking up existing course with ID:', id);
        // Check if course exists
        const existingCourse = await courseService.getCourseById(id);
        
        if (!existingCourse) {
          return sendNotFound(res, 'Course not found');
        }
        
        console.log('Existing course found:', existingCourse.name);
        console.log('Preparing update with tournament ID:', tournamentId || existingCourse.tournamentId);
        
        // Prepare update data
        const updateData = {
          name,
          tournamentId: tournamentId || existingCourse.tournamentId,
          holes: holes && Array.isArray(holes) ? holes : undefined
        };
        
        console.log('Calling updateCourse with data:', JSON.stringify(updateData, null, 2));
        
        // Update course with safe number parsing
        const updatedCourse = await courseService.updateCourse(id, updateData);
        
        console.log('Update successful');
        return sendSuccess(res, updatedCourse);
      } catch (updateError) {
        console.error('Error updating course:', updateError);
        
        // Handle Prisma specific errors
        if (updateError && (updateError as any).code === 'P2003') {
          // Foreign key constraint violation
          return sendError(res, 'Cannot update course because it has related match data. Please delete the related matches first or contact an administrator.', 409, {
            code: (updateError as any).code,
            foreignKey: (updateError as any).meta?.field_name
          });
        }
        
        // Handle other errors
        return sendError(res, 'Failed to update course', 500, {
          message: updateError instanceof Error ? updateError.message : String(updateError),
          code: (updateError as any).code,
          meta: (updateError as any).meta
        });
      }
    } else if (req.method === 'DELETE') {
      // Check if course exists
      const existingCourse = await courseService.getCourseById(id);
      
      if (!existingCourse) {
        return sendNotFound(res, 'Course not found');
      }
      
      // Delete the course and related holes
      await courseService.deleteCourse(id);
      
      return sendSuccess(res, { message: 'Course deleted successfully' });
    }
    
    // For other methods, return 405 Method Not Allowed
    return sendMethodNotAllowed(res, ['GET', 'PUT', 'DELETE']);
  } catch (error) {
    console.error('API error:', error);
    return sendError(res, 'Internal server error', 500, { 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}