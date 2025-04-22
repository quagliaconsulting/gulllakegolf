import React from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PrinterIcon, LockClosedIcon, LockOpenIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ScorecardHeaderProps {
  tournamentId: string;
  matchId: string;
  match: any;
  lockStatus: boolean;
  toggleLock: () => void;
  onPrint: () => void;
  onRefresh: () => void;
  isSaving: boolean;
  onGoToPlayerAssignments: () => void;
}

export const ScorecardHeader: React.FC<ScorecardHeaderProps> = ({
  tournamentId,
  matchId,
  match,
  lockStatus,
  toggleLock,
  onPrint,
  onRefresh,
  isSaving,
  onGoToPlayerAssignments,
}) => {
  if (!match) return null;
  
  // Format indicator by match type for visual clarity
  const getFormatBadgeClass = () => {
    const format = match.format?.toLowerCase() || '';
    if (format.includes('singles')) return 'bg-blue-100 text-blue-800';
    if (format.includes('best ball')) return 'bg-green-100 text-green-800';
    if (format.includes('alternate')) return 'bg-purple-100 text-purple-800';
    if (format.includes('chapman')) return 'bg-orange-100 text-orange-800';
    if (format.includes('scramble')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-6 print:shadow-none print:border-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <Link 
            href={`/tournaments/${tournamentId}`} 
            className="inline-flex items-center text-green-600 hover:text-green-800 mb-2 sm:mb-0 print:hidden"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Tournament
          </Link>
          <div className="flex items-center">
            <h1 className="text-2xl font-bold mr-2">{match.format} Match</h1>
            <span className={`${getFormatBadgeClass()} text-xs px-2 py-0.5 rounded-full font-medium`}>
              {match.format}
            </span>
          </div>
          <h2 className="text-gray-600 mt-1">
            {match.course?.name || match.course} | {match.teeTime ? new Date(match.teeTime).toLocaleString() : match.time}
          </h2>
        </div>
        
        <div className="flex space-x-2 mt-3 sm:mt-0 print:hidden">
          <button
            onClick={onGoToPlayerAssignments}
            className="px-3 py-1.5 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200"
          >
            Assign Players
          </button>
          
          <button
            onClick={onRefresh}
            disabled={isSaving}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={`h-5 w-5 ${isSaving ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={toggleLock}
            className={`px-3 py-1.5 text-sm rounded ${
              lockStatus
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
            title={lockStatus ? 'Unlock Scorecard' : 'Lock Scorecard'}
          >
            {lockStatus ? (
              <LockClosedIcon className="h-5 w-5" />
            ) : (
              <LockOpenIcon className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={onPrint}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            title="Print Scorecard"
          >
            <PrinterIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between border-t border-gray-200 pt-3">
        <div className="text-sm flex flex-col sm:flex-row sm:space-x-6">
          <div className="mb-1 sm:mb-0">
            <span className="font-semibold">Starting Hole:</span>{' '}
            {match.startingHole}
          </div>
          <div className="mb-1 sm:mb-0">
            <span className="font-semibold">Format:</span>{' '}
            <span className={getFormatBadgeClass().replace('bg-', 'text-').replace('-100', '-600')}>
              {match.format}
            </span>
          </div>
        </div>
        <div className="text-sm flex flex-col sm:flex-row sm:space-x-6">
          <div className="mb-1 sm:mb-0">
            <span className="font-semibold">Home Team:</span>{' '}
            <span className="text-green-600 font-medium">{match.homeTeam}</span>
          </div>
          <div>
            <span className="font-semibold">Away Team:</span>{' '}
            <span className="text-red-600 font-medium">{match.awayTeam}</span>
          </div>
        </div>
      </div>
      
      {lockStatus && (
        <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          <LockClosedIcon className="h-4 w-4 inline mr-1" />
          This scorecard is locked. Click the lock icon to unlock.
        </div>
      )}
      
      {isSaving && (
        <div className="mt-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-sm">
          <ArrowPathIcon className="h-4 w-4 inline mr-1 animate-spin" />
          Saving scores...
        </div>
      )}
    </div>
  );
};

export default ScorecardHeader;