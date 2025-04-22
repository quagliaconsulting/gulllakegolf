import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/utils/auth';
import { sendSuccess, sendError, sendMethodNotAllowed, sendAuthError } from '@/services/api/apiResponse';

/**
 * GET /api/tournaments/[id]/money
 * Returns all financial data for a tournament, including players, CTP, and skins
 */
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
    // Verify token
    if (!verifyToken(token, res)) {
      return; // Response already sent by verifyToken
    }
    
    const tournamentId = req.query.id as string;
  
    if (!tournamentId) {
      return sendError(res, 'Tournament ID is required', 400);
    }
  
    // GET method for retrieving financial data
    if (req.method === 'GET') {
      try {
        // Get tournament with players
        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId },
          include: {
            teams: {
              include: {
                players: true,
              },
            },
          },
        });

        if (!tournament) {
          return sendError(res, 'Tournament not found', 404);
        }

        // Get all players from all teams with proper team references
        // This ensures each player has a complete team reference with isHomeTeam status
        // which is needed for the financial components to display team data correctly
        const allPlayers = tournament.teams.flatMap(
          (team) => (team.players || []).map(player => {
            // Check if metadata exists and contains isHomeTeam
            let isHomeTeam = false;
            if (team.metadata) {
              try {
                // Handle both object and string metadata
                const metadata = typeof team.metadata === 'string' 
                  ? JSON.parse(team.metadata) 
                  : team.metadata;
                
                isHomeTeam = !!(metadata && metadata.isHomeTeam);
              } catch (e) {
                console.log('Error parsing team metadata:', e);
              }
            }
            
            return {
              ...player,
              team: {
                id: team.id,
                name: team.name,
                metadata: team.metadata,
                isHomeTeam
              }
            };
          })
        );

        // Count par 3 holes for CTP
        const courses = await prisma.course.findMany({
          where: { tournamentId },
          include: {
            holes: {
              where: { isPar3: true },
            },
          },
        });

        const par3Count = courses.reduce(
          (total, course) => total + course.holes.length,
          0
        );
        
        // Get player payment status
        const playerPayments = await prisma.playerPayment.findMany({
          where: { tournamentId },
        });

        // Format payments as a map of playerId to payment types
        const paymentsByPlayer = playerPayments.reduce((acc, payment) => {
          if (!acc[payment.playerId]) {
            acc[payment.playerId] = {};
          }
          acc[payment.playerId][payment.type] = payment.status === 'PAID';
          return acc;
        }, {} as Record<string, Record<string, boolean>>);

        // Count CTP and Skins participants
        const ctpParticipants = Object.values(paymentsByPlayer).filter(
          (payments) => payments.CTP_ENTRY === true
        ).length;

        const skinsParticipants = Object.values(paymentsByPlayer).filter(
          (payments) => payments.SKINS_ENTRY === true
        ).length;

        // Get CTP results
        const ctpResults = await prisma.cTPResult.findMany({
          where: { tournamentId },
          include: {
            player: true,
            hole: true,
          },
        });

        // Get Skins results with match format information
        const skinsResults = await prisma.skinsResult.findMany({
          where: { tournamentId },
          include: {
            player: true,
            match: {
              include: {
                format: true
              }
            }
          },
          orderBy: [
            { holeNumber: 'asc' }
          ]
        });

        // Return formatted response
        return sendSuccess(res, {
          tournament,
          allPlayers,
          playerCount: allPlayers.length,
          par3Count,
          playerPayments: paymentsByPlayer,
          ctpParticipants,
          skinsParticipants,
          ctpResults,
          skinsResults,
        });
      } catch (error) {
        console.error('Error fetching financial data:', error);
        return sendError(res, `Failed to fetch financial data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      return sendMethodNotAllowed(res, ['GET']);
    }
  } catch (error) {
    console.error('Error in financial API:', error);
    return sendError(res, `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}