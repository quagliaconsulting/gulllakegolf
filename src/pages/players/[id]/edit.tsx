import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import { ArrowLeftIcon, ArrowPathIcon, UserCircleIcon } from '@heroicons/react/24/outline';

type PlayerFormData = {
  id: string;
  name: string;
  handicapIndex: string;
  teamId: string;
  email?: string;
  phone?: string;
};

export default function EditPlayer() {
  const router = useRouter();
  const { id } = router.query;
  const [playerData, setPlayerData] = useState<PlayerFormData | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Fetch player data when ID is available
  useEffect(() => {
    if (id) {
      const fetchPlayerData = async () => {
        try {
          const response = await axios.get(`/api/players/${id}`);
          if (response.data && response.data.player) {
            const player = response.data.player;
            setPlayerData({
              id: player.id,
              name: player.name,
              handicapIndex: player.handicapIndex.toString(),
              teamId: player.teamId,
              email: player.email || '',
              phone: player.phone || ''
            });
          }
        } catch (err) {
          console.error('Error fetching player:', err);
          setError('Failed to load player data. Please try again.');
        }
      };

      fetchPlayerData();
    }
  }, [id]);

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

  const handleInputChange = (field: keyof PlayerFormData, value: string) => {
    if (playerData) {
      setPlayerData({
        ...playerData,
        [field]: value
      });
    }
    // Reset saved state when making changes
    setIsSaved(false);
  };

  const validateForm = () => {
    if (!playerData) return false;
    
    if (!playerData.name || !playerData.teamId || !playerData.handicapIndex) {
      setError('Player must have a name, handicap index, and team.');
      return false;
    }
    
    // Validate handicap is a number
    if (isNaN(parseFloat(playerData.handicapIndex))) {
      setError('Handicap index must be a valid number.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !playerData) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await axios.put(`/api/players/${id}`, {
        name: playerData.name,
        handicapIndex: playerData.handicapIndex,
        teamId: playerData.teamId,
        email: playerData.email || undefined,
        phone: playerData.phone || undefined
      });
      
      setIsSaved(true);
      setLoading(false);
      
      // Auto-navigate back after brief delay
      setTimeout(() => {
        router.push('/players');
      }, 1500);
    } catch (err: any) {
      console.error('Error updating player:', err);
      setError(err.response?.data?.error || 'Failed to update player. Please try again.');
      setLoading(false);
    }
  };

  // Handle deleting player
  const handleDeletePlayer = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this player?')) {
      return;
    }

    setLoading(true);
    
    try {
      await axios.delete(`/api/players/${id}`);
      router.push('/players');
    } catch (err: any) {
      console.error('Error deleting player:', err);
      setError(err.response?.data?.error || 'Failed to delete player. Please try again.');
      setLoading(false);
    }
  };

  if (!playerData && !error) {
    return <div className="p-8 text-center">Loading player data...</div>;
  }

  return (
    <>
      <Head>
        <title>Edit Player | Gull Lake Golf Tournament</title>
      </Head>

      <div>
        <div className="mb-8">
          <Link href="/players" passHref legacyBehavior={false} className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Players
          </Link>
        </div>

        <div className="md:flex md:items-center md:justify-between md:space-x-5 mb-8">
          <div className="flex items-start space-x-5">
            <div className="flex-shrink-0">
              <div className="relative">
                <UserCircleIcon className="h-16 w-16 text-gray-300" aria-hidden="true" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {playerData?.name || 'Edit Player'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Update player information and team assignment.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
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

        {isSaved && (
          <div className="rounded-md bg-green-50 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Player updated successfully! Redirecting...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {playerData && (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  {/* Player Name */}
                  <div className="sm:col-span-3">
                    <label htmlFor="player-name" className="block text-sm font-medium text-gray-700">
                      Name *
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="player-name"
                        value={playerData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Handicap Index */}
                  <div className="sm:col-span-3">
                    <label htmlFor="player-handicap" className="block text-sm font-medium text-gray-700">
                      Handicap Index *
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        step="0.1"
                        id="player-handicap"
                        value={playerData.handicapIndex}
                        onChange={(e) => handleInputChange('handicapIndex', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Team */}
                  <div className="sm:col-span-3">
                    <label htmlFor="player-team" className="block text-sm font-medium text-gray-700">
                      Team *
                    </label>
                    <div className="mt-1">
                      <select
                        id="player-team"
                        value={playerData.teamId}
                        onChange={(e) => handleInputChange('teamId', e.target.value)}
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
                    <label htmlFor="player-email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        id="player-email"
                        value={playerData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="sm:col-span-3">
                    <label htmlFor="player-phone" className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <div className="mt-1">
                      <input
                        type="tel"
                        id="player-phone"
                        value={playerData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleDeletePlayer}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Player
              </button>
              
              <div className="flex space-x-3">
                <Link
                  href="/players"
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
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  );
}