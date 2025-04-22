import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/utils/auth';
import { TournamentService } from '@/services/tournament/tournamentService';
import { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendMethodNotAllowed,
  sendAuthError
} from '@/services/api/apiResponse';

const tournamentService = new TournamentService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
    
    const tournamentId = req.query.id as string;
  
    if (!tournamentId) {
      return sendError(res, 'Tournament ID is required', 400);
    }
  
    // Check if tournament exists
    const tournament = await tournamentService.getTournamentById(tournamentId, false);
  
    if (!tournament) {
      return sendNotFound(res, 'Tournament not found');
    }

    // GET method for retrieving leaderboard
    if (req.method === 'GET') {
      try {
        const leaderboardData = await tournamentService.getTournamentLeaderboard(tournamentId);
        
        if (!leaderboardData) {
          // Return empty leaderboard if not available
          return sendSuccess(res, { 
            teamStandings: [],
            playerStandings: []
          });
        }
        
        return sendSuccess(res, leaderboardData);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return sendError(res, 'Failed to fetch leaderboard data');
      }
    }
    else {
      return sendMethodNotAllowed(res, ['GET']);
    }
  } catch (error) {
    console.error('Error in leaderboard API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return sendError(res, 'Internal server error', 500, {
      details: errorMessage,
      type: typeof error,
      location: 'Main API handler'
    });
  }
}