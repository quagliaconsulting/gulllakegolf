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
  homePlayers: string[]; // Initial selection (2 for singles)
  awayPlayers: string[]; // Initial selection (2 for singles)
  requiredPlayers: number; // Based on format (pairs=2, 4man=4, singles=2 for initial selection)
  allHomePlayers: any[];
  allAwayPlayers: any[];
  expanded: boolean;
  isPairsFormat?: boolean;
  isFourManTeam?: boolean;
  isSingles?: boolean;
  time?: string;
  course?: string;
  needsMatchups?: boolean; // Flag to show the matchup builder UI for singles
  playerMatchups?: {homeId: string, awayId: string}[]; // UI state for building the two 1v1 singles pairs
  homeTeamId?: string;
  awayTeamId?: string;
  formatId?: string;
  courseId?: string;
  startingHole?: number;
  teeTime?: string;
  scheduleId?: string;
  // matchupsCreated?: boolean; // Removed
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

  // Check if a match has the correct number of players assigned for initial selection
  const isMatchValid = (assignment: PlayerAssignment): boolean => {
    // For singles, initial validation requires 2 players per team to allow matchup creation
    if (assignment.isSingles) {
      return assignment.homePlayers.length === 2 && assignment.awayPlayers.length === 2;
    }
    // For other formats, check against required players
    if (assignment.isPairsFormat) {
      return assignment.homePlayers.length === 2 && assignment.awayPlayers.length === 2;
    } else if (assignment.isFourManTeam) {
      return assignment.homePlayers.length === 4 && assignment.awayPlayers.length === 4;
    }
    // Fallback, should ideally be covered by specific format checks
    // Note: This doesn't validate singles matchups, only the initial 2+2 selection.
    return assignment.homePlayers.length === assignment.requiredPlayers &&
           assignment.awayPlayers.length === assignment.requiredPlayers;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    // 1. Validate initial player counts for all assignments
    // Filter assignments to only those with *some* players selected, 
    // otherwise validation might fail on empty matches the user hasn't touched.
    const assignmentsWithSelections = assignments.filter(a => a.homePlayers.length > 0 || a.awayPlayers.length > 0);
    const invalidPlayerCountMatches = assignmentsWithSelections.filter(a => !isMatchValid(a));
    
    if (invalidPlayerCountMatches.length > 0) {
      const firstInvalid = invalidPlayerCountMatches[0];
      const required = firstInvalid.isFourManTeam ? 4 : (firstInvalid.isPairsFormat || firstInvalid.isSingles ? 2 : firstInvalid.requiredPlayers);
      setError(`${invalidPlayerCountMatches.length} matches have incorrect initial player counts. Please ensure ${required} players are selected per team.`);
      // Expand invalid matches
      setAssignments(prev => prev.map(a => invalidPlayerCountMatches.some(inv => inv.matchId === a.matchId) ? { ...a, expanded: true } : a));
      return;
    }

    // 2. Validate that all Singles matches (that have players selected) have their 2 pairings defined and complete
    const singlesMatchesWithSelections = assignmentsWithSelections.filter(a => a.isSingles);
    const singlesWithoutMatchups = singlesMatchesWithSelections.filter(
      a => !a.playerMatchups || a.playerMatchups.length !== 2 || a.playerMatchups.some(m => !m.homeId || !m.awayId)
    );

    if (singlesWithoutMatchups.length > 0) {
      setError("Please specify the two complete 1v1 player matchups for all Singles matches that have players assigned. Expand the match and use the 'Setup 1v1 Player Matchups' section.");
      // Expand invalid singles matches and ensure the builder is visible
      setAssignments(prev => prev.map(a => 
        singlesWithoutMatchups.some(m => m.matchId === a.matchId) 
          ? { ...a, expanded: true, needsMatchups: true } 
          : a
      ));
      return;
    }

    // 3. Prepare data for API call - only include assignments that have selections
    setSaving(true);
    const assignmentsToSave = assignmentsWithSelections
      .map(a => {
        if (a.isSingles) {
          // Format for Singles: Use the 'pairings' structure (validation ensures playerMatchups is valid here)
          return {
            matchId: a.matchId,
            pairings: a.playerMatchups!.map(m => ({ // Use non-null assertion as validated above
              homePlayerId: m.homeId,
              awayPlayerId: m.awayId
            }))
          };
        } else {
          // Format for non-Singles: Use homePlayers/awayPlayers (validation ensures counts are correct)
          return {
            matchId: a.matchId,
            homePlayers: a.homePlayers,
            awayPlayers: a.awayPlayers
          };
        }
      }); // No need to filter nulls as we start from assignmentsWithSelections

    if (assignmentsToSave.length === 0) {
       setError("No player assignments to save. Please select players for at least one match.");
       setSaving(false);
       return;
    }

    // Get token from local storage for authorization
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication error: No token found. Please log in again.');
      setSaving(false);
      return;
    }
    
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    console.log('Payload being sent to /api/matches/batch-assign:', JSON.stringify(assignmentsToSave, null, 2));

    try {
      // Single API call for all assignments - include config with auth header
      const response = await axios.post('/api/matches/batch-assign', {
        assignments: assignmentsToSave
      }, config);

      // Handle response (check status code and results array)
      const results = response.data.results || [];
      const allSuccessful = response.status === 200 && results.every((r: any) => r.success);
      const partialSuccess = response.status === 207 || (response.status !== 200 && results.some((r: any) => r.success));

      if (allSuccessful) {
        setSaveSuccess(true);
        refreshSchedules(); // Refresh data on success
        // Clear local matchup state for singles after successful save
        setAssignments(prev => prev.map(a => a.isSingles ? { ...a, needsMatchups: false } : a)); 
        setTimeout(() => setSaveSuccess(false), 3000);
      } else if (partialSuccess) {
         setError(`Some assignments saved, but errors occurred: ${results.filter((r:any) => !r.success).map((r:any) => `Match ${r.matchId}: ${r.error}`).join(', ')}`);
         refreshSchedules(); // Refresh data even on partial success
      } else {
        // General failure or all assignments failed
        const errorMessages = results.length > 0 
          ? results.map((r: any) => `Match ${r.matchId || 'Unknown'}: ${r.error || 'Unknown error'}`).join(', ')
          : (response.data.message || 'Please try again.');
        setError(`Failed to save assignments. ${errorMessages}`);
      }

    } catch (err: any) {
      console.error('Error saving batch assignments:', err);
      const apiError = err.response?.data?.message || err.response?.data?.error || 'An unknown error occurred. Please try again.';
      setError(`Failed to save player assignments: ${apiError}`);
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
                // ... confirmation logic ...
                if (window.confirm('Are you sure you want to remove ALL player assignments and defined matchups for ALL displayed matches? This cannot be undone.')) {
                  setAssignments(prev => prev.map(a => ({
                    ...a,
                    homePlayers: [],
                    awayPlayers: [],
                    playerMatchups: [], // Clear matchups too
                    needsMatchups: false // Reset flag
                    // matchupsCreated: false, // Removed
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
                      className={`px-4 py-4 cursor-pointer hover:bg-gray-50 ${!isMatchValid(assignment) && (assignment.homePlayers.length > 0 || assignment.awayPlayers.length > 0) ? 'bg-red-50' : ''}`}
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
                          {/* Status indicator - Updated Logic */}
                          <div className="mr-4">
                            {(() => {
                              const hasSelections = assignment.homePlayers.length > 0 || assignment.awayPlayers.length > 0;
                              if (!hasSelections) {
                                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Not Assigned</span>;
                              }
                              const initialSelectionValid = isMatchValid(assignment);
                              // Check if both matchups are fully defined (both homeId and awayId exist)
                              const singlesMatchupsComplete = assignment.isSingles && assignment.playerMatchups?.length === 2 && assignment.playerMatchups.every(m => m.homeId && m.awayId);

                              if (assignment.isSingles) {
                                if (initialSelectionValid && singlesMatchupsComplete) {
                                  return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Ready ✓</span>;
                                } else if (initialSelectionValid) {
                                  return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Needs 1v1 Matchups</span>;
                                } else {
                                  return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Invalid Selection</span>;
                                }
                              } else { // Non-Singles
                                if (initialSelectionValid) {
                                  return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Ready ✓</span>;
                                } else {
                                  return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Invalid Selection</span>;
                                }
                              }
                            })()}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center space-x-2">
                             {/* Delete button - Updated confirmation/logic */}
                            {(assignment.homePlayers.length > 0 || assignment.awayPlayers.length > 0) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation(); 
                                  if (window.confirm('Are you sure you want to remove player assignments and defined matchups for this match?')) {
                                    setAssignments(prev => prev.map(a => {
                                      if (a.matchId === assignment.matchId) {
                                        return {
                                          ...a,
                                          homePlayers: [],
                                          awayPlayers: [],
                                          playerMatchups: [], // Clear matchups too
                                          needsMatchups: false // Reset flag
                                          // matchupsCreated: false, // Removed
                                        };
                                      }
                                      return a;
                                    }));
                                  }
                                }}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Remove assignments & matchups for this match"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            )}
                            {/* ... Expand icon ... */}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Match details (only visible when expanded) */}
                    {assignment.expanded && (
                      <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                        {/* Singles Matchup Builder UI Trigger & Display - Updated Logic */}
                        {assignment.isSingles && (
                          <div className="mb-4">
                             {/* Button is always shown if initial selection is valid, text changes */} 
                            <button
                              type="button"
                              onClick={() => { /* Show the builder */
                                setAssignments(prev => prev.map(a => 
                                  a.matchId === assignment.matchId 
                                    ? { ...a, needsMatchups: true } 
                                    : a
                                ));
                              }}
                              className="inline-flex items-center px-3 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50"
                              // Disable if builder is already showing or if initial selection isn't valid
                              disabled={assignment.needsMatchups || !isMatchValid(assignment)} 
                            >
                              <UserGroupIcon className="h-4 w-4 mr-2" />
                              {/* Change text based on whether matchups are already complete */} 
                              {assignment.playerMatchups?.length === 2 && assignment.playerMatchups.every(m => m.homeId && m.awayId) 
                                ? 'Review 1v1 Matchups' 
                                : 'Set Up 1v1 Player Matchups'}
                            </button>
                            {/* Show status text only when builder is NOT showing */} 
                            {!assignment.needsMatchups && isMatchValid(assignment) && (
                               assignment.playerMatchups?.length === 2 && assignment.playerMatchups.every(m => m.homeId && m.awayId) ? (
                                 <span className="ml-3 text-sm text-green-600">Matchups are set. Ready to save.</span>
                               ) : (
                                 <p className="mt-2 text-sm text-yellow-600">
                                   Click button above to specify the two 1v1 pairings.
                                 </p>
                               )
                             )}
                             {!isMatchValid(assignment) && (
                                <p className="mt-2 text-sm text-red-600">
                                  Select 2 players per team before setting up matchups.
                                </p>
                             )}
                          </div>
                        )}
                        
                        {/* Singles Matchup Builder UI Content - Renders only when needsMatchups is true & initial selection valid */}
                        {assignment.isSingles && assignment.needsMatchups && isMatchValid(assignment) && (
                           <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-200">
                             {/* ... Builder Header (Title, Auto-Assign, Reset) ... */} 
                             {/* ... Builder Instructions ... */} 
                             <div className="space-y-3">
                               {/* Matchup Pair 1 */}
                                <div className="bg-white p-3 rounded-md border border-gray-200">
                                   <h4 className="text-sm font-medium text-gray-700 mb-2">Matchup 1</h4>
                                   <div className="grid grid-cols-2 gap-3 items-center">
                                     <div>
                                        <label className="block text-xs font-medium text-gray-500">Home Player</label>
                                        <select
                                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                          value={assignment.playerMatchups?.[0]?.homeId || ''}
                                          onChange={(e) => {
                                            const selectedHomeId = e.target.value;
                                            const existingMatchups = assignment.playerMatchups || [];
                                            const updatedMatchups = [...existingMatchups];
                                            // Ensure we don't select the same home player twice
                                            if (updatedMatchups[1]?.homeId === selectedHomeId) return;

                                            if (!updatedMatchups[0]) updatedMatchups[0] = { homeId: '', awayId: ''}; 
                                            updatedMatchups[0].homeId = selectedHomeId;

                                            setAssignments(prev => prev.map(a => a.matchId === assignment.matchId ? { ...a, playerMatchups: updatedMatchups } : a));
                                          }}
                                          disabled={assignment.homePlayers.length !== 2}
                                        >
                                          <option value="" disabled>Select...</option>
                                          {assignment.homePlayers.map(id => {
                                             const player = assignment.allHomePlayers.find(p => p.id === id);
                                             const isSelectedInOther = assignment.playerMatchups?.[1]?.homeId === id;
                                             return (
                                                <option key={id} value={id} disabled={isSelectedInOther} >
                                                   {player?.name || 'Unknown'} {isSelectedInOther ? '(in Matchup 2)' : ''}
                                                </option>
                                             );
                                          })}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-500">Away Player</label>
                                        <select
                                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                          value={assignment.playerMatchups?.[0]?.awayId || ''}
                                          onChange={(e) => {
                                            const selectedAwayId = e.target.value;
                                            const existingMatchups = assignment.playerMatchups || [];
                                            const updatedMatchups = [...existingMatchups];
                                            // Ensure we don't select the same away player twice
                                            if (updatedMatchups[1]?.awayId === selectedAwayId) return;

                                            if (!updatedMatchups[0]) updatedMatchups[0] = { homeId: '', awayId: ''}; 
                                            updatedMatchups[0].awayId = selectedAwayId;

                                            setAssignments(prev => prev.map(a => a.matchId === assignment.matchId ? { ...a, playerMatchups: updatedMatchups } : a));
                                          }}
                                          disabled={assignment.awayPlayers.length !== 2}
                                        >
                                          <option value="" disabled>Select...</option>
                                          {assignment.awayPlayers.map(id => {
                                             const player = assignment.allAwayPlayers.find(p => p.id === id);
                                             const isSelectedInOther = assignment.playerMatchups?.[1]?.awayId === id;
                                             return (
                                                <option key={id} value={id} disabled={isSelectedInOther} >
                                                   {player?.name || 'Unknown'} {isSelectedInOther ? '(in Matchup 1)' : ''}
                                                </option>
                                             );
                                          })}
                                        </select>
                                      </div>
                                   </div>
                                </div>

                                {/* Matchup Pair 2 */}
                                <div className="bg-white p-3 rounded-md border border-gray-200">
                                   <h4 className="text-sm font-medium text-gray-700 mb-2">Matchup 2</h4>
                                   <div className="grid grid-cols-2 gap-3 items-center">
                                     <div>
                                        <label className="block text-xs font-medium text-gray-500">Home Player</label>
                                        <select
                                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                          value={assignment.playerMatchups?.[1]?.homeId || ''}
                                          onChange={(e) => {
                                            const selectedHomeId = e.target.value;
                                            const existingMatchups = assignment.playerMatchups || [];
                                            const updatedMatchups = [...existingMatchups];
                                            // Ensure we don't select the same home player twice
                                            if (updatedMatchups[0]?.homeId === selectedHomeId) return;

                                            if (!updatedMatchups[1]) updatedMatchups[1] = { homeId: '', awayId: ''}; 
                                            updatedMatchups[1].homeId = selectedHomeId;

                                            setAssignments(prev => prev.map(a => a.matchId === assignment.matchId ? { ...a, playerMatchups: updatedMatchups } : a));
                                          }}
                                          disabled={assignment.homePlayers.length !== 2}
                                        >
                                          <option value="" disabled>Select...</option>
                                          {assignment.homePlayers.map(id => {
                                             const player = assignment.allHomePlayers.find(p => p.id === id);
                                             const isSelectedInOther = assignment.playerMatchups?.[0]?.homeId === id;
                                             return (
                                                <option key={id} value={id} disabled={isSelectedInOther} >
                                                   {player?.name || 'Unknown'} {isSelectedInOther ? '(in Matchup 1)' : ''}
                                                </option>
                                             );
                                          })}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-500">Away Player</label>
                                        <select
                                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                          value={assignment.playerMatchups?.[1]?.awayId || ''}
                                          onChange={(e) => {
                                            const selectedAwayId = e.target.value;
                                            const existingMatchups = assignment.playerMatchups || [];
                                            const updatedMatchups = [...existingMatchups];
                                            // Ensure we don't select the same away player twice
                                            if (updatedMatchups[0]?.awayId === selectedAwayId) return;

                                            if (!updatedMatchups[1]) updatedMatchups[1] = { homeId: '', awayId: ''}; 
                                            updatedMatchups[1].awayId = selectedAwayId;

                                            setAssignments(prev => prev.map(a => a.matchId === assignment.matchId ? { ...a, playerMatchups: updatedMatchups } : a));
                                          }}
                                          disabled={assignment.awayPlayers.length !== 2}
                                        >
                                          <option value="" disabled>Select...</option>
                                          {assignment.awayPlayers.map(id => {
                                             const player = assignment.allAwayPlayers.find(p => p.id === id);
                                             const isSelectedInOther = assignment.playerMatchups?.[0]?.awayId === id;
                                             return (
                                                <option key={id} value={id} disabled={isSelectedInOther} >
                                                   {player?.name || 'Unknown'} {isSelectedInOther ? '(in Matchup 1)' : ''}
                                                </option>
                                             );
                                          })}
                                        </select>
                                      </div>
                                   </div>
                                </div>
                             </div>
                             {/* Validation status - check completeness */}
                             {assignment.playerMatchups?.length === 2 && assignment.playerMatchups.every(m => m.homeId && m.awayId) ? (
                                <div className="mt-3 text-sm text-green-600 bg-green-50 p-2 rounded-md text-center">
                                  All matchups assigned! ✓
                                </div>
                              ) : (
                                <div className="mt-3 text-sm text-blue-600 text-center">
                                  {2 - (assignment.playerMatchups?.filter(m => m.homeId && m.awayId).length || 0)} more pairings needed.
                                </div>
                              )}
                           </div>
                        )}
                        
                        {/* Player Selection Grids - Remove matchupsCreated logic from helper text */}
                        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
                          {/* Home Team */}
                          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
                            <div className="px-4 py-5 bg-blue-50 sm:px-6">
                              <h2 className="text-lg font-medium leading-6 text-gray-900">{assignment.homeTeam}</h2>
                              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                Select {assignment.requiredPlayers} players
                                {!isMatchValid(assignment) && assignment.homePlayers.length > 0 && (
                                  <span className="text-red-600 ml-2">
                                    ({assignment.homePlayers.length}/{assignment.requiredPlayers} selected)
                                  </span>
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
                                Select {assignment.requiredPlayers} players
                                {!isMatchValid(assignment) && assignment.awayPlayers.length > 0 && (
                                  <span className="text-red-600 ml-2">
                                    ({assignment.awayPlayers.length}/{assignment.requiredPlayers} selected)
                                  </span>
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