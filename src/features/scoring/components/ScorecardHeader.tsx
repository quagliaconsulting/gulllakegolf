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

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-6 print:shadow-none print:border-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <Link 
            href={`/tournaments/${tournamentId}`} 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2 sm:mb-0 print:hidden"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Tournament
          </Link>
          <h1 className="text-2xl font-bold">{match.format} Match</h1>
          <h2 className="text-gray-600">{match.course} | {match.time}</h2>
        </div>
        
        <div className="flex space-x-2 mt-3 sm:mt-0 print:hidden">
          <button
            onClick={onGoToPlayerAssignments}
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
          >
            Assign Players
          </button>
          
          <button
            onClick={onRefresh}
            disabled={isSaving}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
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
            <span className="font-semibold">Format:</span> {match.format}
          </div>
        </div>
        <div className="text-sm flex flex-col sm:flex-row sm:space-x-6">
          <div className="mb-1 sm:mb-0">
            <span className="font-semibold">Home Team:</span>{' '}
            <span className="text-blue-600">{match.homeTeam}</span>
          </div>
          <div>
            <span className="font-semibold">Away Team:</span>{' '}
            <span className="text-red-600">{match.awayTeam}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScorecardHeader;