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
  
  if (!tournamentId || typeof tournamentId !== 'string') {
    return sendValidationError(res, 'Invalid tournament ID');
  }
  
  try {
    if (req.method === 'GET') {
      // Get all matches for this tournament
      const matches = await prisma.match.findMany({
        where: { tournamentId },
        include: {
          course: true,
          format: true,
          schedule: true,
          homeTeam: true,
          awayTeam: true,
          points: true
        },
        orderBy: [
          { scheduleId: 'asc' },
          { teeTime: 'asc' }
        ]
      });
      
      return sendSuccess(res, { matches }, 200);
    } 
    else {
      return sendMethodNotAllowed(res, ['GET']);
    }
  } catch (error) {
    console.error('Error handling tournament matches:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return sendError(res, message, 500);
  }
}