import type { NextApiRequest, NextApiResponse } from 'next';
import { PlayerService } from '@/services/player';
import { AuthService } from '@/services/api/authService';
import { sendSuccess, sendError, sendMethodNotAllowed } from '@/services/api/apiResponse';

// Initialize the player service
const playerService = new PlayerService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Authenticate the request (commented out for development)
  // const user = await AuthService.requireAuth(req, res);
  // if (!user) return; // Response is already sent by requireAuth
  
  if (req.method === 'GET') {
    try {
      console.log("API: Fetching all players with enhanced service method");
      
      // Set no-cache headers to ensure fresh data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      const players = await playerService.getAllPlayers(true, true);
      
      // Log the results for debugging
      console.log(`API: Retrieved ${players.length} players`);
      console.log(`API: Players with team data: ${players.filter(p => p.team).length}`);
      
      sendSuccess(res, { players });
    } catch (error) {
      console.error('Error fetching players:', error);
      sendError(res, 'Failed to fetch players');
    }
  } else if (req.method === 'POST') {
    try {
      const { name, handicapIndex, teamId, accommodationId } = req.body;
      
      const player = await playerService.createPlayer({
        name,
        handicapIndex: parseFloat(handicapIndex),
        teamId,
        accommodationId
      });
      
      sendSuccess(res, { player }, 201);
    } catch (error) {
      console.error('Error creating player:', error);
      sendError(res, 'Failed to create player');
    }
  } else {
    sendMethodNotAllowed(res, ['GET', 'POST']);
  }
}