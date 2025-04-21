import React, { useState, useEffect } from 'react';
import { ArrowPathIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { useApi } from '@/services/api/apiClient';

interface LeaderboardTabProps {
  tournament: any;
  tournamentId: string;
}

interface TeamStanding {
  teamId: string;
  teamName: string;
  totalPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesTied: number;
  matchesLost: number;
  isHomeTeam: boolean;
}

interface PlayerStanding {
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
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ 
  tournament, 
  tournamentId 
}) => {
  const [activeView, setActiveView] = useState<'teams' | 'players'>('teams');
  
  // Fetch leaderboard data
  const {
    data: leaderboardData,
    error: leaderboardError,
    isLoading: leaderboardLoading,
    mutate: refreshLeaderboard
  } = useApi(
    tournamentId ? `/api/tournaments/${tournamentId}/leaderboard` : null,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  );

  // Fallback to generating leaderboard data from tournament data if API doesn't exist
  const [generatedTeamStandings, setGeneratedTeamStandings] = useState<TeamStanding[]>([]);
  const [generatedPlayerStandings, setGeneratedPlayerStandings] = useState<PlayerStanding[]>([]);
  
  // Generate standings from tournament data if API fails or doesn't exist
  useEffect(() => {
    if (leaderboardData) return;
    
    if (tournament && tournament.teams) {
      // Generate team standings
      const teamStandings: TeamStanding[] = tournament.teams.map((team: any) => {
        const isHome = team.metadata && 
                      typeof team.metadata === 'object' && 
                      team.metadata.isHomeTeam === true;
        
        return {
          teamId: team.id,
          teamName: team.name,
          totalPoints: 0,
          matchesPlayed: 0,
          matchesWon: 0,
          matchesTied: 0,
          matchesLost: 0,
          isHomeTeam: isHome
        };
      });
      
      // Sort teams (home teams first, then by name)
      teamStandings.sort((a, b) => {
        if (a.isHomeTeam && !b.isHomeTeam) return -1;
        if (!a.isHomeTeam && b.isHomeTeam) return 1;
        return a.teamName.localeCompare(b.teamName);
      });
      
      setGeneratedTeamStandings(teamStandings);
      
      // Generate player standings
      const playerStandings: PlayerStanding[] = [];
      
      tournament.teams.forEach((team: any) => {
        const isHome = team.metadata && 
                      typeof team.metadata === 'object' && 
                      team.metadata.isHomeTeam === true;
        
        if (team.players) {
          team.players.forEach((player: any) => {
            playerStandings.push({
              playerId: player.id,
              playerName: player.name,
              teamName: team.name,
              handicapIndex: player.handicapIndex || 0,
              matchesPlayed: 0,
              pointsEarned: 0,
              holesWon: 0,
              holesTied: 0,
              holesLost: 0,
              isHomeTeam: isHome
            });
          });
        }
      });
      
      // Sort players (by team, then by name)
      playerStandings.sort((a, b) => {
        if (a.isHomeTeam && !b.isHomeTeam) return -1;
        if (!a.isHomeTeam && b.isHomeTeam) return 1;
        if (a.teamName !== b.teamName) return a.teamName.localeCompare(b.teamName);
        return a.playerName.localeCompare(b.playerName);
      });
      
      setGeneratedPlayerStandings(playerStandings);
    }
  }, [tournament, leaderboardData]);
  
  // Use leaderboard data if available, otherwise use generated data
  const teamStandings = leaderboardData?.teamStandings || generatedTeamStandings;
  const playerStandings = leaderboardData?.playerStandings || generatedPlayerStandings;
  
  if (leaderboardLoading) {
    return <div className="text-center py-6">Loading leaderboard data...</div>;
  }
  
  if (leaderboardError && generatedTeamStandings.length === 0) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
        <div className="flex">
          <div>
            <p className="text-sm text-red-700">
              Error loading leaderboard data. Please try again.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">Tournament Leaderboard</h2>
          <p className="mt-2 text-sm text-gray-700">
            View current standings for teams and players.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex space-x-3">
          <button
            type="button"
            onClick={() => refreshLeaderboard()}
            className="block rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </button>
        </div>
      </div>
      
      {/* View toggle */}
      <div className="bg-white p-2 flex space-x-1 sm:w-72 rounded-lg shadow">
        <button
          type="button"
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
            activeView === 'teams'
              ? 'bg-primary text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => setActiveView('teams')}
        >
          Team Standings
        </button>
        <button
          type="button"
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
            activeView === 'players'
              ? 'bg-primary text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => setActiveView('players')}
        >
          Player Standings
        </button>
      </div>
      
      {/* Team Standings */}
      {activeView === 'teams' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="bg-white px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Team Standings</h3>
          </div>
          {teamStandings.length === 0 ? (
            <div className="text-center py-8">
              <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No team data available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Team standings will appear once matches have been played and scored.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Points
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matches
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      W-T-L
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamStandings.map((team, index) => (
                    <tr key={team.teamId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${team.isHomeTeam ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                          <span className="font-medium text-gray-900">{team.teamName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        {team.totalPoints}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                        {team.matchesPlayed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                        {team.matchesWon}-{team.matchesTied}-{team.matchesLost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Player Standings */}
      {activeView === 'players' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="bg-white px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Player Standings</h3>
          </div>
          {playerStandings.length === 0 ? (
            <div className="text-center py-8">
              <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No player data available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Player standings will appear once matches have been played and scored.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HCP
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Points
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matches
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      W-T-L Holes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {playerStandings.map((player, index) => (
                    <tr key={player.playerId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {player.playerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${player.isHomeTeam ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                          <span>{player.teamName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {player.handicapIndex.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        {player.pointsEarned}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                        {player.matchesPlayed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                        {player.holesWon}-{player.holesTied}-{player.holesLost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaderboardTab;