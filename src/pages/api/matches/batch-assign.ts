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
    
    if (req.method === 'POST') {
      const { assignments } = req.body;
      
      if (!Array.isArray(assignments)) {
        return res.status(400).json({ error: 'Invalid assignment data. Expected an array of assignments.' });
      }
      
      // Process each assignment
      const results = await Promise.all(assignments.map(async (assignment) => {
        const { matchId, homePlayers, awayPlayers } = assignment;
        
        if (!matchId || !Array.isArray(homePlayers) || !Array.isArray(awayPlayers)) {
          return {
            matchId,
            success: false,
            error: 'Invalid assignment data structure'
          };
        }
        
        try {
          // Verify that the match exists
          const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
              format: true,
              playerPairings: true
            }
          });
          
          if (!match) {
            return {
              matchId,
              success: false,
              error: 'Match not found'
            };
          }
          
          // Validate based on match format
          const isPairsFormat = ['Best Ball', 'Alternate Shot', 'Scramble', 'Chapman'].includes(match.format.formatName);
          const isFourManTeam = match.format.isFourManTeam;
          const isSingles = match.format.formatName === 'Singles';
          
          if (isPairsFormat && (homePlayers.length !== 2 || awayPlayers.length !== 2)) {
            return {
              matchId,
              success: false,
              error: 'Pairs formats require exactly 2 players per team'
            };
          } else if (isFourManTeam && (homePlayers.length !== 4 || awayPlayers.length !== 4)) {
            return {
              matchId,
              success: false,
              error: '4-Man Team format requires exactly 4 players per team'
            };
          } else if (isSingles && (homePlayers.length !== 1 || awayPlayers.length !== 1)) {
            return {
              matchId,
              success: false,
              error: 'Singles format requires exactly 1 player per team'
            };
          }
          
          // Delete existing pairings
          await prisma.playerPairing.deleteMany({
            where: { matchId }
          });
          
          // Create new pairings
          const pairings = [
            ...homePlayers.map((playerId: string) => ({
              matchId,
              playerId,
              isHomeTeam: true
            })),
            ...awayPlayers.map((playerId: string) => ({
              matchId,
              playerId,
              isHomeTeam: false
            }))
          ];
          
          await prisma.playerPairing.createMany({
            data: pairings
          });
          
          return {
            matchId,
            success: true
          };
        } catch (error) {
          console.error(`Error processing assignment for match ${matchId}:`, error);
          return {
            matchId,
            success: false,
            error: 'Failed to process assignment'
          };
        }
      }));
      
      // Check if all assignments were successful
      const allSuccessful = results.every(result => result.success);
      
      if (allSuccessful) {
        return res.status(200).json({ 
          message: 'All player assignments completed successfully',
          results
        });
      } else {
        return res.status(207).json({
          message: 'Some player assignments failed',
          results
        });
      }
    }
    
    // Method not allowed
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Error in batch assignment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}