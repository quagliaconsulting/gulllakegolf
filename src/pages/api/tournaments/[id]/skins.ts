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
    
    // GET - Fetch Skins results for this tournament
    if (req.method === 'GET') {
      // Cast prisma to any for new models
      const prismaAny = prisma as any;
      const skinsResults = await prismaAny.skinsResult.findMany({
        where: { tournamentId: id },
        include: {
          player: true
        },
        orderBy: {
          holeNumber: 'asc'
        }
      });
      
      res.status(200).json(skinsResults);
    } 
    // POST - Add new Skin result
    else if (req.method === 'POST') {
      const { playerId, matchId, holeNumber, score, prize } = req.body;
      
      if (!playerId || !holeNumber || !score) {
        return res.status(400).json({ error: 'Player ID, hole number, and score are required' });
      }
      
      // Cast prisma to any for new models
      const prismaAny = prisma as any;
      
      // Check if there is already a Skin for this hole
      const existingSkin = await prismaAny.skinsResult.findFirst({
        where: {
          tournamentId: id,
          holeNumber: Number(holeNumber)
        }
      });
      
      if (existingSkin) {
        // Update existing result
        const updatedSkin = await prismaAny.skinsResult.update({
          where: { id: existingSkin.id },
          data: {
            playerId,
            matchId: matchId || null,
            score: Number(score),
            prize: prize || null
          },
          include: {
            player: true
          }
        });
        
        // Update the holeResult in the match to mark it as a skin
        if (matchId) {
          // Find the hole ID for this hole number
          const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
              course: {
                include: {
                  holes: true
                }
              }
            }
          });
          
          if (match) {
            const hole = match.course.holes.find(h => h.number === Number(holeNumber));
            
            if (hole) {
              // Update the hole result to mark it as a skin - use any for custom field
              await prisma.holeResult.updateMany({
                where: {
                  matchId,
                  holeId: hole.id
                },
                data: {
                  // Cast to any to handle custom field
                  isSkin: true
                } as any
              });
            }
          }
        }
        
        res.status(200).json(updatedSkin);
      } else {
        // Create new result
        const newSkin = await prismaAny.skinsResult.create({
          data: {
            tournamentId: id,
            playerId,
            matchId: matchId || null,
            holeNumber: Number(holeNumber),
            score: Number(score),
            prize: prize || null,
            paid: false
          },
          include: {
            player: true
          }
        });
        
        // Update the holeResult in the match to mark it as a skin
        if (matchId) {
          // Find the hole ID for this hole number
          const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
              course: {
                include: {
                  holes: true
                }
              }
            }
          });
          
          if (match) {
            const hole = match.course.holes.find(h => h.number === Number(holeNumber));
            
            if (hole) {
              // Update the hole result to mark it as a skin
              await prisma.holeResult.updateMany({
                where: {
                  matchId,
                  holeId: hole.id
                },
                data: {
                  // Cast to any to handle custom field
                  isSkin: true
                } as any
              });
            }
          }
        }
        
        res.status(201).json(newSkin);
      }
    }
    // DELETE - Remove Skin result
    else if (req.method === 'DELETE') {
      const { skinId } = req.body;
      
      if (!skinId) {
        return res.status(400).json({ error: 'Skin ID is required' });
      }
      
      // Cast to any for new models
      const prismaAny = prisma as any;
      
      // Get the skin to find match and hole info before deleting
      const skin = await prismaAny.skinsResult.findUnique({
        where: { id: skinId }
      });
      
      if (skin?.matchId) {
        // Find the hole ID for this hole number to update the hole result
        const match = await prisma.match.findUnique({
          where: { id: skin.matchId },
          include: {
            course: {
              include: {
                holes: true
              }
            }
          }
        });
        
        if (match) {
          const hole = match.course.holes.find(h => h.number === skin.holeNumber);
          
          if (hole) {
            // Update the hole result to unmark it as a skin
            await prisma.holeResult.updateMany({
              where: {
                matchId: skin.matchId,
                holeId: hole.id
              },
              data: {
                // Cast to any to handle custom field
                isSkin: false
              } as any
            });
          }
        }
      }
      
      // Now delete the skin
      await prismaAny.skinsResult.delete({
        where: { id: skinId }
      });
      
      res.status(200).json({ message: 'Skin result deleted successfully' });
    } 
    else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error handling Skins request:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}