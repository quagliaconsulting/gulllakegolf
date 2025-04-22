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
  
  if (req.method !== 'GET') {
    return sendMethodNotAllowed(res, ['GET']);
  }

  try {
    const { playerId, tournamentId } = req.query;

    if (!playerId || !tournamentId || typeof playerId !== 'string' || typeof tournamentId !== 'string') {
      return sendValidationError(res, 'Player ID and Tournament ID are required');
    }

    console.log(`Checking payment status for player ${playerId} in tournament ${tournamentId}`);

    // Get payment status from the service
    const paymentStatus = await playerService.getPaymentStatus(playerId, tournamentId);
    
    // Ensure all payment types have a value
    const fullPaymentStatus = {
      BUY_IN: false,
      CTP_ENTRY: false,
      SKINS_ENTRY: false,
      PRIZE_PAYOUT: false,
      CTP_PAYOUT: false,
      SKINS_PAYOUT: false,
      OTHER: false,
      ...paymentStatus
    };

    console.log('Payment status:', fullPaymentStatus);

    return sendSuccess(res, { 
      playerId,
      tournamentId,
      paymentStatus: fullPaymentStatus
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return sendError(res, 'Failed to check payment status');
  }
}