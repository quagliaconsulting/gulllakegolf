import type { NextApiRequest, NextApiResponse } from 'next';
import { PlayerService } from '@/services/player';
import { AuthService } from '@/services/api/authService';
import { sendSuccess, sendError, sendNotFound, sendMethodNotAllowed } from '@/services/api/apiResponse';

// Initialize the player service
const playerService = new PlayerService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return sendError(res, 'Invalid player ID', 400);
  }
  
  // Authenticate the request (commented out for development)
  // const user = await AuthService.requireAuth(req, res);
  // if (!user) return; // Response is already sent by requireAuth
  
  // Handle different HTTP methods
  if (req.method === 'GET') {
    try {
      const player = await playerService.getPlayerById(id);
      
      if (!player) {
        return sendNotFound(res, 'Player not found');
      }
      
      sendSuccess(res, { player });
    } catch (error) {
      console.error('Error fetching player:', error);
      sendError(res, 'Failed to fetch player');
    }
  } else if (req.method === 'PUT') {
    try {
      const updateData = req.body;
      
      const player = await playerService.updatePlayer(id, {
        name: updateData.name,
        handicapIndex: parseFloat(updateData.handicapIndex),
        teamId: updateData.teamId,
        accommodationId: updateData.accommodationId
      });
      
      sendSuccess(res, { player });
    } catch (error) {
      console.error('Error updating player:', error);
      sendError(res, 'Failed to update player');
    }
  } else if (req.method === 'DELETE') {
    try {
      await playerService.deletePlayer(id);
      
      sendSuccess(res, { message: 'Player deleted successfully' });
    } catch (error) {
      console.error('Error deleting player:', error);
      sendError(res, 'Failed to delete player');
    }
  } else {
    sendMethodNotAllowed(res, ['GET', 'PUT', 'DELETE']);
  }
}