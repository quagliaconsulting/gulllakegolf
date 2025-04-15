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
    
    if (req.method === 'POST') {
      const { name, tournamentId, holes } = req.body;
      
      // Validate required fields
      if (!name || !tournamentId || !holes || !Array.isArray(holes)) {
        return res.status(400).json({ error: 'Name, tournament ID, and hole information are required' });
      }
      
      // Check if tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
      });
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Create course with holes
      const course = await prisma.course.create({
        data: {
          name,
          tournamentId,
          holes: {
            create: holes.map((hole: any) => ({
              number: hole.number,
              par: hole.par,
              handicap: hole.handicap,
              distance: hole.distance,
            })),
          },
        },
        include: {
          holes: true,
          tournament: {
            select: {
              name: true,
            },
          },
        },
      });
      
      return res.status(201).json(course);
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}