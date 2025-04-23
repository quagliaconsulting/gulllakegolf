import { prisma } from '@/lib/prisma';
import { calculateTeamHandicap, calculateNetScore, determineHoleWinner, getStrokesOnHole } from '@/utils/handicap';
import { isHomeTeam } from '@/utils/teamUtils';

export interface HoleScoreUpdate {
  holeNumber: number;
  homeGross: number | null;
  awayGross: number | null;
  homePlayerScores?: Record<string, number | null>;
  awayPlayerScores?: Record<string, number | null>;
  // TypeScript doesn't need to know about these properties at compile time,
  // but we want to allow them at runtime
  [key: string]: any;
}

export interface PlayerMatchup {
  homePlayerId: string;
  awayPlayerId: string;
}

export interface FoursomeCreateParams {
  tournamentId: string;
  scheduleId: string;
  formatId: string;
  homeTeamId: string;
  awayTeamId: string;
  courseId: string;
  startingHole: number;
  teeTime: string | Date;
  matchups: PlayerMatchup[];
}

export class MatchService {
  /**
   * Get match details including course, holes, teams, players and existing scores
   */
  async getMatchWithScores(matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        format: true,
        course: {
          include: {
            holes: {
              orderBy: {
                number: 'asc',
              }
            }
          }
        },
        holeResults: {
          include: {
            hole: true,
          },
          orderBy: {
            hole: {
              number: 'asc',
            }
          }
        },
        playerPairings: {
          include: {
            player: true,
          }
        },
        points: true,
      }
    });

    if (!match) {
      return null;
    }

    // Get players
    const homePlayers = match.playerPairings
      .filter(p => p.isHomeTeam)
      .map(p => p.player);
      
    const awayPlayers = match.playerPairings
      .filter(p => !p.isHomeTeam)
      .map(p => p.player);
      
    // Calculate team handicaps using the updated handicap function that handles different formats
    // Pass format name for specialized calculations based on format type
    const homeTeamHandicap = calculateTeamHandicap(
      homePlayers.map(p => p.handicapIndex),
      match.format.multiplier,
      match.format.isFourManTeam || false,
      match.format.formatName
    );
    
    const awayTeamHandicap = calculateTeamHandicap(
      awayPlayers.map(p => p.handicapIndex),
      match.format.multiplier,
      match.format.isFourManTeam || false,
      match.format.formatName
    );
    
    // Log handicap details for debugging
    console.log(`Match ${match.id} handicaps using format ${match.format.formatName} (multiplier: ${match.format.multiplier}):`);
    console.log(`- Home team: ${homeTeamHandicap.toFixed(1)}, Away team: ${awayTeamHandicap.toFixed(1)}`);
    
    // Filter holes based on the match's startingHole
    const relevantHoles = match.course.holes.filter(hole => {
      // For matches starting on hole 1, include only front 9
      if (match.startingHole === 1) {
        return hole.number <= 9;
      }
      // For matches starting on hole 10, include only back 9 
      else if (match.startingHole === 10) {
        return hole.number > 9;
      }
      // For any other startingHole value, include all holes
      return true;
    });
    
    // Format hole results
    const holes = relevantHoles.map(hole => {
      const holeResult = match.holeResults.find(r => r.holeId === hole.id);
      
      // Determine winner based on saved net scores
      const winner = this.getWinner(holeResult);
      
      // Extract player-level scores from metadata if available
      const metadata = holeResult?.metadata as any;
      const homePlayerScores = metadata?.homePlayerScores || {};
      const awayPlayerScores = metadata?.awayPlayerScores || {};
      
      // Log the extracted player scores for debugging
      if (metadata?.homePlayerScores || metadata?.awayPlayerScores) {
        console.log(`Hole ${hole.number} player scores from metadata:`, {
          home: metadata?.homePlayerScores,
          away: metadata?.awayPlayerScores
        });
      }
      
      // Create formatted hole result with all necessary data
      return {
        id: hole.id,
        number: hole.number,
        par: hole.par,
        handicap: hole.handicap,
        isPar3: hole.isPar3,
        homeGross: holeResult?.homeTeamGrossScore ?? null,
        awayGross: holeResult?.awayTeamGrossScore ?? null,
        homeNet: holeResult?.homeTeamNetScore ?? null,
        awayNet: holeResult?.awayTeamNetScore ?? null,
        winner,
        // Include player-level scores for Singles/Best Ball formats
        homePlayerScores,
        awayPlayerScores
      };
    });

    // Handle foursome matches
    let foursomeMatches = null;
    let aggregatedPoints = match.points; // Default to individual match points
    
    // Check if this is a Singles match that might be part of a paired foursome
    const isSinglesFormat = match.format.formatName === 'Singles' || match.formatId === 'SINGLES';

    if (isSinglesFormat) {
      console.log(`[getMatchWithScores] Match ${match.id} is Singles. Checking for paired match using player logic...`);
      
      // 1. Get players in the current match
      const currentPlayerHome = homePlayers.length > 0 ? homePlayers[0] : null;
      const currentPlayerAway = awayPlayers.length > 0 ? awayPlayers[0] : null;
      
      let siblingMatchId: string | null = null;

      if (currentPlayerHome && currentPlayerAway) {
        console.log(`[getMatchWithScores] Current match players: ${currentPlayerHome.name} vs ${currentPlayerAway.name}`);
        
        // 2. Find potential sibling matches (same tournament, tee time, teams) - RELAXED
        const potentialSiblingMatches = await prisma.match.findMany({
          where: {
            id: { not: matchId }, // Exclude self
            tournamentId: match.tournamentId,
            teeTime: match.teeTime,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            // REMOVED startingHole check for quickest fix
          },
          include: {
            playerPairings: { include: { player: true } } 
          }
        });
        
        console.log(`[getMatchWithScores] Found ${potentialSiblingMatches.length} potential sibling matches at the same time/teams.`);

        // 3. Find the specific sibling match involving the *other* players
        if (potentialSiblingMatches.length > 0) {
          // Get all players for the home and away teams in this tournament
          const allTeamPlayers = await prisma.player.findMany({
             where: {
               teamId: { in: [match.homeTeamId, match.awayTeamId] }
             }
          });
          const allHomeTeamPlayers = allTeamPlayers.filter(p => p.teamId === match.homeTeamId);
          const allAwayTeamPlayers = allTeamPlayers.filter(p => p.teamId === match.awayTeamId);

          // Find the players NOT in the current match
          const otherHomePlayer = allHomeTeamPlayers.find(p => p.id !== currentPlayerHome.id);
          const otherAwayPlayer = allAwayTeamPlayers.find(p => p.id !== currentPlayerAway.id);

          if (otherHomePlayer && otherAwayPlayer) {
             console.log(`[getMatchWithScores] Other potential players in foursome: ${otherHomePlayer.name} vs ${otherAwayPlayer.name}`);
             
             // Check potential siblings for the correct pairing
             const actualSiblings = potentialSiblingMatches.filter(potentialMatch => {
               const siblingHome = potentialMatch.playerPairings.find(p => p.isHomeTeam)?.player;
               const siblingAway = potentialMatch.playerPairings.find(p => !p.isHomeTeam)?.player;
               return siblingHome?.id === otherHomePlayer.id && siblingAway?.id === otherAwayPlayer.id;
             });

             if (actualSiblings.length === 1) {
               siblingMatchId = actualSiblings[0].id;
               console.log(`[getMatchWithScores] Found unique sibling match by player pairing: ${siblingMatchId}. Aggregating points.`);
             } else {
               console.log(`[getMatchWithScores] Did not find a unique sibling match with the correct player pairing (found ${actualSiblings.length}).`);
             }
          } else {
            console.log(`[getMatchWithScores] Could not find the other home/away players for this foursome.`);
          }
        }
      }
      
      // 4. Aggregate points if a unique sibling was identified
      if (siblingMatchId) {
         // Fetch points for both matches
          const allGroupPoints = await prisma.matchPoints.findMany({
            where: {
              matchId: { in: [matchId, siblingMatchId] }
            }
          });

          console.log(`[getMatchWithScores] Found points records for paired matches:`, JSON.stringify(allGroupPoints));

          let totalHomePoints = 0;
          let totalAwayPoints = 0;
          allGroupPoints.forEach(p => {
            totalHomePoints += p.homeTeamPoints;
            totalAwayPoints += p.awayTeamPoints;
          });

          aggregatedPoints = {
            matchId: match.id, // Keep association
            homeTeamPoints: totalHomePoints,
            awayTeamPoints: totalAwayPoints
          };
          console.log(`Aggregated points for paired matches ${matchId} & ${siblingMatchId}: Home=${totalHomePoints}, Away=${totalAwayPoints}`);
          
          // Fetch the full sibling match data for the foursomeMatches display
          foursomeMatches = await this.getRelatedFoursomeMatchesByIds([siblingMatchId]);
      } else {
        console.log(`[getMatchWithScores] Proceeding with individual points for match ${matchId}.`);
        foursomeMatches = null;
      }
    } else {
      console.log(`[getMatchWithScores] Match ${match.id} is not Singles format. Using individual points.`);
      foursomeMatches = null; // Not part of a relevant foursome display
    }
    
    // Consistently determine real team status using our utility function
    const homeTeamIsReal = isHomeTeam(match.homeTeam);
    const awayTeamIsReal = isHomeTeam(match.awayTeam);

    // Format the final result
    const result = {
      id: match.id,
      tournamentId: match.tournamentId, // Include tournamentId in the response
      format: match.format.formatName,
      formatMultiplier: match.format.multiplier,
      isFourManTeam: match.format.isFourManTeam || false,
      playerToPlayerMatch: match.playerToPlayerMatch || false,
      foursomeGroupId: match.foursomeGroupId || null,
      homeTeam: match.homeTeam?.name || 'Team 1',
      homeTeamId: match.homeTeamId,
      homeTeamIsReal,
      awayTeam: match.awayTeam?.name || 'Team 2',
      awayTeamId: match.awayTeamId,
      awayTeamIsReal,
      time: match.teeTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true, 
        timeZone: 'UTC' 
      }),
      course: match.course.name,
      startingHole: match.startingHole,
      holeCount: match.startingHole === 1 || match.startingHole === 10 ? 9 : 18,
      homePlayers,
      awayPlayers,
      holes,
      homeTeamHandicap,
      awayTeamHandicap,
      points: aggregatedPoints,
      foursomeMatches
    };
    
    // Log out player data for debugging
    console.log(`Match ${match.id} with players:`, {
      homePlayerCount: homePlayers.length,
      awayPlayerCount: awayPlayers.length
    });
    
    return result;
  }

  /**
   * Get all players assigned to a match
   */
  async getMatchPlayers(matchId: string) {
    // Get match details to understand teams
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        tournamentId: true,
        homeTeam: {
          select: {
            id: true,
            name: true,
            metadata: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            metadata: true
          }
        }
      }
    });
    
    if (!match) {
      return null;
    }
    
    // Is each team a home team (in game terms)?
    const homeTeamIsReal = isHomeTeam(match.homeTeam);
    const awayTeamIsReal = isHomeTeam(match.awayTeam);
    
    const matchPlayers = await prisma.playerPairing.findMany({
      where: { 
        matchId 
      },
      include: {
        player: {
          include: {
            team: true
          }
        },
      },
      orderBy: {
        player: {
          name: 'asc'
        }
      }
    });

    if (matchPlayers.length === 0) {
      console.log(`No player pairings found for match ${matchId}`);
      return null;
    }

    // Add proper team context to the player objects
    const homePlayers = matchPlayers
      .filter(p => p.isHomeTeam)
      .map(p => {
        // Ensure team object exists
        const playerTeam = p.player.team || {
          id: match.homeTeamId,
          name: match.homeTeam?.name || 'Home Team',
          tournamentId: match.tournamentId || '',
          metadata: match.homeTeam?.metadata || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        return {
          ...p.player,
          team: {
            ...playerTeam,
            isHomeTeam: homeTeamIsReal
          }
        };
      });
      
    const awayPlayers = matchPlayers
      .filter(p => !p.isHomeTeam)
      .map(p => {
        // Ensure team object exists
        const playerTeam = p.player.team || {
          id: match.awayTeamId,
          name: match.awayTeam?.name || 'Away Team',
          tournamentId: match.tournamentId || '',
          metadata: match.awayTeam?.metadata || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        return {
          ...p.player,
          team: {
            ...playerTeam,
            isHomeTeam: awayTeamIsReal
          }
        };
      });

    // Group players by pairingGroup if this is a singles/foursome match
    // This ensures players are shown in their proper groups
    const homePlayersByGroup: { [key: number]: typeof homePlayers } = {};
    const awayPlayersByGroup: { [key: number]: typeof awayPlayers } = {};

    matchPlayers.forEach(pairing => {
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

    return {
      homePlayers,
      awayPlayers,
      homePlayersByGroup,
      awayPlayersByGroup,
      pairingGroups: Object.keys(homePlayersByGroup).map(Number)
    };
  }

  /**
   * Update scores for multiple holes in a match
   */
  async updateMatchScores(matchId: string, holeResults: HoleScoreUpdate[]) {
    if (!Array.isArray(holeResults) || holeResults.length === 0) {
      throw new Error('No hole results provided');
    }

    // Get match details
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        format: true,
        course: {
          include: {
            holes: true,
          }
        },
        playerPairings: {
          include: {
            player: true,
          }
        },
      }
    });
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Get players from match
    const homePlayers = match.playerPairings
      .filter(p => p.isHomeTeam)
      .map(p => p.player);
      
    const awayPlayers = match.playerPairings
      .filter(p => !p.isHomeTeam)
      .map(p => p.player);
    
    // For handicap calculation and scoring logic
    const isSinglesMatch = match.format.formatName === 'Singles' || match.formatId === 'SINGLES';
    const isPlayerToPlayerMatch = match.playerToPlayerMatch || false;
    
    // Calculate handicaps using the updated handicap function that handles all formats
    const homeTeamHandicap = calculateTeamHandicap(
      homePlayers.map(p => p.handicapIndex),
      match.format.multiplier,
      match.format.isFourManTeam || false,
      match.format.formatName
    );
    
    const awayTeamHandicap = calculateTeamHandicap(
      awayPlayers.map(p => p.handicapIndex),
      match.format.multiplier,
      match.format.isFourManTeam || false,
      match.format.formatName
    );
    
    // Log handicap details for scoring calculation
    console.log(`Match ${match.id} updating scores with handicaps:`);
    console.log(`- Format: ${match.format.formatName} (multiplier: ${match.format.multiplier})`);
    console.log(`- Home team handicap: ${homeTeamHandicap.toFixed(1)}`);
    console.log(`- Away team handicap: ${awayTeamHandicap.toFixed(1)}`);
    
    // Process each hole score
    const updates = [];
    for (const holeData of holeResults) {
      const holeNumber = holeData.holeNumber;
      if (!holeNumber || !match.course.holes.some(h => h.number === holeNumber)) {
        console.warn(`Skipping invalid hole number: ${holeNumber}`);
        continue;
      }
      
      const hole = match.course.holes.find(h => h.number === holeNumber);
      
      if (!hole) {
        console.warn(`Could not find hole definition for number: ${holeNumber}`);
        continue;
      }
      
      // Convert empty strings or undefined gross scores to null
      let homeGross = holeData.homeGross === null || holeData.homeGross === undefined || 
                      (typeof holeData.homeGross === 'string' && holeData.homeGross === '') ? 
        null : Number(holeData.homeGross);
      let awayGross = holeData.awayGross === null || holeData.awayGross === undefined || 
                      (typeof holeData.awayGross === 'string' && holeData.awayGross === '') ? 
        null : Number(holeData.awayGross);

      // Ensure gross scores are valid numbers if not null
      if ((homeGross !== null && isNaN(homeGross)) || (awayGross !== null && isNaN(awayGross))) {
        console.warn(`Invalid score input for hole ${holeNumber}. Skipping.`);
        continue;
      }
      
      // Determine if this is a format type that uses player-level scores
      const isSinglesOrBestBall = match.format.formatName?.toLowerCase().includes('singles') || 
                                match.format.formatName?.toLowerCase().includes('best ball');
      
      // Create or update metadata object
      // If there's existing metadata, make sure to preserve it
      let metadata: any = {};
      
      // First, fetch existing metadata if it exists
      const existingHoleResult = await prisma.holeResult.findUnique({
        where: {
          matchId_holeId: {
            matchId: matchId,
            holeId: hole.id,
          }
        },
        select: {
          metadata: true,
          homeTeamGrossScore: true,
          awayTeamGrossScore: true
        }
      });
      
      // Start with existing metadata, if any
      if (existingHoleResult?.metadata) {
        // Properly copy metadata object
        if (typeof existingHoleResult.metadata === 'object' && existingHoleResult.metadata !== null) {
          metadata = JSON.parse(JSON.stringify(existingHoleResult.metadata));
        }
        console.log(`Found existing metadata for hole ${hole.number}:`, metadata);
        
        // Debug existing scores
        console.log(`Existing gross scores in DB for hole ${hole.number}:`, {
          homeGross: existingHoleResult.homeTeamGrossScore,
          awayGross: existingHoleResult.awayTeamGrossScore
        });
      }
      
      // Store player-level scores if provided in holeData
      if (isSinglesOrBestBall) {
        if (holeData.homePlayerScores) {
          console.log(`Updating home player scores for hole ${hole.number}:`, holeData.homePlayerScores);
          metadata.homePlayerScores = holeData.homePlayerScores;
        }
        
        if (holeData.awayPlayerScores) {
          console.log(`Updating away player scores for hole ${hole.number}:`, holeData.awayPlayerScores);
          metadata.awayPlayerScores = holeData.awayPlayerScores;
        }
      }
      
      // CRITICAL FIX: If team gross scores are null but we have player scores in metadata,
      // derive the team scores from player scores
      if (metadata.homePlayerScores && homeGross === null) {
        const validScores = Object.values(metadata.homePlayerScores)
          .filter(score => score !== null && score !== undefined)
          .map(score => typeof score === 'string' ? parseInt(score as string) : Number(score));
        
        if (validScores.length > 0) {
          homeGross = Math.min(...validScores);
          console.log(`CRITICAL FIX: Derived homeGross ${homeGross} from metadata.homePlayerScores for hole ${holeNumber}`);
        }
      }
      
      if (metadata.awayPlayerScores && awayGross === null) {
        const validScores = Object.values(metadata.awayPlayerScores)
          .filter(score => score !== null && score !== undefined)
          .map(score => typeof score === 'string' ? parseInt(score as string) : Number(score));
        
        if (validScores.length > 0) {
          awayGross = Math.min(...validScores);
          console.log(`CRITICAL FIX: Derived awayGross ${awayGross} from metadata.awayPlayerScores for hole ${holeNumber}`);
        }
      }
      
      // Final validation for gross scores
      if (homeGross === null || awayGross === null) {
        // Only warn if we have player scores but couldn't derive team scores
        if ((metadata.homePlayerScores && Object.keys(metadata.homePlayerScores).length > 0) || 
            (metadata.awayPlayerScores && Object.keys(metadata.awayPlayerScores).length > 0)) {
          console.warn(`WARNING: Hole ${holeNumber} has player scores but null team scores! This may cause display issues.`);
        }
      }

      // Calculate net scores with more detailed debugging
      // Get the strokes each team receives on this hole
      const homeStrokesOnHole = getStrokesOnHole(homeTeamHandicap, hole.handicap);
      const awayStrokesOnHole = getStrokesOnHole(awayTeamHandicap, hole.handicap);
      
      // Log the handicap details for this hole
      console.log(`Hole ${hole.number} (index ${hole.handicap}) handicap strokes:`);
      console.log(`- Home team (${homeTeamHandicap.toFixed(1)}): ${homeStrokesOnHole} strokes`);
      console.log(`- Away team (${awayTeamHandicap.toFixed(1)}): ${awayStrokesOnHole} strokes`);
      
      // Calculate net scores and add extra logging
      console.log(`Calculating net scores for hole ${hole.number} (index ${hole.handicap}):`);
      console.log(`- Format: ${match.format.formatName}, Handicap multiplier: ${match.format.multiplier}`);
      console.log(`- Home handicap: ${homeTeamHandicap.toFixed(1)}, Home gross: ${homeGross}`);
      console.log(`- Away handicap: ${awayTeamHandicap.toFixed(1)}, Away gross: ${awayGross}`);
      
      const homeNetScore = homeGross !== null ? calculateNetScore(
        homeGross, 
        homeTeamHandicap, 
        hole.handicap, 
        match.format.isFourManTeam || false
      ) : null;
      
      const awayNetScore = awayGross !== null ? calculateNetScore(
        awayGross, 
        awayTeamHandicap, 
        hole.handicap, 
        match.format.isFourManTeam || false
      ) : null;
      
      // Extra debug info for calculated net scores
      if (homeNetScore !== null && awayNetScore !== null) {
        console.log(`- Calculated net scores: Home ${homeNetScore}, Away ${awayNetScore}`);
        console.log(`- Result: ${homeNetScore < awayNetScore ? 'Home wins' : 
                      (homeNetScore > awayNetScore ? 'Away wins' : 'Tie')}`);
      } else {
        console.log(`- Cannot calculate net scores: Home gross ${homeGross}, Away gross ${awayGross}`);
        
        // If one team has a valid score and the other doesn't, consider the team with a score the winner
        if (homeGross !== null && awayGross === null) {
          console.log(`- Setting Home team as winner since only they have a score`);
        } else if (homeGross === null && awayGross !== null) {
          console.log(`- Setting Away team as winner since only they have a score`);
        }
      }
      
      // Log the scores for this hole
      if (homeGross !== null && awayGross !== null) {
        console.log(`Scores for hole ${hole.number}:`);
        console.log(`- Home: ${homeGross} gross → ${homeNetScore} net (${homeStrokesOnHole} strokes)`);
        console.log(`- Away: ${awayGross} gross → ${awayNetScore} net (${awayStrokesOnHole} strokes)`);
        
        // Determine hole winner
        const winner = homeNetScore !== null && awayNetScore !== null 
          ? (homeNetScore < awayNetScore ? 'Home' : (awayNetScore < homeNetScore ? 'Away' : 'Tie'))
          : 'Incomplete';
        console.log(`- Result: ${winner}`);
      }
      
      // Determine winner using utility function
      let winner = null;
      
      if (homeNetScore !== null && awayNetScore !== null) {
        winner = determineHoleWinner(homeNetScore, awayNetScore);
        console.log(`Winner for hole ${hole.number}: ${winner}`);
      } else if (homeGross !== null && awayGross === null) {
        // If one team has a score and the other doesn't, the team with a score wins
        winner = 'home';
        console.log(`Winner for hole ${hole.number}: ${winner} (other team has no score)`);
      } else if (homeGross === null && awayGross !== null) {
        winner = 'away';
        console.log(`Winner for hole ${hole.number}: ${winner} (other team has no score)`);
      } else {
        console.log(`No winner determined for hole ${hole.number} - incomplete scores`);
      }
      
      // We've already handled player-level scores above, no need to do it again
      /*
      // Store player-level scores if provided in holeData
      if (isSinglesOrBestBall) {
        if (holeData.homePlayerScores) {
          console.log(`Updating home player scores for hole ${hole.number}:`, holeData.homePlayerScores);
          metadata.homePlayerScores = holeData.homePlayerScores;
          
          // For Best Ball, use the best (lowest) player score as the team score
          // For Singles with one player, use that player's score
          if (match.format.formatName?.toLowerCase().includes('best ball')) {
            const validScores = Object.values(holeData.homePlayerScores)
              .filter(score => score !== null && score !== undefined)
              .map(score => Number(score));
            
            if (validScores.length > 0) {
              homeGross = Math.min(...validScores);
              console.log(`Auto-set homeGross to ${homeGross} from player scores for Best Ball`);
            }
          } else if (match.format.formatName?.toLowerCase().includes('singles') && 
                    Object.keys(holeData.homePlayerScores).length === 1) {
            const playerScore = Object.values(holeData.homePlayerScores)[0];
            if (playerScore !== null && playerScore !== undefined) {
              homeGross = Number(playerScore);
              console.log(`Auto-set homeGross to ${homeGross} from single player score for Singles`);
            }
          }
        }
        
        if (holeData.awayPlayerScores) {
          console.log(`Updating away player scores for hole ${hole.number}:`, holeData.awayPlayerScores);
          metadata.awayPlayerScores = holeData.awayPlayerScores;
          
          // For Best Ball, use the best (lowest) player score as the team score
          // For Singles with one player, use that player's score
          if (match.format.formatName?.toLowerCase().includes('best ball')) {
            const validScores = Object.values(holeData.awayPlayerScores)
              .filter(score => score !== null && score !== undefined)
              .map(score => Number(score));
            
            if (validScores.length > 0) {
              awayGross = Math.min(...validScores);
              console.log(`Auto-set awayGross to ${awayGross} from player scores for Best Ball`);
            }
          } else if (match.format.formatName?.toLowerCase().includes('singles') && 
                    Object.keys(holeData.awayPlayerScores).length === 1) {
            const playerScore = Object.values(holeData.awayPlayerScores)[0];
            if (playerScore !== null && playerScore !== undefined) {
              awayGross = Number(playerScore);
              console.log(`Auto-set awayGross to ${awayGross} from single player score for Singles`);
            }
          }
        }
      }
      */
      // End of commented out duplicate code
      
      console.log(`Final metadata for hole ${hole.number}:`, metadata);
      
      // Log the metadata structure before updating
      console.log(`Hole ${hole.number} final metadata:`, JSON.stringify(metadata, null, 2));
      
      // Update or create hole result
      updates.push(
        prisma.holeResult.upsert({
          where: {
            matchId_holeId: {
              matchId: matchId,
              holeId: hole.id,
            }
          },
          update: {
            homeTeamGrossScore: homeGross,
            awayTeamGrossScore: awayGross,
            homeTeamNetScore: homeNetScore,
            awayTeamNetScore: awayNetScore,
            winnerTeamId: winner === 'home' ? match.homeTeamId : 
                          winner === 'away' ? match.awayTeamId : null,
            // Always update metadata, ensuring it's properly formatted
            metadata: metadata
          },
          create: {
            matchId: matchId,
            holeId: hole.id,
            homeTeamGrossScore: homeGross,
            awayTeamGrossScore: awayGross,
            homeTeamNetScore: homeNetScore,
            awayTeamNetScore: awayNetScore,
            winnerTeamId: winner === 'home' ? match.homeTeamId : 
                          winner === 'away' ? match.awayTeamId : null,
            // Always include metadata, ensuring it's properly formatted
            metadata: metadata
          }
        })
      );
      
      // Log the update operation
      console.log(`Prepared upsert operation for hole ${hole.number} with gross scores: Home=${homeGross}, Away=${awayGross}`);
    }
    
    // Execute all updates
    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }
    
    // Calculate and update match points
    await this.updateMatchPoints(matchId);
    
    return { message: 'Scores updated successfully' };
  }

  /**
   * Calculate and update match points based on hole results
   */
  private async updateMatchPoints(matchId: string) {
    try {
      console.log(`Updating match points for match ${matchId}`);
      
      // Get all hole results for this match
      const holeResults = await prisma.holeResult.findMany({
        where: { matchId }
      });
      
      console.log(`Found ${holeResults.length} hole results`);

      // Fetch the match with full format details
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          format: true,
          playerPairings: {
            include: {
              player: true
            }
          }
        }
      });

      if (!match) {
        console.error(`Cannot update points: Match not found for matchId: ${matchId}`);
        return;
      }
      
      if (!match.format) {
        console.error(`Cannot update points: Match format not found for matchId: ${matchId}`);
        return;
      }

      // For singles matches with foursome grouping, we need special handling
      const isSinglesMatch = match.format.formatName === 'Singles' || match.formatId === 'SINGLES';
      const isPlayerToPlayerMatch = match.playerToPlayerMatch || false;
      
      // Check if this is part of a foursome group (multiple singles matches)
      const isFoursomeGroup = !!match.foursomeGroupId;
      
      // Log the match details for debugging
      console.log(`Match details: 
        Format: ${match.format.formatName}
        SinglesMatch: ${isSinglesMatch}
        PlayerToPlayer: ${isPlayerToPlayerMatch}
        FoursomeGroup: ${isFoursomeGroup}
        FoursomeID: ${match.foursomeGroupId || 'none'}`);
      
      // Count how many holes have been played
      const completedHoles = holeResults.filter(result => 
        result.homeTeamNetScore !== null && 
        result.awayTeamNetScore !== null
      ).length;
      
      console.log(`Completed holes: ${completedHoles}`);
      
      if (completedHoles === 0) {
        console.log('No completed holes, skipping match points update');
        return;
      }
      
      // ==== New Match Play Scoring Logic ====
      // 1. Count total holes won by each team
      // 2. Team with more holes wins gets 1 point
      // 3. If tied, each team gets 0.5 points
      
      // Count holes won by each team
      let homeHolesWon = 0;
      let awayHolesWon = 0;
      let holesTied = 0;
      
      // Process each hole result to track holes won/tied
      for (const result of holeResults) {
        if (result.homeTeamNetScore !== null && result.awayTeamNetScore !== null) {
          // Determine who won this hole
          if (result.homeTeamNetScore < result.awayTeamNetScore) {
            // Home team/player won this hole (lower score wins in golf)
            homeHolesWon++;
            
            // Set winner in hole result for statistics tracking
            try {
              await prisma.holeResult.update({
                where: { id: result.id },
                data: { 
                  winnerTeamId: match.homeTeamId,
                  homeTeamNetScore: result.homeTeamNetScore,
                  awayTeamNetScore: result.awayTeamNetScore 
                }
              });
            } catch (e) {
              console.error(`Failed to update winner team ID: ${e}`);
            }
          } else if (result.homeTeamNetScore > result.awayTeamNetScore) {
            // Away team/player won this hole
            awayHolesWon++;
            
            // Set winner in hole result for statistics tracking
            try {
              await prisma.holeResult.update({
                where: { id: result.id },
                data: { 
                  winnerTeamId: match.awayTeamId,
                  homeTeamNetScore: result.homeTeamNetScore,
                  awayTeamNetScore: result.awayTeamNetScore 
                }
              });
            } catch (e) {
              console.error(`Failed to update winner team ID: ${e}`);
            }
          } else {
            // Tied hole
            holesTied++;
            
            // Set tie in hole result
            try {
              await prisma.holeResult.update({
                where: { id: result.id },
                data: { 
                  winnerTeamId: null,
                  homeTeamNetScore: result.homeTeamNetScore,
                  awayTeamNetScore: result.awayTeamNetScore 
                }
              });
            } catch (e) {
              console.error(`Failed to update winner team ID: ${e}`);
            }
          }
        }
      }
      
      console.log(`Hole results: Home won ${homeHolesWon}, Away won ${awayHolesWon}, Tied ${holesTied}`);
      
      // Calculate match points based on holes won for the CURRENT match
      let currentMatchHomePoints = 0;
      let currentMatchAwayPoints = 0;
      
      // For completed matches - determine winner based on hole wins
      if (completedHoles > 0) {
        // Standard scoring for non-singles-foursome formats
        // OR initial calculation for a singles match (will be handled further below)
        if (homeHolesWon > awayHolesWon) {
          currentMatchHomePoints = 1.0;
        } else if (awayHolesWon > homeHolesWon) {
          currentMatchAwayPoints = 1.0;
        } else { // Tie
          currentMatchHomePoints = 0.5;
          currentMatchAwayPoints = 0.5;
        }
      }

      // If it's a Singles match, try to find its pair using player logic and update points for both
      let siblingMatchId: string | null = null;
      if (isSinglesMatch) {
        console.log(`[updateMatchPoints] Match ${matchId} is Singles. Checking for paired match using player logic...`);
        
        // 1. Get players IN THIS MATCH from the fetched data
        const currentPairings = match.playerPairings || [];
        const currentPlayerHome = currentPairings.find(p => p.isHomeTeam)?.player || null;
        const currentPlayerAway = currentPairings.find(p => !p.isHomeTeam)?.player || null;

        if (currentPlayerHome && currentPlayerAway) {
          console.log(`[updateMatchPoints] Current match players: ${currentPlayerHome.name} vs ${currentPlayerAway.name}`);
          
          // 2. Find potential sibling matches (same tournament, tee time, teams) - RELAXED
          const potentialSiblingMatches = await prisma.match.findMany({
            where: {
              id: { not: matchId }, // Exclude self
              tournamentId: match.tournamentId,
              teeTime: match.teeTime,
              homeTeamId: match.homeTeamId,
              awayTeamId: match.awayTeamId,
              // REMOVED startingHole check for quickest fix
            },
            include: {
              playerPairings: { include: { player: true } } 
            }
          });
          
          console.log(`[updateMatchPoints] Found ${potentialSiblingMatches.length} potential sibling matches.`);

          // 3. Find the specific sibling match involving the *other* players
          if (potentialSiblingMatches.length > 0) {
            const allTeamPlayers = await prisma.player.findMany({
               where: { teamId: { in: [match.homeTeamId, match.awayTeamId] } }
            });
            const allHomeTeamPlayers = allTeamPlayers.filter(p => p.teamId === match.homeTeamId);
            const allAwayTeamPlayers = allTeamPlayers.filter(p => p.teamId === match.awayTeamId);
            const otherHomePlayer = allHomeTeamPlayers.find(p => p.id !== currentPlayerHome.id);
            const otherAwayPlayer = allAwayTeamPlayers.find(p => p.id !== currentPlayerAway.id);

            if (otherHomePlayer && otherAwayPlayer) {
               console.log(`[updateMatchPoints] Other potential players: ${otherHomePlayer.name} vs ${otherAwayPlayer.name}`);
               const actualSiblings = potentialSiblingMatches.filter(potentialMatch => {
                 const siblingHome = potentialMatch.playerPairings.find(p => p.isHomeTeam)?.player;
                 const siblingAway = potentialMatch.playerPairings.find(p => !p.isHomeTeam)?.player;
                 return siblingHome?.id === otherHomePlayer.id && siblingAway?.id === otherAwayPlayer.id;
               });

               if (actualSiblings.length === 1) {
                 siblingMatchId = actualSiblings[0].id;
                 console.log(`[updateMatchPoints] Found unique sibling match by player pairing: ${siblingMatchId}.`);
               } else {
                 console.log(`[updateMatchPoints] Did not find a unique sibling match with the correct player pairing (found ${actualSiblings.length}).`);
               }
            } else {
              console.log(`[updateMatchPoints] Could not find the other home/away players.`);
            }
          }
        } else {
          console.log(`[updateMatchPoints] Could not get current players for match ${matchId}.`);
        }
      }

      // Update points based on whether a sibling was found
      if (siblingMatchId) {
        // Fetch points for both matches
        const allGroupPoints = await prisma.matchPoints.findMany({
          where: {
            matchId: { in: [matchId, siblingMatchId] }
          }
        });

        console.log(`[updateMatchPoints] Found points records for paired matches:`, JSON.stringify(allGroupPoints));

        let totalHomePoints = 0;
        let totalAwayPoints = 0;
        allGroupPoints.forEach(p => {
          totalHomePoints += p.homeTeamPoints;
          totalAwayPoints += p.awayTeamPoints;
        });

        aggregatedPoints = {
          matchId: match.id, // Keep association
          homeTeamPoints: totalHomePoints,
          awayTeamPoints: totalAwayPoints
        };
        console.log(`[updateMatchPoints] Aggregated points for paired matches ${matchId} & ${siblingMatchId}: Home=${totalHomePoints}, Away=${totalAwayPoints}`);
        
        // Execute updates in a transaction
        await prisma.$transaction(updates);
        console.log(`Match points updated successfully for paired matches ${matchId} & ${siblingMatchId}`);

      } else {
        // For non-paired matches or non-singles, just update the current match
        console.log(`Standard match points update for ${matchId}: Home=${currentMatchHomePoints}, Away=${currentMatchAwayPoints}`);
        await prisma.matchPoints.upsert({
          where: { matchId },
          update: {
            homeTeamPoints: currentMatchHomePoints,
            awayTeamPoints: currentMatchAwayPoints,
          },
          create: {
            matchId,
            homeTeamPoints: currentMatchHomePoints,
            awayTeamPoints: currentMatchAwayPoints,
          }
        });
        console.log(`Match points updated successfully for match ${matchId}`);
      }
    } catch (error) {
      console.error(`Error updating match points for match ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Get related matches by specific IDs (Helper for the new getMatchWithScores logic)
   */
  private async getRelatedFoursomeMatchesByIds(matchIds: string[]) {
    if (!matchIds || matchIds.length === 0) {
      return [];
    }
    
    const otherMatches = await prisma.match.findMany({
      where: {
        id: { in: matchIds }
      },
      include: {
        playerPairings: {
          include: {
            player: true
          }
        },
        points: true,
        holeResults: true,
        format: true
      }
    });
    
    // Format the other matches for display (copied & adapted from original getRelatedFoursomeMatches)
    return otherMatches.map(m => {
      const homePlayers = m.playerPairings.filter(p => p.isHomeTeam).map(p => p.player);
      const awayPlayers = m.playerPairings.filter(p => !p.isHomeTeam).map(p => p.player);
      
      const homeHolesWon = m.holeResults.filter(r => 
        r.winnerTeamId === m.homeTeamId && 
        r.homeTeamNetScore !== null && 
        r.awayTeamNetScore !== null
      ).length;
      
      const awayHolesWon = m.holeResults.filter(r => 
        r.winnerTeamId === m.awayTeamId && 
        r.homeTeamNetScore !== null && 
        r.awayTeamNetScore !== null
      ).length;
      
      const holesTied = m.holeResults.filter(r => 
        r.winnerTeamId === null && 
        r.homeTeamNetScore !== null && 
        r.awayTeamNetScore !== null
      ).length;
      
      let result = null;
      if (m.points) {
        const homePlayerName = homePlayers[0]?.name || 'Home';
        const awayPlayerName = awayPlayers[0]?.name || 'Away';
        const isSinglesMatch = m.format?.formatName === 'Singles' || m.formatId === 'SINGLES';
        
        if (m.points.homeTeamPoints > m.points.awayTeamPoints) {
          result = isSinglesMatch ? `${homePlayerName} wins (${homeHolesWon}-${awayHolesWon}-${holesTied}) - 1 point` : `${homePlayerName} wins ${m.points.homeTeamPoints}-${m.points.awayTeamPoints}`;
        } else if (m.points.awayTeamPoints > m.points.homeTeamPoints) {
          result = isSinglesMatch ? `${awayPlayerName} wins (${awayHolesWon}-${homeHolesWon}-${holesTied}) - 1 point` : `${awayPlayerName} wins ${m.points.awayTeamPoints}-${m.points.homeTeamPoints}`;
        } else if (m.points.homeTeamPoints === m.points.awayTeamPoints) {
          result = isSinglesMatch ? `Match tied (${homeHolesWon}-${awayHolesWon}-${holesTied}) - 0.5 points each` : `Match tied ${m.points.homeTeamPoints}-${m.points.awayTeamPoints}`;
        }
      }
      
      return {
        id: m.id,
        homePlayers,
        awayPlayers,
        result,
        homeHolesWon,
        awayHolesWon,
        holesTied,
        points: m.points
      };
    });
  }

  /**
   * Determine winner based on saved hole result
   * In golf scoring, lower score wins, and we use the net scores
   * that have already been calculated with handicaps
   */
  private getWinner(holeResult: any): string | null {
    if (!holeResult) {
      console.log(`No hole result available, can't determine winner`);
      return null;
    }
    
    // We don't use winnerTeamId to determine winner side here
    // Instead we always use the scores, as they're more reliable
    // The winner status is set separately when scores are updated
    
    // Otherwise check the scores
    if (holeResult.homeTeamNetScore === null || holeResult.awayTeamNetScore === null) {
      console.log(`Null scores detected (home: ${holeResult.homeTeamNetScore}, away: ${holeResult.awayTeamNetScore}), no winner set`);
      return null;
    }
    
    // Make sure we're comparing as numbers
    const homeNet = parseFloat(holeResult.homeTeamNetScore);
    const awayNet = parseFloat(holeResult.awayTeamNetScore);
    
    // Log the decision for debugging
    if (homeNet === awayNet) {
      console.log(`Tie detected - Net scores: ${homeNet} vs ${awayNet}`);
      return 'tie';
    }
    
    // In golf, the LOWER score wins
    const winner = homeNet < awayNet ? 'home' : 'away';
    const winningScore = winner === 'home' ? homeNet : awayNet;
    const losingScore = winner === 'home' ? awayNet : homeNet;
    
    console.log(`Winner determined from scores: ${winner} team wins (${winningScore} vs ${losingScore})`);
    return winner;
  }

  /**
   * Create a foursome group with singles matches
   */
  async createFoursome(params: FoursomeCreateParams) {
    // Validation
    if (!params.tournamentId || !params.scheduleId || !params.formatId || 
        !params.homeTeamId || !params.awayTeamId || !params.courseId || 
        !params.startingHole || !params.teeTime || !params.matchups) {
      throw new Error('Missing required fields for foursome creation');
    }
    
    if (!Array.isArray(params.matchups) || params.matchups.length !== 2) {
      throw new Error('Exactly 2 matchups are required for a singles foursome');
    }
    
    // Validate each matchup has required player IDs
    const invalidMatchups = params.matchups.filter(m => !m.homePlayerId || !m.awayPlayerId);
    if (invalidMatchups.length > 0) {
      throw new Error('All matchups must have a home player and away player');
    }
    
    // Generate a unique foursome group ID
    const foursomeGroupId = `foursome_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Create all matches
    const createdMatches = await Promise.all(params.matchups.map(matchup => {
      return prisma.match.create({
        data: {
          tournamentId: params.tournamentId,
          scheduleId: params.scheduleId,
          formatId: params.formatId,
          homeTeamId: params.homeTeamId,
          awayTeamId: params.awayTeamId,
          courseId: params.courseId,
          startingHole: params.startingHole,
          teeTime: new Date(params.teeTime),
          foursomeGroupId,
          playerToPlayerMatch: true,
          playerPairings: {
            create: [
              {
                playerId: matchup.homePlayerId,
                isHomeTeam: true
              },
              {
                playerId: matchup.awayPlayerId,
                isHomeTeam: false
              }
            ]
          }
        },
        include: {
          playerPairings: {
            include: {
              player: true
            }
          },
          homeTeam: true,
          awayTeam: true,
          format: true
        }
      });
    }));
    
    return { 
      success: true, 
      matches: createdMatches,
      foursomeGroupId
    };
  }
}