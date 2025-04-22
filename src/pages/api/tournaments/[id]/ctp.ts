import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/utils/auth';
import { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendValidationError, 
  sendMethodNotAllowed 
} from '@/services/api/apiResponse';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return sendValidationError(res, 'Invalid tournament ID');
  }
  
  // Authenticate request (optional now, but best practice)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.cookies?.token;
    if (!verifyToken(token, res)) {
      return; // Response already sent by verifyToken
    }
  }
  
  try {
    // GET - Retrieve CTP results for a tournament/match
    if (req.method === 'GET') {
      const { matchId } = req.query;
      let queryOptions: any = { tournamentId: id };

      // If a specific matchId is provided, filter by that match
      if (matchId && typeof matchId === 'string') {
        // For a match, we need to get the holes associated with the match's course
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          include: { course: true }
        });
        
        if (!match) {
          return sendNotFound(res, 'Match not found');
        }
        
        queryOptions.holeId = {
          in: (await prisma.hole.findMany({
            where: { courseId: match.courseId, isPar3: true },
            select: { id: true }
          })).map(hole => hole.id)
        };
      }
      
      const ctpResults = await prisma.cTPResult.findMany({
        where: queryOptions,
        include: {
          player: true,
          hole: true
        }
      });
      
      return sendSuccess(res, { ctpResults }, 200);
    } 
    // POST - Create or update a CTP result
    else if (req.method === 'POST') {
      const { holeId, playerId, matchId } = req.body;
      
      if (!holeId) {
        return sendValidationError(res, 'Hole ID is required');
      }
      
      // Check if the hole exists and is a par 3
      const hole = await prisma.hole.findUnique({
        where: { id: holeId }
      });
      
      if (!hole) {
        return sendNotFound(res, 'Hole not found');
      }
      
      if (!hole.isPar3) {
        return sendValidationError(res, 'CTP winners can only be assigned to par 3 holes');
      }
      
      // If playerId is null, we're removing the CTP winner
      if (playerId === null) {
        // First check if there's an existing record
        const existingRecord = await prisma.cTPResult.findFirst({
          where: {
            tournamentId: id,
            holeId
          }
        });
        
        // If there is, delete it
        if (existingRecord) {
          await prisma.cTPResult.delete({
            where: {
              id: existingRecord.id
            }
          });
        }
        
        return sendSuccess(res, { message: 'CTP winner removed' }, 200);
      }
      
      // Check if the player exists
      const player = await prisma.player.findUnique({
        where: { id: playerId }
      });
      
      if (!player) {
        return sendNotFound(res, 'Player not found');
      }
      
      // Process distance if provided
      const { distance } = req.body;
      let distanceValue: number | null = null;
      
      if (distance) {
        // Simple distance parsing from formats like "5ft 6in" or "66in"
        // Convert to inches for storage
        try {
          if (distance.includes('ft') && distance.includes('in')) {
            // Format: "5ft 6in"
            const ftPart = distance.split('ft')[0].trim();
            const inPart = distance.split('ft')[1].split('in')[0].trim();
            distanceValue = (parseInt(ftPart, 10) * 12) + parseInt(inPart, 10);
          } else if (distance.includes('ft')) {
            // Format: "5ft"
            const ftPart = distance.split('ft')[0].trim();
            distanceValue = parseInt(ftPart, 10) * 12;
          } else if (distance.includes('in')) {
            // Format: "66in"
            const inPart = distance.split('in')[0].trim();
            distanceValue = parseInt(inPart, 10);
          } else {
            // Try to parse as just a number (assumed inches)
            distanceValue = parseInt(distance, 10);
          }
        } catch (e) {
          console.warn('Error parsing distance:', e);
          // If parsing fails, ignore the distance
        }
      }
      
      // Check if there's an existing CTP result for this hole
      const existingCtpResult = await prisma.cTPResult.findFirst({
        where: {
          tournamentId: id,
          holeId
        }
      });
      
      let ctpResult;
      
      // Update existing record or create a new one
      if (existingCtpResult) {
        ctpResult = await prisma.cTPResult.update({
          where: {
            id: existingCtpResult.id
          },
          data: {
            playerId,
            distance: distanceValue
          }
        });
      } else {
        ctpResult = await prisma.cTPResult.create({
          data: {
            tournamentId: id,
            holeId,
            playerId,
            distance: distanceValue,
            round: 1, // Default to first round
            prize: null, // Will be calculated later
            paid: false
          }
        });
      }
      
      return sendSuccess(res, { ctpResult }, 200);
    } 
    else {
      return sendMethodNotAllowed(res, ['GET', 'POST']);
    }
  } catch (error) {
    console.error('Error handling CTP endpoint:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return sendError(res, message, 500);
  }
}