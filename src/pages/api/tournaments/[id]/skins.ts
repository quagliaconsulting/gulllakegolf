import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendValidationError, 
  sendMethodNotAllowed 
} from '@/services/api/apiResponse';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id: tournamentId } = req.query;
  const matchId = req.query.matchId as string | undefined;
  
  if (!tournamentId || typeof tournamentId !== 'string') {
    return sendValidationError(res, 'Invalid tournament ID');
  }
  
  try {
    
    // GET - fetch skins results
    if (req.method === 'GET') {
      const query: any = {
        where: { tournamentId },
        include: {
          player: true
        },
        orderBy: {
          holeNumber: 'asc'
        }
      };
      
      // Filter by matchId if provided
      if (matchId) {
        query.where.matchId = matchId;
      }
      
      const skinsResults = await prisma.skinsResult.findMany(query);
      
      return sendSuccess(res, { skinsResults }, 200);
    } 
    // POST - create/update skin results
    else if (req.method === 'POST') {
      const { playerId, holeNumber, score, matchId } = req.body;
      
      if (!playerId || !holeNumber || !score) {
        return sendValidationError(res, 'Missing required fields');
      }
      
      // Check if this hole already has a skin result
      const existingSkin = await prisma.skinsResult.findFirst({
        where: {
          tournamentId,
          holeNumber: Number(holeNumber)
        }
      });
      
      let result;
      
      if (existingSkin) {
        // Update existing skin
        result = await prisma.skinsResult.update({
          where: { id: existingSkin.id },
          data: {
            playerId,
            score: Number(score),
            matchId: matchId || null
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
              await prisma.holeResult.updateMany({
                where: {
                  matchId,
                  holeId: hole.id
                },
                data: {
                  isSkin: true
                }
              });
            }
          }
        }
      } else {
        // Create new skin
        result = await prisma.skinsResult.create({
          data: {
            tournamentId,
            playerId,
            holeNumber: Number(holeNumber),
            score: Number(score),
            matchId: matchId || null,
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
              await prisma.holeResult.updateMany({
                where: {
                  matchId,
                  holeId: hole.id
                },
                data: {
                  isSkin: true
                }
              });
            }
          }
        }
      }
      
      return sendSuccess(res, { skin: result }, 200);
    }
    // DELETE - remove a skin result
    else if (req.method === 'DELETE') {
      const { skinId } = req.body;
      
      if (!skinId) {
        return sendValidationError(res, 'Missing skin ID');
      }
      
      // Check if skin exists
      const existingSkin = await prisma.skinsResult.findUnique({
        where: { id: skinId }
      });
      
      if (!existingSkin) {
        return sendNotFound(res, 'Skin result not found');
      }
      
      // Update the holeResult in the match to unmark it as a skin
      if (existingSkin.matchId) {
        // Find the hole ID for this hole number to update the hole result
        const match = await prisma.match.findUnique({
          where: { id: existingSkin.matchId },
          include: {
            course: {
              include: {
                holes: true
              }
            }
          }
        });
        
        if (match) {
          const hole = match.course.holes.find(h => h.number === existingSkin.holeNumber);
          
          if (hole) {
            // Update the hole result to unmark it as a skin
            await prisma.holeResult.updateMany({
              where: {
                matchId: existingSkin.matchId,
                holeId: hole.id
              },
              data: {
                isSkin: false
              }
            });
          }
        }
      }
      
      // Delete the skin
      await prisma.skinsResult.delete({
        where: { id: skinId }
      });
      
      return sendSuccess(res, { message: 'Skin result deleted successfully' }, 200);
    }
    else {
      return sendMethodNotAllowed(res, ['GET', 'POST', 'DELETE']);
    }
  } catch (error) {
    console.error('Error handling skin results:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return sendError(res, message, 500);
  }
}