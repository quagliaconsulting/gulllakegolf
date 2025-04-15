import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeftIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SelectOption } from '../../../types/models';

export default function NewTeam() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tournaments, setTournaments] = useState<SelectOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    tournamentId: '',
    players: [{ name: '', email: '', handicapIndex: '' }]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch tournaments for the dropdown
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        // Fetch data from the API
        const response = await axios.get('/api/tournaments', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        // Set tournaments from response
        if (Array.isArray(response.data)) {
          setTournaments(response.data);
        } else {
          console.error('Unexpected response format:', response.data);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        // Fallback to demo data if API fails
        // No tournaments available - don't use fallback data
        setTournaments([]);
      }
    };

    fetchTournaments();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePlayerChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newPlayers = [...formData.players];
    newPlayers[index] = { ...newPlayers[index], [name]: value };
    setFormData(prev => ({ ...prev, players: newPlayers }));
    
    // Clear error
    const errorKey = `players.${index}.${name}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const addPlayer = () => {
    setFormData(prev => ({
      ...prev,
      players: [...prev.players, { name: '', email: '', handicapIndex: '' }]
    }));
  };

  const removePlayer = (index: number) => {
    if (formData.players.length === 1) {
      return; // Keep at least one player field
    }

    setFormData(prev => ({
      ...prev,
      players: prev.players.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    }
    
    if (!formData.tournamentId) {
      newErrors.tournamentId = 'Please select a tournament';
    }
    
    formData.players.forEach((player, index) => {
      if (!player.name.trim()) {
        newErrors[`players.${index}.name`] = 'Player name is required';
      }
      
      if (player.handicapIndex) {
        const handicap = parseFloat(player.handicapIndex as string);
        if (isNaN(handicap) || handicap < 0 || handicap > 54) {
          newErrors[`players.${index}.handicapIndex`] = 'Handicap must be between 0 and 54';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format the data for the API
      const formattedData = {
        ...formData,
        players: formData.players.map(player => ({
          ...player,
          handicapIndex: player.handicapIndex ? parseFloat(player.handicapIndex as string) : 0
        }))
      };
      
      // Submit to the API
      const response = await axios.post('/api/teams', formattedData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Team created:', response.data);
      alert('Team created successfully!');
      router.push('/teams');
    } catch (error: any) {
      console.error('Error creating team:', error);
      alert(error.response?.data?.error || 'Failed to create team. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create New Team | Gull Lake Golf Tournament</title>
      </Head>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/teams" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Teams
          </Link>
        </div>

        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Create New Team
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                    Team Name
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                        errors.name ? 'ring-red-500' : 'ring-gray-300'
                      } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6`}
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="tournamentId" className="block text-sm font-medium leading-6 text-gray-900">
                    Tournament
                  </label>
                  <div className="mt-2">
                    <select
                      id="tournamentId"
                      name="tournamentId"
                      value={formData.tournamentId}
                      onChange={handleChange}
                      className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                        errors.tournamentId ? 'ring-red-500' : 'ring-gray-300'
                      } focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6`}
                    >
                      <option value="">Select a tournament</option>
                      {tournaments.map((tournament: any) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.name}
                        </option>
                      ))}
                    </select>
                    {errors.tournamentId && (
                      <p className="mt-2 text-sm text-red-600">{errors.tournamentId}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div>
                <h3 className="text-base font-semibold leading-6 text-gray-900">Team Players</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add players to your team. You can add more players later.
                </p>
                
                <div className="mt-5 space-y-4">
                  {formData.players.map((player, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg relative">
                      <div className="absolute top-4 right-4">
                        <button
                          type="button"
                          onClick={() => removePlayer(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <XMarkIcon className="h-5 w-5" />
                          <span className="sr-only">Remove player</span>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label htmlFor={`player-${index}-name`} className="block text-sm font-medium text-gray-700">
                            Name
                          </label>
                          <input
                            type="text"
                            id={`player-${index}-name`}
                            name="name"
                            value={player.name}
                            onChange={(e) => handlePlayerChange(index, e)}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                              errors[`players.${index}.name`] ? 'border-red-500' : ''
                            }`}
                          />
                          {errors[`players.${index}.name`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`players.${index}.name`]}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor={`player-${index}-email`} className="block text-sm font-medium text-gray-700">
                            Email <span className="text-gray-400">(Optional)</span>
                          </label>
                          <input
                            type="email"
                            id={`player-${index}-email`}
                            name="email"
                            value={player.email}
                            onChange={(e) => handlePlayerChange(index, e)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor={`player-${index}-handicap`} className="block text-sm font-medium text-gray-700">
                            Handicap Index
                          </label>
                          <input
                            type="text"
                            id={`player-${index}-handicap`}
                            name="handicapIndex"
                            value={player.handicapIndex}
                            onChange={(e) => handlePlayerChange(index, e)}
                            placeholder="e.g. 14.2"
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                              errors[`players.${index}.handicapIndex`] ? 'border-red-500' : ''
                            }`}
                          />
                          {errors[`players.${index}.handicapIndex`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`players.${index}.handicapIndex`]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addPlayer}
                    className="flex w-full items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" />
                    Add Player
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/teams"
              className="rounded-md px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ml-3 inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
            >
              {isSubmitting ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}