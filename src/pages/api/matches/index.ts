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
    : req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Verify token with better error handling
    if (!verifyToken(token, res)) {
      return; // Response already sent by verifyToken
    }
    
    if (req.method === 'GET') {
      // Get all matches with related data
      const matches = await prisma.match.findMany({
        include: {
          tournament: {
            select: {
              name: true,
              year: true,
            },
          },
          homeTeam: {
            select: {
              name: true,
            },
          },
          awayTeam: {
            select: {
              name: true,
            },
          },
          format: {
            select: {
              formatName: true,
            },
          },
          points: true,
          schedule: true,
          course: true,
        },
        orderBy: {
          teeTime: 'desc',
        },
      });
      
      // Format the data for easier consumption by the frontend
      const formattedMatches = matches.map(match => ({
        id: match.id,
        tournamentName: match.tournament.name,
        tournamentId: match.tournamentId,
        date: match.teeTime.toISOString(),
        format: match.format.formatName,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeScore: match.points?.homeTeamPoints || 0,
        awayScore: match.points?.awayTeamPoints || 0,
        courseName: match.course.name,
        startingHole: match.startingHole,
      }));
      
      return res.status(200).json(formattedMatches);
    }
    
    // For other methods, return 405 Method Not Allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}