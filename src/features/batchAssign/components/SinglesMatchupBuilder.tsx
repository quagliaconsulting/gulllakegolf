import React, { useEffect, useState } from 'react';
import { ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Player {
  id: string;
  name: string;
  handicapIndex: number;
}

interface Matchup {
  homeId: string;
  awayId: string;
}

interface SinglesMatchupBuilderProps {
  homePlayers: Player[];
  awayPlayers: Player[];
  matchups: Matchup[];
  onChange: (matchups: Matchup[]) => void;
}

const SinglesMatchupBuilder: React.FC<SinglesMatchupBuilderProps> = ({
  homePlayers,
  awayPlayers,
  matchups,
  onChange
}) => {
  const [unusedHomePlayers, setUnusedHomePlayers] = useState<Player[]>([]);
  const [unusedAwayPlayers, setUnusedAwayPlayers] = useState<Player[]>([]);
  
  // Initialize the unused players list
  useEffect(() => {
    if (homePlayers.length > 0 && awayPlayers.length > 0) {
      // Filter out players that are already in matchups
      const usedHomeIds = matchups.map(m => m.homeId);
      const usedAwayIds = matchups.map(m => m.awayId);
      
      const remainingHomePlayers = homePlayers.filter(p => !usedHomeIds.includes(p.id));
      const remainingAwayPlayers = awayPlayers.filter(p => !usedAwayIds.includes(p.id));
      
      setUnusedHomePlayers(remainingHomePlayers);
      setUnusedAwayPlayers(remainingAwayPlayers);
    }
  }, [homePlayers, awayPlayers, matchups]);
  
  // Add a new matchup
  const addMatchup = (homePlayer: Player, awayPlayer: Player) => {
    const newMatchup = {
      homeId: homePlayer.id,
      awayId: awayPlayer.id
    };
    
    // Update matchups
    const updatedMatchups = [...matchups, newMatchup];
    onChange(updatedMatchups);
    
    // Remove these players from the unused lists
    setUnusedHomePlayers(unusedHomePlayers.filter(p => p.id !== homePlayer.id));
    setUnusedAwayPlayers(unusedAwayPlayers.filter(p => p.id !== awayPlayer.id));
  };
  
  // Remove a matchup
  const removeMatchup = (matchupIndex: number) => {
    const removedMatchup = matchups[matchupIndex];
    
    // Find the players that were in this matchup
    const homePlayer = homePlayers.find(p => p.id === removedMatchup.homeId);
    const awayPlayer = awayPlayers.find(p => p.id === removedMatchup.awayId);
    
    // Add them back to the unused lists
    if (homePlayer) {
      setUnusedHomePlayers([...unusedHomePlayers, homePlayer]);
    }
    
    if (awayPlayer) {
      setUnusedAwayPlayers([...unusedAwayPlayers, awayPlayer]);
    }
    
    // Remove the matchup
    const updatedMatchups = matchups.filter((_, index) => index !== matchupIndex);
    onChange(updatedMatchups);
  };
  
  // Find player by ID
  const findPlayer = (playerId: string, isHome: boolean) => {
    const playerList = isHome ? homePlayers : awayPlayers;
    return playerList.find(p => p.id === playerId);
  };
  
  return (
    <div>
      {/* Existing matchups */}
      {matchups.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Current Matchups
          </h4>
          <div className="space-y-2">
            {matchups.map((matchup, index) => {
              const homePlayer = findPlayer(matchup.homeId, true);
              const awayPlayer = findPlayer(matchup.awayId, false);
              
              if (!homePlayer || !awayPlayer) return null;
              
              return (
                <div 
                  key={index}
                  className="flex items-center bg-gray-50 p-3 rounded-md border border-gray-200"
                >
                  <div className="flex-1">
                    <p className="text-green-600 font-medium">
                      {homePlayer.name}
                      <span className="text-gray-500 font-normal text-sm ml-1">
                        (HCP: {homePlayer.handicapIndex?.toFixed(1)})
                      </span>
                    </p>
                  </div>
                  
                  <ArrowRightIcon className="h-4 w-4 text-gray-400 mx-2" />
                  
                  <div className="flex-1">
                    <p className="text-red-600 font-medium">
                      {awayPlayer.name}
                      <span className="text-gray-500 font-normal text-sm ml-1">
                        (HCP: {awayPlayer.handicapIndex?.toFixed(1)})
                      </span>
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removeMatchup(index)}
                    className="text-gray-400 hover:text-gray-500 ml-2"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Create new matchups */}
      {unusedHomePlayers.length > 0 && unusedAwayPlayers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Create New Matchup
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="home-player" className="block text-xs font-medium text-gray-500 mb-1">
                {homePlayers[0]?.name.split(' ')[0]}'s Team Player
              </label>
              <select
                id="home-player"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                defaultValue=""
              >
                <option value="" disabled>Select player</option>
                {unusedHomePlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} (HCP: {player.handicapIndex?.toFixed(1)})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="away-player" className="block text-xs font-medium text-gray-500 mb-1">
                {awayPlayers[0]?.name.split(' ')[0]}'s Team Player
              </label>
              <select
                id="away-player"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                defaultValue=""
              >
                <option value="" disabled>Select player</option>
                {unusedAwayPlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} (HCP: {player.handicapIndex?.toFixed(1)})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4 text-right">
            <button
              type="button"
              onClick={() => {
                const homeSelect = document.getElementById('home-player') as HTMLSelectElement;
                const awaySelect = document.getElementById('away-player') as HTMLSelectElement;
                
                if (homeSelect && awaySelect && homeSelect.value && awaySelect.value) {
                  const homePlayer = unusedHomePlayers.find(p => p.id === homeSelect.value);
                  const awayPlayer = unusedAwayPlayers.find(p => p.id === awaySelect.value);
                  
                  if (homePlayer && awayPlayer) {
                    addMatchup(homePlayer, awayPlayer);
                    
                    // Reset selects
                    homeSelect.value = '';
                    awaySelect.value = '';
                  }
                }
              }}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Add Matchup
            </button>
          </div>
        </div>
      )}
      
      {/* If all players are assigned */}
      {(unusedHomePlayers.length === 0 || unusedAwayPlayers.length === 0) && matchups.length > 0 && (
        <div className="text-sm text-gray-500 italic">
          All available players have been assigned to matchups.
        </div>
      )}
    </div>
  );
};

export default SinglesMatchupBuilder;