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
    
    if (status) {
      where.status = status;
    }
    
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
        } : undefined
      }
    });
    
    if (!tournament) {
      return null;
    }
    
    // If payment status is requested, fetch and include it
    if (includePaymentStatus && tournament.teams) {
      // Get all players from all teams
      const allPlayers = tournament.teams.flatMap(team => team.players || []);
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
          paymentMap[payment.playerId][payment.type] = payment.paid;
        });
        
        // Add payment statuses to each player
        tournament.teams = tournament.teams.map(team => ({
          ...team,
          players: team.players.map(player => ({
            ...player,
            paymentStatuses: paymentMap[player.id] || {
              BUY_IN: false,
              CTP_ENTRY: false,
              SKINS_ENTRY: false
            }
          }))
        }));
      }
    }
    
    return tournament;
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
    // 1. Delete hole results
    await prisma.holeResult.deleteMany({
      where: {
        match: {
          schedule: {
            tournamentId: id
          }
        }
      }
    });
    
    // 2. Delete player pairings
    await prisma.playerPairing.deleteMany({
      where: {
        match: {
          schedule: {
            tournamentId: id
          }
        }
      }
    });
    
    // 3. Delete match points
    await prisma.matchPoints.deleteMany({
      where: {
        match: {
          schedule: {
            tournamentId: id
          }
        }
      }
    });
    
    // 4. Delete matches
    await prisma.match.deleteMany({
      where: {
        schedule: {
          tournamentId: id
        }
      }
    });
    
    // 5. Delete schedules
    await prisma.schedule.deleteMany({
      where: {
        tournamentId: id
      }
    });
    
    // 6. Delete player payments
    await prisma.playerPayment.deleteMany({
      where: {
        tournamentId: id
      }
    });
    
    // 7. Delete tournament
    return await prisma.tournament.delete({
      where: {
        id
      }
    });
  }
  
  /**
   * Get tournament schedule
   */
  async getTournamentSchedule(tournamentId: string) {
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
    tournament.teams.forEach(team => {
      const isHomeTeam = team.metadata && 
        typeof team.metadata === 'object' && 
        team.metadata.isHomeTeam === true;
        
      teamStandings[team.id] = {
        teamId: team.id,
        teamName: team.name,
        totalPoints: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesTied: 0,
        matchesLost: 0,
        isHomeTeam
      };
      
      // Set up player standings for all players
      team.players.forEach(player => {
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
          isHomeTeam
        };
      });
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
      
      // Update points
      teamStandings[homeTeamId].totalPoints += match.points.homeTeamPoints;
      teamStandings[awayTeamId].totalPoints += match.points.awayTeamPoints;
      
      // Update win/tie/loss records
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
        
        // Update matches played
        player.matchesPlayed++;
        
        // For singles format, calculate player-specific points
        if (match.format === 'SINGLES') {
          // Filter hole results for this player's pairings
          const playerHoleResults = match.holeResults.filter(result => {
            // TODO: Implement player-specific hole results logic
            return true;
          });
          
          // Update player statistics (simplified for now)
          if (playerHoleResults.length > 0) {
            player.holesWon += playerHoleResults.filter(r => r.winnerTeamId === (pairing.isHomeTeam ? homeTeamId : awayTeamId)).length;
            player.holesLost += playerHoleResults.filter(r => r.winnerTeamId === (pairing.isHomeTeam ? awayTeamId : homeTeamId)).length;
            player.holesTied += playerHoleResults.filter(r => r.winnerTeamId === null && r.homeTeamNetScore !== null).length;
          }
        }
        
        // Add team points to player
        player.pointsEarned += pairing.isHomeTeam ? match.points.homeTeamPoints : match.points.awayTeamPoints;
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