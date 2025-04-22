import React from 'react';
import Link from 'next/link';
import { 
  UserGroupIcon, 
  PencilIcon, 
  UserIcon, 
  ChevronDownIcon, 
  ChevronUpIcon 
} from '@heroicons/react/24/outline';

interface TeamsTabProps {
  tournament: any;
  tournamentId: string;
}

export const TeamsTab: React.FC<TeamsTabProps> = ({ tournament, tournamentId }) => {
  const [expandedTeams, setExpandedTeams] = React.useState<Record<string, boolean>>({});

  // Toggle team expansion
  const toggleTeamExpansion = (teamId: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  // Determine if a team has the home team designation in their metadata
  const isHomeTeam = (team: Record<string, any>) => {
    return team.metadata && 
           typeof team.metadata === 'object' && 
           team.metadata.isHomeTeam === true;
  };

  if (!tournament.teams || tournament.teams.length === 0) {
    return (
      <div className="text-center py-12">
        <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No teams</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by adding teams to this tournament.</p>
        <div className="mt-6">
          <Link
            href={`/teams/new?tournamentId=${tournamentId}`}
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            Add Team
          </Link>
        </div>
      </div>
    );
  }

  const homeTeams = tournament.teams.filter((team: any) => isHomeTeam(team));
  const awayTeams = tournament.teams.filter((team: any) => !isHomeTeam(team));

  return (
    <div className="space-y-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">Teams & Players</h2>
          <p className="mt-2 text-sm text-gray-700">
            View and manage teams and players for the tournament.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href={`/teams/new?tournamentId=${tournamentId}`}
            className="block rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            Add Team
          </Link>
        </div>
      </div>

      {/* Home Teams Section */}
      {homeTeams.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Home Teams</h3>
          <div className="space-y-4">
            {homeTeams.map((team: any) => (
              <div key={team.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div 
                  className="px-4 py-4 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleTeamExpansion(team.id)}
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                      {team.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900">{team.name}</h4>
                      <p className="text-sm text-gray-500">
                        {team.players ? `${team.players.length} Players` : 'No players'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/tournaments/${tournamentId}/teams/${team.id}/edit`}
                      className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                    {expandedTeams[team.id] ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {/* Player List */}
                {expandedTeams[team.id] && team.players && team.players.length > 0 && (
                  <div className="border-t border-gray-200">
                    <ul className="divide-y divide-gray-200">
                      {team.players.map((player: any) => (
                        <li key={player.id} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{player.name}</p>
                              <p className="text-xs text-gray-500">Handicap: {player.handicapIndex.toFixed(1)}</p>
                            </div>
                          </div>
                          <Link
                            href={`/players/${player.id}/edit`}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span className="sr-only">Edit player</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Away Teams Section */}
      {awayTeams.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Away Teams</h3>
          <div className="space-y-4">
            {awayTeams.map((team: any) => (
              <div key={team.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div 
                  className="px-4 py-4 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleTeamExpansion(team.id)}
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                      {team.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900">{team.name}</h4>
                      <p className="text-sm text-gray-500">
                        {team.players ? `${team.players.length} Players` : 'No players'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/tournaments/${tournamentId}/teams/${team.id}/edit`}
                      className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                    {expandedTeams[team.id] ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {/* Player List */}
                {expandedTeams[team.id] && team.players && team.players.length > 0 && (
                  <div className="border-t border-gray-200">
                    <ul className="divide-y divide-gray-200">
                      {team.players.map((player: any) => (
                        <li key={player.id} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{player.name}</p>
                              <p className="text-xs text-gray-500">Handicap: {player.handicapIndex.toFixed(1)}</p>
                            </div>
                          </div>
                          <Link
                            href={`/players/${player.id}/edit`}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span className="sr-only">Edit player</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsTab;