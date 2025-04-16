import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/utils/auth';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid tournament ID' });
  }

  // Verify JWT token (middleware should have already checked for token existence)
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
    
    // GET - Fetch CTP results for this tournament
    if (req.method === 'GET') {
      // Use any to work around type issues
      const prismaAny = prisma as any;
      const ctpResults = await prismaAny.cTPResult.findMany({
        where: { tournamentId: id },
        include: {
          hole: {
            include: {
              course: true
            }
          },
          player: true
        },
        orderBy: {
          round: 'asc'
        }
      });
      
      res.status(200).json(ctpResults);
    } 
    // POST - Add new CTP result
    else if (req.method === 'POST') {
      const { holeId, playerId, distance, round, prize } = req.body;
      
      if (!holeId || !playerId) {
        return res.status(400).json({ error: 'Hole ID and Player ID are required' });
      }
      
      // Check if the hole is a par 3
      const hole = await prisma.hole.findUnique({
        where: { id: holeId }
      });
      
      if (!hole) {
        return res.status(404).json({ error: 'Hole not found' });
      }
      
      if (hole.par !== 3) {
        return res.status(400).json({ error: 'CTP can only be recorded on par 3 holes' });
      }
      
      // Cast to any for working with new models
      const prismaAny = prisma as any;
      
      // Check if there is already a CTP for this hole and round
      const existingCTP = await prismaAny.cTPResult.findFirst({
        where: {
          tournamentId: id,
          holeId,
          round: round || 1
        }
      });
      
      if (existingCTP) {
        // Update existing result
        const updatedCTP = await prismaAny.cTPResult.update({
          where: { id: existingCTP.id },
          data: {
            playerId,
            distance: distance || null,
            prize: prize || null
          },
          include: {
            hole: {
              include: {
                course: true
              }
            },
            player: true
          }
        });
        
        res.status(200).json(updatedCTP);
      } else {
        // Create new result
        const newCTP = await prismaAny.cTPResult.create({
          data: {
            tournamentId: id,
            holeId,
            playerId,
            distance: distance || null,
            round: round || 1,
            prize: prize || null,
            paid: false
          },
          include: {
            hole: {
              include: {
                course: true
              }
            },
            player: true
          }
        });
        
        res.status(201).json(newCTP);
      }
    }
    // DELETE - Remove CTP result
    else if (req.method === 'DELETE') {
      const { ctpId } = req.body;
      
      if (!ctpId) {
        return res.status(400).json({ error: 'CTP ID is required' });
      }
      
      // Cast to any
      const prismaAny = prisma as any;
      await prismaAny.cTPResult.delete({
        where: { id: ctpId }
      });
      
      res.status(200).json({ message: 'CTP result deleted successfully' });
    } 
    else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error handling CTP request:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}