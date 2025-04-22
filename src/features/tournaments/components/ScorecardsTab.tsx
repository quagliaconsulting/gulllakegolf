import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TableCellsIcon, 
  ArrowPathIcon, 
  UsersIcon, 
  CheckCircleIcon,
  MinusCircleIcon 
} from '@heroicons/react/24/outline';
import { formatDate } from '../utils/dateUtils';

interface ScorecardsTabProps {
  tournamentId: string;
  schedulesData: any;
  schedulesLoading: boolean;
  schedulesError: any;
  refreshSchedules: () => Promise<any>;
}

export const ScorecardsTab: React.FC<ScorecardsTabProps> = ({ 
  tournamentId, 
  schedulesData, 
  schedulesLoading, 
  schedulesError, 
  refreshSchedules 
}) => {
  const [matchScores, setMatchScores] = useState<Record<string, any>>({});
  const [loadingScores, setLoadingScores] = useState(false);
  const [activeDay, setActiveDay] = useState<string>('');

  // Load match scores when scorecard tab is active
  // Set the active day when schedule data is loaded
  useEffect(() => {
    if (schedulesData?.schedules && Array.isArray(schedulesData.schedules) && schedulesData.schedules.length > 0) {
      // Log the schedule data for debugging
      console.log("Schedule days data:", schedulesData.schedules);
      
      // Find the first day with matches
      const daysWithMatches = schedulesData.schedules.filter((day: any) => 
        day.matches && day.matches.length > 0
      );
      
      console.log("Days with matches:", daysWithMatches);
      
      if (daysWithMatches.length > 0) {
        // Set the first day with matches as active by default
        console.log("Setting active day to:", daysWithMatches[0].id);
        setActiveDay(daysWithMatches[0].id);
      }
    }
  }, [schedulesData]);

  // Load match scores when scorecard tab is active
  useEffect(() => {
    // Skip if no schedule data or if loading is already in progress
    if (!schedulesData?.schedules || loadingScores) return;
    
    // Only run this once when the component mounts or schedulesData changes
    const loadScores = async () => {
      setLoadingScores(true);
      
      try {
        // Flatten all matches from all schedule days
        const allMatches = schedulesData.schedules.flatMap((day: any) => 
          day.matches || []
        );
        
        // Skip if no matches or we already have scores for all matches
        if (allMatches.length === 0) {
          setLoadingScores(false);
          return;
        }
        
        // Calculate which matches need data loading
        const matchesToLoad = allMatches.filter(match => {
          return !matchScores[match.id] || 
            (!matchScores[match.id].homePlayers || matchScores[match.id].homePlayers.length === 0) &&
            (!matchScores[match.id].awayPlayers || matchScores[match.id].awayPlayers.length === 0);
        });
        
        // If all matches already have data, just skip
        if (matchesToLoad.length === 0) {
          setLoadingScores(false);
          return;
        }
        
        // Create a new scores object to avoid modifying state directly
        const updatedScores = { ...matchScores };
        
        // Get auth token from localStorage
        let headers = {};
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) {
            headers = {
              'Authorization': `Bearer ${token}`
            };
          }
        }
        
        console.log('Fetching player data with auth token');
        
        // First pass - get all player assignments in parallel
        const playerPromises = matchesToLoad.map(match => 
          fetch(`/api/matches/${match.id}/players`, { headers })
            .then(res => res.ok ? res.json() : null)
            .catch(err => {
              console.error(`Error fetching players for match ${match.id}:`, err);
              return { matchId: match.id, data: null };
            })
            .then(data => ({ matchId: match.id, data }))
        );
        
        const scorePromises = matchesToLoad.map(match => 
          fetch(`/api/matches/${match.id}/scores`, { headers })
            .then(res => res.ok ? res.json() : null)
            .catch(err => {
              console.error(`Error fetching scores for match ${match.id}:`, err);
              return { matchId: match.id, data: null };
            })
            .then(data => ({ matchId: match.id, data }))
        );
        
        // Fetch data in parallel
        const [playerResponses, scoreResponses] = await Promise.all([
          Promise.all(playerPromises),
          Promise.all(scorePromises)
        ]);
        
        // Create maps for easier lookup
        const playerDataMap: Record<string, {homePlayers: any[], awayPlayers: any[]}> = {};
        const scoreDataMap: Record<string, any> = {};
        
        // Process player data
        playerResponses.forEach(({ matchId, data }) => {
          if (!data) return;
          
          let homePlayers: any[] = [];
          let awayPlayers: any[] = [];
          
          try {
            console.log(`Processing player data for match ${matchId}:`, data ? 'data exists' : 'data is null');
            
            // Get the actual data based on API response format
            const responseData = data?.success === true ? data.data : data;
            
            // Log keys to help with debugging
            if (responseData) {
              console.log(`Response data keys for match ${matchId}:`, Object.keys(responseData));
            }
            
            // Handle different response formats systematically
            if (responseData) {
              // Try to get players from all possible structures
              
              // 1. Try loading from assigned players first (homePlayers/awayPlayers arrays)
              if (Array.isArray(responseData.homePlayers) && responseData.homePlayers.length > 0) {
                homePlayers = responseData.homePlayers;
                console.log(`Found ${homePlayers.length} home players in homePlayers array`);
              } else if (Array.isArray(responseData.homePlayers)) {
                console.log(`HomePlayer array exists but is empty (${responseData.homePlayers.length} players)`);
              }
              
              if (Array.isArray(responseData.awayPlayers) && responseData.awayPlayers.length > 0) {
                awayPlayers = responseData.awayPlayers;
                console.log(`Found ${awayPlayers.length} away players in awayPlayers array`);
              } else if (Array.isArray(responseData.awayPlayers)) {
                console.log(`AwayPlayer array exists but is empty (${responseData.awayPlayers.length} players)`);
              }
              
              // 2. If none assigned, check for available team players (allHomePlayers/allAwayPlayers)
              if (homePlayers.length === 0 && Array.isArray(responseData.allHomePlayers) && responseData.allHomePlayers.length > 0) {
                // Take first two players from available list
                homePlayers = responseData.allHomePlayers.slice(0, 2);
                console.log(`Using ${homePlayers.length} players from allHomePlayers array instead`);
                
                // Log the first player to verify data format
                if (homePlayers.length > 0) {
                  console.log(`First home player sample: ${JSON.stringify(homePlayers[0])}`);
                }
              }
              
              if (awayPlayers.length === 0 && Array.isArray(responseData.allAwayPlayers) && responseData.allAwayPlayers.length > 0) {
                // Take first two players from available list
                awayPlayers = responseData.allAwayPlayers.slice(0, 2);
                console.log(`Using ${awayPlayers.length} players from allAwayPlayers array instead`);
                
                // Log the first player to verify data format
                if (awayPlayers.length > 0) {
                  console.log(`First away player sample: ${JSON.stringify(awayPlayers[0])}`);
                }
              }
            }
            
            // IMPORTANT: Always store the player data even if there are no players yet
            // This ensures the player data map has an entry for every match
            playerDataMap[matchId] = { 
              homePlayers: homePlayers || [], 
              awayPlayers: awayPlayers || [] 
            };
            
            console.log(`Added players for match ${matchId} to playerDataMap: ${homePlayers.length} home, ${awayPlayers.length} away players`);
          } catch (err) {
            console.error(`Error processing player data for match ${matchId}:`, err);
            // Still add an empty entry to avoid undefined errors later
            playerDataMap[matchId] = { homePlayers: [], awayPlayers: [] };
          }
        });
        
        // Process score data
        scoreResponses.forEach(({ matchId, data }) => {
          if (data && data.match) {
            scoreDataMap[matchId] = data;
          }
        });
        
        // Combine data for each match
        matchesToLoad.forEach(match => {
          // Always get the player data entry (even if it has empty arrays)
          const playerData = playerDataMap[match.id] || { homePlayers: [], awayPlayers: [] };
          const scoreData = scoreDataMap[match.id];
          
          // Even if we don't have score data, still process the player data
          if (scoreData && scoreData.match) {
            // Count completed holes
            const completedHoles = scoreData.match.holes.filter(
              (h: any) => h.homeGross !== null && h.awayGross !== null
            ).length;
            
            // Always set the expected hole count based on starting hole
            // Matches starting on holes 1 or 10 are ALWAYS 9-hole matches
            const expectedHoles = (match.startingHole === 1 || match.startingHole === 10) ? 9 : 18;
            
            // Actual number of holes in the scorecard data
            const actualHoles = scoreData.match.holes?.length || 0;
            
            // Always use the expected holes based on starting hole for consistency
            const adjustedTotalHoles = expectedHoles;
            
            console.log(`Match ${match.id} - Starting hole ${match.startingHole}, expected ${expectedHoles} holes, got ${actualHoles} holes in data`);
            
            
            // Calculate completion percentage
            const completionPercent = adjustedTotalHoles > 0 
              ? Math.round((completedHoles / adjustedTotalHoles) * 100) 
              : 0;
              
            console.log(`Match ${match.id} - Holes: completed=${completedHoles}, total=${totalHoles}, adjusted=${adjustedTotalHoles}, startingHole=${match.startingHole}`);
            
            
            console.log(`Match ${match.id} - Processing player data with ${playerData.homePlayers.length} home, ${playerData.awayPlayers.length} away players`);
          
            updatedScores[match.id] = {
              completedHoles,
              totalHoles: adjustedTotalHoles,
              completionPercent,
              homeTeam: scoreData.match.homeTeam,
              awayTeam: scoreData.match.awayTeam,
              // Just use the player data directly - it already has the best data
              homePlayers: playerData.homePlayers,
              awayPlayers: playerData.awayPlayers,
              format: scoreData.match.format,
              result: scoreData.match.points ? {
                homePoints: scoreData.match.points.homeTeamPoints,
                awayPoints: scoreData.match.points.awayTeamPoints
              } : null
            };
          } else {
            // If we don't have score data but do have player data, still create an entry
            if (playerData.homePlayers.length > 0 || playerData.awayPlayers.length > 0) {
              console.log(`Match ${match.id} - No score data, but creating entry with ${playerData.homePlayers.length} home, ${playerData.awayPlayers.length} away players`);
              
              // Determine expected hole count based on starting hole
              const expectedHoles = (match.startingHole === 1 || match.startingHole === 10) ? 9 : 18;
              
              updatedScores[match.id] = {
                completedHoles: 0,
                totalHoles: expectedHoles,
                completionPercent: 0,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                homePlayers: playerData.homePlayers,
                awayPlayers: playerData.awayPlayers,
                format: match.format
              };
            }
          }
        });
        
        // Only update state if we have new data
        setMatchScores(prevScores => {
          // Check if there are actually any differences to avoid unnecessary re-renders
          const hasChanges = Object.keys(updatedScores).some(matchId => {
            return !prevScores[matchId] || JSON.stringify(prevScores[matchId]) !== JSON.stringify(updatedScores[matchId]);
          });
          
          return hasChanges ? updatedScores : prevScores;
        });
      } catch (err) {
        console.error("Error loading match scores:", err);
      } finally {
        setLoadingScores(false);
      }
    };
    
    loadScores();
  }, [schedulesData]); // Remove loadingScores from dependencies to prevent re-triggering

  if (schedulesLoading || loadingScores) {
    return (
      <div>
        <div className="sm:flex sm:items-center mb-6">
          <div className="sm:flex-auto">
            <h2 className="text-xl font-semibold text-gray-900">Scorecards</h2>
            <div className="h-4 bg-gray-200 rounded w-64 mt-2"></div>
          </div>
        </div>

        {/* Skeleton loading state */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <div className="flex space-x-4 overflow-x-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 w-20 animate-pulse bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow h-64 overflow-hidden border border-gray-200 animate-pulse">
              <div className="h-10 bg-gray-200 mb-4"></div>
              <div className="px-4">
                {/* Course and hole info */}
                <div className="flex justify-between mb-3">
                  <div className="h-4 bg-gray-200 w-32 rounded"></div>
                  <div className="h-4 bg-gray-200 w-16 rounded"></div>
                </div>
                
                {/* Team matchup with players */}
                <div className="flex mb-3">
                  <div className="w-1/2 pr-2 border-r border-gray-200">
                    <div className="h-4 bg-gray-200 w-full mb-2 rounded"></div>
                    <div className="h-3 bg-gray-200 w-5/6 mb-1 rounded"></div>
                    <div className="h-3 bg-gray-200 w-3/4 mb-1 rounded"></div>
                  </div>
                  <div className="w-1/2 pl-2">
                    <div className="h-4 bg-gray-200 w-full mb-2 rounded"></div>
                    <div className="h-3 bg-gray-200 w-4/5 mb-1 rounded"></div>
                    <div className="h-3 bg-gray-200 w-2/3 mb-1 rounded"></div>
                  </div>
                </div>
                
                {/* Score info */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 w-24 rounded"></div>
                    <div className="h-4 bg-gray-200 w-16 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="h-8 bg-gray-200 mt-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (schedulesError) {
    return (
      <div>
        <div className="sm:flex sm:items-center mb-6">
          <div className="sm:flex-auto">
            <h2 className="text-xl font-semibold text-gray-900">Scorecards</h2>
            <p className="mt-2 text-sm text-gray-700">Unable to load match data</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => refreshSchedules()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Try Again
            </button>
          </div>
        </div>
        
        <div className="bg-red-50 border-l-4 border-red-400 p-4 my-8 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading match data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  There was a problem fetching the schedule information. Please try refreshing the page or try again later.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter out schedule days with no matches
  const daysWithMatches = schedulesData?.schedules?.filter((day: any) => 
    day.matches && day.matches.length > 0
  ) || [];

  if (!schedulesData || !schedulesData.schedules || daysWithMatches.length === 0) {
    return (
      <div>
        <div className="sm:flex sm:items-center mb-6">
          <div className="sm:flex-auto">
            <h2 className="text-xl font-semibold text-gray-900">Scorecards</h2>
            <p className="mt-2 text-sm text-gray-700">
              No matches found. Create matches to start scoring.
            </p>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center max-w-2xl mx-auto my-10">
          <div className="bg-gray-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
            <TableCellsIcon className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Matches Available</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            To begin scoring, you'll need to create matches for this tournament. 
            You can create matches in the Schedule tab.
          </p>
          <Link 
            href={`/tournaments/${tournamentId}/schedule/edit`} 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark"
          >
            Go to Schedule
          </Link>
        </div>
      </div>
    );
  }

  // Format indicator by match type for visual clarity
  const getFormatBadgeClass = (format: string) => {
    const formatLower = format.toLowerCase();
    if (formatLower.includes('singles')) return 'bg-blue-100 text-blue-800';
    if (formatLower.includes('best ball')) return 'bg-green-100 text-green-800';
    if (formatLower.includes('alternate')) return 'bg-purple-100 text-purple-800';
    if (formatLower.includes('chapman')) return 'bg-orange-100 text-orange-800';
    if (formatLower.includes('scramble')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Helper to determine the completion status styling
  const getCompletionStatusClass = (percent: number) => {
    if (percent === 100) return 'bg-green-100 text-green-800';
    if (percent >= 50) return 'bg-amber-100 text-amber-800';
    if (percent > 0) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-500';
  };
  
  return (
    <div>
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">Scorecards</h2>
          <p className="mt-2 text-sm text-gray-700">
            All match scorecards. Click any match card to view and update scores.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex space-x-3">
          <button
            type="button"
            onClick={() => refreshSchedules()}
            className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5 text-gray-400 mr-1" aria-hidden="true" />
            Refresh
          </button>
          <Link
            href={`/tournaments/${tournamentId}/batch-assign`}
            className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50"
          >
            <UsersIcon className="h-5 w-5 text-indigo-500 mr-1" aria-hidden="true" />
            Batch Assign
          </Link>
        </div>
      </div>

      {/* Date navigation tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
            {daysWithMatches.map((day: any) => (
              <button
                key={day.id}
                onClick={() => setActiveDay(day.id)}
                className={`whitespace-nowrap py-3 px-3 text-sm font-medium border-b-2 ${
                  activeDay === day.id
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                type="button"
              >
                {formatDate(day.date)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Display matches for the active day only */}
      <div className="space-y-10">
        {daysWithMatches.map((scheduleDay: any, dayIndex: number) => {
          // Only render the active day's content
          if (scheduleDay.id !== activeDay) return null;
          
          // Get all matches for the day
          const matches = scheduleDay.matches || [];

          return (
            <div key={scheduleDay.id} className="pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {formatDate(scheduleDay.date)}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {scheduleDay.description || 'Tournament Day'}
                </span>
              </h3>
              
              {/* Display all matches for this day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.map((match: any) => {
                      const scoreData = matchScores[match.id] || {};
                      const isComplete = scoreData.completionPercent === 100;
                      const completionPercent = scoreData.completionPercent || 0;
                      const statusClass = getCompletionStatusClass(completionPercent);
                      
                      // Log missing player issues for debugging
                      if (!scoreData.homePlayers?.length && !scoreData.awayPlayers?.length) {
                        console.warn(`No player data found for match ${match.id} (${match.format}) - click this card to assign players`);
                      }
                      
                      // Use player data from the API response instead of directly from the match 
                      const matchData = scoreData || {};
                      const homePlayers = matchData.homePlayers || [];
                      const awayPlayers = matchData.awayPlayers || [];

                      return (
                        <Link 
                          key={match.id} 
                          href={`/tournaments/${tournamentId}/matches/${match.id}/scorecard`}
                          className="block"
                        >
                          <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 h-full overflow-hidden border border-gray-200 hover:border-primary">
                            {/* Card header with format and time */}
                            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                              <div className="flex items-center">
                                <span className={`${getFormatBadgeClass(match.format)} text-xs px-2 py-1 rounded-full font-medium`}>
                                  {match.format}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(match.teeTime).toLocaleTimeString([], {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZone: 'UTC',
                                })}
                              </div>
                            </div>
                            
                            {/* Card content */}
                            <div className="p-4">
                              {/* Course and starting hole */}
                              <div className="mb-3 flex justify-between">
                                <div className="text-sm text-gray-500">
                                  {match.course}
                                </div>
                                <div className="flex items-center text-xs px-2 py-1 bg-gray-100 rounded">
                                  <span className="font-medium">Hole {match.startingHole}</span>
                                </div>
                              </div>
                              
                              {/* Team matchup with players */}
                              <div className="flex mb-3">
                                <div className="w-1/2 pr-2 border-r border-gray-200">
                                  <div className="text-green-600 font-medium mb-1">{match.homeTeam}</div>
                                  <ul className="text-xs text-gray-600 list-disc list-inside">
                                    {homePlayers && Array.isArray(homePlayers) && homePlayers.length > 0 ? (
                                      homePlayers.map((player: any, idx: number) => {
                                        // Only log severe issues
                                        if (idx === 0 && !player) {
                                          console.error(`Missing home player data for match ${match.id}`);
                                        }
                                        
                                        // Debug the player object structure for the first player
                                        if (idx === 0) {
                                          console.log(`Home player [${idx}] for match ${match.id}:`, player);
                                        }
                                        
                                        // Handle player data format more reliably
                                        const playerName = 
                                          // Object with name property
                                          (typeof player === 'object' && player?.name) ? player.name :
                                          // Object without name but with id (malformed player object)
                                          (typeof player === 'object' && player?.id) ? `Player ${player.id.substring(0,3)}` :
                                          // String value (simple player name)
                                          (typeof player === 'string') ? player :
                                          // Fallback
                                          'Player';
                                        
                                        return (
                                          <li key={`home-${match.id}-${idx}`} className="truncate">
                                            {playerName}
                                          </li>
                                        );
                                      })
                                    ) : (
                                      <li className="text-gray-400 italic">
                                        {loadingScores ? 'Loading players...' : 'No players assigned (click to assign)'}
                                      </li>
                                    )}
                                  </ul>
                                </div>
                                <div className="w-1/2 pl-2">
                                  <div className="text-red-600 font-medium mb-1">{match.awayTeam}</div>
                                  <ul className="text-xs text-gray-600 list-disc list-inside">
                                    {awayPlayers && Array.isArray(awayPlayers) && awayPlayers.length > 0 ? (
                                      awayPlayers.map((player: any, idx: number) => {
                                        // Only log severe issues
                                        if (idx === 0 && !player) {
                                          console.error(`Missing away player data for match ${match.id}`);
                                        }
                                        
                                        // Debug the player object structure for the first player
                                        if (idx === 0) {
                                          console.log(`Away player [${idx}] for match ${match.id}:`, player);
                                        }
                                        
                                        // Handle player data format more reliably
                                        const playerName = 
                                          // Object with name property
                                          (typeof player === 'object' && player?.name) ? player.name :
                                          // Object without name but with id (malformed player object)
                                          (typeof player === 'object' && player?.id) ? `Player ${player.id.substring(0,3)}` :
                                          // String value (simple player name)
                                          (typeof player === 'string') ? player :
                                          // Fallback
                                          'Player';
                                        
                                        return (
                                          <li key={`away-${match.id}-${idx}`} className="truncate">
                                            {playerName}
                                          </li>
                                        );
                                      })
                                    ) : (
                                      <li className="text-gray-400 italic">
                                        {loadingScores ? 'Loading players...' : 'No players assigned (click to assign)'}
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              </div>
                              
                              {/* Score and completion info */}
                              <div className="flex items-center justify-between mt-4 border-t border-gray-100 pt-3">
                                {/* Completion progress */}
                                <div className="flex flex-col">
                                  <div className="text-xs text-gray-500 mb-1">Completion</div>
                                  <div className="relative h-2 w-24 bg-gray-200 rounded overflow-hidden">
                                    <div 
                                      className={`absolute left-0 top-0 h-full ${
                                        completionPercent === 100 ? 'bg-green-500' :
                                        completionPercent > 50 ? 'bg-amber-500' : 'bg-orange-500'
                                      }`}
                                      style={{ width: `${completionPercent}%` }}
                                    ></div>
                                  </div>
                                  <div className="text-xs mt-1">
                                    {scoreData.completedHoles || 0}/{
                                      // Always show 9 holes for matches starting on hole 1 or 10, regardless of scoreData
                                      (match.startingHole === 1 || match.startingHole === 10) ? 9 : 
                                      // For other starting holes, use the data or default to 18
                                      (scoreData.totalHoles || 18)
                                    } holes
                                  </div>
                                </div>
                                
                                {/* Match result */}
                                {scoreData.result && (
                                  <div className="flex flex-col items-end">
                                    <div className="text-xs text-gray-500 mb-1">Score</div>
                                    <div className="flex items-center text-base font-bold">
                                      <span className="text-green-600">{scoreData.result.homePoints}</span>
                                      <span className="mx-1 text-gray-400">:</span>
                                      <span className="text-red-600">{scoreData.result.awayPoints}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Status badge */}
                              {scoreData.completedHoles !== undefined && (
                                <div className="mt-3 flex justify-end">
                                  <span className={`${statusClass} text-xs px-2 py-0.5 rounded-full`}>
                                    {isComplete ? 'Complete' : 
                                     completionPercent > 0 ? `${completionPercent}% Complete` : 'Not Started'}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Card footer with action hint */}
                            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-center">
                              <span className="text-xs text-primary flex items-center justify-center">
                                <TableCellsIcon className="h-3 w-3 mr-1" />
                                View Scorecard
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScorecardsTab;