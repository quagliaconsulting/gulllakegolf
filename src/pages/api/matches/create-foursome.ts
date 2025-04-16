import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/utils/auth';

const prisma = new PrismaClient();

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
    // Verify token
    if (!verifyToken(token, res)) {
      return; // Response already sent by verifyToken
    }
    
    if (req.method === 'POST') {
      const { 
        tournamentId, 
        scheduleId, 
        formatId, 
        homeTeamId, 
        awayTeamId, 
        courseId, 
        startingHole, 
        teeTime,
        matchups  // Array of { homePlayerId, awayPlayerId }
      } = req.body;
      
      // Validation
      if (!tournamentId || !scheduleId || !formatId || !homeTeamId || !awayTeamId || !courseId || !startingHole || !teeTime || !matchups) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (!Array.isArray(matchups) || matchups.length !== 2) {
        return res.status(400).json({ error: 'Exactly 2 matchups are required for a singles foursome' });
      }
      
      // Validate each matchup has required player IDs
      const invalidMatchups = matchups.filter(m => !m.homePlayerId || !m.awayPlayerId);
      if (invalidMatchups.length > 0) {
        return res.status(400).json({ error: 'All matchups must have a home player and away player' });
      }
      
      // Generate a unique foursome group ID
      const foursomeGroupId = `foursome_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // Create all matches
      const createdMatches = await Promise.all(matchups.map(matchup => {
        return prisma.match.create({
          data: {
            tournamentId,
            scheduleId,
            formatId,
            homeTeamId,
            awayTeamId,
            courseId,
            startingHole,
            teeTime: new Date(teeTime),
            foursomeGroupId,
            playerToPlayerMatch: true,
            playerPairings: {
              create: [
                {
                  playerId: matchup.homePlayerId,
                  isHomeTeam: true
                },
                {
                  playerId: matchup.awayPlayerId,
                  isHomeTeam: false
                }
              ]
            }
          },
          include: {
            playerPairings: {
              include: {
                player: true
              }
            },
            homeTeam: true,
            awayTeam: true,
            format: true
          }
        });
      }));
      
      return res.status(201).json({ 
        success: true, 
        matches: createdMatches,
        foursomeGroupId
      });
    }
    
    // Method not allowed
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Error creating foursome:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}