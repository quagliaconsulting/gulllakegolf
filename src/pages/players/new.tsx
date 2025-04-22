import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import { ArrowLeftIcon, PlusIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

type PlayerFormData = {
  name: string;
  handicapIndex: string;
  teamId: string;
  email?: string;
  phone?: string;
};

const EmptyPlayer: PlayerFormData = {
  name: '',
  handicapIndex: '',
  teamId: '',
  email: '',
  phone: ''
};

export default function NewPlayer() {
  const router = useRouter();
  const { teamId, tournamentId } = router.query;
  const [players, setPlayers] = useState<PlayerFormData[]>([{ ...EmptyPlayer }]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(0);

  // Set default teamId if provided in the URL
  useEffect(() => {
    if (teamId && players[0].teamId === '') {
      const updatedPlayers = [...players];
      updatedPlayers[0] = {
        ...updatedPlayers[0],
        teamId: teamId as string
      };
      setPlayers(updatedPlayers);
    }
  }, [teamId, players]);

  // Fetch teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await axios.get('/api/teams');
        if (response.data && response.data.teams) {
          setTeams(response.data.teams);
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load teams. Please try again.');
      }
    };

    fetchTeams();
  }, []);

  const handleInputChange = (index: number, field: keyof PlayerFormData, value: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = {
      ...updatedPlayers[index],
      [field]: value
    };
    setPlayers(updatedPlayers);
  };

  const addPlayerForm = () => {
    setPlayers([...players, { ...EmptyPlayer }]);
  };

  const removePlayerForm = (index: number) => {
    if (players.length === 1) {
      // If there's only one form, just reset it
      setPlayers([{ ...EmptyPlayer }]);
    } else {
      // Remove the specified form
      const updatedPlayers = players.filter((_, i) => i !== index);
      setPlayers(updatedPlayers);
    }
  };

  const validateForm = () => {
    // Validate at least one player has required fields
    for (const player of players) {
      if (!player.name || !player.teamId || !player.handicapIndex) {
        setError('Each player must have a name, handicap index, and team.');
        return false;
      }
      
      // Validate handicap is a number
      if (isNaN(parseFloat(player.handicapIndex))) {
        setError('Handicap index must be a valid number.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccessCount(0);
    
    try {
      // Submit each player in sequence
      for (const player of players) {
        await axios.post('/api/players', {
          name: player.name,
          handicapIndex: player.handicapIndex,
          teamId: player.teamId,
          email: player.email || undefined,
          phone: player.phone || undefined
        });
        setSuccessCount(prev => prev + 1);
      }
      
      // Navigate back after successful submission
      setTimeout(() => {
        if (tournamentId && tournamentId !== 'undefined') {
          router.push(`/tournaments/${tournamentId}/teams/${teamId}/edit`);
        } else {
          router.push('/players');
        }
      }, 1000);
    } catch (err: any) {
      console.error('Error creating player(s):', err);
      setError(err.response?.data?.error || 'Failed to create player(s). Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Add New Player | Gull Lake Golf Tournament</title>
      </Head>

      <div>
        <div className="mb-8">
          <Link 
            href={tournamentId && tournamentId !== 'undefined' 
              ? `/tournaments/${tournamentId}/teams/${teamId}/edit` 
              : '/players'} 
            passHref 
            legacyBehavior={false} 
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> 
            {tournamentId && tournamentId !== 'undefined' ? 'Back to Team' : 'Back to Players'}
          </Link>
        </div>

        <div className="md:flex md:items-center md:justify-between md:space-x-5 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Players</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create new player profiles and assign them to teams.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Player Forms */}
          {players.map((player, index) => (
            <div key={index} className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Player {index + 1}
                  </h3>
                  {players.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePlayerForm(index)}
                      className="inline-flex items-center text-sm text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  {/* Player Name */}
                  <div className="sm:col-span-3">
                    <label htmlFor={`player-${index}-name`} className="block text-sm font-medium text-gray-700">
                      Name *
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id={`player-${index}-name`}
                        value={player.name}
                        onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Handicap Index */}
                  <div className="sm:col-span-3">
                    <label htmlFor={`player-${index}-handicap`} className="block text-sm font-medium text-gray-700">
                      Handicap Index *
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        step="0.1"
                        id={`player-${index}-handicap`}
                        value={player.handicapIndex}
                        onChange={(e) => handleInputChange(index, 'handicapIndex', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Team */}
                  <div className="sm:col-span-3">
                    <label htmlFor={`player-${index}-team`} className="block text-sm font-medium text-gray-700">
                      Team *
                    </label>
                    <div className="mt-1">
                      <select
                        id={`player-${index}-team`}
                        value={player.teamId}
                        onChange={(e) => handleInputChange(index, 'teamId', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        required
                      >
                        <option value="">Select a team</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="sm:col-span-3">
                    <label htmlFor={`player-${index}-email`} className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        id={`player-${index}-email`}
                        value={player.email}
                        onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="sm:col-span-3">
                    <label htmlFor={`player-${index}-phone`} className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <div className="mt-1">
                      <input
                        type="tel"
                        id={`player-${index}-phone`}
                        value={player.phone}
                        onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Another Player Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={addPlayerForm}
              className="inline-flex items-center px-4 py-2 border border-primary text-sm font-medium rounded-md text-primary bg-white hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Add Another Player
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successCount > 0 && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Created {successCount} of {players.length} players</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <Link
              href={tournamentId && tournamentId !== 'undefined' 
                ? `/tournaments/${tournamentId}/teams/${teamId}/edit` 
                : '/players'}
              passHref
              legacyBehavior={false}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Saving...
                </>
              ) : (
                'Save Players'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}