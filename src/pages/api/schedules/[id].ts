import { NextApiRequest, NextApiResponse } from 'next';
import { ScheduleService } from '@/services/schedule';
import { AuthService } from '@/services/api/authService';
import { sendSuccess, sendError, sendNotFound, sendMethodNotAllowed } from '@/services/api/apiResponse';

// Initialize the schedule service
const scheduleService = new ScheduleService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate the request (commented out for development)
  // const user = await AuthService.requireAuth(req, res);
  // if (!user) return; // Response is already sent by requireAuth
  
  const id = req.query.id as string;
  
  if (!id) {
    return sendError(res, 'Schedule ID is required', 400);
  }

  try {
    // Handle DELETE method
    if (req.method === 'DELETE') {
      await scheduleService.deleteSchedule(id);
      return sendSuccess(res, { message: 'Schedule and associated matches deleted successfully' });
    }
    
    // Handle GET method
    if (req.method === 'GET') {
      const schedule = await scheduleService.getScheduleById(id);
      
      if (!schedule) {
        return sendNotFound(res, 'Schedule not found');
      }
      
      // Transform the data to include team names and tournament info
      const normalizedDate = new Date(schedule.date);
      normalizedDate.setUTCHours(12, 0, 0, 0);
      
      const transformedMatches = schedule.matches.map(match => {
        const homeTeamName = match.homeTeam?.name || 'Team 1';
        const awayTeamName = match.awayTeam?.name || 'Team 2';
        
        const teeTime = new Date(match.teeTime);
        const timeString = teeTime.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true,
          timeZone: 'UTC'
        });
        
        return {
          id: match.id,
          time: timeString,
          format: match.format.formatName,
          teams: [homeTeamName, awayTeamName],
          course: match.course.name,
          homeTeam: homeTeamName,
          awayTeam: awayTeamName,
          teeTime: match.teeTime.toISOString(),
          startingHole: match.startingHole
        };
      });
      
      return sendSuccess(res, { 
        schedule: {
          ...schedule,
          date: normalizedDate,
          tournamentName: schedule.tournament?.name || 'Unknown Tournament',
          matches: transformedMatches
        }
      });
    }
    
    // Method not allowed
    return sendMethodNotAllowed(res, ['GET', 'DELETE']);
  } catch (error) {
    console.error('Error handling schedule request:', error);
    return sendError(res, 'Internal server error');
  }
}