import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import axios from 'axios';
import { UserCircleIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function Players() {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const [isCreatingDummy, setIsCreatingDummy] = useState(false);

  // Fetch players from API
  const { data, error, isLoading, mutate } = useSWR(
    '/api/players',
    fetcher,
    {
      fallbackData: {
        players: []
      }
    }
  );
  
  // Replace fallback data with API call
  useEffect(() => {
    // Helper function to set empty players list
    const setEmptyPlayers = () => {
      console.log('No players found. Try running the create dummy tournament endpoint.');
      // Empty players list
      mutate({ 
        players: []
      }, false);
    };
    
    // If no data, attempt to fetch real data
    const fetchPlayers = async () => {
      try {
        console.log('Fetching players data from API...');
        
        // Include auth token in headers - bypassing for development
        // const token = localStorage.getItem('token');
        // const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Force cache busting with timestamp
        const timestamp = new Date().getTime();
        const response = await axios.get(`/api/players?t=${timestamp}`, { 
          // headers 
        });
        
        console.log('API response:', response.data);
        
        if (response.data) {
          // Check if data is already in expected format
          if (response.data.success && Array.isArray(response.data.data?.players)) {
            console.log(`Found ${response.data.data.players.length} players in API response`);
            mutate({ players: response.data.data.players }, false);
          } else if (Array.isArray(response.data.players)) {
            console.log(`Found ${response.data.players.length} players in API response`);
            mutate({ players: response.data.players }, false);
          } else if (Array.isArray(response.data)) {
            // If data is an array, wrap it
            console.log(`Found ${response.data.length} players in array format`);
            mutate({ players: response.data }, false);
          } else {
            console.error('Unexpected data format:', response.data);
            setEmptyPlayers();
          }
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        setEmptyPlayers();
      }
    };
    
    fetchPlayers();
  }, [mutate]);

  // Filter players by search term with safety checks
  const filteredPlayers = data?.players
    ? data.players.filter((player: any) => {
        const playerName = player?.name?.toLowerCase() || '';
        const teamName = player?.team?.name?.toLowerCase() || '';
        const searchLower = searchTerm.toLowerCase();
        
        return playerName.includes(searchLower) || teamName.includes(searchLower);
      })
    : [];

  const handleDeletePlayer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this player?')) return;

    try {
      // Call the API to delete the player
      await axios.delete(`/api/players/${id}`);
      
      // Update the client-side cache
      const updatedPlayers = data.players.filter((player: any) => player.id !== id);
      mutate({ players: updatedPlayers }, false);
      
      alert('Player deleted successfully');
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Failed to delete player');
    }
  };

  const createDummyTournament = async () => {
    if (!confirm('This will create a new dummy tournament with sample data. Continue?')) {
      return;
    }
    
    try {
      setIsCreatingDummy(true);
      const response = await fetch('/api/dev/create-dummy-tournament', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Created dummy tournament: ${result.data.tournamentName} with ${result.data.playersCreated} players. Refresh the page to see them.`);
        mutate(); // Refresh the data
      } else {
        const error = await response.json();
        alert(`Error creating dummy tournament: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating dummy tournament:', error);
      alert('Failed to create dummy tournament. See console for details.');
    } finally {
      setIsCreatingDummy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Players | Gull Lake Golf Tournament</title>
      </Head>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold leading-6 text-gray-900">Players</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all players including their handicap index and team assignment.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex space-x-3">
            <Link
              href="/players/new"
              passHref
              legacyBehavior={false}
              className="btn-primary"
            >
              Add Player
            </Link>

            {/* Only show in development mode */}
            {process.env.NODE_ENV !== 'production' && (
              <button
                onClick={createDummyTournament}
                disabled={isCreatingDummy}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {isCreatingDummy ? 'Creating...' : 'Create Dummy Tournament'}
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-8">
          <div className="flex flex-1 items-center justify-between">
            <div>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  placeholder="Search players..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Player List */}
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Handicap Index
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Team
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center">Loading players...</td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-red-500">Error loading players</td>
                      </tr>
                    ) : filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center">
                          No players found.
                          {process.env.NODE_ENV !== 'production' && (
                            <div className="mt-2">
                              <button 
                                onClick={createDummyTournament}
                                className="text-primary hover:text-primary-dark"
                              >
                                Create a dummy tournament with players
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((player: any) => (
                        <tr key={player.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            <div className="flex items-center">
                              <UserCircleIcon className="h-10 w-10 flex-shrink-0 text-gray-300" />
                              <div className="ml-4">
                                <div className="font-medium text-gray-900">{player.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {typeof player.handicapIndex === 'number' 
                              ? player.handicapIndex.toFixed(1) 
                              : (player.handicapIndex || 'N/A')}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {player.team ? (
                              player.team.name === 'Spartan Dawgs' ? 
                                <span className="text-forest-green font-medium">Spartan Dawgs</span> : 
                                player.team.name
                            ) : (
                              <span className="text-gray-400">Not assigned</span>
                            )}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              href={`/players/${player.id}/edit`}
                              passHref
                              legacyBehavior={false}
                              className="text-primary hover:text-primary/80 mr-4 inline-block"
                            >
                              <PencilIcon className="h-5 w-5" />
                              <span className="sr-only">Edit</span>
                            </Link>
                            <button
                              onClick={() => handleDeletePlayer(player.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="h-5 w-5" />
                              <span className="sr-only">Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}