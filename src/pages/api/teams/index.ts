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
      // Get all teams
      const teams = await prisma.team.findMany({
        include: {
          tournament: {
            select: {
              name: true,
              year: true,
            },
          },
          players: true
        },
      });
      
      return res.status(200).json({ teams });
    } 
    
    else if (req.method === 'POST') {
      const { name, tournamentId, players } = req.body;
      
      // Validate required fields
      if (!name || !tournamentId) {
        return res.status(400).json({ error: 'Name and tournament ID are required' });
      }
      
      // Check if tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
      });
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Create team with players if provided
      if (players && Array.isArray(players) && players.length > 0) {
        const team = await prisma.team.create({
          data: {
            name,
            tournamentId,
            players: {
              create: players.map((player: any) => ({
                name: player.name,
                email: player.email || null,
                handicapIndex: parseFloat(player.handicapIndex) || 0,
                photoUrl: player.photoUrl || null,
              })),
            },
          },
          include: {
            players: true,
            tournament: {
              select: {
                name: true,
              },
            },
          },
        });
        
        return res.status(201).json(team);
      } else {
        // Create team without players
        const team = await prisma.team.create({
          data: {
            name,
            tournamentId,
          },
          include: {
            tournament: {
              select: {
                name: true,
              },
            },
          },
        });
        
        return res.status(201).json(team);
      }
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}