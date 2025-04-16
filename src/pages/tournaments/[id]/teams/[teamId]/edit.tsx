import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EditTeam() {
  const router = useRouter();
  const { id: tournamentId, teamId } = router.query;
  
  // Handle undefined tournamentId from teams page
  const handleBackNavigation = () => {
    if (tournamentId === 'undefined' || !tournamentId) {
      router.push('/teams');
    } else {
      router.push(`/tournaments/${tournamentId}`);
    }
  };
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  type TeamPlayer = {
    id: string;
    name: string;
    handicapIndex: number;
  };
  
  interface EditableTeam {
    id: string;
    name: string;
    tournamentId: string;
    isHomeTeam: boolean; // New field to handle home/away designation
    players: TeamPlayer[];
  }
  
  const [team, setTeam] = useState<EditableTeam>({
    id: '',
    name: '',
    tournamentId: '',
    isHomeTeam: false,
    players: []
  });
  
  // Fetch team data
  useEffect(() => {
    if (!tournamentId || !teamId) return;
    
    const fetchTeam = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/api/teams/${teamId}`);
        
        if (response.data && response.data.team) {
          // Parse metadata to get isHomeTeam property
          const teamData = response.data.team;
          let isHomeTeam = false;
          
          // Try to get isHomeTeam from metadata
          if (teamData.metadata) {
            try {
              const metadata = typeof teamData.metadata === 'string' 
                ? JSON.parse(teamData.metadata) 
                : teamData.metadata;
              isHomeTeam = metadata?.isHomeTeam === true;
            } catch (err) {
              console.error('Error parsing team metadata:', err);
            }
          }
          
          setTeam({
            ...teamData,
            isHomeTeam
          });
        }
      } catch (err) {
        console.error('Error fetching team:', err);
        setError('Failed to load team data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeam();
  }, [tournamentId, teamId]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setTeam({
      ...team,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      await axios.put(`/api/teams/${teamId}`, {
        name: team.name,
        isHomeTeam: team.isHomeTeam
      });
      
      // Redirect back to appropriate page
      handleBackNavigation();
    } catch (err) {
      console.error('Error updating team:', err);
      setError('Failed to update team');
      setIsLoading(false);
    }
  };
  
  if (isLoading && !team.id) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Edit Team | Gull Lake Golf Tournament</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <div className="mb-6">
            <button 
              onClick={handleBackNavigation}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="mr-1 h-4 w-4" />
              {tournamentId && tournamentId !== 'undefined' ? 'Back to Tournament' : 'Back to Teams'}
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Team</h1>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Team Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Team Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={team.name}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
                
                {/* Home Team Designation */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isHomeTeam"
                    name="isHomeTeam"
                    checked={team.isHomeTeam}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="isHomeTeam" className="ml-2 block text-sm text-gray-700">
                    Designate as Home Team
                  </label>
                </div>
                
                <div className="pt-4 flex justify-end space-x-3">
                  <button
                    onClick={handleBackNavigation}
                    type="button"
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
          
          {/* Team Players Section */}
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Team Players</h2>
              <Link 
                href={`/tournaments/${tournamentId}/teams/${teamId}/add-player`}
                className="btn-secondary btn-sm"
              >
                Add Player
              </Link>
            </div>
            
            {team.players && team.players.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {team.players.map((player) => (
                  <li key={player.id} className="py-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{player.name}</p>
                      <p className="text-xs text-gray-500">Handicap: {player.handicapIndex}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Link 
                        href={`/players/${player.id}/edit`}
                        className="text-sm font-medium text-primary hover:text-primary/80"
                      >
                        Edit
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No players in this team yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}