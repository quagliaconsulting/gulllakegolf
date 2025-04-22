import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import useSWR from 'swr';
import { ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, UserGroupIcon, ArrowsRightLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function AssignPlayers() {
  const router = useRouter();
  const { id, matchId } = router.query;
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerMatchups, setPlayerMatchups] = useState<{homeId: string, awayId: string}[]>([]);
  const [singlesMode, setSinglesMode] = useState<'standard' | 'foursome'>('standard');

  // Fetch match data
  const { data, error: fetchError, isLoading, mutate } = useSWR(
    matchId ? `/api/matches/${matchId}/players` : null,
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  // Set initial selections when data loads
  useEffect(() => {
    if (data) {
      // Safely set home players with null checks
      if (data.homePlayers && Array.isArray(data.homePlayers)) {
        const filteredHomePlayers = data.homePlayers.filter((p: {id?: string}) => p && p.id);
        setSelectedHomePlayers(filteredHomePlayers.map((p: {id: string}) => p.id));
      } else {
        setSelectedHomePlayers([]);
      }
      
      // Safely set away players with null checks
      if (data.awayPlayers && Array.isArray(data.awayPlayers)) {
        const filteredAwayPlayers = data.awayPlayers.filter((p: {id?: string}) => p && p.id);
        setSelectedAwayPlayers(filteredAwayPlayers.map((p: {id: string}) => p.id));
      } else {
        setSelectedAwayPlayers([]);
      }
      
      // Detect if this is a singles foursome container match
      if (data.isSingles && data.foursomeGroupId && !data.playerToPlayerMatch) {
        setSinglesMode('foursome');
      } else {
        setSinglesMode('standard');
      }
    }
  }, [data]);

  // Handle player selection
  const toggleHomePlayer = (playerId: string) => {
    setSelectedHomePlayers(prev => {
      if (prev.includes(playerId)) {
        // Remove player
        const newSelection = prev.filter(id => id !== playerId);
        
        // Also remove any matchups involving this player
        setPlayerMatchups(matchups => 
          matchups.filter(m => m.homeId !== playerId)
        );
        
        return newSelection;
      } else {
        // Add player (max 1 for standard singles, max 4 for foursome)
        const maxPlayers = singlesMode === 'foursome' ? 4 : 1;
        if (prev.length < maxPlayers) {
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
        setPlayerMatchups(matchups => 
          matchups.filter(m => m.awayId !== playerId)
        );
        
        return newSelection;
      } else {
        // Add player (max 1 for standard singles, max 4 for foursome)
        const maxPlayers = singlesMode === 'foursome' ? 4 : 1;
        if (prev.length < maxPlayers) {
          return [...prev, playerId];
        }
        return prev;
      }
    });
  };
  
  // Add a player matchup
  const addMatchup = (homeId: string, awayId: string) => {
    setPlayerMatchups(prev => {
      // Remove any existing matchups involving these players
      const filtered = prev.filter(
        m => m.homeId !== homeId && m.awayId !== awayId
      );
      
      // Add the new matchup
      return [...filtered, { homeId, awayId }];
    });
  };
  
  // Remove a player matchup
  const removeMatchup = (homeId: string, awayId: string) => {
    setPlayerMatchups(prev => 
      prev.filter(m => !(m.homeId === homeId && m.awayId === awayId))
    );
  };
  
  // Auto-create matchups based on player handicaps
  const autoCreateMatchups = () => {
    if ((singlesMode === 'foursome' && (selectedHomePlayers.length !== 4 || selectedAwayPlayers.length !== 4)) ||
        (singlesMode === 'standard' && (selectedHomePlayers.length !== 2 || selectedAwayPlayers.length !== 2))) {
      setError('Please select the correct number of players from each team first');
      return;
    }
    
    // Get all selected players with their data
    const homePlayersData = data.allHomePlayers
      .filter((p: any) => selectedHomePlayers.includes(p.id))
      .sort((a: any, b: any) => (a.handicapIndex || 0) - (b.handicapIndex || 0));
      
    const awayPlayersData = data.allAwayPlayers
      .filter((p: any) => selectedAwayPlayers.includes(p.id))
      .sort((a: any, b: any) => (a.handicapIndex || 0) - (b.handicapIndex || 0));
    
    // Match players by handicap (lowest with lowest, etc.)
    const newMatchups = homePlayersData.map((homePlayer: any, index) => ({
      homeId: homePlayer.id,
      awayId: awayPlayersData[index].id
    }));
    
    setPlayerMatchups(newMatchups);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!data) return;
    
    // Special handling for Singles foursome mode
    if (singlesMode === 'foursome') {
      // For foursome, we need exactly 4 players per team
      if (selectedHomePlayers.length !== 4 || selectedAwayPlayers.length !== 4) {
        setError('Singles foursome requires exactly 4 players per team');
        return;
      }
      
      // We also need exactly 4 matchups
      if (playerMatchups.length !== 4) {
        setError('Please create all 4 player matchups before saving');
        return;
      }
      
      // Ensure all players are included in matchups
      const homeIdsInMatchups = playerMatchups.map(m => m.homeId);
      const awayIdsInMatchups = playerMatchups.map(m => m.awayId);
      
      const allHomePlayersMatched = selectedHomePlayers.every(id => homeIdsInMatchups.includes(id));
      const allAwayPlayersMatched = selectedAwayPlayers.every(id => awayIdsInMatchups.includes(id));
      
      if (!allHomePlayersMatched || !allAwayPlayersMatched) {
        setError('All selected players must be part of a matchup');
        return;
      }
      
      // All validations pass, now save the foursome
      setError(null);
      setSaving(true);
      
      try {
        // Create the individual player-player matches using the shared foursomeGroupId
        const promises = playerMatchups.map(matchup => {
          return axios.post('/api/matches', {
            tournamentId: data.tournamentId,
            scheduleId: data.scheduleId,
            formatId: data.formatId,
            homeTeamId: data.homeTeamId,
            awayTeamId: data.awayTeamId,
            courseId: data.courseId,
            startingHole: data.startingHole || 1,
            teeTime: data.teeTime,
            foursomeGroupId: data.foursomeGroupId,
            playerToPlayerMatch: true,
            playerPairings: [
              {
                playerId: matchup.homeId,
                isHomeTeam: true
              },
              {
                playerId: matchup.awayId,
                isHomeTeam: false
              }
            ]
          });
        });
        
        await Promise.all(promises);
        
        setSaved(true);
        
        // Navigate back to tournament page
        setTimeout(() => {
          router.push(`/tournaments/${id}`);
        }, 1500);
      } catch (err) {
        console.error('Error creating player matches:', err);
        setError('Failed to create player matches. Please try again.');
        setSaving(false);
      }
      
      return;
    }
    
    // Regular validation for non-foursome formats
    if (data.isPairsFormat) {
      // For pairs formats, we need exactly 2 players per team
      if (selectedHomePlayers.length !== 2 || selectedAwayPlayers.length !== 2) {
        setError('Pairs formats require exactly 2 players per team');
        return;
      }
    } else if (data.isFourManTeam) {
      // For 4-man team format, we need 4 players per team
      if (selectedHomePlayers.length !== 4 || selectedAwayPlayers.length !== 4) {
        setError('4-Man Team format requires exactly 4 players per team');
        return;
      }
    } else if (data.isSingles && data.playerToPlayerMatch) {
      // For singles player-to-player matches, we need exactly 1 player per team
      if (selectedHomePlayers.length !== 1 || selectedAwayPlayers.length !== 1) {
        setError('Singles player-to-player matches require exactly 1 player from each team');
        return;
      }
    } else if (data.isSingles && !data.playerToPlayerMatch) {
      // For singles container matches, we need exactly 2 players per team for foursome setup
      if (selectedHomePlayers.length !== 2 || selectedAwayPlayers.length !== 2) {
        setError('Singles container matches require exactly 2 players from each team for foursome setup');
        return;
      }
      
      // Also validate player matchups for singles
      if (playerMatchups.length !== 2) {
        setError('Please create matchups for all players in Singles format');
        return;
      }
      
      // Make sure all players are included in matchups
      const homeIdsInMatchups = playerMatchups.map(m => m.homeId);
      const awayIdsInMatchups = playerMatchups.map(m => m.awayId);
      
      const allHomePlayersMatched = selectedHomePlayers.every(id => homeIdsInMatchups.includes(id));
      const allAwayPlayersMatched = selectedAwayPlayers.every(id => awayIdsInMatchups.includes(id));
      
      if (!allHomePlayersMatched || !allAwayPlayersMatched) {
        setError('All selected players must be part of a matchup');
        return;
      }
    }
    
    setError(null);
    setSaving(true);
    
    try {
      // Submit player selections
      await axios.post(`/api/matches/${matchId}/players`, {
        homePlayers: selectedHomePlayers,
        awayPlayers: selectedAwayPlayers
      });
      
      // For singles matches, also save the player pairings
      if (data.isSingles && !data.playerToPlayerMatch && playerMatchups.length === 2) {
        // Create player-to-player matches for the singles format
        const foursomeGroupId = `foursome_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        // Create individual match requests for each player pairing
        const matchRequests = playerMatchups.map(matchup => {
          return axios.post('/api/matches', {
            tournamentId: data.tournamentId,
            scheduleId: data.scheduleId,
            formatId: data.formatId,
            homeTeamId: data.homeTeamId,
            awayTeamId: data.awayTeamId,
            courseId: data.courseId,
            startingHole: data.startingHole || 1,
            teeTime: data.teeTime,
            foursomeGroupId: foursomeGroupId,
            playerToPlayerMatch: true,
            playerPairings: [
              {
                playerId: matchup.homeId,
                isHomeTeam: true
              },
              {
                playerId: matchup.awayId,
                isHomeTeam: false
              }
            ]
          });
        });
        
        await Promise.all(matchRequests);
      }
      
      setSaved(true);
      mutate(); // Refresh data
      
      // Redirect back to tournament page after successful save
      setTimeout(() => {
        router.push(`/tournaments/${id}`);
      }, 1500);
    } catch (err) {
      console.error('Error assigning players:', err);
      setError('Failed to assign players. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate required players based on format
  const getRequiredPlayers = () => {
    if (!data) return 0;
    if (data.isPairsFormat) return 2;
    if (data.isFourManTeam) return 4;
    if (data.isSingles) {
      return singlesMode === 'foursome' ? 4 : 1;
    }
    return 0;
  };
  
  // Helper functions for foursome matchups
  const isHomePlayerMatched = (playerId: string) => {
    return playerMatchups.some(m => m.homeId === playerId);
  };
  
  const isAwayPlayerMatched = (playerId: string) => {
    return playerMatchups.some(m => m.awayId === playerId);
  };
  
  // Get opponent for a player
  const getOpponentId = (playerId: string, team: 'home' | 'away') => {
    if (team === 'home') {
      const matchup = playerMatchups.find(m => m.homeId === playerId);
      return matchup?.awayId;
    } else {
      const matchup = playerMatchups.find(m => m.awayId === playerId);
      return matchup?.homeId;
    }
  };
  
  // Get player name by ID
  const getPlayerNameById = (playerId: string) => {
    if (!playerId) return 'Unknown player';
    
    if (data?.allHomePlayers) {
      const homePlayer = data.allHomePlayers.find((p: any) => p && p.id === playerId);
      if (homePlayer && homePlayer.name) return homePlayer.name;
    }
    
    if (data?.allAwayPlayers) {
      const awayPlayer = data.allAwayPlayers.find((p: any) => p && p.id === playerId);
      if (awayPlayer && awayPlayer.name) return awayPlayer.name;
    }
    
    return 'Unknown player';
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading match details...</div>;
  }

  if (fetchError) {
    return <div className="p-8 text-center text-red-600">Error loading match. Please try again.</div>;
  }

  if (!data) {
    return <div className="p-8 text-center">Match not found</div>;
  }

  return (
    <>
      <Head>
        <title>Assign Players | {data.format} Match</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href={`/tournaments/${id}`} className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Tournament
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {singlesMode === 'foursome' ? 'Create Singles Foursome' : 'Assign Players'}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {data.format} - {data.homeTeam} vs {data.awayTeam}
          </p>
          <p className="mt-1 text-sm font-medium text-blue-600">
            {data.isPairsFormat && "Select exactly 2 players per team"}
            {data.isFourManTeam && "Select exactly 4 players per team"}
            {data.isSingles && singlesMode === 'standard' && "Select exactly 1 player per team"}
            {data.isSingles && singlesMode === 'foursome' && "Select 4 players from each team and create individual matchups"}
          </p>
          
          {singlesMode === 'foursome' && (
            <div className="mt-3 bg-blue-50 p-3 rounded-md">
              <div className="flex items-center text-blue-700">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Singles Foursome Mode</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                In this mode, you'll create 4 individual player-vs-player matches that will play together as a foursome.
                First select 4 players from each team, then specify which home player will compete against which away player.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
            {/* Home Team */}
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
              <div className="px-4 py-5 bg-blue-50 sm:px-6">
                <h2 className="text-lg font-medium leading-6 text-gray-900">{data.homeTeam}</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Select {getRequiredPlayers()} players for this match
                </p>
              </div>
              <ul className="divide-y divide-gray-200">
                {data.allHomePlayers && data.allHomePlayers.length > 0 ? (
                  data.allHomePlayers.map((player: any) => (
                    <li key={player.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            id={`home-${player.id}`}
                            name={`home-${player.id}`}
                            type="checkbox"
                            checked={selectedHomePlayers.includes(player.id)}
                            onChange={() => toggleHomePlayer(player.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor={`home-${player.id}`} className="ml-3 flex items-center">
                            <div className="text-sm font-medium text-gray-900">{player.name}</div>
                            <div className="text-sm text-gray-500 ml-2">(Handicap: {player.handicapIndex})</div>
                          </label>
                        </div>
                        {selectedHomePlayers.includes(player.id) && (
                          <div className="flex items-center">
                            {/* For foursome mode, show matchup info */}
                            {singlesMode === 'foursome' && isHomePlayerMatched(player.id) && (
                              <div className="text-sm text-gray-600 mr-2">
                                vs. {getPlayerNameById(getOpponentId(player.id, 'home') || '')}
                              </div>
                            )}
                            <div className="text-primary">
                              <CheckCircleIcon className="h-5 w-5" />
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                    No players available in this team
                  </li>
                )}
              </ul>
            </div>

            {/* Away Team */}
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
              <div className="px-4 py-5 bg-red-50 sm:px-6">
                <h2 className="text-lg font-medium leading-6 text-gray-900">{data.awayTeam}</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Select {getRequiredPlayers()} players for this match
                </p>
              </div>
              <ul className="divide-y divide-gray-200">
                {data.allAwayPlayers && data.allAwayPlayers.length > 0 ? (
                  data.allAwayPlayers.map((player: any) => (
                    <li key={player.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            id={`away-${player.id}`}
                            name={`away-${player.id}`}
                            type="checkbox"
                            checked={selectedAwayPlayers.includes(player.id)}
                            onChange={() => toggleAwayPlayer(player.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor={`away-${player.id}`} className="ml-3 flex items-center">
                            <div className="text-sm font-medium text-gray-900">{player.name}</div>
                            <div className="text-sm text-gray-500 ml-2">(Handicap: {player.handicapIndex})</div>
                          </label>
                        </div>
                        {selectedAwayPlayers.includes(player.id) && (
                          <div className="flex items-center">
                            {/* For foursome mode, show matchup info */}
                            {singlesMode === 'foursome' && isAwayPlayerMatched(player.id) && (
                              <div className="text-sm text-gray-600 mr-2">
                                vs. {getPlayerNameById(getOpponentId(player.id, 'away') || '')}
                              </div>
                            )}
                            <div className="text-primary">
                              <CheckCircleIcon className="h-5 w-5" />
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                    No players available in this team
                  </li>
                )}
              </ul>
            </div>
          </div>
          
          {/* Singles Matchup Section for standard singles matches */}
          {data.isSingles && !data.playerToPlayerMatch && (
            <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
              <div className="px-4 py-5 bg-gray-50 sm:px-6">
                <h2 className="text-lg font-medium leading-6 text-gray-900">Singles Player Matchups</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Specify which home player will play against which away player (1 point per matchup)
                </p>
              </div>
              
              <div className="p-4">
                {selectedHomePlayers.length === 2 && selectedAwayPlayers.length === 2 ? (
                  <div className="space-y-4">
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={autoCreateMatchups}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        <ArrowsRightLeftIcon className="h-4 w-4 mr-1" />
                        Auto-Match by Handicap
                      </button>
                    </div>
                    
                    {/* Existing matchups */}
                    {playerMatchups.map((matchup, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="flex-1 bg-blue-50 p-2 rounded">
                          <span className="font-medium">{getPlayerNameById(matchup.homeId)}</span>
                        </div>
                        <span>vs</span>
                        <div className="flex-1 bg-red-50 p-2 rounded">
                          <span className="font-medium">{getPlayerNameById(matchup.awayId)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMatchup(matchup.homeId, matchup.awayId)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Create new matchups */}
                    {playerMatchups.length < 2 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Create New Matchup</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Home Player</label>
                            <select 
                              id="home-player-select"
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              onChange={(e) => {
                                const selectedHomeId = e.target.value;
                                const select = document.getElementById('away-player-select') as HTMLSelectElement;
                                if (select?.value) {
                                  addMatchup(selectedHomeId, select.value);
                                  // Reset both selects
                                  e.target.value = '';
                                  select.value = '';
                                }
                              }}
                            >
                              <option value="">Select Home Player</option>
                              {selectedHomePlayers
                                .filter(id => !isHomePlayerMatched(id))
                                .map(id => (
                                  <option key={id} value={id}>
                                    {getPlayerNameById(id)}
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Away Player</label>
                            <select 
                              id="away-player-select"
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              onChange={(e) => {
                                const selectedAwayId = e.target.value;
                                const select = document.getElementById('home-player-select') as HTMLSelectElement;
                                if (select?.value) {
                                  addMatchup(select.value, selectedAwayId);
                                  // Reset both selects
                                  e.target.value = '';
                                  select.value = '';
                                }
                              }}
                            >
                              <option value="">Select Away Player</option>
                              {selectedAwayPlayers
                                .filter(id => !isAwayPlayerMatched(id))
                                .map(id => (
                                  <option key={id} value={id}>
                                    {getPlayerNameById(id)}
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-md">
                    <p className="text-yellow-700">Please select exactly 2 players from each team first.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Singles Foursome Matchup Section */}
          {singlesMode === 'foursome' && (
            <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
              <div className="px-4 py-5 bg-gray-50 sm:px-6">
                <h2 className="text-lg font-medium leading-6 text-gray-900">Player Matchups</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Specify which home player will play against which away player
                </p>
              </div>
              
              <div className="p-4">
                {selectedHomePlayers.length === 2 && selectedAwayPlayers.length === 2 ? (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={autoCreateMatchups}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        Auto-Match by Handicap
                      </button>
                    </div>
                    
                    {/* Existing matchups */}
                    {playerMatchups.map((matchup, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="flex-1 bg-blue-50 p-2 rounded">
                          <span className="font-medium">{getPlayerNameById(matchup.homeId)}</span>
                        </div>
                        <span>vs</span>
                        <div className="flex-1 bg-red-50 p-2 rounded">
                          <span className="font-medium">{getPlayerNameById(matchup.awayId)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMatchup(matchup.homeId, matchup.awayId)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    
                    {/* Create new matchups */}
                    {playerMatchups.length < 2 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Create New Matchup</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Home Player</label>
                            <select 
                              id="home-player-select"
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              onChange={(e) => {
                                const selectedHomeId = e.target.value;
                                const select = document.getElementById('away-player-select') as HTMLSelectElement;
                                if (select?.value) {
                                  addMatchup(selectedHomeId, select.value);
                                  // Reset both selects
                                  e.target.value = '';
                                  select.value = '';
                                }
                              }}
                            >
                              <option value="">Select Home Player</option>
                              {selectedHomePlayers
                                .filter(id => !isHomePlayerMatched(id))
                                .map(id => (
                                  <option key={id} value={id}>
                                    {getPlayerNameById(id)}
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Away Player</label>
                            <select 
                              id="away-player-select"
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              onChange={(e) => {
                                const selectedAwayId = e.target.value;
                                const select = document.getElementById('home-player-select') as HTMLSelectElement;
                                if (select?.value) {
                                  addMatchup(select.value, selectedAwayId);
                                  // Reset both selects
                                  e.target.value = '';
                                  select.value = '';
                                }
                              }}
                            >
                              <option value="">Select Away Player</option>
                              {selectedAwayPlayers
                                .filter(id => !isAwayPlayerMatched(id))
                                .map(id => (
                                  <option key={id} value={id}>
                                    {getPlayerNameById(id)}
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-md">
                    <p className="text-yellow-700">Please select exactly 2 players from each team first.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end space-x-4">
            <Link
              href={`/tournaments/${id}`}
              className="rounded-md px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className={`
                ${saving ? 'cursor-not-allowed bg-gray-300' : 'bg-primary hover:bg-primary/90'}
                inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
              `}
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="mr-2 -ml-1 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                singlesMode === 'foursome' ? 'Create Matches' : 'Assign Players'
              )}
            </button>
            
            {saved && (
              <span className="text-sm font-medium text-green-600">
                {singlesMode === 'foursome' ? 'Matches created successfully!' : 'Players assigned successfully!'}
              </span>
            )}
          </div>
        </form>
      </div>
    </>
  );
}