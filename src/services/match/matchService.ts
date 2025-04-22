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
    
    if (match.playerToPlayerMatch && match.foursomeGroupId) {
      foursomeMatches = await this.getRelatedFoursomeMatches(match.id, match.foursomeGroupId);
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
      points: match.points,
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
      
      // Singles format in a foursome group has 2 points available in total (1 point per player-to-player match)
      // Each individual match has 1 point available (9 holes = 9 individual points available)
      // Other formats have 1 point available for the entire match
      
      // For singles player-to-player matches:
      // - Each hole is worth 1/9 of a point (for 9 hole matches)
      // - Each player can earn up to 1 point per match
      // - This gives 2 total points available per foursome (with 2 singles matches)
      const totalAvailablePoints = 1.0; // Each individual match worth 1 point
      
      // Log the match details for debugging
      console.log(`Match details: 
        Format: ${match.format.formatName}
        SinglesMatch: ${isSinglesMatch}
        PlayerToPlayer: ${isPlayerToPlayerMatch}
        FoursomeGroup: ${isFoursomeGroup}
        FoursomeID: ${match.foursomeGroupId || 'none'}`);
      
      
      // Determine hole count - for 9-hole matches, each hole is worth 1/9 of the total available points
      const holeCount = holeResults.length > 0 ? 
        (holeResults.length <= 9 ? 9 : 18) : 9;
      
      // For Singles format with player-to-player matches:
      // - Each player can earn 1 point per match (9 holes)
      // - Each hole is worth 1/9 point for a win, 1/18 point for a tie
      // - Total available points per foursome = 2 points (1 point per 1v1 matchup)
      const pointsPerWin = (totalAvailablePoints / holeCount);
      const pointsPerTie = pointsPerWin / 2.0;
      
      console.log(`Points per hole: Win=${pointsPerWin.toFixed(4)}, Tie=${pointsPerTie.toFixed(4)}`);
      
      console.log(`Match format: ${match.format.formatName}, Singles: ${isSinglesMatch}, PlayerToPlayer: ${isPlayerToPlayerMatch}`);
      console.log(`Total available points: ${totalAvailablePoints}, Hole count: ${holeCount}`);
      console.log(`Points per hole: Win=${pointsPerWin}, Tie=${pointsPerTie}`);
      
      // Count points for each team
      let homePoints = 0;
      let awayPoints = 0;
      
      
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
      
      // Process each hole result to calculate points
      for (const result of holeResults) {
        if (result.homeTeamNetScore !== null && result.awayTeamNetScore !== null) {
          // Singles matches are scored just like other match play formats
          // But we'll add extra logging for clarity
          if (isSinglesMatch && isPlayerToPlayerMatch) {
            console.log(`Processing singles player-to-player match: ${match.id}`);
            
            // For singles matches, use the standard match play scoring
            // with points determined by the format (same as other formats)
            if (result.homeTeamNetScore < result.awayTeamNetScore) {
              // Home player won this hole (lower score wins in golf)
              homePoints += pointsPerWin;
              console.log(`Singles match - Hole win for Home (${result.homeTeamNetScore} vs ${result.awayTeamNetScore}) - ${pointsPerWin} points`);
              console.log(`Setting winnerTeamId to ${match.homeTeamId} (home team) for hole ${result.id}`);
              
              // Set winner in hole result and ensure scores are saved correctly
              try {
                await prisma.holeResult.update({
                  where: { id: result.id },
                  data: { 
                    winnerTeamId: match.homeTeamId,
                    // Force a refresh of net scores to make sure they're correctly stored
                    homeTeamNetScore: result.homeTeamNetScore,
                    awayTeamNetScore: result.awayTeamNetScore 
                  }
                });
                console.log(`Updated winner team for hole ${result.id} to ${match.homeTeamId} (home team)`);
              } catch (e) {
                console.error(`Failed to update winner team ID: ${e}`);
              }
            } else if (result.homeTeamNetScore > result.awayTeamNetScore) {
              // Away player won this hole (lower score wins)
              awayPoints += pointsPerWin;
              console.log(`Singles match - Hole win for Away (${result.awayTeamNetScore} vs ${result.homeTeamNetScore}) - ${pointsPerWin} points`);
              console.log(`Setting winnerTeamId to ${match.awayTeamId} (away team) for hole ${result.id}`);
              
              // Set winner in hole result and make sure scores are correct
              try {
                await prisma.holeResult.update({
                  where: { id: result.id },
                  data: { 
                    winnerTeamId: match.awayTeamId,
                    // Force a refresh of net scores to make sure they're correctly stored
                    homeTeamNetScore: result.homeTeamNetScore,
                    awayTeamNetScore: result.awayTeamNetScore
                  }
                });
                console.log(`Updated winner team for hole ${result.id} to ${match.awayTeamId} (away team)`);
              } catch (e) {
                console.error(`Failed to update winner team ID: ${e}`);
              }
            } else {
              // Tied hole (halved) - each gets half points
              homePoints += pointsPerTie;
              awayPoints += pointsPerTie;
              console.log(`Singles match - Hole tied (${result.homeTeamNetScore} vs ${result.awayTeamNetScore}) - ${pointsPerTie} points each`);
              
              // Clear winner for tied holes and ensure scores are saved
              try {
                await prisma.holeResult.update({
                  where: { id: result.id },
                  data: { 
                    winnerTeamId: null,
                    // Force a refresh of net scores to make sure they're correctly stored
                    homeTeamNetScore: result.homeTeamNetScore,
                    awayTeamNetScore: result.awayTeamNetScore 
                  }
                });
                console.log(`Updated hole ${result.id} as tied`);
              } catch (e) {
                console.error(`Failed to update winner team ID: ${e}`);
              }
            }
          } else {
            // Standard scoring for non-singles matches
            if (result.homeTeamNetScore < result.awayTeamNetScore) {
              homePoints += pointsPerWin;
              console.log(`Hole ${result.holeId}: Home wins (${result.homeTeamNetScore} vs ${result.awayTeamNetScore})`);
              
              // Set winner in hole result to ensure it's captured for leaderboard
              try {
                await prisma.holeResult.update({
                  where: { id: result.id },
                  data: { 
                    winnerTeamId: match.homeTeamId,
                    // Ensure net scores are correctly stored
                    homeTeamNetScore: result.homeTeamNetScore,
                    awayTeamNetScore: result.awayTeamNetScore
                  }
                });
                console.log(`Updated hole ${result.holeId} with home team win`);
              } catch (e) {
                console.error(`Failed to update winner team ID: ${e}`);
              }
              
            } else if (result.homeTeamNetScore > result.awayTeamNetScore) {
              awayPoints += pointsPerWin;
              console.log(`Hole ${result.holeId}: Away wins (${result.awayTeamNetScore} vs ${result.homeTeamNetScore})`);
              
              // Set winner in hole result to ensure it's captured for leaderboard
              try {
                await prisma.holeResult.update({
                  where: { id: result.id },
                  data: { 
                    winnerTeamId: match.awayTeamId,
                    // Ensure net scores are correctly stored
                    homeTeamNetScore: result.homeTeamNetScore,
                    awayTeamNetScore: result.awayTeamNetScore
                  }
                });
                console.log(`Updated hole ${result.holeId} with away team win`);
              } catch (e) {
                console.error(`Failed to update winner team ID: ${e}`);
              }
              
            } else {
              // Scores are tied
              homePoints += pointsPerTie;
              awayPoints += pointsPerTie;
              console.log(`Hole ${result.holeId}: Tied (${result.homeTeamNetScore} vs ${result.awayTeamNetScore})`);
              
              // Clear winner in hole result for ties
              try {
                await prisma.holeResult.update({
                  where: { id: result.id },
                  data: { 
                    winnerTeamId: null,
                    // Ensure net scores are correctly stored
                    homeTeamNetScore: result.homeTeamNetScore,
                    awayTeamNetScore: result.awayTeamNetScore
                  }
                });
                console.log(`Updated hole ${result.holeId} as tied`);
              } catch (e) {
                console.error(`Failed to update winner team ID: ${e}`);
              }
            }
          }
        }
      }
      
      console.log(`Final points: Home=${homePoints}, Away=${awayPoints}`);
      
      // Update match points
      await prisma.matchPoints.upsert({
        where: { matchId },
        update: {
          homeTeamPoints: homePoints,
          awayTeamPoints: awayPoints,
        },
        create: {
          matchId,
          homeTeamPoints: homePoints,
          awayTeamPoints: awayPoints,
        }
      });
      
      console.log(`Match points updated successfully for match ${matchId}`);
    } catch (error) {
      console.error(`Error updating match points for match ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Get related matches in the same foursome group
   */
  private async getRelatedFoursomeMatches(currentMatchId: string, foursomeGroupId: string) {
    const otherMatches = await prisma.match.findMany({
      where: {
        foursomeGroupId: foursomeGroupId,
        id: { not: currentMatchId }
      },
      include: {
        playerPairings: {
          include: {
            player: true
          }
        },
        points: true
      }
    });
    
    // Format the other matches for display
    return otherMatches.map(m => {
      const homePlayers = m.playerPairings.filter(p => p.isHomeTeam).map(p => p.player);
      const awayPlayers = m.playerPairings.filter(p => !p.isHomeTeam).map(p => p.player);
      
      // Determine match result
      let result = null;
      if (m.points) {
        if (m.points.homeTeamPoints > m.points.awayTeamPoints) {
          result = `${homePlayers[0]?.name || 'Home'} wins ${m.points.homeTeamPoints}-${m.points.awayTeamPoints}`;
        } else if (m.points.awayTeamPoints > m.points.homeTeamPoints) {
          result = `${awayPlayers[0]?.name || 'Away'} wins ${m.points.awayTeamPoints}-${m.points.homeTeamPoints}`;
        } else if (m.points.homeTeamPoints === m.points.awayTeamPoints) {
          result = 'Match tied';
        }
      }
      
      return {
        id: m.id,
        homePlayers,
        awayPlayers,
        result
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