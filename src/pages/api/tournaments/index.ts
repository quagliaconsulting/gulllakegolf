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
        
        // Return transformed tournament
        return {
          id: tournament.id,
          name: tournament.name,
          location: tournament.location,
          year: tournament.year,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          status,
          teams: tournament.teams.map(team => team.name),
          players: playerCount,
          matches: matchCount,
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
          teams: {
            create: teamNames.map((team: { name: string }) => ({
              name: team.name
            }))
          },
          formatMultipliers: {
            create: formatMultipliers ? formatMultipliers : [
              { formatName: 'Best Ball', multiplier: 1.0 },
              { formatName: 'Scramble', multiplier: 0.4 },
              { formatName: 'Alternate Shot', multiplier: 0.7 },
              { formatName: 'Chapman', multiplier: 0.6 },
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