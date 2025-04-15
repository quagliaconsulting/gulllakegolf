import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import useSWR from 'swr';
import { ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function AssignPlayers() {
  const router = useRouter();
  const { id, matchId } = router.query;
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch match data
  const { data, error: fetchError, isLoading, mutate } = useSWR(
    matchId ? `/api/matches/${matchId}/players` : null,
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  // Set initial selections when data loads
  useEffect(() => {
    if (data) {
      setSelectedHomePlayers(data.homePlayers.map((p: any) => p.id));
      setSelectedAwayPlayers(data.awayPlayers.map((p: any) => p.id));
    }
  }, [data]);

  // Handle player selection
  const toggleHomePlayer = (playerId: string) => {
    setSelectedHomePlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const toggleAwayPlayer = (playerId: string) => {
    setSelectedAwayPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!data) return;
    
    // Validate based on match format
    if (data.isPairsFormat) {
      // For pairs formats, we need exactly 2 players per team
      if (selectedHomePlayers.length !== 2 || selectedAwayPlayers.length !== 2) {
        setError('Pairs formats require exactly 2 players per team');
        return;
      }
    } else if (data.isFourManTeam) {
      // For 4-man team format, we need 4 players per team
      if (selectedHomePlayers.length !== 4 || selectedAwayPlayers.length !== 4) {
        setError('4-Man Team format requires exactly 4 players per team');
        return;
      }
    } else if (data.isSingles) {
      // For singles, we need exactly 1 player per team
      if (selectedHomePlayers.length !== 1 || selectedAwayPlayers.length !== 1) {
        setError('Singles format requires exactly 1 player per team');
        return;
      }
    }
    
    setError(null);
    setSaving(true);
    
    try {
      // Submit player selections
      await axios.post(`/api/matches/${matchId}/players`, {
        homePlayers: selectedHomePlayers,
        awayPlayers: selectedAwayPlayers
      });
      
      setSaved(true);
      mutate(); // Refresh data
      
      // Reset after 3 seconds
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      console.error('Error assigning players:', err);
      setError('Failed to assign players. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate required players based on format
  const getRequiredPlayers = () => {
    if (!data) return 0;
    if (data.isPairsFormat) return 2;
    if (data.isFourManTeam) return 4;
    if (data.isSingles) return 1;
    return 0;
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading match details...</div>;
  }

  if (fetchError) {
    return <div className="p-8 text-center text-red-600">Error loading match. Please try again.</div>;
  }

  if (!data) {
    return <div className="p-8 text-center">Match not found</div>;
  }

  return (
    <>
      <Head>
        <title>Assign Players | {data.format} Match</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href={`/tournaments/${id}`} className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Tournament
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Assign Players</h1>
          <p className="mt-2 text-sm text-gray-700">
            {data.format} - {data.homeTeam} vs {data.awayTeam}
          </p>
          <p className="mt-1 text-sm font-medium text-blue-600">
            {data.isPairsFormat && "Select exactly 2 players per team"}
            {data.isFourManTeam && "Select exactly 4 players per team"}
            {data.isSingles && "Select exactly 1 player per team"}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
            {/* Home Team */}
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
              <div className="px-4 py-5 bg-blue-50 sm:px-6">
                <h2 className="text-lg font-medium leading-6 text-gray-900">{data.homeTeam}</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Select {getRequiredPlayers()} players for this match
                </p>
              </div>
              <ul className="divide-y divide-gray-200">
                {data.allHomePlayers.map((player: any) => (
                  <li key={player.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id={`home-${player.id}`}
                          name={`home-${player.id}`}
                          type="checkbox"
                          checked={selectedHomePlayers.includes(player.id)}
                          onChange={() => toggleHomePlayer(player.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor={`home-${player.id}`} className="ml-3 flex items-center">
                          <div className="text-sm font-medium text-gray-900">{player.name}</div>
                          <div className="text-sm text-gray-500 ml-2">(Handicap: {player.handicapIndex})</div>
                        </label>
                      </div>
                      {selectedHomePlayers.includes(player.id) && (
                        <div className="text-primary">
                          <CheckCircleIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {data.allHomePlayers.length === 0 && (
                  <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                    No players available in this team
                  </li>
                )}
              </ul>
            </div>

            {/* Away Team */}
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
              <div className="px-4 py-5 bg-red-50 sm:px-6">
                <h2 className="text-lg font-medium leading-6 text-gray-900">{data.awayTeam}</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Select {getRequiredPlayers()} players for this match
                </p>
              </div>
              <ul className="divide-y divide-gray-200">
                {data.allAwayPlayers.map((player: any) => (
                  <li key={player.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id={`away-${player.id}`}
                          name={`away-${player.id}`}
                          type="checkbox"
                          checked={selectedAwayPlayers.includes(player.id)}
                          onChange={() => toggleAwayPlayer(player.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor={`away-${player.id}`} className="ml-3 flex items-center">
                          <div className="text-sm font-medium text-gray-900">{player.name}</div>
                          <div className="text-sm text-gray-500 ml-2">(Handicap: {player.handicapIndex})</div>
                        </label>
                      </div>
                      {selectedAwayPlayers.includes(player.id) && (
                        <div className="text-primary">
                          <CheckCircleIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {data.allAwayPlayers.length === 0 && (
                  <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                    No players available in this team
                  </li>
                )}
              </ul>
            </div>
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
                'Assign Players'
              )}
            </button>
            
            {saved && (
              <span className="text-sm font-medium text-green-600">
                Players assigned successfully!
              </span>
            )}
          </div>
        </form>
      </div>
    </>
  );
}