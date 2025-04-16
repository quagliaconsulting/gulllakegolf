import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/utils/auth';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    
    const id = req.query.id as string;
    
    if (!id) {
      return res.status(400).json({ error: 'Schedule ID is required' });
    }

    // Check if schedule exists
    const schedule = await prisma.schedule.findUnique({
      where: { id }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Handle DELETE method
    if (req.method === 'DELETE') {
      // Delete all matches associated with this schedule
      await prisma.match.deleteMany({
        where: { scheduleId: id }
      });
      
      // Delete the schedule
      await prisma.schedule.delete({
        where: { id }
      });
      
      return res.status(200).json({ message: 'Schedule and associated matches deleted successfully' });
    }
    
    // Handle GET method
    if (req.method === 'GET') {
      const scheduleWithMatches = await prisma.schedule.findUnique({
        where: { id },
        include: {
          tournament: {
            select: {
              id: true,
              name: true
            }
          },
          matches: {
            include: {
              format: true,
              course: true,
              homeTeam: true,
              awayTeam: true,
              points: true
            }
          }
        }
      });
      
      if (!scheduleWithMatches) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      // Transform the data to include team names and tournament info
      const normalizedDate = new Date(scheduleWithMatches.date);
      normalizedDate.setUTCHours(12, 0, 0, 0);
      
      const transformedMatches = scheduleWithMatches.matches.map(match => {
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
          points: match.points,
          teeTime: match.teeTime.toISOString(),
          startingHole: match.startingHole
        };
      });
      
      return res.status(200).json({ 
        schedule: {
          ...scheduleWithMatches,
          date: normalizedDate,
          tournamentName: scheduleWithMatches.tournament?.name || 'Unknown Tournament',
          matches: transformedMatches
        }
      });
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling schedule request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}