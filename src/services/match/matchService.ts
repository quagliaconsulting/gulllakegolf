import { prisma } from '@/lib/prisma';
import { calculateTeamHandicap, calculateNetScore, determineHoleWinner } from '@/utils/handicap';
import { isHomeTeam } from '@/utils/teamUtils';

export interface HoleScoreUpdate {
  holeNumber: number;
  homeGross: number | null;
  awayGross: number | null;
  homePlayerScores?: Record<string, number | null>;
  awayPlayerScores?: Record<string, number | null>;
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
      
    // Calculate team handicaps
    const homeTeamHandicap = calculateTeamHandicap(
      homePlayers.map(p => p.handicapIndex),
      match.format.multiplier,
      match.format.isFourManTeam || false
    );
    
    const awayTeamHandicap = calculateTeamHandicap(
      awayPlayers.map(p => p.handicapIndex),
      match.format.multiplier,
      match.format.isFourManTeam || false
    );
    
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
    
    // Calculate team handicaps
    const homePlayers = match.playerPairings
      .filter(p => p.isHomeTeam)
      .map(p => p.player);
      
    const awayPlayers = match.playerPairings
      .filter(p => !p.isHomeTeam)
      .map(p => p.player);
      
    const homeTeamHandicap = calculateTeamHandicap(
      homePlayers.map(p => p.handicapIndex),
      match.format.multiplier,
      match.format.isFourManTeam || false
    );
    
    const awayTeamHandicap = calculateTeamHandicap(
      awayPlayers.map(p => p.handicapIndex),
      match.format.multiplier,
      match.format.isFourManTeam || false
    );
    
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
      const homeGross = holeData.homeGross === null || holeData.homeGross === undefined || 
                        (typeof holeData.homeGross === 'string' && holeData.homeGross === '') ? 
        null : Number(holeData.homeGross);
      const awayGross = holeData.awayGross === null || holeData.awayGross === undefined || 
                        (typeof holeData.awayGross === 'string' && holeData.awayGross === '') ? 
        null : Number(holeData.awayGross);

      // Ensure gross scores are valid numbers if not null
      if ((homeGross !== null && isNaN(homeGross)) || (awayGross !== null && isNaN(awayGross))) {
        console.warn(`Invalid score input for hole ${holeNumber}. Skipping.`);
        continue;
      }

      // Calculate net scores
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
      
      // Determine winner using utility function
      const winner = (homeNetScore !== null && awayNetScore !== null) 
                     ? determineHoleWinner(homeNetScore, awayNetScore) 
                     : null;
      
      // Prepare metadata with player-level scores if available
      const isSinglesOrBestBall = match.format.formatName?.toLowerCase().includes('singles') || 
                                 match.format.formatName?.toLowerCase().includes('best ball');
      
      // Create or update metadata object
      const metadata: any = {};
      
      // Store player-level scores if provided in holeData
      if (isSinglesOrBestBall) {
        if (holeData.homePlayerScores) {
          metadata.homePlayerScores = holeData.homePlayerScores;
        }
        
        if (holeData.awayPlayerScores) {
          metadata.awayPlayerScores = holeData.awayPlayerScores;
        }
      }
      
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
            // Only update metadata if new player scores are provided
            ...(Object.keys(metadata).length > 0 ? { metadata } : {})
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
            // Include metadata if player scores are provided
            ...(Object.keys(metadata).length > 0 ? { metadata } : {})
          }
        })
      );
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

      // Extract points values with reasonable defaults
      const pointsPerWin = match.format.points || 1.0;
      const pointsPerTie = match.format.halfPoints || pointsPerWin / 2.0;
      
      console.log(`Using points: Win=${pointsPerWin}, Tie=${pointsPerTie}`);
      console.log(`Match format: ${match.format.formatName}`);
      
      // Count points for each team
      let homePoints = 0;
      let awayPoints = 0;
      
      // For singles matches with foursome grouping, we need to count differently
      const isSinglesMatch = match.format.formatName === 'Singles' || match.formatId === 'SINGLES';
      const isPlayerToPlayerMatch = match.playerToPlayerMatch || false;
      
      console.log(`Is Singles Match: ${isSinglesMatch}, Is Player-to-Player: ${isPlayerToPlayerMatch}`);
      
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
          if (result.homeTeamNetScore < result.awayTeamNetScore) {
            homePoints += pointsPerWin;
            console.log(`Hole ${result.holeId}: Home wins (${result.homeTeamNetScore} vs ${result.awayTeamNetScore})`);
            
            // Set winner in hole result to ensure it's captured for leaderboard
            if (!result.winnerTeamId) {
              try {
                await prisma.holeResult.update({
                  where: { id: result.id },
                  data: { winnerTeamId: match.homeTeamId }
                });
              } catch (e) {
                console.error(`Failed to update winner team ID: ${e}`);
              }
            }
          } else if (result.awayTeamNetScore < result.homeTeamNetScore) {
            awayPoints += pointsPerWin;
            console.log(`Hole ${result.holeId}: Away wins (${result.awayTeamNetScore} vs ${result.homeTeamNetScore})`);
            
            // Set winner in hole result to ensure it's captured for leaderboard
            if (!result.winnerTeamId) {
              try {
                await prisma.holeResult.update({
                  where: { id: result.id },
                  data: { winnerTeamId: match.awayTeamId }
                });
              } catch (e) {
                console.error(`Failed to update winner team ID: ${e}`);
              }
            }
          } else {
            // Scores are tied
            homePoints += pointsPerTie;
            awayPoints += pointsPerTie;
            console.log(`Hole ${result.holeId}: Tied (${result.homeTeamNetScore} vs ${result.awayTeamNetScore})`);
            
            // Clear winner in hole result for ties
            if (result.winnerTeamId) {
              try {
                await prisma.holeResult.update({
                  where: { id: result.id },
                  data: { winnerTeamId: null }
                });
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
   */
  private getWinner(holeResult: any): string | null {
    if (!holeResult) return null;
    if (holeResult.homeTeamNetScore === null || holeResult.awayTeamNetScore === null) return null;
    if (holeResult.homeTeamNetScore === holeResult.awayTeamNetScore) return 'tie';
    return holeResult.homeTeamNetScore < holeResult.awayTeamNetScore ? 'home' : 'away';
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