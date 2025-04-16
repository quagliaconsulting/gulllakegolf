import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/utils/auth';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid tournament ID' });
  }

  // Verify JWT token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Verify token with better error handling
    if (!verifyToken(token, res)) {
      return; // Response already sent by verifyToken
    }
    
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
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Calculate financial metrics
      const playerCount = tournament.teams.reduce((sum, team) => sum + team.players.length, 0);
      const par3Count = tournament.courses.reduce((sum, course) => sum + course.holes.length, 0);
      
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
      
      // Count participants by finding unique players who have paid
      const ctpPaidPlayerIds = new Set(
        latestPayments
          .filter(p => p.type === 'CTP_ENTRY' && p.status === 'PAID')
          .map(p => p.playerId)
      );
      
      const skinsPaidPlayerIds = new Set(
        latestPayments
          .filter(p => p.type === 'SKINS_ENTRY' && p.status === 'PAID')
          .map(p => p.playerId)
      );
      
      const ctpParticipants = ctpPaidPlayerIds.size;
      const skinsParticipants = skinsPaidPlayerIds.size;
      
      // First group payments by player and type to get latest status for each type
      const playerPaymentsByType: Record<string, Record<string, any>> = {};
      
      // Process payments to find the latest entry for each player and payment type
      latestPayments.forEach(payment => {
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
        if (!paymentsByPlayer[playerId]) {
          paymentsByPlayer[playerId] = {};  
        }
        
        // Process each payment type for this player
        Object.entries(payments).forEach(([type, payment]: [string, any]) => {
          paymentsByPlayer[playerId][type] = payment.status === 'PAID';
          console.log(`Player ${playerId} ${type} LATEST status: ${payment.status} -> ${payment.status === 'PAID'}`);
        });
      });
      
      // Calculate prize amounts based on entry fees
      let ctpPrizePerHole = 0;
      if (par3Count > 0 && tournament.ctpPrizeAmount) {
        ctpPrizePerHole = (tournament.ctpPrizeAmount * ctpParticipants) / par3Count;
      }
      
      let skinsPrizePerHole = 0;
      if (tournament.skinsPrizeAmount) {
        if (tournament.skinsResults.length > 0) {
          skinsPrizePerHole = (tournament.skinsPrizeAmount * skinsParticipants) / tournament.skinsResults.length;
        } else {
          // If no skins yet, just calculate the total pot
          skinsPrizePerHole = tournament.skinsPrizeAmount * skinsParticipants;
        }
      }
      
      // Get all players with financial information
      const allPlayers = tournament.teams.flatMap(team => {
        return team.players.map(player => ({
          ...player,
          team: { id: team.id, name: team.name, tournamentId: team.tournamentId }
        }));
      });
      
      res.status(200).json({
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
        ctpResults: tournament.ctpResults,
        skinsResults: tournament.skinsResults,
        playerPayments: paymentsByPlayer,
        allPlayers
      });
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
      
      res.status(200).json({ tournament: updatedTournament });
    }
    else {
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error handling money request:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}