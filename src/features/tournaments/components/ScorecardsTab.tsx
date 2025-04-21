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

  // Load match scores when scorecard tab is active
  useEffect(() => {
    const loadScores = async () => {
      if (!schedulesData?.schedules) return;

      setLoadingScores(true);
      const updatedScores: Record<string, any> = {};
      
      try {
        // Flatten all matches from all schedule days
        const allMatches = schedulesData.schedules.flatMap((day: any) => 
          day.matches || []
        );
        
        // Load scores for each match
        for (const match of allMatches) {
          try {
            const response = await fetch(`/api/matches/${match.id}/scores`);
            if (response.ok) {
              const data = await response.json();
              if (data.match) {
                // Count completed holes
                const completedHoles = data.match.holes.filter(
                  (h: any) => h.homeGross !== null && h.awayGross !== null
                ).length;
                
                // Calculate completion percentage
                const totalHoles = data.match.holes.length;
                const completionPercent = totalHoles > 0 
                  ? Math.round((completedHoles / totalHoles) * 100) 
                  : 0;
                
                updatedScores[match.id] = {
                  completedHoles,
                  totalHoles,
                  completionPercent,
                  homeTeam: data.match.homeTeam,
                  awayTeam: data.match.awayTeam,
                  result: data.match.points ? {
                    homePoints: data.match.points.homeTeamPoints,
                    awayPoints: data.match.points.awayTeamPoints
                  } : null
                };
              }
            }
          } catch (err) {
            console.error(`Error loading scores for match ${match.id}:`, err);
          }
        }
        
        setMatchScores(updatedScores);
      } catch (err) {
        console.error("Error loading match scores:", err);
      } finally {
        setLoadingScores(false);
      }
    };
    
    loadScores();
  }, [schedulesData]);

  if (schedulesLoading || loadingScores) {
    return <div className="text-center py-6">Loading scorecards...</div>;
  }

  if (schedulesError) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
        <div className="flex">
          <div>
            <p className="text-sm text-red-700">
              Error loading match data. Please try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!schedulesData || !schedulesData.schedules || schedulesData.schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <TableCellsIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No matches found</h3>
        <p className="mt-1 text-sm text-gray-500">Create matches to start scoring.</p>
      </div>
    );
  }

  // Filter out schedule days with no matches
  const daysWithMatches = schedulesData.schedules.filter((day: any) => 
    day.matches && day.matches.length > 0
  );

  if (daysWithMatches.length === 0) {
    return (
      <div className="text-center py-12">
        <TableCellsIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No matches found</h3>
        <p className="mt-1 text-sm text-gray-500">Create matches to start scoring.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">Scorecards</h2>
          <p className="mt-2 text-sm text-gray-700">
            View and update match scorecards.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => refreshSchedules()}
            className="block rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {daysWithMatches.map((scheduleDay: any) => (
          <div key={scheduleDay.id} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {formatDate(scheduleDay.date)}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {scheduleDay.description || 'Tournament Day'}
              </p>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {scheduleDay.matches.map((match: any) => {
                  const scoreData = matchScores[match.id] || {};
                  const isComplete = scoreData.completionPercent === 100;
                  
                  return (
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
                              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                {new Date(match.teeTime).toLocaleTimeString([], {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZone: 'UTC',
                                })}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              <span className="text-blue-600 font-medium">
                                {match.homeTeam}
                              </span>
                              <span className="mx-1">vs</span>
                              <span className="text-red-600 font-medium">
                                {match.awayTeam}
                              </span>
                              <span className="mx-2">•</span>
                              <span>{match.course}</span>
                            </div>
                            
                            {/* Score Summary */}
                            {scoreData.completedHoles > 0 && (
                              <div className="mt-2 flex items-center space-x-4">
                                <div className="flex items-center">
                                  {isComplete ? (
                                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                  ) : (
                                    <MinusCircleIcon className="h-4 w-4 text-amber-500 mr-1" />
                                  )}
                                  <span className="text-xs">
                                    {scoreData.completedHoles}/{scoreData.totalHoles} holes scored
                                  </span>
                                </div>
                                
                                {scoreData.result && (
                                  <div className="text-xs">
                                    <span className="text-blue-600 font-medium">
                                      {scoreData.result.homePoints}
                                    </span>
                                    <span className="mx-1">-</span>
                                    <span className="text-red-600 font-medium">
                                      {scoreData.result.awayPoints}
                                    </span>
                                  </div>
                                )}
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
                            className="inline-flex items-center px-2.5 py-1.5 border border-primary text-xs font-medium rounded text-primary bg-white hover:bg-primary hover:text-white"
                          >
                            <TableCellsIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                            Scorecard
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScorecardsTab;