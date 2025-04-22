import React from 'react';
import { CheckCircleIcon, PlusCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Player {
  id: string;
  name: string;
  handicapIndex: number;
  isAssigned?: boolean;
}

interface PlayerSelectionListProps {
  players: Player[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  requiredPlayers: number;
  teamColor?: 'green' | 'red';
}

const PlayerSelectionList: React.FC<PlayerSelectionListProps> = ({
  players,
  selectedIds,
  onChange,
  requiredPlayers,
  teamColor = 'green',
}) => {
  const handleTogglePlayer = (playerId: string) => {
    const isSelected = selectedIds.includes(playerId);
    
    if (isSelected) {
      // Remove player
      onChange(selectedIds.filter(id => id !== playerId));
    } else {
      // Add player
      onChange([...selectedIds, playerId]);
    }
  };
  
  // Make sure we have valid player objects before sorting
  const validPlayers = players.filter(p => p && typeof p === 'object' && p.id);
  
  // Log issues if we're getting invalid players
  if (validPlayers.length !== players.length) {
    console.warn(`Filtered out ${players.length - validPlayers.length} invalid players`);
    console.log('Invalid players:', players.filter(p => !p || typeof p !== 'object' || !p.id));
  }
  
  // Sort players by handicap (lower handicap = better player)
  const sortedPlayers = [...validPlayers].sort((a, b) => 
    (a.handicapIndex ?? 99) - (b.handicapIndex ?? 99)
  );
  
  // Auto-select players with best handicaps
  const autoSelectBestPlayers = () => {
    // Get top players by handicap (limited to required number)
    const bestPlayers = sortedPlayers
      .filter(p => !p.isAssigned || selectedIds.includes(p.id))
      .slice(0, requiredPlayers)
      .map(p => p.id);
      
    onChange(bestPlayers);
  };

  return (
    <div className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
      <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
        <p className="text-xs text-gray-500">
          {selectedIds.length} of {requiredPlayers} players selected
        </p>
        <button
          type="button"
          onClick={autoSelectBestPlayers}
          className={`inline-flex items-center text-xs font-medium ${teamColor === 'green' ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
        >
          <ArrowPathIcon className="h-3 w-3 mr-1" />
          Auto-Select Best
        </button>
      </div>
      <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
        {players.length === 0 ? (
          <li className="px-4 py-3 text-sm text-gray-500">
            No players available. Please add players to this team in the Teams tab.
          </li>
        ) : (
          sortedPlayers.map(player => {
            const isSelected = selectedIds.includes(player.id);
            
            return (
              <li 
                key={player.id}
                className={`px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 
                  ${isSelected ? (teamColor === 'green' ? 'bg-green-50' : 'bg-red-50') : ''}`}
                onClick={() => handleTogglePlayer(player.id)}
              >
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{player.name}</p>
                  <p className="text-gray-500">HCP: {player.handicapIndex?.toFixed(1)}</p>
                </div>
                <div>
                  {isSelected ? (
                    <CheckCircleIcon className={`h-5 w-5 ${teamColor === 'green' ? 'text-green-500' : 'text-red-500'}`} />
                  ) : (
                    <PlusCircleIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};

export default PlayerSelectionList;