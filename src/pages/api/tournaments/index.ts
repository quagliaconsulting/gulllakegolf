import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper function to format dates consistently with UTC
function formatUTCDate(dateString: string) {
  const date = new Date(dateString);
  // Set to noon UTC to avoid timezone issues
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify JWT token (middleware should have already checked for token existence)
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Verify token
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Invalid token:', error);
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
  if (req.method === 'GET') {
    try {
      const tournaments = await prisma.tournament.findMany({
        include: {
          teams: true,
          courses: true,
          formatMultipliers: true,
          schedules: {
            include: {
              matches: true
            }
          }
        }
      });
      
      // Transform data to include player counts
      const transformedTournaments = await Promise.all(tournaments.map(async (tournament) => {
        // Count total players across all teams
        const playerCount = await prisma.player.count({
          where: {
            team: {
              tournamentId: tournament.id
            }
          }
        });
        
        // Calculate match count
        const matchCount = tournament.schedules.reduce((total, schedule) => {
          return total + schedule.matches.length;
        }, 0);
        
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
        
        // Return transformed tournament with type assertions
        const t: any = tournament; // Cast to any to access the new fields
        return {
          id: tournament.id,
          name: tournament.name,
          location: tournament.location,
          year: tournament.year,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          // Financial fields
          buyIn: t.buyIn || null,
          totalPrize: t.totalPrize || null,
          hasCTP: t.hasCTP || false,
          ctpPrizeAmount: t.ctpPrizeAmount || null,
          hasSkins: t.hasSkins || false,
          skinsPrizeAmount: t.skinsPrizeAmount || null,
          payoutStructure: t.payoutStructure || null,
          status,
          teams: tournament.teams.map(team => team.name),
          players: playerCount,
          matches: matchCount,
          formatMultipliers: tournament.formatMultipliers,
          createdAt: tournament.createdAt,
        };
      }));
      
      res.status(200).json(transformedTournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
  } else if (req.method === 'POST') {
    try {
      // Extract tournament data from request body
      const { 
        name, 
        year, 
        location, 
        startDate, 
        endDate, 
        // Financial fields
        buyIn,
        totalPrize,
        hasCTP,
        ctpPrizeAmount,
        hasSkins,
        skinsPrizeAmount,
        payoutStructure,
        teamNames,
        formatMultipliers
      } = req.body;
      
      // Create tournament with nested data
      const tournament = await prisma.tournament.create({
        data: {
          name,
          year: parseInt(year, 10),
          location,
          startDate: formatUTCDate(startDate),
          endDate: formatUTCDate(endDate),
          // Financial fields
          buyIn: buyIn || null,
          totalPrize: totalPrize || null,
          hasCTP: hasCTP || false,
          ctpPrizeAmount: ctpPrizeAmount || null,
          hasSkins: hasSkins || false,
          skinsPrizeAmount: skinsPrizeAmount || null,
          payoutStructure: payoutStructure || null,
          teams: {
            create: teamNames.map((team: { name: string, isHomeTeam?: boolean }, index: number) => ({
              name: team.name,
              metadata: { 
                isHomeTeam: team.isHomeTeam === undefined ? index === 0 : team.isHomeTeam 
              }
            }))
          },
          formatMultipliers: {
            create: formatMultipliers ? formatMultipliers.map((format: any) => ({
              formatName: format.formatName,
              multiplier: format.multiplier,
              points: format.points || 1.0,
              halfPoints: format.halfPoints || 0.5,
              isFourManTeam: format.isFourManTeam || false
            })) : [
              { formatName: 'Best Ball', multiplier: 1.0, points: 1.0, halfPoints: 0.5 },
              { formatName: 'Scramble', multiplier: 0.4, points: 1.0, halfPoints: 0.5 },
              { formatName: 'Alternate Shot', multiplier: 0.7, points: 1.0, halfPoints: 0.5 },
              { formatName: 'Chapman', multiplier: 0.6, points: 1.0, halfPoints: 0.5 },
            ]
          }
        },
        include: {
          teams: true,
          formatMultipliers: true
        }
      });
      
      res.status(201).json({ tournament });
    } catch (error) {
      console.error('Error creating tournament:', error);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}