import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';
import { useBatchAssign } from '../hooks/useBatchAssign';
import DaySelector from './DaySelector';
import MatchAssignmentCard from './MatchAssignmentCard';
import SinglesFoursomeEditor from '@/features/tournaments/components/SinglesFoursomeEditor';

interface BatchAssignPageProps {
  tournamentId: string;
}

const BatchAssignPage: React.FC<BatchAssignPageProps> = ({ tournamentId }) => {
  const {
    tournamentData,
    scheduleData,
    assignments,
    saving,
    saveSuccess,
    error,
    dayFilter,
    setDayFilter,
    showFoursomeEditor,
    setShowFoursomeEditor,
    foursomeData,
    toggleExpandMatch,
    handlePlayerChange,
    handleSinglesMatchupChange,
    createFoursomeGroup,
    savePlayerAssignments,
    handleOpenFoursomeEditor
  } = useBatchAssign(tournamentId);

  return (
    <>
      <Head>
        <title>Batch Assign Players | {tournamentData?.name || 'Tournament'}</title>
      </Head>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <Link 
              href={`/tournaments/${tournamentId}`} 
              className="inline-flex items-center text-sm text-green-600 hover:text-green-800 mb-2"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to Tournament
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Batch Assign Players</h1>
            <p className="mt-1 text-sm text-gray-500">
              Assign players to multiple matches at once.
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <DaySelector
              schedules={scheduleData?.schedules || []}
              selectedDay={dayFilter}
              onChange={setDayFilter}
            />
          </div>
        </div>

        {/* Status messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Player assignments saved successfully!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No matches message */}
        {assignments.length === 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
            <p className="text-gray-500">
              No matches available for the selected day. Please select a different day or create matches first.
            </p>
          </div>
        )}

        {/* Match assignments */}
        {assignments.length > 0 && (
          <div className="space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-4">
                  {assignments.map((match) => (
                    <MatchAssignmentCard
                      key={match.matchId}
                      match={match}
                      toggleExpand={toggleExpandMatch}
                      onPlayerChange={handlePlayerChange}
                      onSinglesMatchupChange={handleSinglesMatchupChange}
                      onCreateFoursome={handleOpenFoursomeEditor}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={savePlayerAssignments}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Saving...
                  </>
                ) : (
                  'Save Assignments'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Foursome editor modal */}
        {showFoursomeEditor && foursomeData && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowFoursomeEditor(false)}></div>
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg font-medium leading-6 text-gray-900">
                        Create Foursome Group
                      </h3>
                      <div className="mt-4">
                        <SinglesFoursomeEditor
                          homeTeamId={foursomeData.homeTeamId}
                          awayTeamId={foursomeData.awayTeamId}
                          courseId={foursomeData.courseId}
                          formatId={foursomeData.formatId}
                          scheduleId={foursomeData.scheduleId}
                          startingHole={foursomeData.startingHole}
                          teeTime={foursomeData.teeTime}
                          homePlayers={foursomeData.allHomePlayers || []}
                          awayPlayers={foursomeData.allAwayPlayers || []}
                          onSubmit={createFoursomeGroup}
                          onCancel={() => setShowFoursomeEditor(false)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BatchAssignPage;