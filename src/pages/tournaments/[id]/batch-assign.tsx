import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import useSWR from 'swr';
import { ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, ChevronRightIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

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
}

export default function BatchAssignPlayers() {
  const router = useRouter();
  const { id } = router.query;
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<string>('all');

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
      return 1;
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
            isSingles: data.isSingles
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
    if (assignment.isPairsFormat) {
      return assignment.homePlayers.length === 2 && assignment.awayPlayers.length === 2;
    } else if (assignment.isFourManTeam) {
      return assignment.homePlayers.length === 4 && assignment.awayPlayers.length === 4;
    } else if (assignment.isSingles) {
      return assignment.homePlayers.length === 1 && assignment.awayPlayers.length === 1;
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
    
    setError(null);
    setSaving(true);
    
    // Only save assignments that have been modified with players
    const assignmentsToSave = assignments.filter(a => 
      a.homePlayers.length > 0 || a.awayPlayers.length > 0
    ).map(a => ({
      matchId: a.matchId,
      homePlayers: a.homePlayers,
      awayPlayers: a.awayPlayers
    }));
    
    try {
      await axios.post('/api/matches/batch-assign', {
        assignments: assignmentsToSave
      });
      
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
                            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100">{assignment.format}</span>
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
                                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Valid</span>;
                              } else {
                                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Invalid</span>;
                              }
                            })()}
                          </div>
                          
                          {/* Expand/collapse icon */}
                          <ChevronRightIcon 
                            className={`h-5 w-5 text-gray-400 transition-transform ${assignment.expanded ? 'rotate-90' : ''}`} 
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Match details (only visible when expanded) */}
                    {assignment.expanded && (
                      <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
                          {/* Home Team */}
                          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
                            <div className="px-4 py-5 bg-blue-50 sm:px-6">
                              <h2 className="text-lg font-medium leading-6 text-gray-900">{assignment.homeTeam}</h2>
                              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                Select {assignment.requiredPlayers} players for this match
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
                                Select {assignment.requiredPlayers} players for this match
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
      </div>
    </>
  );
}