import { prisma } from '@/lib/prisma';
import { calculateTeamHandicap, calculateNetScore, determineHoleWinner } from '@/utils/handicap';

export interface HoleScoreUpdate {
  holeNumber: number;
  homeGross: number | null;
  awayGross: number | null;
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
      };
    });

    // Handle foursome matches
    let foursomeMatches = null;
    
    if (match.playerToPlayerMatch && match.foursomeGroupId) {
      foursomeMatches = await this.getRelatedFoursomeMatches(match.id, match.foursomeGroupId);
    }
    
    // Parse team metadata for real team status
    const homeTeamIsReal = typeof match.homeTeam?.metadata === 'object' && 
      match.homeTeam.metadata !== null && 
      'isHomeTeam' in match.homeTeam.metadata ? 
      !!match.homeTeam.metadata.isHomeTeam : false;
      
    const awayTeamIsReal = typeof match.awayTeam?.metadata === 'object' && 
      match.awayTeam.metadata !== null && 
      'isHomeTeam' in match.awayTeam.metadata ? 
      !!match.awayTeam.metadata.isHomeTeam : false;

    // Format the final result
    return {
      id: match.id,
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
      holeCount: (match as any).holes ?? 18,
      homePlayers,
      awayPlayers,
      holes,
      homeTeamHandicap,
      awayTeamHandicap,
      points: match.points,
      foursomeMatches
    };
  }

  /**
   * Get all players assigned to a match
   */
  async getMatchPlayers(matchId: string) {
    const matchPlayers = await prisma.playerPairing.findMany({
      where: { 
        matchId 
      },
      include: {
        player: true,
      },
      orderBy: {
        player: {
          name: 'asc'
        }
      }
    });

    if (matchPlayers.length === 0) {
      return null;
    }

    const homePlayers = matchPlayers
      .filter(p => p.isHomeTeam)
      .map(p => p.player);
      
    const awayPlayers = matchPlayers
      .filter(p => !p.isHomeTeam)
      .map(p => p.player);

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
      const homeGross = holeData.homeGross === '' || holeData.homeGross === undefined ? 
        null : Number(holeData.homeGross);
      const awayGross = holeData.awayGross === '' || holeData.awayGross === undefined ? 
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
      // Get all hole results for this match
      const holeResults = await prisma.holeResult.findMany({
        where: { matchId }
      });

      // Fetch the match format to get points data
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          format: {
            select: { points: true, halfPoints: true }
          }
        }
      });

      if (!match || !match.format) {
        console.error(`Cannot update points: Match format not found for matchId: ${matchId}`);
        return;
      }

      const pointsPerWin = match.format.points ?? 1.0;
      const pointsPerTie = match.format.halfPoints ?? pointsPerWin / 2.0;
      
      // Count points for each team
      let homePoints = 0;
      let awayPoints = 0;
      
      holeResults.forEach(result => {
        if (result.homeTeamNetScore !== null && result.awayTeamNetScore !== null) {
          if (result.homeTeamNetScore < result.awayTeamNetScore) {
            homePoints += pointsPerWin;
          } else if (result.awayTeamNetScore < result.homeTeamNetScore) {
            awayPoints += pointsPerWin;
          } else {
            // Scores are tied
            homePoints += pointsPerTie;
            awayPoints += pointsPerTie;
          }
        }
      });
      
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
}