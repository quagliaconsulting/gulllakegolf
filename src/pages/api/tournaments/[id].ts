import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { TournamentService } from '@/services/tournament/tournamentService';
import { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendMethodNotAllowed
} from '@/services/api/apiResponse';

const prisma = new PrismaClient();

const tournamentService = new TournamentService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Tournament [id] endpoint requested', req.url);
  
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return sendError(res, 'Invalid tournament ID', 400);
  }
  
  // GET tournament details
  if (req.method === 'GET') {
    try {
      const includePaymentStatus = req.query.includeFull === 'true';
      const tournament = await tournamentService.getTournamentById(
        id, 
        true, 
        includePaymentStatus
      );
      
      if (!tournament) {
        // Check if tournament record exists at all
        const tournamentExists = await prisma.tournament.findUnique({
          where: { id },
          select: { id: true }
        });
        
        if (!tournamentExists) {
          console.log(`Tournament not found in database: ${id}`);
          return sendNotFound(res, 'Tournament not found');
        }
        
        // If the tournament record exists but service returned null,
        // return a minimal tournament object
        console.log(`Tournament ${id} exists but service returned no data. Returning minimal object.`);
        return sendSuccess(res, {
          id,
          name: "Tournament",
          teams: [],
          schedules: [],
          formatMultipliers: [],
          status: 'upcoming'
        });
      }
      
      return sendSuccess(res, tournament);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      return sendError(res, 'Failed to fetch tournament details');
    }
  }
  
  // PUT (update) tournament
  else if (req.method === 'PUT') {
    try {
      const data = req.body;
      const updatedTournament = await tournamentService.updateTournament(id, data);
      return sendSuccess(res, updatedTournament);
    } catch (error) {
      console.error('Error updating tournament:', error);
      return sendError(res, 'Failed to update tournament');
    }
  }
  
  // DELETE tournament
  else if (req.method === 'DELETE') {
    try {
      await tournamentService.deleteTournament(id);
      return sendSuccess(res, { message: 'Tournament deleted successfully' });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      return sendError(res, 'Failed to delete tournament');
    }
  }
  
  // Method not allowed
  else {
    return sendMethodNotAllowed(res, ['GET', 'PUT', 'DELETE']);
  }
}