import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/utils/auth';
import { PrismaClient } from '@prisma/client';
import { TournamentService } from '@/services/tournament/tournamentService';
import { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendMethodNotAllowed,
  sendAuthError
} from '@/services/api/apiResponse';

const prisma = new PrismaClient();

const tournamentService = new TournamentService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // IMPORTANT: Bypassing authentication for development
  // TODO: Re-enable in production when needed
  
  try {
    const tournamentId = req.query.id as string;
  
    if (!tournamentId) {
      return sendError(res, 'Tournament ID is required', 400);
    }
  
    // Check if tournament exists - just verify the ID exists in the database
    const tournamentExists = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true }
    });
  
    if (!tournamentExists) {
      return sendNotFound(res, 'Tournament not found');
    }

    // GET method for retrieving schedule
    if (req.method === 'GET') {
      const scheduleData = await tournamentService.getTournamentSchedule(tournamentId);
      return sendSuccess(res, scheduleData);
    }
    // POST method for updating schedule
    else if (req.method === 'POST') {
      const { schedule } = req.body;

      if (!Array.isArray(schedule)) {
        return sendError(res, 'Invalid schedule format', 400);
      }

      try {
        // TODO: Implement updateTournamentSchedule in TournamentService
        // For now, we'll use the existing implementation

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
                    holes: match.holes || 18, // Use the holes property from the form data (9 or 18)
                    
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

          return sendSuccess(res, { message: 'Schedule updated successfully' });
        }, {
          maxWait: 5000, // 5 seconds max wait time
          timeout: 30000, // 30 seconds transaction timeout
        });
      } catch (error) {
        console.error('Transaction error:', error);
        // Provide more detailed error information for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return sendError(res, 'An error occurred while updating the schedule', 500, {
          details: errorMessage,
          code: (error as any).code
        });
      }
    }
    else {
      return sendMethodNotAllowed(res, ['GET', 'POST']);
    }
  } catch (error) {
    console.error('Error in schedule API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return sendError(res, 'Internal server error', 500, {
      details: errorMessage,
      type: typeof error,
      location: 'Main API handler'
    });
  }
}