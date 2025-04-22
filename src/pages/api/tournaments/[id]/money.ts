import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/services/api/authService';
import { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendValidationError, 
  sendMethodNotAllowed,
  sendAuthError
} from '@/services/api/apiResponse';
import { verifyToken } from '@/utils/auth';
import { 
  calculateCTPPrize, 
  calculateSkinsPrize, 
  calculateTeamPayouts 
} from '@/utils/prizeCalculator';
import { isHomeTeam } from '@/utils/teamUtils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify JWT token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : req.cookies?.token;

  // Set no-cache headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return sendValidationError(res, 'Invalid tournament ID');
  }
  
  // Log request details for debugging
  console.log(`Money API accessed for tournament: ${id}, method: ${req.method}`);
  
  // For development, we'll temporarily bypass token verification
  // In a production environment, this should be uncommented
  /*
  if (!token) {
    return sendAuthError(res, 'Authentication required');
  }

  // Verify token with better error handling
  if (!verifyToken(token, res)) {
    return; // Response already sent by verifyToken
  }
  */

  try {
    
    // GET - Fetch financial data for this tournament
    if (req.method === 'GET') {
      // Get tournament with financial data and all related data
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          teams: {
            include: {
              players: true,
            }
          },
          courses: {
            include: {
              holes: {
                where: {
                  isPar3: true
                }
              }
            }
          },
          payments: {
            include: {
              player: true
            }
          },
          ctpResults: {
            include: {
              player: true,
              hole: true
            }
          },
          skinsResults: {
            include: {
              player: true
            }
          }
        }
      });
      
      if (!tournament) {
        return sendNotFound(res, 'Tournament not found');
      }

      // Enhanced player collection logic
      // 1. First check if we have players directly in teams
      let allPlayers = [];
      const teamPlayersCount = tournament.teams.reduce((sum, team) => {
        if (team.players && Array.isArray(team.players)) {
          return sum + team.players.length;
        }
        return sum;
      }, 0);
      
      // Log player count for debugging
      console.log(`Found ${teamPlayersCount} players in tournament teams initially`);
      
      // Collect all players from teams
      allPlayers = tournament.teams.flatMap(team => {
        if (!team.players || !Array.isArray(team.players)) {
          console.log(`Team ${team.id} has no players or players is not an array`);
          return [];
        }
        
        // Enhanced logging for debugging
        console.log(`Team ${team.id} (${team.name}) has ${team.players.length} players`);
        
        // Determine if this is a home team consistently
        const isHome = isHomeTeam(team);
        console.log(`Team ${team.name} isHomeTeam: ${isHome}`);
        
        return team.players.map(player => ({
          ...player,
          team: { 
            id: team.id, 
            name: team.name, 
            tournamentId: team.tournamentId,
            isHomeTeam: isHome,
            metadata: team.metadata
          }
        }));
      });
      
      // If we still don't have players from teams, try fetching directly from database
      if (allPlayers.length === 0) {
        console.log("No players found in teams, querying players from database directly");
        const teamIds = tournament.teams.map(team => team.id);
        
        if (teamIds.length > 0) {
          // Query all players for these teams directly
          const dbPlayers = await prisma.player.findMany({
            where: {
              teamId: {
                in: teamIds
              }
            },
            include: {
              team: true
            }
          });
          
          console.log(`Found ${dbPlayers.length} players by direct database query`);
          
          allPlayers = dbPlayers.map(player => {
            const playerTeam = player.team || null;
            const teamHomeStatus = playerTeam ? isHomeTeam(playerTeam) : false;
            
            return {
              ...player,
              team: playerTeam ? { 
                id: playerTeam.id, 
                name: playerTeam.name, 
                tournamentId: playerTeam.tournamentId,
                isHomeTeam: teamHomeStatus,
                metadata: playerTeam.metadata
              } : null
            };
          });
        }
      }
      
      // Still no players? Try a direct tournament players query without team filter
      if (allPlayers.length === 0) {
        console.log("No players found via teams, trying direct tournament query");
        
        // Get all players who have played in any match in this tournament
        const playerPairings = await prisma.playerPairing.findMany({
          where: {
            match: {
              tournamentId: id
            }
          },
          include: {
            player: {
              include: {
                team: true
              }
            },
            match: {
              select: {
                homeTeamId: true,
                awayTeamId: true,
                homeTeam: true,
                awayTeam: true
              }
            }
          },
          distinct: ['playerId']
        });
        
        console.log(`Found ${playerPairings.length} player pairings in this tournament`);
        
        if (playerPairings.length > 0) {
          // Extract players from pairings with team info from the match
          allPlayers = playerPairings.map(pairing => {
            const player = pairing.player;
            let playerTeam = player.team;
            
            // If player doesn't have a team, use the match's team
            if (!playerTeam && pairing.match) {
              const isHome = pairing.isHomeTeam;
              playerTeam = isHome ? pairing.match.homeTeam : pairing.match.awayTeam;
            }
            
            const teamHomeStatus = playerTeam ? isHomeTeam(playerTeam) : false;
            
            return {
              ...player,
              team: playerTeam ? {
                id: playerTeam.id,
                name: playerTeam.name || (pairing.isHomeTeam ? 'Home Team' : 'Away Team'),
                tournamentId: id,
                isHomeTeam: teamHomeStatus,
                metadata: playerTeam.metadata
              } : {
                id: pairing.isHomeTeam ? pairing.match.homeTeamId : pairing.match.awayTeamId,
                name: pairing.isHomeTeam ? 'Home Team' : 'Away Team',
                tournamentId: id,
                isHomeTeam: pairing.isHomeTeam
              }
            };
          });
          
          console.log(`Extracted ${allPlayers.length} players from pairings`);
        }
      }
      
      // Calculate financial metrics
      const playerCount = allPlayers.length;
      console.log(`Final player count: ${playerCount}`);
      
      const par3Count = tournament.courses.reduce((sum, course) => sum + course.holes.length, 0);
      
      // Get a list of valid player IDs
      const validPlayerIds = new Set(allPlayers.map(player => player.id));
      console.log(`Found ${validPlayerIds.size} valid players for payment processing`);
      
      // Make a fresh query for latest payment data to avoid any stale cache
      console.log("Fetching fresh payment data for tournament:", id);
      const latestPayments = await prisma.playerPayment.findMany({
        where: {
          tournamentId: id
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
      
      console.log(`Found ${latestPayments.length} payment records in database`);
      
      // Process payment data
      const paymentsByPlayer: Record<string, Record<string, boolean>> = {};
      
      // Initialize payment records for all players
      allPlayers.forEach(player => {
        paymentsByPlayer[player.id] = {
          BUY_IN: false,
          CTP_ENTRY: false,
          SKINS_ENTRY: false
        };
      });
      
      // Filter payments to only include those for valid players
      const validPayments = latestPayments.filter(p => validPlayerIds.has(p.playerId));
      console.log(`Filtered from ${latestPayments.length} to ${validPayments.length} valid payments`);
      
      // Count participants by finding unique players who have paid
      const ctpPaidPlayerIds = new Set(
        validPayments
          .filter(p => p.type === 'CTP_ENTRY' && p.status === 'PAID')
          .map(p => p.playerId)
      );
      
      const skinsPaidPlayerIds = new Set(
        validPayments
          .filter(p => p.type === 'SKINS_ENTRY' && p.status === 'PAID')
          .map(p => p.playerId)
      );
      
      const ctpParticipants = ctpPaidPlayerIds.size;
      const skinsParticipants = skinsPaidPlayerIds.size;
      
      // First group payments by player and type to get latest status for each type
      const playerPaymentsByType: Record<string, Record<string, any>> = {};
      
      // Process payments to find the latest entry for each player and payment type
      validPayments.forEach(payment => {
        if (!playerPaymentsByType[payment.playerId]) {
          playerPaymentsByType[payment.playerId] = {};
        }
        
        // If this payment type isn't recorded yet or is newer than existing record
        if (!playerPaymentsByType[payment.playerId][payment.type] || 
            new Date(payment.updatedAt) > new Date(playerPaymentsByType[payment.playerId][payment.type].updatedAt)) {
          playerPaymentsByType[payment.playerId][payment.type] = payment;
        }
      });
      
      // Now create the final status map using only the latest payment for each type
      Object.entries(playerPaymentsByType).forEach(([playerId, payments]) => {
        // Process each payment type for this player
        Object.entries(payments).forEach(([type, payment]: [string, any]) => {
          if (payment && payment.status) {
            const isPaid = payment.status === 'PAID';
            paymentsByPlayer[playerId][type] = isPaid;
            console.log(`Player ${playerId} ${type} LATEST status: ${payment.status} -> ${isPaid}`);
          }
        });
      });
      
      // Debug the final payment state
      console.log("Final payment status summary:");
      allPlayers.forEach(player => {
        console.log(`Player ${player.name} (${player.id}) payment status:`, 
          paymentsByPlayer[player.id] || 'No payment records');
      });
      
      // Calculate prize amounts using the utility functions
      const ctpPrizePerHole = calculateCTPPrize(
        tournament.ctpPrizeAmount || 0,
        ctpParticipants,
        par3Count
      );
      
      const skinsPrizePerHole = calculateSkinsPrize(
        tournament.skinsPrizeAmount || 0,
        skinsParticipants,
        tournament.skinsResults.length
      );
      
      // Calculate team payouts
      const teamPrizes = calculateTeamPayouts(
        tournament.buyIn || 0,
        playerCount,
        tournament.payoutStructure as Record<string, number> || {},
        tournament.teams.length
      );
      
      // Create the response data
      const responseData = {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          buyIn: tournament.buyIn,
          totalPrize: tournament.buyIn ? tournament.buyIn * playerCount : 0,
          hasCTP: tournament.hasCTP,
          ctpPrizeAmount: tournament.ctpPrizeAmount,
          hasSkins: tournament.hasSkins,
          skinsPrizeAmount: tournament.skinsPrizeAmount,
          payoutStructure: tournament.payoutStructure,
        },
        playerCount,
        par3Count,
        ctpParticipants,
        skinsParticipants,
        ctpPrizePerHole,
        skinsPrizePerHole,
        teamPrizes,
        ctpResults: tournament.ctpResults,
        skinsResults: tournament.skinsResults,
        playerPayments: paymentsByPlayer,
        allPlayers
      };
      
      // Log the response length for debugging
      console.log(`Sending API response with ${allPlayers.length} players and ${Object.keys(paymentsByPlayer).length} payment records`);
      
      // Log a few player samples to verify structure
      if (allPlayers.length > 0) {
        console.log('Sample player data:', JSON.stringify(allPlayers[0]).substring(0, 500));
      }
      
      return sendSuccess(res, responseData, 200);
    } 
    // PUT - Update tournament financial settings
    else if (req.method === 'PUT') {
      const {
        buyIn,
        totalPrize,
        hasCTP,
        ctpPrizeAmount,
        hasSkins,
        skinsPrizeAmount,
        payoutStructure
      } = req.body;
      
      const updatedTournament = await prisma.tournament.update({
        where: { id },
        data: {
          buyIn: buyIn !== undefined ? Number(buyIn) : undefined,
          totalPrize: totalPrize !== undefined ? Number(totalPrize) : undefined,
          hasCTP: hasCTP !== undefined ? Boolean(hasCTP) : undefined,
          ctpPrizeAmount: ctpPrizeAmount !== undefined ? Number(ctpPrizeAmount) : undefined,
          hasSkins: hasSkins !== undefined ? Boolean(hasSkins) : undefined,
          skinsPrizeAmount: skinsPrizeAmount !== undefined ? Number(skinsPrizeAmount) : undefined,
          payoutStructure: payoutStructure !== undefined ? payoutStructure : undefined
        }
      });
      
      return sendSuccess(res, { tournament: updatedTournament }, 200);
    }
    else {
      return sendMethodNotAllowed(res, ['GET', 'PUT']);
    }
  } catch (error) {
    console.error('Error handling money request:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return sendError(res, message, 500);
  }
}