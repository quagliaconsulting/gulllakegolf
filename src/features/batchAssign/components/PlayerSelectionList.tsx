import React from 'react';
import { CheckCircleIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

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
  teamColor?: 'blue' | 'red';
}

const PlayerSelectionList: React.FC<PlayerSelectionListProps> = ({
  players,
  selectedIds,
  onChange,
  requiredPlayers,
  teamColor = 'blue',
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

  return (
    <div className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
      <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
        {players.length === 0 ? (
          <li className="px-4 py-3 text-sm text-gray-500">
            No players available
          </li>
        ) : (
          players.map(player => {
            const isSelected = selectedIds.includes(player.id);
            
            return (
              <li 
                key={player.id}
                className={`px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 
                  ${isSelected ? (teamColor === 'blue' ? 'bg-blue-50' : 'bg-red-50') : ''}`}
                onClick={() => handleTogglePlayer(player.id)}
              >
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{player.name}</p>
                  <p className="text-gray-500">HCP: {player.handicapIndex?.toFixed(1)}</p>
                </div>
                <div>
                  {isSelected ? (
                    <CheckCircleIcon className={`h-5 w-5 ${teamColor === 'blue' ? 'text-blue-500' : 'text-red-500'}`} />
                  ) : (
                    <PlusCircleIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
      <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {selectedIds.length} of {requiredPlayers} players selected
        </p>
      </div>
    </div>
  );
};

export default PlayerSelectionList;