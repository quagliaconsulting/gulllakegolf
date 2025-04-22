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
      // Get match details with all team players
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
          },
          tournament: {
            include: {
              teams: {
                include: {
                  players: true
                }
              }
            }
          }
        }
      });
      
      console.log(`Match ${id} found, homeTeam players: ${match?.homeTeam?.players?.length || 0}, awayTeam players: ${match?.awayTeam?.players?.length || 0}`);
      
      if (!match) {
        return sendNotFound(res, 'Match not found');
      }
      
      // Get assigned players
      const players = await matchService.getMatchPlayers(id);
      
      // We need the players from both teams involved in this match
      // For batch assign purposes, we don't care about "home team" designation in tournament
      // We only need to know which players belong to each team in the match
      const homeTeamId = match.homeTeamId;
      const awayTeamId = match.awayTeamId;
      
      // Get players directly from the database with extensive debugging
      // This is more reliable than going through nested team references
      console.log(`Looking for home players with teamId = ${homeTeamId}`);
      const homePlayers = await prisma.player.findMany({
        where: { teamId: homeTeamId }
      });
      
      console.log(`Looking for away players with teamId = ${awayTeamId}`);
      const awayPlayers = await prisma.player.findMany({
        where: { teamId: awayTeamId }
      });
      
      // Debug home player data
      if (homePlayers.length > 0) {
        console.log(`Found ${homePlayers.length} home players, first player:`, {
          id: homePlayers[0].id,
          name: homePlayers[0].name,
          teamId: homePlayers[0].teamId
        });
      } else {
        console.log(`WARNING: No home players found for teamId ${homeTeamId}`);
        
        // If 0 players found, check if the team exists and has any players
        const teamCheck = await prisma.team.findUnique({
          where: { id: homeTeamId },
          include: { players: true }
        });
        
        if (!teamCheck) {
          console.log(`ERROR: Home team with ID ${homeTeamId} does not exist`);
        } else {
          console.log(`Home team found: ${teamCheck.name} with ${teamCheck.players.length} players`);
          if (teamCheck.players.length > 0) {
            console.log(`First player in team from direct team query:`, {
              id: teamCheck.players[0].id,
              name: teamCheck.players[0].name,
              teamId: teamCheck.players[0].teamId
            });
          }
        }
      }
      
      // Debug away player data
      if (awayPlayers.length > 0) {
        console.log(`Found ${awayPlayers.length} away players, first player:`, {
          id: awayPlayers[0].id,
          name: awayPlayers[0].name,
          teamId: awayPlayers[0].teamId
        });
      } else {
        console.log(`WARNING: No away players found for teamId ${awayTeamId}`);
        
        // If 0 players found, check if the team exists and has any players
        const teamCheck = await prisma.team.findUnique({
          where: { id: awayTeamId },
          include: { players: true }
        });
        
        if (!teamCheck) {
          console.log(`ERROR: Away team with ID ${awayTeamId} does not exist`);
        } else {
          console.log(`Away team found: ${teamCheck.name} with ${teamCheck.players.length} players`);
          if (teamCheck.players.length > 0) {
            console.log(`First player in team from direct team query:`, {
              id: teamCheck.players[0].id,
              name: teamCheck.players[0].name,
              teamId: teamCheck.players[0].teamId
            });
          }
        }
      }
      
      console.log(`Direct DB query for players: home team (${homeTeamId}) has ${homePlayers.length} players, away team (${awayTeamId}) has ${awayPlayers.length} players`);
      
      // Add team info to each player for the frontend
      // Make sure we have valid players first and clean up the data to ensure it's serializable
      const allHomePlayers = Array.isArray(homePlayers) ? 
        homePlayers.map(player => {
          // Convert dates to ISO strings to avoid serialization issues
          const serializedPlayer = {
            id: player.id,
            name: player.name,
            handicapIndex: player.handicapIndex,
            email: player.email, 
            phone: player.phone,
            photoUrl: player.photoUrl,
            teamId: player.teamId,
            accommodationId: player.accommodationId
          };
          
          return {
            ...serializedPlayer,
            team: {
              id: homeTeamId,
              name: match.homeTeam?.name || 'Home Team',
              tournamentId: match.tournamentId,
              isHomeTeam: true
            }
          };
        }) : [];
      
      const allAwayPlayers = Array.isArray(awayPlayers) ? 
        awayPlayers.map(player => {
          // Convert dates to ISO strings to avoid serialization issues
          const serializedPlayer = {
            id: player.id,
            name: player.name,
            handicapIndex: player.handicapIndex,
            email: player.email, 
            phone: player.phone,
            photoUrl: player.photoUrl,
            teamId: player.teamId,
            accommodationId: player.accommodationId
          };
          
          return {
            ...serializedPlayer,
            team: {
              id: awayTeamId,
              name: match.awayTeam?.name || 'Away Team',
              tournamentId: match.tournamentId,
              isHomeTeam: false
            }
          };
        }) : [];
      
      // Debug what's going on with player data
      if (allHomePlayers.length > 0) {
        console.log(`Home player sample: ${JSON.stringify(allHomePlayers[0])}`);
      }
      
      if (allAwayPlayers.length > 0) {
        console.log(`Away player sample: ${JSON.stringify(allAwayPlayers[0])}`);
      }
      
      // Get all existing player pairings for the match to ensure we're showing the right data
      const existingPairings = await prisma.playerPairing.findMany({
        where: { matchId: id },
        include: { player: true }
      });
      
      // If no players were found via the service but we have pairings, build the player data
      let assignedHomePlayers = [];
      let assignedAwayPlayers = [];
      let homePlayersByGroup = {};
      let awayPlayersByGroup = {};
      let pairingGroups = [];
      
      if (!players && existingPairings.length > 0) {
        // Extract players from pairings directly
        assignedHomePlayers = existingPairings
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
        
        assignedAwayPlayers = existingPairings
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
        
        console.log(`Built player data directly from ${existingPairings.length} pairings: ${assignedHomePlayers.length} home, ${assignedAwayPlayers.length} away`);
      } else if (players) {
        // Use data from the service
        assignedHomePlayers = players.homePlayers;
        assignedAwayPlayers = players.awayPlayers;
        homePlayersByGroup = players.homePlayersByGroup;
        awayPlayersByGroup = players.awayPlayersByGroup;
        pairingGroups = players.pairingGroups;
      }
      
      // Log available players for debugging
      console.log(`Available team players for match ${id}:`, {
        homeTeamId: match.homeTeamId,
        homeTeamName: match.homeTeam?.name || 'Home Team',
        homePlayersCount: match.homeTeam?.players?.length || 0,
        awayTeamId: match.awayTeamId,
        awayTeamName: match.awayTeam?.name || 'Away Team',
        awayPlayersCount: match.awayTeam?.players?.length || 0
      });
      
      // Combine data and send response
      const response = {
        homePlayers: assignedHomePlayers || [],
        awayPlayers: assignedAwayPlayers || [],
        homePlayersByGroup: homePlayersByGroup || {},
        awayPlayersByGroup: awayPlayersByGroup || {},
        pairingGroups: pairingGroups || [],
        allHomePlayers: allHomePlayers || [],  // Ensure these are never undefined
        allAwayPlayers: allAwayPlayers || [],  // Ensure these are never undefined
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
      
      // Log what we're returning for debugging
      console.log(`API: Returning match players with ${assignedHomePlayers.length} home, ${assignedAwayPlayers.length} away players assigned, and ${allHomePlayers.length} home players and ${allAwayPlayers.length} away players available`);
      
      // Debug response content
      console.log(`Response allHomePlayers: ${Array.isArray(response.allHomePlayers) ? 'Array' : typeof response.allHomePlayers} with ${Array.isArray(response.allHomePlayers) ? response.allHomePlayers.length : 0} items`);
      console.log(`Response allAwayPlayers: ${Array.isArray(response.allAwayPlayers) ? 'Array' : typeof response.allAwayPlayers} with ${Array.isArray(response.allAwayPlayers) ? response.allAwayPlayers.length : 0} items`);
      
      // Full response structure debugging
      console.log(`API sending data structure: ${JSON.stringify({
        dataType: typeof response,
        keys: Object.keys(response),
        homeTeamData: {
          id: homeTeamId,
          name: match.homeTeam?.name || 'Home Team',
          playerCount: allHomePlayers.length,
          samplePlayer: allHomePlayers.length > 0 ? allHomePlayers[0].id : 'none'
        },
        awayTeamData: {
          id: awayTeamId,
          name: match.awayTeam?.name || 'Away Team',
          playerCount: allAwayPlayers.length,
          samplePlayer: allAwayPlayers.length > 0 ? allAwayPlayers[0].id : 'none'
        }
      })}`);
      
      // Check if the match has correct team IDs that match our database
      console.log(`Match team IDs: homeTeamId=${homeTeamId}, awayTeamId=${awayTeamId}`);
      
      // Log player counts for debugging
      if (allHomePlayers.length === 0 || allAwayPlayers.length === 0) {
        console.log(`WARNING: One or more teams have no players for match ${id}. Tournament ID: ${match.tournamentId}`);
        console.log(`Home team ${match.homeTeam?.name} (${homeTeamId}): ${allHomePlayers.length} players`);
        console.log(`Away team ${match.awayTeam?.name} (${awayTeamId}): ${allAwayPlayers.length} players`);
      }
      
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