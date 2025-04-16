import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@/utils/auth';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    
    if (req.method === 'GET') {
      const { tournamentId } = req.query;
      
      // Build the query condition based on whether tournamentId is provided
      const whereCondition = tournamentId 
        ? { tournamentId: tournamentId as string }
        : {};
      
      console.log('API /schedules: Query condition:', whereCondition);
      
      // Fetch schedules with matches
      const schedules = await prisma.schedule.findMany({
        where: whereCondition,
        orderBy: { 
          day: 'asc' 
        },
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
      
      console.log('API /schedules: Raw schedules found:', schedules.length);
      
      // Transform the data to include team names and tournament info
      const transformedSchedules = schedules.map(schedule => {
        // Extract tournament info
        const tournamentName = schedule.tournament?.name || 'Unknown Tournament';
        
        // Normalize date to handle timezone correctly
        const normalizedDate = new Date(schedule.date);
        // Force noon UTC time to avoid date shifts
        normalizedDate.setUTCHours(12, 0, 0, 0);
        
        return {
          ...schedule,
          date: normalizedDate, // Use normalized date
          // Include tournament name explicitly to make it easier to access
          tournamentName,
          matches: schedule.matches.map(match => {
            // Handle potentially missing team data (if teams aren't assigned yet)
            const homeTeamName = match.homeTeam?.name || 'Team 1';
            const awayTeamName = match.awayTeam?.name || 'Team 2';
            
            // Extract just the time portion with UTC timezone to avoid shifts
            const teeTime = new Date(match.teeTime);
            // Use time with a fixed format in UTC timezone
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
              teeTime: match.teeTime.toISOString(), // Use ISO string for consistent handling
              startingHole: match.startingHole
            };
          })
        };
      });
      
      console.log('API /schedules: Transformed schedules count:', transformedSchedules.length);
      
      return res.status(200).json({ schedules: transformedSchedules });
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}