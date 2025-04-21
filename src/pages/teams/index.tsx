import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import axios from 'axios';
import { UserGroupIcon, UsersIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function Teams() {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  // Fetch teams from API
  const { data, error, isLoading, mutate } = useSWR(
    '/api/teams',
    fetcher,
    {
      // Just use dummy data for demonstration since we haven't built this endpoint yet
      fallbackData: {
        teams: [
          { 
            id: '1', 
            name: 'Spartan Dawgs', 
            players: [
              { id: '1', name: 'James Miller', handicapIndex: 16.0 },
              { id: '2', name: 'Tom Wilson', handicapIndex: 12.4 },
              { id: '3', name: 'Steve Adams', handicapIndex: 8.0 },
              { id: '4', name: 'Brian Taylor', handicapIndex: 14.2 },
              { id: '5', name: 'Kevin Brown', handicapIndex: 10.5 },
              { id: '6', name: 'Mark Johnson', handicapIndex: 7.8 },
            ],
            tournament: { id: '1', name: 'Spring Classic 2025' }
          },
          { 
            id: '2', 
            name: 'Invited Guests', 
            players: [
              { id: '7', name: 'Dan Johnson', handicapIndex: 7.8 },
              { id: '8', name: 'Mike Smith', handicapIndex: 10.2 },
              { id: '9', name: 'Chris Davis', handicapIndex: 12.8 },
              { id: '10', name: 'Bob Martin', handicapIndex: 11.2 },
              { id: '11', name: 'Alex Robinson', handicapIndex: 9.3 },
              { id: '12', name: 'Dave Wilson', handicapIndex: 15.6 },
            ],
            tournament: { id: '1', name: 'Spring Classic 2025' }
          },
        ]
      }
    }
  );

  // Filter teams by search term
  const filteredTeams = data?.teams ? data.teams.filter((team: any) => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.tournament?.name && team.tournament.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];
  
  // Replace fallback data with API call
  useEffect(() => {
    // If fallback data is being used, attempt to fetch real data
    const fetchTeams = async () => {
      try {
        console.log('Fetching teams data from API...');
        
        // Include auth token in headers
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get('/api/teams', { headers });
        console.log('Teams API response:', response.data);
        
        if (response.data) {
          // Check if data is already in expected format
          if (Array.isArray(response.data.teams)) {
            mutate({ teams: response.data.teams }, false);
          } else if (Array.isArray(response.data)) {
            // If data is an array, wrap it
            mutate({ teams: response.data }, false);
          } else {
            console.error('Unexpected teams data format:', response.data);
            // Keep using fallback data
          }
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    };
    
    fetchTeams();
  }, [mutate]);

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team? This will also delete all associated players.')) return;

    try {
      // Call the API to delete the team
      await axios.delete(`/api/teams/${id}`);
      
      // Update the client-side cache
      const updatedTeams = data.teams.filter((team: any) => team.id !== id);
      mutate({ teams: updatedTeams }, false);
      
      alert('Team deleted successfully');
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team');
    }
  };

  return (
    <>
      <Head>
        <title>Teams | Gull Lake Golf Tournament</title>
      </Head>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold leading-6 text-gray-900">Teams</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all teams participating in tournaments.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              onClick={() => router.push('/teams/new')}
              className="btn-primary"
            >
              Add Team
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-8">
          <div className="flex flex-1 items-center justify-between">
            <div>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  placeholder="Search teams..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Team Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full text-center p-12">Loading teams...</div>
          ) : error ? (
            <div className="col-span-full text-center p-12 text-red-500">Error loading teams</div>
          ) : filteredTeams.length === 0 ? (
            <div className="col-span-full text-center p-12">No teams found</div>
          ) : (
            filteredTeams.map((team: any) => (
              <div key={team.id} className="card">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {team.name === 'Spartan Dawgs' ? 
                      <span className="text-forest-green">Spartan Dawgs</span> : 
                      team.name
                    }
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => router.push(`/tournaments/${team.tournament.id}/teams/${team.id}/edit`)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <PencilIcon className="h-5 w-5" />
                      <span className="sr-only">Edit Team</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <TrashIcon className="h-5 w-5" />
                      <span className="sr-only">Delete</span>
                    </button>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <UserGroupIcon className="h-5 w-5 text-gray-400 mr-1.5" />
                  <span>Tournament: {team.tournament.name}</span>
                </div>
                
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <UsersIcon className="h-5 w-5 text-gray-400 mr-1.5" />
                  <span>{team.players.length} Players</span>
                </div>
                
                <div className="mt-4 space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Players</h4>
                  <ul className="divide-y divide-gray-200">
                    {team.players.slice(0, 4).map((player: any) => (
                      <li key={player.id} className="py-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900">{player.name}</span>
                          <span className="text-gray-500">HC: {player.handicapIndex.toFixed(1)}</span>
                        </div>
                      </li>
                    ))}
                    {team.players.length > 4 && (
                      <li className="py-1.5 text-sm text-gray-500">
                        +{team.players.length - 4} more players
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}