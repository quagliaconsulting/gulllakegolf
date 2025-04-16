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
    // If no data, attempt to fetch real data
    const fetchPlayers = async () => {
      try {
        console.log('Fetching players data from API...');
        
        // Include auth token in headers
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get('/api/players', { headers });
        console.log('API response:', response.data);
        
        if (response.data) {
          // Check if data is already in expected format
          if (Array.isArray(response.data.players)) {
            mutate({ players: response.data.players }, false);
          } else if (Array.isArray(response.data)) {
            // If data is an array, wrap it
            mutate({ players: response.data }, false);
          } else {
            console.error('Unexpected data format:', response.data);
            useFallbackData();
          }
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        useFallbackData();
      }
    };
    
    const useFallbackData = () => {
      console.log('Using fallback player data');
      // Fallback to dummy data if API call fails
      mutate({ 
        players: [
          { id: '1', name: 'James Miller', handicapIndex: 16.0, team: { name: 'Spartan Dawgs' } },
          { id: '2', name: 'Tom Wilson', handicapIndex: 12.4, team: { name: 'Spartan Dawgs' } },
          { id: '3', name: 'Steve Adams', handicapIndex: 8.0, team: { name: 'Spartan Dawgs' } },
          { id: '4', name: 'Brian Taylor', handicapIndex: 14.2, team: { name: 'Spartan Dawgs' } },
          { id: '5', name: 'Kevin Brown', handicapIndex: 10.5, team: { name: 'Spartan Dawgs' } },
          { id: '6', name: 'Mark Johnson', handicapIndex: 7.8, team: { name: 'Spartan Dawgs' } },
          { id: '7', name: 'Dan Johnson', handicapIndex: 7.8, team: { name: 'Invited Guests' } },
          { id: '8', name: 'Mike Smith', handicapIndex: 10.2, team: { name: 'Invited Guests' } },
          { id: '9', name: 'Chris Davis', handicapIndex: 12.8, team: { name: 'Invited Guests' } },
          { id: '10', name: 'Bob Martin', handicapIndex: 11.2, team: { name: 'Invited Guests' } },
          { id: '11', name: 'Alex Robinson', handicapIndex: 9.3, team: { name: 'Invited Guests' } },
          { id: '12', name: 'Dave Wilson', handicapIndex: 15.6, team: { name: 'Invited Guests' } },
        ]
      }, false);
    };
    
    fetchPlayers();
  }, [mutate]);

  // Filter players by search term
  const filteredPlayers = data?.players.filter((player: any) => 
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.team.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <Link
              href="/players/new"
              passHref
              legacyBehavior={false}
              className="btn-primary"
            >
              Add Player
            </Link>
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
                        <td colSpan={4} className="p-4 text-center">No players found</td>
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
                            {player.handicapIndex.toFixed(1)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {player.team.name === 'Spartan Dawgs' ? 
                              <span className="text-forest-green font-medium">Spartan Dawgs</span> : 
                              player.team.name
                            }
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