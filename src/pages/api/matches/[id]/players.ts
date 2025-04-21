import type { NextApiRequest, NextApiResponse } from 'next';
import { MatchService } from '@/services/match/matchService';
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
      const players = await matchService.getMatchPlayers(id);
      
      if (!players) {
        return sendNotFound(res, 'Match or players not found');
      }
      
      return sendSuccess(res, players, 200);
    } 
    else {
      return sendMethodNotAllowed(res, ['GET']);
    }
  } catch (error) {
    console.error('Error handling match players:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return sendError(res, message, 500);
  }
}