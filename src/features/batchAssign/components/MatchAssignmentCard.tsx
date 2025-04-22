import React from 'react';
import { ChevronRightIcon, ChevronDownIcon, UsersIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { PlayerAssignment } from '../hooks/useBatchAssign';
import PlayerSelectionList from './PlayerSelectionList';
import SinglesMatchupBuilder from './SinglesMatchupBuilder';

interface MatchAssignmentCardProps {
  match: PlayerAssignment;
  toggleExpand: (matchId: string) => void;
  onPlayerChange: (matchId: string, isHomeTeam: boolean, playerIds: string[]) => void;
  onSinglesMatchupChange: (matchId: string, matchups: {homeId: string, awayId: string}[]) => void;
  onCreateFoursome: (match: PlayerAssignment) => void;
}

const MatchAssignmentCard: React.FC<MatchAssignmentCardProps> = ({
  match,
  toggleExpand,
  onPlayerChange,
  onSinglesMatchupChange,
  onCreateFoursome
}) => {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md mb-4">
      <div 
        className="px-4 py-5 sm:px-6 cursor-pointer flex justify-between items-center"
        onClick={() => toggleExpand(match.matchId)}
      >
        <div>
          <div className="flex items-center mb-1">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mr-2">
              {match.format}
            </h3>
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              {match.time}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {match.course} • Hole {match.startingHole || 1}
          </p>
          <div className="mt-2 flex text-sm">
            <div className="text-green-600 font-medium mr-1">{match.homeTeam}</div>
            <div className="text-gray-500 mx-1">vs</div>
            <div className="text-red-600 font-medium ml-1">{match.awayTeam}</div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-1">
            <div className="flex items-center bg-green-50 px-2 py-1 rounded-md">
              <UsersIcon className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600 text-sm font-medium">{match.homePlayers.length}</span>
            </div>
            <div className="flex items-center bg-red-50 px-2 py-1 rounded-md">
              <UsersIcon className="h-4 w-4 text-red-600 mr-1" />
              <span className="text-red-600 text-sm font-medium">{match.awayPlayers.length}</span>
            </div>
          </div>
          {match.expanded ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>
      
      {match.expanded && (
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Home Team */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-green-700">
                  {match.homeTeam} Players
                </h4>
              </div>
              <PlayerSelectionList
                players={Array.isArray(match.allHomePlayers) ? match.allHomePlayers : []}
                selectedIds={Array.isArray(match.homePlayers) ? match.homePlayers : []}
                onChange={(playerIds) => onPlayerChange(match.matchId, true, playerIds)}
                requiredPlayers={match.requiredPlayers}
              />
            </div>
            
            {/* Away Team */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-red-700">
                  {match.awayTeam} Players
                </h4>
              </div>
              <PlayerSelectionList
                players={Array.isArray(match.allAwayPlayers) ? match.allAwayPlayers : []}
                selectedIds={Array.isArray(match.awayPlayers) ? match.awayPlayers : []}
                onChange={(playerIds) => onPlayerChange(match.matchId, false, playerIds)}
                requiredPlayers={match.requiredPlayers}
                teamColor="red"
              />
            </div>
          </div>
          
          {/* Singles matchup builder (if needed) */}
          {match.isSingles && match.homePlayers.length >= 2 && match.awayPlayers.length >= 2 && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">
                Player-to-Player Matchups
              </h4>
              <SinglesMatchupBuilder
                homePlayers={Array.isArray(match.allHomePlayers) ? 
                  match.allHomePlayers.filter((p: any) => Array.isArray(match.homePlayers) && match.homePlayers.includes(p.id)) : []}
                awayPlayers={Array.isArray(match.allAwayPlayers) ? 
                  match.allAwayPlayers.filter((p: any) => Array.isArray(match.awayPlayers) && match.awayPlayers.includes(p.id)) : []}
                matchups={Array.isArray(match.playerMatchups) ? match.playerMatchups : []}
                onChange={(matchups) => onSinglesMatchupChange(match.matchId, matchups)}
              />
            </div>
          )}
          
          {/* Create foursome button (pairs formats only) */}
          {match.isPairsFormat && (
            <div className="mt-6 text-right">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateFoursome(match);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Foursome Group
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchAssignmentCard;