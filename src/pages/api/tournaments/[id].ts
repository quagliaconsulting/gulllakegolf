import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, PlayerPayment } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to process payments and determine latest status
const getLatestPaymentStatuses = (payments: PlayerPayment[]) => {
  const latestStatuses: { [key: string]: boolean } = {
    BUY_IN: false,
    CTP_ENTRY: false,
    SKINS_ENTRY: false,
  };
  const latestPaymentsByType: { [key: string]: PlayerPayment } = {};

  payments.forEach(payment => {
    if (!latestPaymentsByType[payment.type] || 
        new Date(payment.updatedAt) > new Date(latestPaymentsByType[payment.type].updatedAt)) {
      latestPaymentsByType[payment.type] = payment;
    }
  });

  Object.entries(latestPaymentsByType).forEach(([type, payment]) => {
    latestStatuses[type] = payment.status === 'PAID';
  });

  return latestStatuses;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid tournament ID' });
  }
  
  if (req.method === 'GET') {
    try {
      // Fetch tournament with all related data, including payments ordered by updated date
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          teams: {
            include: {
              players: {
                include: {
                  payments: {
                    where: { tournamentId: id }, // Ensure payments are for this tournament
                    orderBy: {
                      updatedAt: 'desc', // Get the latest first
                    }
                  },
                }
              },
            }
          },
          courses: {
            include: {
              holes: true,
            }
          },
          formatMultipliers: true,
          schedules: {
            include: {
              matches: {
                include: {
                  homeTeam: true,
                  awayTeam: true,
                  format: true,
                  course: true,
                  playerPairings: {
                    include: {
                      player: true,
                    }
                  },
                  holeResults: {
                    include: {
                      hole: true,
                    }
                  },
                  points: true,
                }
              }
            },
            orderBy: {
              day: 'asc',
            }
          },
          accommodations: true,
        }
      });
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Process players to add latest payment statuses
      const teamsWithPaymentStatus = tournament.teams.map(team => ({
        ...team,
        players: team.players.map(player => {
          const paymentStatuses = getLatestPaymentStatuses(player.payments);
          const { payments, ...playerWithoutPayments } = player;
          return {
            ...playerWithoutPayments,
            paymentStatuses, // Add the computed statuses
          };
        }),
      }));
      
      // Determine status based on dates
      const now = new Date();
      const startDate = new Date(tournament.startDate);
      const endDate = new Date(tournament.endDate);
      
      let status = 'upcoming';
      if (now > endDate) {
        status = 'completed';
      } else if (now >= startDate && now <= endDate) {
        status = 'active';
      }
      
      // Format schedules for easier consumption by the frontend
      const formattedSchedules = tournament.schedules.map(schedule => {
        return {
          id: schedule.id,
          day: schedule.day,
          date: schedule.date,
          matches: schedule.matches.map(match => {
            return {
              id: match.id,
              format: match.format.formatName,
              formatMultiplier: match.format.multiplier,
              formatPoints: match.format.points || 0,
              formatHalfPoints: match.format.halfPoints || 0,
              homeTeam: match.homeTeam.name,
              homeTeamIsReal: match.homeTeam.metadata?.isHomeTeam || false,
              awayTeam: match.awayTeam.name,
              awayTeamIsReal: match.awayTeam.metadata?.isHomeTeam || false,
              time: match.teeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              course: match.course.name,
              startingHole: match.startingHole,
              homePlayers: match.playerPairings
                .filter(pairing => pairing.isHomeTeam)
                .map(pairing => pairing.player),
              awayPlayers: match.playerPairings
                .filter(pairing => !pairing.isHomeTeam)
                .map(pairing => pairing.player),
              holeResults: match.holeResults,
              points: match.points,
            };
          }),
        };
      });
      
      // Return transformed tournament with status and processed players
      const result = {
        ...tournament,
        teams: teamsWithPaymentStatus, // Use teams with processed player payment statuses
        status,
        schedules: formattedSchedules,
      };
      
      res.status(200).json({ tournament: result });
    } catch (error) {
      console.error('Error fetching tournament:', error);
      res.status(500).json({ error: 'Failed to fetch tournament' });
    }
  } else if (req.method === 'PUT') {
    try {
      const updateData = req.body;
      
      // Update tournament - fix timezone issues with dates
      const startDate = updateData.startDate ? new Date(updateData.startDate) : undefined;
      const endDate = updateData.endDate ? new Date(updateData.endDate) : undefined;
      
      // Fix timezone issues by setting time to noon UTC to avoid date shift
      if (startDate) {
        startDate.setUTCHours(12, 0, 0, 0);
      }
      
      if (endDate) {
        endDate.setUTCHours(12, 0, 0, 0);
      }
      
      // Prepare data with possible type assertions
      const updateFields: any = {
        name: updateData.name,
        year: updateData.year,
        location: updateData.location,
        startDate: startDate,
        endDate: endDate,
        // Financial fields
        buyIn: updateData.buyIn,
        totalPrize: updateData.totalPrize,
        hasCTP: updateData.hasCTP,
        ctpPrizeAmount: updateData.ctpPrizeAmount,
        hasSkins: updateData.hasSkins,
        skinsPrizeAmount: updateData.skinsPrizeAmount,
        payoutStructure: updateData.payoutStructure,
      };
      
      const tournament = await prisma.tournament.update({
        where: { id },
        data: updateFields,
        include: {
          teams: true,
          courses: true,
          formatMultipliers: true,
        }
      });
      
      res.status(200).json({ tournament });
    } catch (error) {
      console.error('Error updating tournament:', error);
      res.status(500).json({ error: 'Failed to update tournament' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // First delete all associated items that we want to remove with the tournament
      await prisma.$transaction([
        // Delete match-related data
        prisma.matchPoints.deleteMany({ 
          where: { match: { tournamentId: id } } 
        }),
        prisma.holeResult.deleteMany({ 
          where: { match: { tournamentId: id } } 
        }),
        prisma.playerPairing.deleteMany({ 
          where: { match: { tournamentId: id } } 
        }),
        prisma.match.deleteMany({ 
          where: { tournamentId: id } 
        }),
        
        // Delete tournament-specific data
        prisma.schedule.deleteMany({ where: { tournamentId: id } }),
        prisma.galleryPhoto.deleteMany({ where: { tournamentId: id } }),
        prisma.report.deleteMany({ where: { tournamentId: id } }),
        prisma.playerPayment.deleteMany({ where: { tournamentId: id } }),
        prisma.cTPResult.deleteMany({ where: { tournamentId: id } }),
        prisma.skinsResult.deleteMany({ where: { tournamentId: id } }),
        
        // Delete the tournament itself
        prisma.tournament.delete({ where: { id } })
      ]);
      
      res.status(200).json({ message: 'Tournament deleted successfully' });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      res.status(500).json({ error: 'Failed to delete tournament' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}