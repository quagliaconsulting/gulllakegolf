import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import useSWR from 'swr';
import { ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, ChevronRightIcon, ExclamationCircleIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline';
import SinglesFoursomeEditor from '@/components/tournaments/SinglesFoursomeEditor';

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

interface PlayerAssignment {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  format: string;
  homePlayers: string[];
  awayPlayers: string[];
  requiredPlayers: number;
  allHomePlayers: any[];
  allAwayPlayers: any[];
  expanded: boolean;
  isPairsFormat?: boolean;
  isFourManTeam?: boolean;
  isSingles?: boolean;
  time?: string;
  course?: string;
  needsMatchups?: boolean;
  playerMatchups?: {homeId: string, awayId: string}[];
  homeTeamId?: string;
  awayTeamId?: string;
  formatId?: string;
  courseId?: string;
  startingHole?: number;
  teeTime?: string;
  scheduleId?: string;
  matchupsCreated?: boolean;
}

export default function BatchAssignPlayers() {
  const router = useRouter();
  const { id } = router.query;
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [showFoursomeEditor, setShowFoursomeEditor] = useState(false);
  const [foursomeData, setFoursomeData] = useState<any>(null);

  // Fetch tournament data
  const { data: tournamentData } = useSWR(
    id ? `/api/tournaments/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  // Fetch schedule data
  const { data: scheduleData, mutate: refreshSchedules } = useSWR(
    id ? `/api/schedules?tournamentId=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  // Initialize assignments when data loads
  useEffect(() => {
    if (scheduleData?.schedules) {
      const matchesWithAssignmentData: PlayerAssignment[] = [];
      
      scheduleData.schedules.forEach((day: any) => {
        day.matches.forEach((match: any) => {
          // Only add matches that don't have a dayFilter set, or match the current filter
          if (dayFilter === 'all' || day.id === dayFilter) {
            matchesWithAssignmentData.push({
              matchId: match.id,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              format: match.format,
              homePlayers: [],
              awayPlayers: [],
              requiredPlayers: getRequiredPlayersByFormat(match.format),
              allHomePlayers: [],
              allAwayPlayers: [],
              expanded: false,
              time: match.time,
              course: match.course
            });
          }
        });
      });
      
      setAssignments(matchesWithAssignmentData);
      
      // Fetch player data for each match
      matchesWithAssignmentData.forEach(fetchMatchPlayers);
    }
  }, [scheduleData, dayFilter]);

  // Determine required players based on format
  const getRequiredPlayersByFormat = (format: string): number => {
    if (['Best Ball', 'Alternate Shot', 'Scramble', 'Chapman'].includes(format)) {
      return 2;
    } else if (format === 'Singles') {
      return 2; // Singles needs 2 players per team in batch mode for foursome creation
    } else if (format.includes('4-Man') || format.includes('Four Man')) {
      return 4;
    }
    return 0;
  };

  // Fetch players for a specific match
  const fetchMatchPlayers = async (assignment: PlayerAssignment) => {
    try {
      const { data } = await axios.get(`/api/matches/${assignment.matchId}/players`);
      
      setAssignments(prev => prev.map(a => {
        if (a.matchId === assignment.matchId) {
          return {
            ...a,
            homePlayers: data.homePlayers.map((p: any) => p.id),
            awayPlayers: data.awayPlayers.map((p: any) => p.id),
            allHomePlayers: data.allHomePlayers,
            allAwayPlayers: data.allAwayPlayers,
            isPairsFormat: data.isPairsFormat,
            isFourManTeam: data.isFourManTeam,
            isSingles: data.isSingles,
            homeTeamId: data.homeTeamId,
            awayTeamId: data.awayTeamId,
            formatId: data.formatId,
            courseId: data.courseId,
            startingHole: data.startingHole,
            teeTime: data.teeTime,
            scheduleId: data.scheduleId
          };
        }
        return a;
      }));
    } catch (err) {
      console.error(`Error fetching players for match ${assignment.matchId}:`, err);
    }
  };

  // Toggle a player selection
  const togglePlayer = (matchId: string, playerId: string, isHomeTeam: boolean) => {
    setAssignments(prev => prev.map(assignment => {
      if (assignment.matchId === matchId) {
        if (isHomeTeam) {
          const homePlayers = assignment.homePlayers.includes(playerId)
            ? assignment.homePlayers.filter(id => id !== playerId)
            : [...assignment.homePlayers, playerId];
          return { ...assignment, homePlayers };
        } else {
          const awayPlayers = assignment.awayPlayers.includes(playerId)
            ? assignment.awayPlayers.filter(id => id !== playerId)
            : [...assignment.awayPlayers, playerId];
          return { ...assignment, awayPlayers };
        }
      }
      return assignment;
    }));
  };

  // Toggle the expanded state of a match
  const toggleMatchExpanded = (matchId: string) => {
    setAssignments(prev => prev.map(assignment => {
      if (assignment.matchId === matchId) {
        return { ...assignment, expanded: !assignment.expanded };
      }
      return assignment;
    }));
  };

  // Check if a match has the correct number of players assigned
  const isMatchValid = (assignment: PlayerAssignment): boolean => {
    // Check if this is a singles match that already has matchups created or marked as created
    if (assignment.isSingles && (assignment.playerMatchups?.length === 2 || assignment.matchupsCreated)) {
      return true; // Singles matches with matchups already created are valid
    }
    
    if (assignment.isPairsFormat) {
      return assignment.homePlayers.length === 2 && assignment.awayPlayers.length === 2;
    } else if (assignment.isFourManTeam) {
      return assignment.homePlayers.length === 4 && assignment.awayPlayers.length === 4;
    } else if (assignment.isSingles) {
      // For singles batch assign, we allow 2 players from each team for foursome creation
      return assignment.homePlayers.length === 2 && assignment.awayPlayers.length === 2;
    }
    return assignment.homePlayers.length === assignment.requiredPlayers && 
           assignment.awayPlayers.length === assignment.requiredPlayers;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const invalidMatches = assignments.filter(a => !isMatchValid(a));
    
    if (invalidMatches.length > 0) {
      setError(`${invalidMatches.length} matches have incorrect player assignments. Please fix before saving.`);
      
      // Expand invalid matches to make them visible
      setAssignments(prev => prev.map(assignment => {
        if (!isMatchValid(assignment)) {
          return { ...assignment, expanded: true };
        }
        return assignment;
      }));
      
      return;
    }
    
    // Check if any singles matches need player pairings
    const singlesMatches = assignments.filter(a => 
      a.isSingles && isMatchValid(a)
    );
    
    if (singlesMatches.length > 0) {
      // Check if all singles matches have complete matchups
      const singlesWithoutMatchups = singlesMatches.filter(a => 
        !a.playerMatchups || a.playerMatchups.length !== 2
      );
      
      if (singlesWithoutMatchups.length > 0) {
        // Show error message
        setError("Please specify the 1v1 player matchups for Singles matches by clicking 'Setup 1v1 Matchups' on each Singles match below before saving.");
        
        // Mark all singles matches as needing matchups
        setAssignments(prev => prev.map(assignment => {
          if (singlesWithoutMatchups.some(m => m.matchId === assignment.matchId)) {
            return { ...assignment, expanded: true, needsMatchups: true };
          }
          return assignment;
        }));
        
        return;
      }
    }
    
    setError(null);
    setSaving(true);
    
    // Only save assignments that have been modified with players
    const assignmentsToSave = assignments.filter(a => 
      a.homePlayers.length > 0 || a.awayPlayers.length > 0
    ).map(a => ({
      matchId: a.matchId,
      homePlayers: a.homePlayers,
      awayPlayers: a.awayPlayers,
      isSingles: a.isSingles
    }));
    
    try {
      // First save all player assignments
      await axios.post('/api/matches/batch-assign', {
        assignments: assignmentsToSave
      });
      
      // Then create individual player-to-player matches for singles
      const singlesFoursomes = assignments.filter(a => 
        a.isSingles && a.playerMatchups && a.playerMatchups.length === 2
      );
      
      if (singlesFoursomes.length > 0) {
        // Create player-to-player matches for each singles foursome
        for (const foursome of singlesFoursomes) {
          // Generate a unique foursome group ID
          const foursomeGroupId = `foursome_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          
          // Use the create-foursome endpoint - map the field names to match the API
          await axios.post('/api/matches/create-foursome', {
            tournamentId: id,
            scheduleId: foursome.scheduleId,
            formatId: foursome.formatId,
            homeTeamId: foursome.homeTeamId,
            awayTeamId: foursome.awayTeamId,
            courseId: foursome.courseId,
            startingHole: foursome.startingHole || 1,
            teeTime: foursome.teeTime,
            matchups: foursome.playerMatchups!.map(m => ({
              homePlayerId: m.homeId,
              awayPlayerId: m.awayId
            }))
          });
          
          // Mark this match as already having matchups in the UI
          setAssignments(prev => prev.map(a => {
            if (a.matchId === foursome.matchId) {
              return { ...a, matchupsCreated: true };
            }
            return a;
          }));
        }
      }
      
      setSaveSuccess(true);
      refreshSchedules();
      
      // Reset after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving batch assignments:', err);
      setError('Failed to save player assignments. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Generate a list of days for filtering
  const scheduleDays = scheduleData?.schedules.map((day: any) => ({
    id: day.id,
    label: `Day ${day.day} - ${new Date(day.date).toLocaleDateString()}`
  })) || [];

  return (
    <>
      <Head>
        <title>Batch Assign Players | Tournament</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href={`/tournaments/${id}`} className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Tournament
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Batch Assign Players</h1>
          <p className="mt-2 text-sm text-gray-700">
            Assign players to multiple matches at once
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Players assigned successfully!</h3>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <div>
            <label htmlFor="dayFilter" className="block text-sm font-medium text-gray-700">Filter by Day:</label>
            <select
              id="dayFilter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
            >
              <option value="all">All Days</option>
              {scheduleDays.map((day: any) => (
                <option key={day.id} value={day.id}>{day.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => refreshSchedules()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4" />
              Refresh
            </button>
            
            <button
              type="button"
              onClick={() => {
                // Check if we have any assignments
                const hasAssignments = assignments.some(a => 
                  a.homePlayers.length > 0 || a.awayPlayers.length > 0
                );
                
                if (!hasAssignments) {
                  alert('No assignments to clear.');
                  return;
                }
                
                // Confirm deletion
                if (window.confirm('Are you sure you want to remove ALL player assignments for ALL matches? This cannot be undone.')) {
                  setAssignments(prev => prev.map(a => ({
                    ...a,
                    homePlayers: [],
                    awayPlayers: [],
                    playerMatchups: [],
                    matchupsCreated: false,
                    needsMatchups: false
                  })));
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <XMarkIcon className="-ml-1 mr-2 h-4 w-4" />
              Clear All Assignments
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium leading-6 text-gray-900">Matches</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Click on a match to expand and assign players
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {assignments.length} matches found
              </div>
            </div>

            <ul className="divide-y divide-gray-200">
              {assignments.length === 0 ? (
                <li className="px-4 py-6 text-center text-gray-500">
                  No matches found for the selected filter
                </li>
              ) : (
                assignments.map(assignment => (
                  <li key={assignment.matchId} className="px-0">
                    {/* Match Header (always visible) */}
                    <div 
                      className={`px-4 py-4 cursor-pointer hover:bg-gray-50 ${!isMatchValid(assignment) && assignment.homePlayers.length + assignment.awayPlayers.length > 0 ? 'bg-red-50' : ''}`}
                      onClick={() => toggleMatchExpanded(assignment.matchId)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center space-x-3">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100">
                              {assignment.format}
                              {assignment.isSingles && " (2 players each, worth 2 points)"}
                            </span>
                            {assignment.time && <span className="text-sm text-gray-500">{assignment.time}</span>}
                            {assignment.course && <span className="text-sm text-gray-500">• {assignment.course}</span>}
                          </div>
                          <div className="mt-2 flex space-x-4">
                            <div className="text-sm font-medium text-blue-600">{assignment.homeTeam}</div>
                            <div className="text-sm text-gray-500">vs</div>
                            <div className="text-sm font-medium text-red-600">{assignment.awayTeam}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          {/* Status indicator */}
                          <div className="mr-4">
                            {(() => {
                              if (assignment.homePlayers.length === 0 && assignment.awayPlayers.length === 0) {
                                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Not Assigned</span>;
                              } else if (isMatchValid(assignment)) {
                                if (assignment.isSingles && (assignment.playerMatchups?.length === 2 || assignment.matchupsCreated)) {
                                  return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Matchups ✓</span>;
                                } else {
                                  return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Valid</span>;
                                }
                              } else {
                                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Invalid</span>;
                              }
                            })()}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center space-x-2">
                            {/* Delete button - only show if players are assigned */}
                            {(assignment.homePlayers.length > 0 || assignment.awayPlayers.length > 0) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent expanding toggle
                                  
                                  // Confirm deletion
                                  if (window.confirm('Are you sure you want to remove all player assignments for this match?')) {
                                    setAssignments(prev => prev.map(a => {
                                      if (a.matchId === assignment.matchId) {
                                        return {
                                          ...a,
                                          homePlayers: [],
                                          awayPlayers: [],
                                          playerMatchups: [],
                                          matchupsCreated: false,
                                          needsMatchups: false
                                        };
                                      }
                                      return a;
                                    }));
                                  }
                                }}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Remove all player assignments"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            )}
                            
                            {/* Expand/collapse icon */}
                            <ChevronRightIcon 
                              className={`h-5 w-5 text-gray-400 transition-transform ${assignment.expanded ? 'rotate-90' : ''}`} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Match details (only visible when expanded) */}
                    {assignment.expanded && (
                      <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                        {/* Singles Matchup Setup UI */}
                        {assignment.isSingles && isMatchValid(assignment) && !assignment.needsMatchups && (
                          <div className="mb-4">
                            <button
                              type="button"
                              onClick={() => {
                                setAssignments(prev => prev.map(a => {
                                  if (a.matchId === assignment.matchId) {
                                    return { 
                                      ...a, 
                                      needsMatchups: true,
                                      playerMatchups: a.playerMatchups || []
                                    };
                                  }
                                  return a;
                                }));
                              }}
                              className="inline-flex items-center px-3 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                            >
                              <UserGroupIcon className="h-4 w-4 mr-2" />
                              Setup 1v1 Player Matchups
                            </button>
                            <p className="mt-2 text-sm text-blue-600">
                              For Singles matches, you need to set up which home player plays against which away player.
                            </p>
                          </div>
                        )}
                        
                        {/* Singles Matchup Builder UI */}
                        {assignment.isSingles && assignment.needsMatchups && (
                          <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-200">
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="text-md font-medium text-blue-900">
                                1v1 Player Matchups
                              </h3>
                              {!assignment.playerMatchups || assignment.playerMatchups.length === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Auto-match players
                                    const homeIds = [...assignment.homePlayers];
                                    const awayIds = [...assignment.awayPlayers];
                                    
                                    const newMatchups = homeIds.map((homeId, index) => ({
                                      homeId,
                                      awayId: awayIds[index]
                                    }));
                                    
                                    setAssignments(prev => prev.map(a => {
                                      if (a.matchId === assignment.matchId) {
                                        return { ...a, playerMatchups: newMatchups };
                                      }
                                      return a;
                                    }));
                                  }}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                  Auto-Match Players
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Clear matchups
                                    setAssignments(prev => prev.map(a => {
                                      if (a.matchId === assignment.matchId) {
                                        return { ...a, playerMatchups: [] };
                                      }
                                      return a;
                                    }));
                                  }}
                                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >
                                  Reset Matchups
                                </button>
                              )}
                            </div>
                            
                            <p className="text-sm text-blue-700 mb-3">
                              Specify which home player will compete against which away player (1 point per matchup)
                            </p>
                            
                            <div className="space-y-3">
                              {/* Existing matchups */}
                              {assignment.playerMatchups?.map((matchup, idx) => (
                                <div key={idx} className="flex items-center space-x-3">
                                  <div className="flex-1 bg-white p-2 rounded">
                                    <span className="font-medium">
                                      {assignment.allHomePlayers.find(p => p.id === matchup.homeId)?.name || 'Player'}
                                    </span>
                                  </div>
                                  <span>vs</span>
                                  <div className="flex-1 bg-white p-2 rounded">
                                    <span className="font-medium">
                                      {assignment.allAwayPlayers.find(p => p.id === matchup.awayId)?.name || 'Player'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAssignments(prev => prev.map(a => {
                                        if (a.matchId === assignment.matchId) {
                                          return { 
                                            ...a, 
                                            playerMatchups: (a.playerMatchups || []).filter((_, i) => i !== idx)
                                          };
                                        }
                                        return a;
                                      }));
                                    }}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <XMarkIcon className="h-5 w-5" />
                                  </button>
                                </div>
                              ))}
                              
                              {/* Create matchup UI */}
                              {(!assignment.playerMatchups || assignment.playerMatchups.length === 0) && (
                                <div className="bg-white p-4 rounded-md">
                                  <h4 className="text-sm font-medium text-blue-800 mb-2">Set Up 1v1 Matchups</h4>
                                  <p className="text-xs text-gray-600 mb-3">
                                    Select which home player will play against which away player. The other two players will automatically be matched together.
                                  </p>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {(() => {
                                          const player = assignment.allHomePlayers.find(p => p.id === assignment.homePlayers[0]);
                                          return player ? `${player.name} vs:` : 'Home Player 1 vs:';
                                        })()}
                                      </label>
                                      <select
                                        className="w-full rounded-md border-gray-300 shadow-sm"
                                        onChange={(e) => {
                                          const homeId = assignment.homePlayers[0]; // First home player
                                          const awayId = e.target.value;
                                          
                                          // Create matchups for both pairs
                                          setAssignments(prev => prev.map(a => {
                                            if (a.matchId === assignment.matchId) {
                                              // First selected pair
                                              const firstMatchup = { homeId, awayId };
                                              
                                              // Other home player
                                              const remainingHomePlayer = assignment.homePlayers[1];
                                              
                                              // Other away player
                                              const remainingAwayPlayer = assignment.awayPlayers.find(id => 
                                                id !== awayId
                                              );
                                              
                                              if (remainingHomePlayer && remainingAwayPlayer) {
                                                // Create both matchups
                                                return { 
                                                  ...a, 
                                                  playerMatchups: [
                                                    firstMatchup,
                                                    { homeId: remainingHomePlayer, awayId: remainingAwayPlayer }
                                                  ]
                                                };
                                              } else {
                                                // Just create the first matchup
                                                return { 
                                                  ...a, 
                                                  playerMatchups: [firstMatchup]
                                                };
                                              }
                                            }
                                            return a;
                                          }));
                                        }}
                                      >
                                        <option value="">Select away player</option>
                                        {assignment.awayPlayers.map(id => {
                                          const player = assignment.allAwayPlayers.find(p => p.id === id);
                                          return (
                                            <option key={id} value={id}>
                                              {player?.name || 'Unknown player'}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </div>
                                    
                                    <div className="flex items-center justify-center">
                                      <span className="text-gray-500 italic">
                                        {(() => {
                                          const homePlayer = assignment.allHomePlayers.find(p => p.id === assignment.homePlayers[1]);
                                          const homeName = homePlayer ? homePlayer.name : 'Home Player 2';
                                          return `${homeName} will play vs the remaining Away Player`;
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Validation status */}
                              {assignment.playerMatchups?.length === 2 ? (
                                <div className="text-sm text-green-600 bg-green-50 p-2 rounded-md">
                                  All matchups created! ✓
                                </div>
                              ) : (
                                <div className="text-sm text-blue-600">
                                  {2 - (assignment.playerMatchups?.length || 0)} more matchups needed.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
                          {/* Home Team */}
                          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
                            <div className="px-4 py-5 bg-blue-50 sm:px-6">
                              <h2 className="text-lg font-medium leading-6 text-gray-900">{assignment.homeTeam}</h2>
                              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                {assignment.isSingles && (assignment.playerMatchups?.length === 2 || assignment.matchupsCreated) ? (
                                  <span className="text-green-600">Player matchups created ✓</span>
                                ) : (
                                  <>
                                    Select {assignment.requiredPlayers} players for this match
                                    {!isMatchValid(assignment) && assignment.homePlayers.length > 0 && (
                                      <span className="text-red-600 ml-2">
                                        ({assignment.homePlayers.length}/{assignment.requiredPlayers} selected)
                                        {assignment.isSingles && " - Singles matches need 2 players"}
                                      </span>
                                    )}
                                  </>
                                )}
                              </p>
                            </div>
                            <ul className="divide-y divide-gray-200">
                              {assignment.allHomePlayers?.map((player: any) => (
                                <li key={player.id} className="px-4 py-4 sm:px-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <input
                                        id={`home-${assignment.matchId}-${player.id}`}
                                        name={`home-${assignment.matchId}-${player.id}`}
                                        type="checkbox"
                                        checked={assignment.homePlayers.includes(player.id)}
                                        onChange={() => togglePlayer(assignment.matchId, player.id, true)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                      />
                                      <label htmlFor={`home-${assignment.matchId}-${player.id}`} className="ml-3 flex items-center">
                                        <div className="text-sm font-medium text-gray-900">{player.name}</div>
                                        <div className="text-sm text-gray-500 ml-2">(Handicap: {player.handicapIndex})</div>
                                      </label>
                                    </div>
                                    {assignment.homePlayers.includes(player.id) && (
                                      <div className="text-primary">
                                        <CheckCircleIcon className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                              {(!assignment.allHomePlayers || assignment.allHomePlayers.length === 0) && (
                                <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                                  No players available in this team
                                </li>
                              )}
                            </ul>
                          </div>

                          {/* Away Team */}
                          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
                            <div className="px-4 py-5 bg-red-50 sm:px-6">
                              <h2 className="text-lg font-medium leading-6 text-gray-900">{assignment.awayTeam}</h2>
                              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                {assignment.isSingles && (assignment.playerMatchups?.length === 2 || assignment.matchupsCreated) ? (
                                  <span className="text-green-600">Player matchups created ✓</span>
                                ) : (
                                  <>
                                    Select {assignment.requiredPlayers} players for this match
                                    {!isMatchValid(assignment) && assignment.awayPlayers.length > 0 && (
                                      <span className="text-red-600 ml-2">
                                        ({assignment.awayPlayers.length}/{assignment.requiredPlayers} selected)
                                        {assignment.isSingles && " - Singles matches need 2 players"}
                                      </span>
                                    )}
                                  </>
                                )}
                              </p>
                            </div>
                            <ul className="divide-y divide-gray-200">
                              {assignment.allAwayPlayers?.map((player: any) => (
                                <li key={player.id} className="px-4 py-4 sm:px-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <input
                                        id={`away-${assignment.matchId}-${player.id}`}
                                        name={`away-${assignment.matchId}-${player.id}`}
                                        type="checkbox"
                                        checked={assignment.awayPlayers.includes(player.id)}
                                        onChange={() => togglePlayer(assignment.matchId, player.id, false)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                      />
                                      <label htmlFor={`away-${assignment.matchId}-${player.id}`} className="ml-3 flex items-center">
                                        <div className="text-sm font-medium text-gray-900">{player.name}</div>
                                        <div className="text-sm text-gray-500 ml-2">(Handicap: {player.handicapIndex})</div>
                                      </label>
                                    </div>
                                    {assignment.awayPlayers.includes(player.id) && (
                                      <div className="text-primary">
                                        <CheckCircleIcon className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                              {(!assignment.allAwayPlayers || assignment.allAwayPlayers.length === 0) && (
                                <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                                  No players available in this team
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>

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
                'Save Assignments'
              )}
            </button>
          </div>
        </form>
        
        {/* Singles Foursome Editor Modal */}
        {showFoursomeEditor && foursomeData && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Create Singles Foursome</h2>
                  <button
                    type="button"
                    onClick={() => setShowFoursomeEditor(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                {foursomeData.homeTeams?.length > 0 && foursomeData.awayTeams?.length > 0 && foursomeData.courses?.length > 0 ? (
                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label htmlFor="homeTeam" className="block text-sm font-medium text-gray-700">Home Team</label>
                        <select
                          id="homeTeam"
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                          value={foursomeData.homeTeamId || ''}
                          onChange={(e) => setFoursomeData({...foursomeData, homeTeamId: e.target.value, homeTeamName: foursomeData.homeTeams.find((t: any) => t.id === e.target.value)?.name})}
                        >
                          <option value="">-- Select Home Team --</option>
                          {foursomeData.homeTeams.map((team: any) => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="awayTeam" className="block text-sm font-medium text-gray-700">Away Team</label>
                        <select
                          id="awayTeam"
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                          value={foursomeData.awayTeamId || ''}
                          onChange={(e) => setFoursomeData({...foursomeData, awayTeamId: e.target.value, awayTeamName: foursomeData.awayTeams.find((t: any) => t.id === e.target.value)?.name})}
                        >
                          <option value="">-- Select Away Team --</option>
                          {foursomeData.awayTeams.map((team: any) => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="course" className="block text-sm font-medium text-gray-700">Course</label>
                        <select
                          id="course"
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                          value={foursomeData.courseId || ''}
                          onChange={(e) => setFoursomeData({...foursomeData, courseId: e.target.value})}
                        >
                          <option value="">-- Select Course --</option>
                          {foursomeData.courses.map((course: any) => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label htmlFor="startingHole" className="block text-sm font-medium text-gray-700">Starting Hole</label>
                        <select
                          id="startingHole"
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                          value={foursomeData.startingHole || '1'}
                          onChange={(e) => setFoursomeData({...foursomeData, startingHole: parseInt(e.target.value, 10)})}
                        >
                          {[...Array(18)].map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="teeTime" className="block text-sm font-medium text-gray-700">Tee Time</label>
                        <input
                          type="datetime-local"
                          id="teeTime"
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                          value={foursomeData.teeTime ? new Date(foursomeData.teeTime).toISOString().slice(0, 16) : ''}
                          onChange={(e) => setFoursomeData({...foursomeData, teeTime: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-md mb-4">
                    <p className="text-yellow-700">Please make sure teams and courses are defined in the tournament.</p>
                  </div>
                )}
                
                {foursomeData.homeTeamId && foursomeData.awayTeamId && foursomeData.courseId && (
                  <SinglesFoursomeEditor
                    tournamentId={foursomeData.tournamentId}
                    homeTeamId={foursomeData.homeTeamId}
                    awayTeamId={foursomeData.awayTeamId}
                    homeTeamName={foursomeData.homeTeamName}
                    awayTeamName={foursomeData.awayTeamName}
                    formatId={foursomeData.formatId}
                    scheduleId={foursomeData.scheduleId}
                    courseId={foursomeData.courseId}
                    startingHole={foursomeData.startingHole || 1}
                    teeTime={new Date(foursomeData.teeTime)}
                    onCancel={() => setShowFoursomeEditor(false)}
                    onSave={() => {
                      setShowFoursomeEditor(false);
                      // Show success notification
                      setSaveSuccess(true);
                      setTimeout(() => {
                        setSaveSuccess(false);
                      }, 3000);
                      // Reload data
                      refreshSchedules();
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}