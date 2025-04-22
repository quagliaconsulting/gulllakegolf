import React, { useState } from 'react';
import Link from 'next/link';
import { 
  CalendarIcon, 
  PlusIcon, 
  ArrowPathIcon, 
  PencilIcon,
  NoSymbolIcon, 
  UsersIcon, 
  TableCellsIcon 
} from '@heroicons/react/24/outline';
import { formatDate } from '../utils/dateUtils';

interface ScheduleTabProps {
  tournamentId: string;
  schedulesData: any;
  schedulesLoading: boolean;
  schedulesError: any;
  refreshSchedules: () => Promise<any>;
  matchPlayerData: Record<string, any>;
  isDeletingMatch: string | null;
  setIsDeletingMatch: (id: string | null) => void;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  tournamentId,
  schedulesData,
  schedulesLoading,
  schedulesError,
  refreshSchedules,
  matchPlayerData,
  isDeletingMatch,
  setIsDeletingMatch
}) => {
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handle match deletion
  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      return;
    }
    
    setIsDeletingMatch(matchId);
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete match: ${response.statusText}`);
      }
      
      // Refresh the schedule data after deletion
      await refreshSchedules();
    } catch (error) {
      console.error('Error deleting match:', error);
      setDeleteError('Failed to delete match. Please try again.');
    } finally {
      setIsDeletingMatch(null); // Clear deleting state
    }
  };

  if (schedulesLoading) {
    return <div className="text-center py-6">Loading schedule...</div>;
  }

  if (schedulesError) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
        <div className="flex">
          <div>
            <p className="text-sm text-red-700">
              Error loading schedule. Please try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!schedulesData || !schedulesData.schedules || schedulesData.schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No schedule days</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new schedule day.</p>
        <div className="mt-6">
          <Link
            href={`/schedule/new?tournamentId=${tournamentId}`}
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Add Schedule Day
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">Schedule & Matches</h2>
          <p className="mt-2 text-sm text-gray-700">
            View and manage matches for the tournament.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex space-x-3">
          <button
            type="button"
            onClick={() => refreshSchedules()}
            className="block rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </button>
          <Link
            href={`/tournaments/${tournamentId}/batch-assign`}
            className="block rounded-md bg-white px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50"
          >
            <UsersIcon className="-ml-0.5 mr-1.5 h-5 w-5 inline-block" aria-hidden="true" />
            Batch Assign
          </Link>
          <Link
            href={`/schedule/new?tournamentId=${tournamentId}`}
            className="block rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5 inline-block" aria-hidden="true" />
            Add Day
          </Link>
        </div>
      </div>

      {deleteError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div>
              <p className="text-sm text-red-700">{deleteError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {schedulesData.schedules.map((scheduleDay: any) => (
          <div key={scheduleDay.id} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {formatDate(scheduleDay.date)}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {scheduleDay.description || 'Schedule Day'}
                </p>
              </div>
              <Link
                href={`/tournaments/${tournamentId}/schedule/edit?scheduleId=${scheduleDay.id}`}
                className="text-gray-400 hover:text-gray-500"
              >
                <PencilIcon className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Edit schedule day</span>
              </Link>
            </div>
            <div className="border-t border-gray-200">
              {scheduleDay.matches && scheduleDay.matches.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {scheduleDay.matches.map((match: any) => (
                    <li key={match.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-primary/10 rounded-full">
                            <span className="text-primary font-medium">{match.startingHole}</span>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <h4 className="text-base font-medium text-gray-900">
                                {match.format}
                              </h4>
                              <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                {new Date(match.teeTime).toLocaleTimeString([], {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZone: 'UTC',
                                })}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              <span className="text-green-600 font-medium">
                                {match.homeTeam}
                              </span>
                              <span className="mx-1">vs</span>
                              <span className="text-red-600 font-medium">
                                {match.awayTeam}
                              </span>
                              <span className="mx-2">•</span>
                              <span>{match.course}</span>
                            </div>
                            {matchPlayerData[match.id] && (
                              <div className="mt-1 text-xs text-gray-500">
                                <div className="flex flex-wrap gap-x-4">
                                  <div className="flex items-center">
                                    <UsersIcon className="h-3 w-3 mr-1" />
                                    <span className="text-green-600">
                                      {matchPlayerData[match.id].homePlayers.length > 0
                                        ? matchPlayerData[match.id].homePlayers
                                            .map((p: any) => p.name)
                                            .join(', ')
                                        : 'No players'}
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <UsersIcon className="h-3 w-3 mr-1" />
                                    <span className="text-red-600">
                                      {matchPlayerData[match.id].awayPlayers.length > 0
                                        ? matchPlayerData[match.id].awayPlayers
                                            .map((p: any) => p.name)
                                            .join(', ')
                                        : 'No players'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            href={`/tournaments/${tournamentId}/matches/${match.id}/players`}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <UsersIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                            Players
                          </Link>
                          <Link
                            href={`/tournaments/${tournamentId}/matches/${match.id}/scorecard`}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <TableCellsIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                            Scorecard
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteMatch(match.id)}
                            disabled={isDeletingMatch === match.id}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-gray-50 hover:text-red-800 disabled:opacity-50"
                          >
                            {isDeletingMatch === match.id ? (
                              <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                            ) : (
                              <NoSymbolIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                  No matches scheduled for this day.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleTab;