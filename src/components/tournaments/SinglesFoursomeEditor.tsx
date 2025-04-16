import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

interface SinglesFoursomeEditorProps {
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  formatId: string;
  scheduleId: string;
  courseId: string;
  startingHole: number;
  teeTime: Date;
  onCancel: () => void;
  onSave: () => void;
}

interface Player {
  id: string;
  name: string;
  handicapIndex: number;
}

interface PlayerMatchup {
  homePlayerId: string;
  awayPlayerId: string;
}

export default function SinglesFoursomeEditor({
  tournamentId,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  formatId,
  scheduleId,
  courseId,
  startingHole,
  teeTime,
  onCancel,
  onSave
}: SinglesFoursomeEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);
  const [matchups, setMatchups] = useState<PlayerMatchup[]>([]);

  // Load team players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch home team players
        const homeResponse = await axios.get(`/api/teams/${homeTeamId}`);
        if (homeResponse.data && homeResponse.data.players) {
          setHomePlayers(homeResponse.data.players);
        }

        // Fetch away team players
        const awayResponse = await axios.get(`/api/teams/${awayTeamId}`);
        if (awayResponse.data && awayResponse.data.players) {
          setAwayPlayers(awayResponse.data.players);
        }
      } catch (err) {
        console.error('Error fetching players:', err);
        setError('Failed to load players. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [homeTeamId, awayTeamId]);

  // Toggle player selection
  const toggleHomePlayer = (playerId: string) => {
    setSelectedHomePlayers(prev => {
      if (prev.includes(playerId)) {
        // Remove player
        const newSelection = prev.filter(id => id !== playerId);
        
        // Also remove any matchups involving this player
        setMatchups(prev => prev.filter(m => m.homePlayerId !== playerId));
        
        return newSelection;
      } else {
        // Add player (max 2)
        if (prev.length < 2) {
          return [...prev, playerId];
        }
        return prev;
      }
    });
  };

  const toggleAwayPlayer = (playerId: string) => {
    setSelectedAwayPlayers(prev => {
      if (prev.includes(playerId)) {
        // Remove player
        const newSelection = prev.filter(id => id !== playerId);
        
        // Also remove any matchups involving this player
        setMatchups(prev => prev.filter(m => m.awayPlayerId !== playerId));
        
        return newSelection;
      } else {
        // Add player (max 2)
        if (prev.length < 2) {
          return [...prev, playerId];
        }
        return prev;
      }
    });
  };

  // Create or update a matchup
  const setMatchup = (homePlayerId: string, awayPlayerId: string) => {
    setMatchups(prev => {
      // Remove any existing matchups involving these players
      const filtered = prev.filter(m => 
        m.homePlayerId !== homePlayerId && m.awayPlayerId !== awayPlayerId
      );
      
      // Add new matchup
      return [...filtered, { homePlayerId, awayPlayerId }];
    });
  };

  // Remove a matchup
  const removeMatchup = (homePlayerId: string, awayPlayerId: string) => {
    setMatchups(prev => prev.filter(m => 
      m.homePlayerId !== homePlayerId || m.awayPlayerId !== awayPlayerId
    ));
  };

  // Check if a home player is already matched
  const isHomePlayerMatched = (playerId: string) => {
    return matchups.some(m => m.homePlayerId === playerId);
  };

  // Check if an away player is already matched
  const isAwayPlayerMatched = (playerId: string) => {
    return matchups.some(m => m.awayPlayerId === playerId);
  };

  // Get the matched away player for a home player
  const getMatchedAwayPlayer = (homePlayerId: string) => {
    const matchup = matchups.find(m => m.homePlayerId === homePlayerId);
    return matchup ? matchup.awayPlayerId : null;
  };

  // Get the matched home player for an away player
  const getMatchedHomePlayer = (awayPlayerId: string) => {
    const matchup = matchups.find(m => m.awayPlayerId === awayPlayerId);
    return matchup ? matchup.homePlayerId : null;
  };

  // Auto-match players based on selection order
  const autoMatchPlayers = () => {
    if (selectedHomePlayers.length !== 2 || selectedAwayPlayers.length !== 2) {
      setError('Please select exactly 2 players from each team before auto-matching');
      return;
    }

    // Create matchups based on order
    const newMatchups = selectedHomePlayers.map((homeId, index) => ({
      homePlayerId: homeId,
      awayPlayerId: selectedAwayPlayers[index]
    }));

    setMatchups(newMatchups);
  };

  // Auto-match players based on handicap
  const autoMatchByHandicap = () => {
    if (selectedHomePlayers.length !== 2 || selectedAwayPlayers.length !== 2) {
      setError('Please select exactly 2 players from each team before auto-matching');
      return;
    }

    // Sort home players by handicap
    const sortedHomePlayers = [...selectedHomePlayers].sort((a, b) => {
      const playerA = homePlayers.find(p => p.id === a);
      const playerB = homePlayers.find(p => p.id === b);
      return (playerA?.handicapIndex || 0) - (playerB?.handicapIndex || 0);
    });

    // Sort away players by handicap
    const sortedAwayPlayers = [...selectedAwayPlayers].sort((a, b) => {
      const playerA = awayPlayers.find(p => p.id === a);
      const playerB = awayPlayers.find(p => p.id === b);
      return (playerA?.handicapIndex || 0) - (playerB?.handicapIndex || 0);
    });

    // Create matchups based on handicap order
    const newMatchups = sortedHomePlayers.map((homeId, index) => ({
      homePlayerId: homeId,
      awayPlayerId: sortedAwayPlayers[index]
    }));

    setMatchups(newMatchups);
  };

  // Clear all matchups
  const clearMatchups = () => {
    setMatchups([]);
  };

  // Reset all selections
  const resetAll = () => {
    setSelectedHomePlayers([]);
    setSelectedAwayPlayers([]);
    setMatchups([]);
  };

  // Save the foursome
  const handleSave = async () => {
    try {
      // Validate we have exactly 2 players per team
      if (selectedHomePlayers.length !== 2 || selectedAwayPlayers.length !== 2) {
        setError('Please select exactly 2 players from each team');
        return;
      }

      // Validate all players are matched
      if (matchups.length !== 2) {
        setError('Please create matchups for both selected players');
        return;
      }

      setSaving(true);
      setError(null);

      // Generate a unique foursome group ID
      const foursomeGroupId = `foursome_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Create 4 match objects
      const matchRequests = matchups.map(matchup => {
        return axios.post('/api/matches', {
          tournamentId,
          scheduleId,
          formatId,
          homeTeamId,
          awayTeamId,
          courseId,
          startingHole,
          teeTime,
          foursomeGroupId,
          playerToPlayerMatch: true,
          playerPairings: [
            {
              playerId: matchup.homePlayerId,
              isHomeTeam: true
            },
            {
              playerId: matchup.awayPlayerId,
              isHomeTeam: false
            }
          ]
        });
      });

      // Create all matches in parallel
      await Promise.all(matchRequests);
      
      // Notify parent component
      onSave();
    } catch (err) {
      console.error('Error saving foursome:', err);
      setError('Failed to save foursome. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse bg-gray-200 h-8 w-1/4 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-32 w-full rounded"></div>
        <div className="animate-pulse bg-gray-200 h-32 w-full rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow-sm">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Create Singles Matches Foursome
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Select 2 players from each team and create 1v1 matchups (1 point per matchup)
        </p>
      </div>
      
      {error && (
        <div className="px-4 py-3 bg-red-50 text-red-700 text-sm rounded-md m-4">
          {error}
        </div>
      )}
      
      <div className="px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Home Team */}
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="font-medium text-blue-800 mb-2">{homeTeamName}</h4>
            <p className="text-sm text-gray-500 mb-3">
              Selected: {selectedHomePlayers.length}/2 players
            </p>
            
            <div className="divide-y divide-gray-200">
              {homePlayers.map(player => (
                <div key={player.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`home-${player.id}`}
                        checked={selectedHomePlayers.includes(player.id)}
                        onChange={() => toggleHomePlayer(player.id)}
                        disabled={
                          !selectedHomePlayers.includes(player.id) && 
                          selectedHomePlayers.length >= 4
                        }
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <label htmlFor={`home-${player.id}`} className="ml-3 block">
                        <span className="text-sm font-medium text-gray-700">{player.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          (HCP: {player.handicapIndex})
                        </span>
                      </label>
                    </div>
                    
                    {selectedHomePlayers.includes(player.id) && (
                      <div>
                        {isHomePlayerMatched(player.id) ? (
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">
                              vs. {awayPlayers.find(p => p.id === getMatchedAwayPlayer(player.id))?.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeMatchup(player.id, getMatchedAwayPlayer(player.id) || '')}
                              className="text-red-500 hover:text-red-700"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">Unmatched</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Away Team */}
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="font-medium text-red-800 mb-2">{awayTeamName}</h4>
            <p className="text-sm text-gray-500 mb-3">
              Selected: {selectedAwayPlayers.length}/2 players
            </p>
            
            <div className="divide-y divide-gray-200">
              {awayPlayers.map(player => (
                <div key={player.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`away-${player.id}`}
                        checked={selectedAwayPlayers.includes(player.id)}
                        onChange={() => toggleAwayPlayer(player.id)}
                        disabled={
                          !selectedAwayPlayers.includes(player.id) && 
                          selectedAwayPlayers.length >= 4
                        }
                        className="h-4 w-4 text-red-600 rounded border-gray-300"
                      />
                      <label htmlFor={`away-${player.id}`} className="ml-3 block">
                        <span className="text-sm font-medium text-gray-700">{player.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          (HCP: {player.handicapIndex})
                        </span>
                      </label>
                    </div>
                    
                    {selectedAwayPlayers.includes(player.id) && (
                      <div>
                        {isAwayPlayerMatched(player.id) ? (
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">
                              vs. {homePlayers.find(p => p.id === getMatchedHomePlayer(player.id))?.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeMatchup(getMatchedHomePlayer(player.id) || '', player.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">Unmatched</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Matchup controls */}
        <div className="mt-6 bg-gray-50 p-4 rounded-md border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Create Player Matchups</h4>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={autoMatchPlayers}
              disabled={selectedHomePlayers.length !== 4 || selectedAwayPlayers.length !== 4}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowsRightLeftIcon className="h-4 w-4 mr-1" />
              Auto-Match (By Selection Order)
            </button>
            
            <button
              type="button"
              onClick={autoMatchByHandicap}
              disabled={selectedHomePlayers.length !== 4 || selectedAwayPlayers.length !== 4}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowsRightLeftIcon className="h-4 w-4 mr-1" />
              Auto-Match (By Handicap)
            </button>
            
            <button
              type="button"
              onClick={clearMatchups}
              disabled={matchups.length === 0}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear Matchups
            </button>
            
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md bg-white text-red-700 hover:bg-red-50"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Reset All
            </button>
          </div>
          
          {selectedHomePlayers.length === 2 && selectedAwayPlayers.length === 2 ? (
            <div>
              <p className="text-sm text-gray-500 mb-3">
                {matchups.length === 2 ? (
                  <span className="text-green-600">All matchups created! Review or adjust them below.</span>
                ) : (
                  <span>
                    Create matchups by selecting players from the dropdowns below, or use the auto-match buttons above.
                  </span>
                )}
              </p>
              
              <div className="space-y-3">
                {selectedHomePlayers.filter(
                  id => !isHomePlayerMatched(id)
                ).map(homePlayerId => {
                  const homePlayer = homePlayers.find(p => p.id === homePlayerId);
                  if (!homePlayer) return null;
                  
                  return (
                    <div key={homePlayerId} className="flex items-center space-x-2">
                      <div className="flex-1 bg-blue-50 p-2 rounded">
                        <span className="text-sm font-medium">{homePlayer.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          (HCP: {homePlayer.handicapIndex})
                        </span>
                      </div>
                      
                      <span className="text-gray-500">vs</span>
                      
                      <div className="flex-1">
                        <select
                          className="w-full rounded-md border-gray-300 text-sm"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setMatchup(homePlayerId, e.target.value);
                            }
                          }}
                        >
                          <option value="">-- Select Opponent --</option>
                          {selectedAwayPlayers.filter(
                            id => !isAwayPlayerMatched(id)
                          ).map(awayPlayerId => {
                            const awayPlayer = awayPlayers.find(p => p.id === awayPlayerId);
                            if (!awayPlayer) return null;
                            
                            return (
                              <option key={awayPlayerId} value={awayPlayerId}>
                                {awayPlayer.name} (HCP: {awayPlayer.handicapIndex})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  );
                })}
                
                {/* Show existing matchups */}
                {matchups.map(matchup => {
                  const homePlayer = homePlayers.find(p => p.id === matchup.homePlayerId);
                  const awayPlayer = awayPlayers.find(p => p.id === matchup.awayPlayerId);
                  
                  if (!homePlayer || !awayPlayer) return null;
                  
                  return (
                    <div key={`${matchup.homePlayerId}-${matchup.awayPlayerId}`} className="flex items-center space-x-2">
                      <div className="flex-1 bg-blue-50 p-2 rounded">
                        <span className="text-sm font-medium">{homePlayer.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          (HCP: {homePlayer.handicapIndex})
                        </span>
                      </div>
                      
                      <span className="text-gray-500">vs</span>
                      
                      <div className="flex-1 bg-red-50 p-2 rounded flex justify-between items-center">
                        <div>
                          <span className="text-sm font-medium">{awayPlayer.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            (HCP: {awayPlayer.handicapIndex})
                          </span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => removeMatchup(matchup.homePlayerId, matchup.awayPlayerId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-yellow-600">
              Please select exactly 2 players from each team to create matchups.
            </p>
          )}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="px-4 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        
        <button
          type="button"
          onClick={handleSave}
          disabled={
            saving || 
            selectedHomePlayers.length !== 2 || 
            selectedAwayPlayers.length !== 2 ||
            matchups.length !== 2
          }
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Create Foursome'
          )}
        </button>
      </div>
    </div>
  );
}