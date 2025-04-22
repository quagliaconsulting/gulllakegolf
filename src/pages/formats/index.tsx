import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';

interface Format {
  id: string;
  formatName: string;
  multiplier: number;
  isFourManTeam: boolean;
  tournamentId: string;
}

interface Tournament {
  id: string;
  name: string;
}

const FormatsPage: React.FC = () => {
  const router = useRouter();
  const [formats, setFormats] = useState<Format[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        // Add auth header to request
        const authHeader = {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        };
        
        const response = await axios.get('/api/tournaments', authHeader);
        let tournamentsData;
        
        // Handle different API response formats
        if (response.data.success && response.data.data) {
          // New format with success/data wrapper
          tournamentsData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        } else if (Array.isArray(response.data)) {
          // Old format (direct array)
          tournamentsData = response.data;
        } else {
          console.error('Unexpected tournaments response format:', response.data);
          tournamentsData = [];
        }
        
        console.log('Tournaments data:', tournamentsData);
        setTournaments(tournamentsData);
        
        // If tournaments exist, select the first one by default
        if (tournamentsData.length > 0) {
          setSelectedTournament(tournamentsData[0].id);
        }
      } catch (err) {
        setError('Failed to load tournaments');
        console.error(err);
      }
    };
    
    fetchTournaments();
  }, []);

  useEffect(() => {
    const fetchFormats = async () => {
      if (!selectedTournament) return;
      
      setLoading(true);
      try {
        // Add auth header to request
        const authHeader = {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        };
        
        const response = await axios.get(`/api/formats?tournamentId=${selectedTournament}`, authHeader);
        let formatsData;
        
        // Handle different API response formats
        if (response.data.success && response.data.data) {
          // New format with success/data wrapper
          formatsData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        } else if (Array.isArray(response.data)) {
          // Old format (direct array)
          formatsData = response.data;
        } else {
          console.error('Unexpected formats response format:', response.data);
          formatsData = [];
        }
        
        console.log('Formats data:', formatsData);
        setFormats(formatsData);
        setError(null);
      } catch (err) {
        setError('Failed to load formats');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFormats();
  }, [selectedTournament]);

  const handleTournamentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTournament(e.target.value);
  };

  const handleDeleteFormat = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this format?')) return;
    
    try {
      // Add auth header to request
      const authHeader = {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      };
      
      await axios.delete(`/api/formats?id=${id}`, authHeader);
      // Update formats list
      setFormats(formats.filter(format => format.id !== id));
    } catch (err: any) {
      if (err.response?.data?.error) {
        alert(err.response.data.error);
      } else {
        alert('Failed to delete format');
      }
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Golf Formats</h1>
        <Link 
          href="/formats/new" 
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Add New Format
        </Link>
      </div>
      
      <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Format Types Guide</h2>
        <ul className="list-disc ml-5 text-sm">
          <li className="mb-1"><span className="font-medium">Singles (1v1):</span> Individual matches with 100% handicap (multiplier = 1.0)</li>
          <li className="mb-1"><span className="font-medium">Best Ball / 2-Man Best Ball (2v2):</span> Average handicap × multiplier (multiplier = 0.9)</li>
          <li className="mb-1"><span className="font-medium">Scramble / 2-Man Scramble (2v2):</span> Average handicap × multiplier (multiplier = 0.4)</li>
          <li className="mb-1"><span className="font-medium">Alternate Shot / Mod Alt Shot (2v2):</span> Average handicap × multiplier (multiplier = 0.7)</li>
          <li className="mb-1"><span className="font-medium">Chapman (2v2):</span> Average handicap × multiplier (multiplier = 0.6)</li>
          <li className="mb-1"><span className="font-medium">4-Man Team:</span> Uses gross scoring only (no handicaps applied)</li>
        </ul>
        <p className="text-sm mt-2 text-blue-700">
          <strong>Pro Tip:</strong> For 9-hole formats, create separate tee times for Front 9 and Back 9 if using different formats.
        </p>
        <p className="text-sm mt-2 text-blue-700">
          <strong>Note:</strong> All handicap calculations (except Singles and 4-Man Team) use the average of player handicaps, then apply the format multiplier.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Tournament:
        </label>
        <select
          className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md"
          value={selectedTournament}
          onChange={handleTournamentChange}
        >
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading formats...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : formats.length === 0 ? (
        <p>No formats found for this tournament. Click "Add New Format" to create one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Format Name</th>
                <th className="py-2 px-4 border-b text-left">Handicap Multiplier</th>
                <th className="py-2 px-4 border-b text-left">4-Man Team Event</th>
                <th className="py-2 px-4 border-b text-left">Example Calculation</th>
                <th className="py-2 px-4 border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {formats.map((format) => (
                <tr key={format.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{format.formatName}</td>
                  <td className="py-2 px-4 border-b">{format.multiplier}</td>
                  <td className="py-2 px-4 border-b">
                    {format.isFourManTeam ? 'Yes' : 'No'}
                  </td>
                  <td className="py-2 px-4 border-b text-sm">
                    {format.isFourManTeam ? (
                      <div className="text-blue-600 space-y-1">
                        <p className="font-medium">4-Man Team Format:</p>
                        <p>No handicap applied. Gross score is used directly.</p>
                        <p className="mt-1">Example: Gross score 5 → Net score 5</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {format.formatName.toLowerCase().includes('singles') ? (
                          <div>
                            <p className="font-medium">Singles Format (100% handicap):</p>
                            <p>Player handicap: 15</p>
                            <p>For match play: Player gets 15 strokes on the hardest 15 holes</p>
                            <p>Example: On hole with index 8 (top 8 hardest hole)</p>
                            <p>Gross 5 with 1 stroke = <span className="font-medium">Net 4</span></p>
                          </div>
                        ) : format.formatName.toLowerCase().includes('best ball') ? (
                          <div>
                            <p className="font-medium">Best Ball Format (Average):</p>
                            <p>Players: 12 & 18 handicap</p>
                            <p>Average: (12 + 18) ÷ 2 = 15</p>
                            <p>With multiplier: 15 × {format.multiplier} = {Math.ceil(15 * format.multiplier)}</p>
                            <p>For match play: Team gets {Math.ceil(15 * format.multiplier)} strokes on the hardest {Math.ceil(15 * format.multiplier)} holes</p>
                            <p>Example: On hole with index 5 (top 5 hardest hole)</p>
                            <p>Gross 5 with 1 stroke = <span className="font-medium">Net 4</span></p>
                          </div>
                        ) : format.formatName.toLowerCase().includes('scramble') ? (
                          <div>
                            <p className="font-medium">Scramble Format (Average):</p>
                            <p>Players: 10 & 20 handicap</p>
                            <p>Average: (10 + 20) ÷ 2 = 15</p>
                            <p>With multiplier: 15 × {format.multiplier} = {Math.ceil(15 * format.multiplier)}</p>
                            <p>For match play: Team gets {Math.ceil(15 * format.multiplier)} strokes on the hardest {Math.ceil(15 * format.multiplier)} holes</p>
                            <p>Example: On hole with index 3 (top 3 hardest hole)</p>
                            <p>Gross 4 with 1 stroke = <span className="font-medium">Net 3</span></p>
                          </div>
                        ) : format.formatName.toLowerCase().includes('alternate') || format.formatName.toLowerCase().includes('alt shot') || format.formatName.toLowerCase().includes('modified') ? (
                          <div>
                            <p className="font-medium">Alternate Shot Format (Average):</p>
                            <p>Players: 12 & 18 handicap</p>
                            <p>Average: (12 + 18) ÷ 2 = 15</p>
                            <p>With multiplier: 15 × {format.multiplier} = {Math.ceil(15 * format.multiplier)}</p>
                            <p>For match play: Team gets {Math.ceil(15 * format.multiplier)} strokes on the hardest {Math.ceil(15 * format.multiplier)} holes</p>
                            <p>Example: On hole with index 9 (top 9 hardest hole)</p>
                            <p>Gross 5 with 1 stroke = <span className="font-medium">Net 4</span></p>
                          </div>
                        ) : format.formatName.toLowerCase().includes('chapman') ? (
                          <div>
                            <p className="font-medium">Chapman Format (Average):</p>
                            <p>Players: 10 & 20 handicap</p>
                            <p>Average: (10 + 20) ÷ 2 = 15</p>
                            <p>With multiplier: 15 × {format.multiplier} = {Math.ceil(15 * format.multiplier)}</p>
                            <p>For match play: Team gets {Math.ceil(15 * format.multiplier)} strokes on the hardest {Math.ceil(15 * format.multiplier)} holes</p>
                            <p>Example: On hole with index 7 (top 7 hardest hole)</p>
                            <p>Gross 5 with 1 stroke = <span className="font-medium">Net 4</span></p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium">Custom Format:</p>
                            <p>Handicap × {format.multiplier} multiplier (rounded up)</p>
                            <p>Player gets strokes on hardest holes up to their handicap</p>
                            <p>Example: 15 handicap gets strokes on holes with indexes 1-15</p>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b text-center">
                    <Link
                      href={`/formats/${format.id}/edit`}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded mr-2"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteFormat(format.id)}
                      className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FormatsPage;