import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useScorecardState } from '../hooks/useScorecardState';
import ScorecardHeader from './ScorecardHeader';
import PasswordModal from './PasswordModal';
import ScoreTable from './ScoreTable';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

export const ScorecardPage: React.FC = () => {
  const router = useRouter();
  const { id: tournamentId, matchId } = router.query;

  const {
    match,
    scores,
    error,
    isLoading,
    isSaving,
    saveError,
    lockStatus,
    showPasswordModal,
    passwordInput,
    handleScoreChange,
    saveScores,
    toggleLock,
    setShowPasswordModal,
    setPasswordInput,
    verifyPasswordAndLock,
    refreshMatch,
  } = useScorecardState(matchId as string);

  // Navigate to player assignments
  const goToPlayerAssignments = () => {
    router.push(`/tournaments/${tournamentId}/matches/${matchId}/players`);
  };

  // Handle printing
  const handlePrint = () => {
    window.print();
  };

  // Determine if match has front/back nine
  const shouldShowFrontNine = () => {
    if (!match) return true;
    if (match.startingHole === 1) return true;
    return false;
  };
  
  const shouldShowBackNine = () => {
    if (!match) return false;
    if (match.startingHole === 10) return true;
    if (match.holeCount === 18) return true;
    return false;
  };

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading match: {error.message}
        </div>
      </div>
    );
  }

  if (isLoading || !match) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-1/3 mb-4 rounded"></div>
          <div className="bg-gray-200 h-24 rounded mb-4"></div>
          <div className="bg-gray-200 h-64 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Match Scorecard | {match.format}</title>
      </Head>

      <div className="container mx-auto p-4">
        <ScorecardHeader
          tournamentId={tournamentId as string}
          matchId={matchId as string}
          match={match}
          lockStatus={lockStatus}
          toggleLock={toggleLock}
          onPrint={handlePrint}
          onRefresh={refreshMatch}
          isSaving={isSaving}
          onGoToPlayerAssignments={goToPlayerAssignments}
        />

        {/* Players section */}
        <div className="bg-white shadow-md rounded-lg p-4 mb-6 print:shadow-none print:border print:border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Players</h3>
            <button
              onClick={goToPlayerAssignments}
              className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center print:hidden"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
              Edit Players
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-600 mb-1">{match.homeTeam}</h4>
              <ul className="list-disc list-inside text-sm">
                {match.homePlayers && match.homePlayers.length > 0 ? (
                  match.homePlayers.map((player: any) => (
                    <li key={player.id} className="mb-1">
                      {player.name}{' '}
                      <span className="text-gray-500">
                        ({player.handicapIndex.toFixed(1)})
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">No players assigned</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-red-600 mb-1">{match.awayTeam}</h4>
              <ul className="list-disc list-inside text-sm">
                {match.awayPlayers && match.awayPlayers.length > 0 ? (
                  match.awayPlayers.map((player: any) => (
                    <li key={player.id} className="mb-1">
                      {player.name}{' '}
                      <span className="text-gray-500">
                        ({player.handicapIndex.toFixed(1)})
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">No players assigned</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Score entry section */}
        <div className="bg-white shadow-md rounded-lg p-4 mb-6 overflow-hidden print:shadow-none print:border print:border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Score Entry</h3>
            <div className="print:hidden">
              <button
                onClick={saveScores}
                disabled={isSaving || lockStatus}
                className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Scores'}
              </button>
            </div>
          </div>

          {saveError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded print:hidden">
              {saveError}
            </div>
          )}

          {/* Front Nine */}
          {shouldShowFrontNine() && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Front Nine</h4>
              <ScoreTable
                match={match}
                scores={scores}
                holes={match.holes.filter((h: any) => h.number <= 9)}
                onScoreChange={handleScoreChange}
                lockStatus={lockStatus}
                isFrontNine={true}
              />
            </div>
          )}

          {/* Back Nine */}
          {shouldShowBackNine() && (
            <div>
              <h4 className="font-medium mb-2">Back Nine</h4>
              <ScoreTable
                match={match}
                scores={scores}
                holes={match.holes.filter((h: any) => h.number > 9)}
                onScoreChange={handleScoreChange}
                lockStatus={lockStatus}
                isFrontNine={false}
              />
            </div>
          )}
        </div>

        {/* Match Points Summary */}
        {match.points && (
          <div className="bg-white shadow-md rounded-lg p-4 mb-6 print:shadow-none print:border print:border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Match Points</h3>
            <div className="flex justify-center space-x-12 text-center">
              <div>
                <div className="text-blue-600 font-medium mb-1">{match.homeTeam}</div>
                <div className="text-3xl font-bold">{match.points.homeTeamPoints}</div>
              </div>
              <div>
                <div className="text-red-600 font-medium mb-1">{match.awayTeam}</div>
                <div className="text-3xl font-bold">{match.points.awayTeamPoints}</div>
              </div>
            </div>
          </div>
        )}

        {/* Related Matches in Foursome */}
        {match.foursomeMatches && match.foursomeMatches.length > 0 && (
          <div className="bg-white shadow-md rounded-lg p-4 mb-6 print:shadow-none print:border print:border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Other Matches in Foursome</h3>
            <div className="space-y-3">
              {match.foursomeMatches.map((m: any) => (
                <div key={m.id} className="border-b pb-2 last:border-0">
                  <div className="flex justify-between">
                    <div className="text-blue-600">
                      {m.homePlayers.map((p: any) => p.name).join(' / ')}
                    </div>
                    <div className="text-gray-600">vs</div>
                    <div className="text-red-600">
                      {m.awayPlayers.map((p: any) => p.name).join(' / ')}
                    </div>
                  </div>
                  {m.result && (
                    <div className="text-sm text-gray-600 mt-1 text-center">
                      {m.result}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Password Modal */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        passwordInput={passwordInput}
        onPasswordChange={setPasswordInput}
        onSubmit={verifyPasswordAndLock}
      />
    </>
  );
};

export default ScorecardPage;