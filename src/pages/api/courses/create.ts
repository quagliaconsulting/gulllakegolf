import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/utils/auth';
import { CourseService } from '@/services/course/courseService';
import { TournamentService } from '@/services/tournament/tournamentService';
import { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendMethodNotAllowed,
  sendAuthError
} from '@/services/api/apiResponse';

const courseService = new CourseService();
const tournamentService = new TournamentService();

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
    
    if (req.method === 'POST') {
      const { name, tournamentId, holes } = req.body;
      
      // Validate required fields
      if (!name || !tournamentId || !holes || !Array.isArray(holes)) {
        return sendError(res, 'Name, tournament ID, and hole information are required', 400);
      }
      
      // Check if tournament exists
      const tournament = await tournamentService.getTournamentById(tournamentId, false);
      
      if (!tournament) {
        return sendNotFound(res, 'Tournament not found');
      }
      
      // Create course with holes and safe number parsing
      const course = await courseService.createCourse({
        name,
        tournament: {
          connect: { id: tournamentId }
        },
        holes
      });
      
      return sendSuccess(res, course, 201);
    }
    
    // Method not allowed
    return sendMethodNotAllowed(res, ['POST']);
  } catch (error) {
    console.error('API error:', error);
    return sendError(res, 'Internal server error', 500, {
      details: error instanceof Error ? error.message : String(error)
    });
  }
}