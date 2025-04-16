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
              
              // Get team IDs based on metadata
              let homeTeamId: string | undefined = undefined;
              let awayTeamId: string | undefined = undefined;
              
              const allTeams = await tx.team.findMany({
                where: { tournamentId },
                select: { id: true, metadata: true } // Select only needed fields
              });
              
              let designatedHomeTeam: any = null;
              let designatedAwayTeams: any[] = [];
              
              for (const team of allTeams) {
                // Safely check metadata structure and value
                if (team.metadata && typeof team.metadata === 'object' && (team.metadata as any)?.isHomeTeam === true) {
                    if (designatedHomeTeam) {
                        // Error: More than one home team designated
                        throw new Error(`Multiple teams are designated as home team in tournament ${tournamentId}. Please correct team metadata.`);
                    }
                    designatedHomeTeam = team;
                    homeTeamId = team.id;
                } else {
                    designatedAwayTeams.push(team);
                }
              }

              if (!designatedHomeTeam) {
                  throw new Error(`No designated home team found in tournament ${tournamentId}. Please set metadata {'isHomeTeam': true} on exactly one team.`);
              }
              
              // For a standard 2-team match, find the specific away team if provided by name/ID
              // Otherwise, if there's only one other team, assume it's the away team.
              if (match.awayTeamId) {
                 awayTeamId = match.awayTeamId;
                 if (!allTeams.some(t => t.id === awayTeamId)) {
                     throw new Error(`Provided awayTeamId ${awayTeamId} does not belong to this tournament.`);
                 }
              } else if (match.awayTeam) {
                  const foundAway = await tx.team.findFirst({
                      where: { tournamentId, name: match.awayTeam },
                      select: { id: true }
                  });
                  if (!foundAway) {
                       throw new Error(`Named away team '${match.awayTeam}' not found in tournament.`);
                  }
                  if (foundAway.id === homeTeamId) {
                      throw new Error(`Named away team '${match.awayTeam}' cannot be the same as the designated home team.`);
                  }
                  awayTeamId = foundAway.id;
              } else {
                  // If away team isn't specified, try to infer if there's only ONE possible away team
                  const possibleAwayTeams = designatedAwayTeams.filter(t => t.id !== homeTeamId);
                   if (possibleAwayTeams.length === 1) {
                      awayTeamId = possibleAwayTeams[0].id;
                      console.log(`Inferred away team ${awayTeamId} as it's the only non-home team.`);
                   } else if (possibleAwayTeams.length > 1) {
                       throw new Error(`Could not determine the away team for match against home team ${homeTeamId}. Multiple potential away teams exist and none was specified.`);
                   } else {
                       // This case (no away teams) should ideally not happen in a 2-team setup
                       throw new Error('Could not find any potential away team.');
                   }
              }
              
              if (!homeTeamId || !awayTeamId) {
                   // This should theoretically not be reachable due to checks above, but as a safeguard:
                   throw new Error('Failed to determine both home and away team IDs.');
              }

              // Create match
              await tx.match.create({
                data: {
                  startingHole: match.startingHole || 1,
                  teeTime: new Date(`${day.date}T${match.time || '08:00'}:00Z`),
                  
                  tournament: { connect: { id: tournamentId } },
                  schedule: { connect: { id: scheduleDay.id } },
                  homeTeam: { connect: { id: homeTeamId } },
                  awayTeam: { connect: { id: awayTeamId } },
                  ...(match.courseId && { course: { connect: { id: match.courseId } } }),
                  ...(formatId && { format: { connect: { id: formatId } } }),
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