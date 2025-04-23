import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Service for tournament-related operations
 */
export class TournamentService {
  /**
   * Get all tournaments with optional filtering
   */
  async getAllTournaments(
    status?: 'upcoming' | 'active' | 'completed',
    includeTeams: boolean = false
  ) {
    const where: Prisma.TournamentWhereInput = {};
    
    // Status filtering logic will be handled in-memory since status is a derived property
    
    const tournaments = await prisma.tournament.findMany({
      where,
      orderBy: {
        startDate: 'desc'
      },
      include: {
        teams: includeTeams ? {
          include: {
            players: true
          }
        } : undefined
      }
    });
    
    return tournaments;
  }
  
  /**
   * Get tournament by ID with related data
   */
  async getTournamentById(
    id: string, 
    includeTeams: boolean = true,
    includePaymentStatus: boolean = false
  ) {
    // Get the base tournament with teams
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        teams: includeTeams ? {
          include: {
            players: true
          }
        } : false,
        schedules: {
          include: {
            matches: true
          }
        },
        formatMultipliers: true
      }
    });
    
    if (!tournament) {
      return null;
    }
    
    // Calculate tournament status based on dates
    const now = new Date();
    const startDate = new Date(tournament.startDate);
    const endDate = new Date(tournament.endDate);
    
    let status = 'upcoming';
    if (now > endDate) {
      status = 'completed';
    } else if (now >= startDate && now <= endDate) {
      status = 'active';
    }
    
    // Add status to the tournament
    const enrichedTournament = {
      ...tournament,
      status
    };
    
    // If payment status is requested, fetch and include it
    if (includePaymentStatus && enrichedTournament.teams) {
      // Get all players from all teams
      const allPlayers = enrichedTournament.teams.flatMap((team: any) => (team.players && Array.isArray(team.players)) ? team.players : []);
      const playerIds = allPlayers.map(player => player.id);
      
      if (playerIds.length > 0) {
        // Fetch payment statuses for all players
        const paymentStatuses = await prisma.playerPayment.findMany({
          where: {
            playerId: { in: playerIds },
            tournamentId: id
          }
        });
        
        // Create a map of player ID to payment statuses
        const paymentMap: Record<string, Record<string, boolean>> = {};
        paymentStatuses.forEach(payment => {
          if (!paymentMap[payment.playerId]) {
            paymentMap[payment.playerId] = {};
          }
          paymentMap[payment.playerId][payment.type] = payment.status === 'PAID';
        });
        
        // Add payment statuses to each player
        enrichedTournament.teams = enrichedTournament.teams.map((team: any) => ({
          ...team,
          players: Array.isArray(team.players) ? team.players.map((player: any) => ({
            ...player,
            paymentStatuses: paymentMap[player.id] || {
              BUY_IN: false,
              CTP_ENTRY: false,
              SKINS_ENTRY: false
            }
          })) : []
        }));
      }
    }
    
    // Add match count for consistency with the old API
    const matchCount = enrichedTournament.schedules.reduce((total, schedule) => {
      return total + schedule.matches.length;
    }, 0);
    
    // Add player count for consistency with the old API
    // Query to get the actual count rather than relying on the teams players
    const playerCount = await prisma.player.count({
      where: {
        teamId: {
          in: enrichedTournament.teams?.map((t: any) => t.id) || []
        }
      }
    });
    
    // Final enhanced tournament object
    return {
      ...enrichedTournament,
      matches: matchCount,
      players: playerCount
    };
  }
  
  /**
   * Create a new tournament
   */
  async createTournament(data: Prisma.TournamentCreateInput) {
    return await prisma.tournament.create({
      data
    });
  }
  
  /**
   * Update an existing tournament
   */
  async updateTournament(id: string, data: Prisma.TournamentUpdateInput) {
    return await prisma.tournament.update({
      where: { id },
      data
    });
  }
  
  /**
   * Delete a tournament and its related data
   */
  async deleteTournament(id: string) {
    // First, delete all related data in the correct order
    try {
      // 1. Delete CTP results
      await prisma.cTPResult.deleteMany({
        where: { tournamentId: id }
      });
      
      // 2. Delete skins results
      await prisma.skinsResult.deleteMany({
        where: { tournamentId: id }
      });
      
      // 3. Delete hole results
      await prisma.holeResult.deleteMany({
        where: {
          match: {
            tournamentId: id
          }
        }
      });
      
      // 4. Delete player pairings
      await prisma.playerPairing.deleteMany({
        where: {
          match: {
            tournamentId: id
          }
        }
      });
      
      // 5. Delete match points
      await prisma.matchPoints.deleteMany({
        where: {
          match: {
            tournamentId: id
          }
        }
      });
      
      // 6. Delete matches directly by tournamentId (not through schedule)
      await prisma.match.deleteMany({
        where: { tournamentId: id }
      });
      
      // 7. Delete schedules
      await prisma.schedule.deleteMany({
        where: { tournamentId: id }
      });
      
      // 8. Delete player payments
      await prisma.playerPayment.deleteMany({
        where: { tournamentId: id }
      });
      
      // 9. Delete formatMultipliers
      await prisma.formatMultiplier.deleteMany({
        where: { tournamentId: id }
      });
      
      // 10. Delete holes from course
      await prisma.hole.deleteMany({
        where: {
          course: {
            tournamentId: id
          }
        }
      });
      
      // 11. Delete courses
      await prisma.course.deleteMany({
        where: { tournamentId: id }
      });
      
      // 12. Delete gallery photos
      await prisma.galleryPhoto.deleteMany({
        where: { tournamentId: id }
      });
      
      // 13. Delete reports
      await prisma.report.deleteMany({
        where: { tournamentId: id }
      });
      
      // Remove team affiliations for players, but don't delete the players
      await prisma.player.updateMany({
        where: {
          team: {
            tournamentId: id
          }
        },
        data: {
          teamId: null
        }
      });
      
      // 15. Delete teams
      await prisma.team.deleteMany({
        where: { tournamentId: id }
      });
      
      // 16. Delete accommodations
      await prisma.accommodation.deleteMany({
        where: { tournamentId: id }
      });
      
      // 17. Finally, delete the tournament
      return await prisma.tournament.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error in deleteTournament:', error);
      throw error;
    }
  }
  
  /**
   * Get tournament schedule
   */
  async getTournamentSchedule(tournamentId: string) {
    try {
      // First check if tournament exists
      const tournamentExists = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { id: true }
      });
      
      if (!tournamentExists) {
        console.log(`Tournament not found for schedule lookup: ${tournamentId}`);
        return { schedules: [] };
      }
      
      const schedules = await prisma.schedule.findMany({
        where: {
          tournamentId
        },
        orderBy: {
          date: 'asc'
        },
        include: {
          matches: {
            include: {
              format: true,
              course: true,
              homeTeam: true,
              awayTeam: true
            },
            orderBy: {
              teeTime: 'asc'
            }
          }
        }
      });
      
      // If no schedules found, return empty array
      if (schedules.length === 0) {
        console.log(`No schedules found for tournament: ${tournamentId}`);
        return { schedules: [] };
      }
      
      // Format the matches for easier consumption
      return {
        schedules: schedules.map(schedule => ({
          ...schedule,
          matches: schedule.matches.map(match => ({
            id: match.id,
            homeTeam: match.homeTeam?.name || 'Team 1',
            homeTeamId: match.homeTeamId,
            awayTeam: match.awayTeam?.name || 'Team 2',
            awayTeamId: match.awayTeamId,
            format: match.format.formatName,
            formatId: match.formatId,
            course: match.course.name,
            courseId: match.courseId,
            time: match.teeTime,
            teeTime: match.teeTime,
            startingHole: match.startingHole,
            scheduleId: schedule.id
          }))
        }))
      };
    } catch (error) {
      console.error(`Error getting tournament schedule for ${tournamentId}:`, error);
      // Return empty schedules on error
      return { schedules: [] };
    }
  }
  
  /**
   * Get tournament leaderboard data
   */
  async getTournamentLeaderboard(tournamentId: string) {
    // Get the tournament with teams and players
    const tournament = await this.getTournamentById(tournamentId, true);
    
    if (!tournament) {
      return null;
    }
    
    // Get all matches for this tournament
    const matches = await prisma.match.findMany({
      where: {
        schedule: {
          tournamentId
        }
      },
      include: {
        points: true,
        playerPairings: {
          include: {
            player: true
          }
        },
        holeResults: true
      }
    });
    
    // Initialize team standings
    const teamStandings: Record<string, {
      teamId: string;
      teamName: string;
      totalPoints: number;
      matchesPlayed: number;
      matchesWon: number;
      matchesTied: number;
      matchesLost: number;
      isHomeTeam: boolean;
    }> = {};
    
    // Initialize player standings
    const playerStandings: Record<string, {
      playerId: string;
      playerName: string;
      teamName: string;
      handicapIndex: number;
      matchesPlayed: number;
      pointsEarned: number;
      holesWon: number;
      holesTied: number;
      holesLost: number;
      isHomeTeam: boolean;
    }> = {};
    
    // Set up team standings for all teams
    tournament.teams.forEach((team: any) => {
      const metadata = team.metadata;
      const isHomeTeam = metadata && 
        (typeof metadata === 'object') && 
        ('isHomeTeam' in metadata) && 
        Boolean(metadata.isHomeTeam);
        
      teamStandings[team.id] = {
        teamId: team.id,
        teamName: team.name,
        totalPoints: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesTied: 0,
        matchesLost: 0,
        isHomeTeam: Boolean(isHomeTeam)
      };
      
      // Set up player standings for all players
      if (team.players && Array.isArray(team.players)) {
        team.players.forEach((player: any) => {
          playerStandings[player.id] = {
            playerId: player.id,
            playerName: player.name,
            teamName: team.name,
            handicapIndex: player.handicapIndex,
            matchesPlayed: 0,
            pointsEarned: 0,
            holesWon: 0,
            holesTied: 0,
            holesLost: 0,
            isHomeTeam: Boolean(isHomeTeam)
          };
        });
      }
    });
    
    // Process match results
    matches.forEach(match => {
      // Skip matches without points
      if (!match.points) return;
      
      const homeTeamId = match.homeTeamId;
      const awayTeamId = match.awayTeamId;
      
      // Skip if teams are not in the standings (could happen if a team was deleted)
      if (!teamStandings[homeTeamId] || !teamStandings[awayTeamId]) return;
      
      // Update matches played
      teamStandings[homeTeamId].matchesPlayed++;
      teamStandings[awayTeamId].matchesPlayed++;
      
      // Update points - fixed to 1 decimal place to avoid floating point issues
      // The loop processes each match individually. For singles foursomes,
      // summing the points from each match (1 for win, 0.5 for tie)
      // naturally aggregates the total points for the group.
      teamStandings[homeTeamId].totalPoints += parseFloat(match.points.homeTeamPoints.toFixed(1));
      teamStandings[awayTeamId].totalPoints += parseFloat(match.points.awayTeamPoints.toFixed(1));
      
      // Update win/tie/loss records for teams
      if (match.points.homeTeamPoints > match.points.awayTeamPoints) {
        teamStandings[homeTeamId].matchesWon++;
        teamStandings[awayTeamId].matchesLost++;
      } else if (match.points.homeTeamPoints < match.points.awayTeamPoints) {
        teamStandings[homeTeamId].matchesLost++;
        teamStandings[awayTeamId].matchesWon++;
      } else {
        teamStandings[homeTeamId].matchesTied++;
        teamStandings[awayTeamId].matchesTied++;
      }
      
      // Process player statistics
      match.playerPairings.forEach(pairing => {
        // Skip if player is not in the standings
        if (!playerStandings[pairing.playerId]) return;
        
        const player = playerStandings[pairing.playerId];
        if (!player) return;
        
        // Update matches played
        player.matchesPlayed++;
        
        // Calculate player-specific hole statistics for ALL formats
        const playerTeamId = pairing.isHomeTeam ? homeTeamId : awayTeamId;
        const opponentTeamId = pairing.isHomeTeam ? awayTeamId : homeTeamId;
        
        // Count holes won/lost/tied for this player
        const holesWon = match.holeResults.filter(r => 
          r.winnerTeamId === playerTeamId && 
          r.homeTeamNetScore !== null && 
          r.awayTeamNetScore !== null
        ).length;
        
        const holesLost = match.holeResults.filter(r => 
          r.winnerTeamId === opponentTeamId && 
          r.homeTeamNetScore !== null && 
          r.awayTeamNetScore !== null
        ).length;
        
        const holesTied = match.holeResults.filter(r => 
          r.winnerTeamId === null && 
          r.homeTeamNetScore !== null && 
          r.awayTeamNetScore !== null
        ).length;
        
        // Update player hole statistics for ALL formats
        player.holesWon += holesWon;
        player.holesLost += holesLost;
        player.holesTied += holesTied;
        
        console.log(`Player ${player.playerName}: W-T-L Holes: ${holesWon}-${holesTied}-${holesLost} (Total: ${holesWon + holesTied + holesLost})`);
        
        // Handle points calculation based on match format
        const isSinglesFormat = match.formatId === 'SINGLES' || 
          (match.format?.formatName?.toLowerCase()?.includes('singles'));
        
        // For singles format with 1v1 matchups, player gets their own score
        if (isSinglesFormat || match.playerToPlayerMatch) {
          // In singles format, each player gets points based on their individual match result
          // (1 point for winning, 0.5 for tying, 0 for losing).
          // The loop processes each match, so summing these individual points
          // correctly reflects the total points earned by the player across all their matches.
          const playerPoints = pairing.isHomeTeam ? match.points.homeTeamPoints : match.points.awayTeamPoints;
          player.pointsEarned += parseFloat(playerPoints.toFixed(1));
          console.log(`Singles/P2P match - Player ${player.playerName} awarded ${playerPoints} points`);
        }
        // Team formats - add team match points to player
        else if (match.points) {
          const teamPoints = pairing.isHomeTeam ? match.points.homeTeamPoints : match.points.awayTeamPoints;
          player.pointsEarned += parseFloat(teamPoints.toFixed(1));
          
          console.log(`Team format - Player ${player.playerName} awarded ${teamPoints} points from team`);
        }
      });
    });
    
    return {
      teamStandings: Object.values(teamStandings),
      playerStandings: Object.values(playerStandings)
    };
  }
  
  /**
   * Get CTP (Closest to Pin) entries
   */
  async getTournamentCTP(tournamentId: string) {
    // To be implemented
    return {
      entries: [],
      winners: []
    };
  }
  
  /**
   * Get Skins game entries
   */
  async getTournamentSkins(tournamentId: string) {
    // To be implemented
    return {
      entries: [],
      winners: []
    };
  }
}