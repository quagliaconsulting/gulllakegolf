import type { NextApiRequest, NextApiResponse } from 'next';
import { MatchService, HoleScoreUpdate } from '@/services/match/matchService';
import { AuthService } from '@/services/api/authService';
import { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendValidationError, 
  sendMethodNotAllowed 
} from '@/services/api/apiResponse';

const matchService = new MatchService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return sendValidationError(res, 'Invalid match ID');
  }
  
  // Authenticate request - currently commented out until auth is fully migrated
  // const auth = AuthService.authenticate(req, res);
  // if (!auth) return; // Response already sent by authenticate method
  
  try {
    if (req.method === 'GET') {
      const match = await matchService.getMatchWithScores(id);
      
      if (!match) {
        return sendNotFound(res, 'Match not found');
      }
      
      return sendSuccess(res, { match }, 200);
    } 
    else if (req.method === 'POST') {
      const { holeResults } = req.body;
      
      if (!Array.isArray(holeResults) || holeResults.length === 0) {
        return sendValidationError(res, 'Invalid hole data format');
      }
      
      const result = await matchService.updateMatchScores(id, holeResults as HoleScoreUpdate[]);
      return sendSuccess(res, result, 200);
    } 
    else {
      return sendMethodNotAllowed(res, ['GET', 'POST']);
    }
  } catch (error) {
    console.error('Error handling match scores:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return sendError(res, message, 500);
  }
}