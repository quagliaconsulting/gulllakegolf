import type { NextApiRequest, NextApiResponse } from 'next';
import { MatchService } from '@/services/match/matchService';
import { AuthService } from '@/services/api/authService';
import { prisma } from '@/lib/prisma';
import { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendValidationError, 
  sendMethodNotAllowed 
} from '@/services/api/apiResponse';
import { isHomeTeam } from '@/utils/teamUtils';

const matchService = new MatchService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return sendValidationError(res, 'Invalid match ID');
  }
  
  // Authenticate request - currently commented out until auth is fully migrated
  // const auth = AuthService.authenticate(req, res);
  // if (!auth) return; // Response already sent by authenticate method
  
  try {
    if (req.method === 'GET') {
      // Get match details
      const match = await prisma.match.findUnique({
        where: { id },
        include: {
          homeTeam: {
            include: {
              players: true
            }
          },
          awayTeam: {
            include: {
              players: true
            }
          }
        }
      });
      
      if (!match) {
        return sendNotFound(res, 'Match not found');
      }
      
      // Get assigned players
      const players = await matchService.getMatchPlayers(id);
      
      // Add team players as available options - create a team object for each player
      const allHomePlayers = (match.homeTeam?.players || []).map(player => ({
        ...player,
        team: {
          id: match.homeTeamId,
          name: match.homeTeam?.name || 'Home Team',
          tournamentId: match.tournamentId,
          isHomeTeam: true,
          metadata: match.homeTeam?.metadata || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }));
      
      const allAwayPlayers = (match.awayTeam?.players || []).map(player => ({
        ...player,
        team: {
          id: match.awayTeamId,
          name: match.awayTeam?.name || 'Away Team',
          tournamentId: match.tournamentId,
          isHomeTeam: false,
          metadata: match.awayTeam?.metadata || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }));
      
      // Get all existing player pairings for the match to ensure we're showing the right data
      const existingPairings = await prisma.playerPairing.findMany({
        where: { matchId: id },
        include: { player: true }
      });
      
      // If no players were found via the service but we have pairings, build the player data
      let homePlayers = [];
      let awayPlayers = [];
      let homePlayersByGroup = {};
      let awayPlayersByGroup = {};
      let pairingGroups = [];
      
      if (!players && existingPairings.length > 0) {
        // Extract players from pairings directly
        homePlayers = existingPairings
          .filter(p => p.isHomeTeam)
          .map(p => ({
            ...p.player,
            team: {
              id: match.homeTeamId,
              name: match.homeTeam?.name || 'Home Team',
              tournamentId: match.tournamentId,
              metadata: match.homeTeam?.metadata || null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }));
        
        awayPlayers = existingPairings
          .filter(p => !p.isHomeTeam)
          .map(p => ({
            ...p.player,
            team: {
              id: match.awayTeamId,
              name: match.awayTeam?.name || 'Away Team',
              tournamentId: match.tournamentId,
              metadata: match.awayTeam?.metadata || null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }));
        
        // Group players by pairingGroup
        existingPairings.forEach(pairing => {
          const group = pairing.pairingGroup || 1;
          
          if (pairing.isHomeTeam) {
            if (!homePlayersByGroup[group]) {
              homePlayersByGroup[group] = [];
            }
            homePlayersByGroup[group].push(pairing.player);
          } else {
            if (!awayPlayersByGroup[group]) {
              awayPlayersByGroup[group] = [];
            }
            awayPlayersByGroup[group].push(pairing.player);
          }
        });
        
        pairingGroups = [...new Set(existingPairings.map(p => p.pairingGroup || 1))];
        
        console.log(`Built player data directly from ${existingPairings.length} pairings: ${homePlayers.length} home, ${awayPlayers.length} away`);
      } else if (players) {
        // Use data from the service
        homePlayers = players.homePlayers;
        awayPlayers = players.awayPlayers;
        homePlayersByGroup = players.homePlayersByGroup;
        awayPlayersByGroup = players.awayPlayersByGroup;
        pairingGroups = players.pairingGroups;
      }
      
      // Combine data and send response
      const response = {
        homePlayers: homePlayers || [],
        awayPlayers: awayPlayers || [],
        homePlayersByGroup: homePlayersByGroup || {},
        awayPlayersByGroup: awayPlayersByGroup || {},
        pairingGroups: pairingGroups || [],
        allHomePlayers: allHomePlayers,
        allAwayPlayers: allAwayPlayers,
        homeTeam: match.homeTeam?.name || 'Home Team',
        awayTeam: match.awayTeam?.name || 'Away Team',
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        tournamentId: match.tournamentId,
        scheduleId: match.scheduleId,
        formatId: match.formatId,
        courseId: match.courseId,
        startingHole: match.startingHole,
        teeTime: match.teeTime,
        isSingles: true, // Default for now, will update with proper format check later
        isPairsFormat: false, // Default for now, will update with proper format check later
        isFourManTeam: false, // Default for now, will update with proper format check later
        playerToPlayerMatch: match.playerToPlayerMatch || false,
        foursomeGroupId: match.foursomeGroupId
      };
      
      console.log(`API: Returning match players with ${homePlayers.length} home, ${awayPlayers.length} away players assigned, and ${allHomePlayers.length} home players and ${allAwayPlayers.length} away players available`);
      
      return sendSuccess(res, response, 200);
    } 
    else if (req.method === 'POST') {
      const { homePlayers, awayPlayers } = req.body;
      
      if (!Array.isArray(homePlayers) || !Array.isArray(awayPlayers)) {
        return sendValidationError(res, 'Invalid player data. Arrays of player IDs expected.');
      }
      
      // First remove existing player pairings
      await prisma.playerPairing.deleteMany({
        where: { matchId: id }
      });
      
      // Then create new pairings
      const homePairings = homePlayers.map((playerId, index) => ({
        matchId: id,
        playerId,
        isHomeTeam: true,
        pairingGroup: index + 1
      }));
      
      const awayPairings = awayPlayers.map((playerId, index) => ({
        matchId: id,
        playerId,
        isHomeTeam: false,
        pairingGroup: index + 1
      }));
      
      // Create all pairings
      await prisma.playerPairing.createMany({
        data: [...homePairings, ...awayPairings]
      });
      
      return sendSuccess(res, { 
        message: 'Players assigned successfully',
        homePlayers,
        awayPlayers 
      }, 200);
    }
    else {
      return sendMethodNotAllowed(res, ['GET', 'POST']);
    }
  } catch (error) {
    console.error('Error handling match players:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return sendError(res, message, 500);
  }
}