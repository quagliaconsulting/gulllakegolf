import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { sendSuccess, sendError, sendMethodNotAllowed } from '@/services/api/apiResponse';

/**
 * DEVELOPMENT ONLY ROUTE
 * Cleans up test data by deleting all player pairings, matches, players, and teams
 * for a given tournament or for all tournaments if no ID is provided
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow this in development
  if (process.env.NODE_ENV === 'production') {
    return sendError(res, 'This endpoint is only available in development mode', 403);
  }

  if (req.method !== 'DELETE') {
    return sendMethodNotAllowed(res, ['DELETE']);
  }
  
  try {
    const { tournamentId } = req.query;
    
    // Track what we've deleted
    const results = {
      deletedPlayerPairings: 0,
      deletedHoleResults: 0,
      deletedCtpResults: 0,
      deletedSkinsResults: 0,
      deletedMatchPoints: 0,
      deletedMatches: 0,
      deletedPlayerPayments: 0,
      deletedPlayers: 0,
      deletedTeams: 0
    };
    
    // Delete records in the correct order to respect foreign key constraints
    
    // STEP 1: Find relevant teams if a tournament ID is provided
    let teamIds: string[] = [];
    if (tournamentId && typeof tournamentId === 'string') {
      const teams = await prisma.team.findMany({
        where: { tournamentId },
        select: { id: true }
      });
      teamIds = teams.map(t => t.id);
      console.log(`Found ${teamIds.length} teams in tournament ${tournamentId}`);
    }
    
    // STEP 2: Delete player pairings (relation between players and matches)
    if (tournamentId && typeof tournamentId === 'string') {
      // If tournament ID is provided, only delete pairings for matches in that tournament
      const pairingResult = await prisma.playerPairing.deleteMany({
        where: {
          match: {
            tournamentId
          }
        }
      });
      results.deletedPlayerPairings = pairingResult.count;
    } else {
      // Delete all pairings if no tournament ID is provided
      const pairingResult = await prisma.playerPairing.deleteMany({});
      results.deletedPlayerPairings = pairingResult.count;
    }
    
    // STEP 3: Delete hole results
    if (tournamentId && typeof tournamentId === 'string') {
      const holeResult = await prisma.holeResult.deleteMany({
        where: {
          match: {
            tournamentId
          }
        }
      });
      results.deletedHoleResults = holeResult.count;
    } else {
      const holeResult = await prisma.holeResult.deleteMany({});
      results.deletedHoleResults = holeResult.count;
    }
    
    // STEP 4: Delete CTP and Skins results
    if (tournamentId && typeof tournamentId === 'string') {
      const ctpResult = await prisma.cTPResult.deleteMany({
        where: { tournamentId }
      });
      results.deletedCtpResults = ctpResult.count;
      
      const skinsResult = await prisma.skinsResult.deleteMany({
        where: { tournamentId }
      });
      results.deletedSkinsResults = skinsResult.count;
    } else {
      const ctpResult = await prisma.cTPResult.deleteMany({});
      results.deletedCtpResults = ctpResult.count;
      
      const skinsResult = await prisma.skinsResult.deleteMany({});
      results.deletedSkinsResults = skinsResult.count;
    }
    
    // STEP 5: Delete match points
    if (tournamentId && typeof tournamentId === 'string') {
      const matchPointsResult = await prisma.matchPoints.deleteMany({
        where: {
          match: {
            tournamentId
          }
        }
      });
      results.deletedMatchPoints = matchPointsResult.count;
    } else {
      const matchPointsResult = await prisma.matchPoints.deleteMany({});
      results.deletedMatchPoints = matchPointsResult.count;
    }
    
    // STEP 6: Delete matches
    if (tournamentId && typeof tournamentId === 'string') {
      const matchesResult = await prisma.match.deleteMany({
        where: { tournamentId }
      });
      results.deletedMatches = matchesResult.count;
    } else {
      const matchesResult = await prisma.match.deleteMany({});
      results.deletedMatches = matchesResult.count;
    }
    
    // STEP 7: Delete player payments
    if (tournamentId && typeof tournamentId === 'string') {
      const paymentResult = await prisma.playerPayment.deleteMany({
        where: { tournamentId }
      });
      results.deletedPlayerPayments = paymentResult.count;
    } else {
      const paymentResult = await prisma.playerPayment.deleteMany({});
      results.deletedPlayerPayments = paymentResult.count;
    }
    
    // STEP 8: Delete players
    if (teamIds.length > 0) {
      // If we have team IDs, only delete players in those teams
      const playersResult = await prisma.player.deleteMany({
        where: {
          teamId: {
            in: teamIds
          }
        }
      });
      results.deletedPlayers = playersResult.count;
    } else if (tournamentId && typeof tournamentId === 'string') {
      // If we have tournament ID but no teams were found, just log it
      console.log(`No teams found for tournament ${tournamentId}, skipping player deletion`);
    } else {
      // Delete all players if no filters provided
      const playersResult = await prisma.player.deleteMany({});
      results.deletedPlayers = playersResult.count;
    }
    
    // STEP 9: Delete teams
    if (tournamentId && typeof tournamentId === 'string') {
      const teamsResult = await prisma.team.deleteMany({
        where: { tournamentId }
      });
      results.deletedTeams = teamsResult.count;
    } else {
      const teamsResult = await prisma.team.deleteMany({});
      results.deletedTeams = teamsResult.count;
    }
    
    return sendSuccess(res, {
      message: tournamentId ? 
        `Successfully cleaned up data for tournament ${tournamentId}` : 
        `Successfully cleaned up all tournament data`,
      counts: results
    });
  } catch (error) {
    console.error('Error cleaning up data:', error);
    return sendError(res, `Failed to clean up data: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}