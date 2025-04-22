import type { NextApiRequest, NextApiResponse } from 'next';
import { PlayerService } from '@/services/player';
import { AuthService } from '@/services/api/authService';
import { sendSuccess, sendError, sendValidationError, sendMethodNotAllowed } from '@/services/api/apiResponse';

// Initialize the player service
const playerService = new PlayerService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Authenticate the request (commented out for development)
  // const user = await AuthService.requireAuth(req, res);
  // if (!user) return; // Response is already sent by requireAuth
  
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  try {
    const { playerId, tournamentId, buyIn, ctp, skins, notes } = req.body;

    if (!playerId || !tournamentId) {
      return sendValidationError(res, 'Player ID and Tournament ID are required');
    }

    // Log the incoming request for debugging
    console.log('Payment status update request:', { 
      playerId, 
      tournamentId, 
      buyIn: !!buyIn, 
      ctp: !!ctp, 
      skins: !!skins 
    });

    // Update payment status using the service
    const payments = await playerService.updatePaymentStatus(
      playerId,
      tournamentId,
      {
        buyIn: !!buyIn,
        ctp: !!ctp,
        skins: !!skins,
        notes
      }
    );
    
    return sendSuccess(res, { 
      success: true,
      payments 
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return sendError(res, 'Failed to update payment status');
  }
}