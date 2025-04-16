import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@/utils/auth';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Verify token with better error handling
    if (!verifyToken(token, res)) {
      return; // Response already sent by verifyToken
    }
    
    const tournamentId = req.query.id as string;
  
    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }
  
    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: {
        id: tournamentId,
      },
    });
  
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // GET method for retrieving schedule
    if (req.method === 'GET') {
      const schedule = await prisma.schedule.findMany({
        where: {
          tournamentId,
        },
        orderBy: {
          day: 'asc',
        },
        include: {
          matches: {
            include: {
              format: true,
              course: true,
              homeTeam: true,
              awayTeam: true,
            },
            orderBy: {
              teeTime: 'asc',
            },
          },
        },
      });
      
      return res.status(200).json({ schedule });
    }
    // POST method for updating schedule
    else if (req.method === 'POST') {
      const { schedule } = req.body;

      if (!Array.isArray(schedule)) {
        return res.status(400).json({ error: 'Invalid schedule format' });
      }

      // Start a transaction for the whole operation
      return await prisma.$transaction(async (tx) => {
        // Delete existing matches for this tournament
        await tx.match.deleteMany({
          where: {
            tournamentId,
          },
        });

        // Delete existing schedule days
        await tx.schedule.deleteMany({
          where: {
            tournamentId,
          },
        });

        // Create new schedule
        for (const day of schedule) {
          // Create schedule day
          const scheduleDay = await tx.schedule.create({
            data: {
              tournamentId,
              day: day.day,
              date: new Date(`${day.date}T12:00:00Z`),
            },
          });

          // Process matches for this day
          if (Array.isArray(day.matches) && day.matches.length > 0) {
            for (const match of day.matches) {
              // Get format ID
              let formatId = match.formatId;
              
              if (!formatId && match.format) {
                // Find existing format by name
                const format = await tx.formatMultiplier.findFirst({
                  where: {
                    tournamentId,
                    formatName: match.format,
                  },
                });
                
                if (format) {
                  formatId = format.id;
                } else {
                  // Create new format with default multiplier if not found
                  const newFormat = await tx.formatMultiplier.create({
                    data: {
                      tournamentId,
                      formatName: match.format,
                      multiplier: 1.0, // Default multiplier
                    },
                  });
                  formatId = newFormat.id;
                }
              }
              
              // Get team IDs
              let homeTeamId = match.homeTeamId;
              let awayTeamId = match.awayTeamId;
              
              // If home/away teams are strings (names), find or create them
              if (!homeTeamId && match.homeTeam) {
                const homeTeam = await tx.team.findFirst({
                  where: {
                    tournamentId,
                    name: match.homeTeam,
                  },
                });
                
                if (homeTeam) {
                  homeTeamId = homeTeam.id;
                }
              }
              
              if (!awayTeamId && match.awayTeam) {
                const awayTeam = await tx.team.findFirst({
                  where: {
                    tournamentId,
                    name: match.awayTeam,
                  },
                });
                
                if (awayTeam) {
                  awayTeamId = awayTeam.id;
                }
              }
              
              // Get teams if not provided
              if (!homeTeamId || !awayTeamId) {
                const teams = await tx.team.findMany({
                  where: {
                    tournamentId,
                  },
                  take: 2,
                });
                
                if (teams.length >= 2) {
                  if (!homeTeamId) homeTeamId = teams[0].id;
                  if (!awayTeamId) awayTeamId = teams[1].id;
                }
              }
              
              // Create match
              await tx.match.create({
                data: {
                  tournamentId,
                  scheduleId: scheduleDay.id,
                  formatId,
                  homeTeamId,
                  awayTeamId,
                  courseId: match.courseId,
                  startingHole: match.startingHole || 1,
                  teeTime: new Date(`${day.date}T${match.time || '08:00'}:00Z`),
                },
              });
            }
          }
        }

        return res.status(200).json({ message: 'Schedule updated successfully' });
      }, {
        maxWait: 5000, // 5 seconds max wait time
        timeout: 30000, // 30 seconds transaction timeout
      }).catch(error => {
        console.error('Transaction error:', error);
        // Provide more detailed error information for debugging
        const errorMessage = error.message || 'Unknown error';
        return res.status(500).json({ 
          error: 'An error occurred while updating the schedule',
          details: errorMessage,
          code: error.code
        });
      });
    }
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in schedule API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: errorMessage,
      type: typeof error,
      location: 'Main API handler'
    });
  }
}