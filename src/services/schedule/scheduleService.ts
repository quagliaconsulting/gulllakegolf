import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Service for schedule-related operations
 */
export class ScheduleService {
  /**
   * Get all schedules
   */
  async getAllSchedules() {
    return await prisma.schedule.findMany({
      include: {
        tournament: {
          select: {
            name: true,
            year: true,
          },
        },
        matches: {
          include: {
            format: true,
            course: true,
            homeTeam: true,
            awayTeam: true
          },
          orderBy: {
            teeTime: 'asc'
          }
        }
      },
      orderBy: {
        date: 'asc',
      },
    });
  }
  
  /**
   * Get schedules for a tournament
   */
  async getSchedulesByTournamentId(tournamentId: string) {
    return await prisma.schedule.findMany({
      where: {
        tournamentId
      },
      include: {
        matches: {
          include: {
            format: true,
            course: true,
            homeTeam: true,
            awayTeam: true
          },
          orderBy: {
            teeTime: 'asc'
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: string) {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
        matches: {
          include: {
            format: true,
            course: true,
            homeTeam: true,
            awayTeam: true,
            playerPairings: {
              include: {
                player: true
              }
            }
          },
          orderBy: {
            teeTime: 'asc'
          }
        },
      },
    });
    
    if (!schedule) {
      return null;
    }
    
    return schedule;
  }

  /**
   * Create a new schedule
   */
  async createSchedule(data: {
    tournamentId: string;
    date: Date | string;
    day: number;
  }) {
    try {
      // Create schedule with proper data format
      const schedule = await prisma.schedule.create({
        data: {
          tournamentId: data.tournamentId,
          date: new Date(data.date),
          day: data.day || 1
        }
      });
      
      // Return schedule with relations
      return await this.getScheduleById(schedule.id);
    } catch (error) {
      console.error('Error in ScheduleService.createSchedule:', error);
      throw error;
    }
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(id: string, data: {
    date?: Date | string;
    day?: number;
  }) {
    try {
      // Update schedule
      const updateData: Prisma.ScheduleUpdateInput = {};
      
      if (data.date) {
        updateData.date = new Date(data.date);
      }
      
      if (data.day !== undefined) {
        updateData.day = data.day;
      }
      
      await prisma.schedule.update({
        where: { id },
        data: updateData
      });
      
      // Return updated schedule with relations
      return await this.getScheduleById(id);
    } catch (error) {
      console.error('Error in ScheduleService.updateSchedule:', error);
      throw error;
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(id: string) {
    // Delete all hole results for matches in this schedule
    const matches = await prisma.match.findMany({
      where: { scheduleId: id },
      select: { id: true }
    });
    
    const matchIds = matches.map(m => m.id);
    
    if (matchIds.length > 0) {
      // Delete hole results
      await prisma.holeResult.deleteMany({
        where: {
          matchId: { in: matchIds }
        }
      });
      
      // Delete player pairings
      await prisma.playerPairing.deleteMany({
        where: {
          matchId: { in: matchIds }
        }
      });
      
      // Delete match points
      await prisma.matchPoints.deleteMany({
        where: {
          matchId: { in: matchIds }
        }
      });
      
      // Delete matches
      await prisma.match.deleteMany({
        where: {
          scheduleId: id
        }
      });
    }
    
    // Delete the schedule
    return await prisma.schedule.delete({
      where: { id }
    });
  }
}