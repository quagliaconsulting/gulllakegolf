import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

interface Format {
  id: string;
  formatName: string;
  multiplier: number;
  isFourManTeam: boolean;
  tournamentId: string;
}

const EditFormatPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [formData, setFormData] = useState<Omit<Format, 'id'>>({
    formatName: '',
    multiplier: 1.0,
    isFourManTeam: false,
    tournamentId: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch format data when ID is available
    const fetchFormat = async () => {
      if (!id) return;
      
      try {
        // Add auth header to request
        const authHeader = {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        };
        
        const { data } = await axios.get(`/api/formats/${id}`, authHeader);
        setFormData({
          formatName: data.formatName,
          multiplier: data.multiplier,
          isFourManTeam: data.isFourManTeam,
          tournamentId: data.tournamentId
        });
      } catch (err) {
        setError('Failed to load format data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFormat();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'multiplier') {
      // Ensure multiplier is a valid number
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setFormData({ ...formData, [name]: numValue });
      }
    } else if (name === 'formatName') {
      // Auto-adjust multiplier and isFourManTeam based on format selection
      let newMultiplier = formData.multiplier;
      let newIsFourManTeam = formData.isFourManTeam;
      
      switch(value.toLowerCase()) {
        case 'singles':
          newMultiplier = 1.0;
          newIsFourManTeam = false;
          break;
        case 'best ball':
        case '2 man best ball':
          newMultiplier = 0.9;
          newIsFourManTeam = false;
          break;
        case 'scramble':
        case '2 man scramble':
          newMultiplier = 0.5;
          newIsFourManTeam = false;
          break;
        case 'alternate shot':
        case 'mod alt shot':
        case 'modified alternate shot':
          newMultiplier = 0.5;
          newIsFourManTeam = false;
          break;
        case 'chapman':
          newMultiplier = 0.6;
          newIsFourManTeam = false;
          break;
        case '4-man team':
          newMultiplier = 1.0;
          newIsFourManTeam = true;
          break;
      }
      
      setFormData({ 
        ...formData, 
        [name]: value,
        multiplier: newMultiplier,
        isFourManTeam: newIsFourManTeam 
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Add auth header to request
      const authHeader = {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      };
      
      await axios.put(`/api/formats/${id}`, {
        ...formData,
        id
      }, authHeader);
      router.push('/formats');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update format');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Edit Format</h1>
        <p>Loading format data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Edit Format</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Format Name:
          </label>
          <select
            name="formatName"
            value={formData.formatName}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          >
            <option value="" disabled>Select a Format</option>
            <optgroup label="Individual Formats">
              <option value="Singles">Singles (1v1)</option>
            </optgroup>
            <optgroup label="Two-Person Formats">
              <option value="Best Ball">Best Ball (2v2)</option>
              <option value="Scramble">Scramble (2v2)</option>
              <option value="Alternate Shot">Alternate Shot (2v2)</option>
              <option value="Modified Alternate Shot">Modified Alt Shot (2v2)</option>
              <option value="Chapman">Chapman (2v2)</option>
            </optgroup>
            <optgroup label="Team Formats">
              <option value="4-Man Team">4-Man Team (No Handicaps)</option>
            </optgroup>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Common formats include Singles (1v1), Best Ball (2v2), Scramble (2v2), etc.
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Handicap Multiplier:
          </label>
          <input
            type="number"
            name="multiplier"
            value={formData.multiplier}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            For example: 0.8 for 80% handicap, 0.35 for 35% handicap
          </p>
        </div>
        
        <div className="mb-6 bg-gray-50 p-4 rounded-md border border-gray-200">
          <h3 className="text-md font-semibold text-gray-700 mb-2">Calculation Preview</h3>
          {formData.isFourManTeam ? (
            <div className="text-blue-600 text-sm space-y-2">
              <p className="font-medium">4-Man Team Format:</p>
              <p>No handicap applied. Gross score is used directly.</p>
              <p className="mt-1">Example: Gross score 5 → Net score 5</p>
            </div>
          ) : (
            <div className="text-sm space-y-2">
              {formData.formatName.toLowerCase().includes('singles') ? (
                <div>
                  <p className="font-medium">Singles Format (100% handicap):</p>
                  <p>Player handicap: 15</p>
                  <p>For match play: Player gets 15 strokes on the hardest 15 holes</p>
                  <p>Example: On hole with index 8 (top 8 hardest hole)</p>
                  <p>Gross 5 with 1 stroke = <span className="font-medium">Net 4</span></p>
                </div>
              ) : formData.formatName.toLowerCase().includes('best ball') ? (
                <div>
                  <p className="font-medium">Best Ball Format (90% of lower handicap):</p>
                  <p>Players: 12 & 18 handicap</p>
                  <p>Team handicap: 12 × {formData.multiplier} = {(12 * formData.multiplier).toFixed(1)} rounded to {Math.ceil(12 * formData.multiplier)}</p>
                  <p>For match play: Team gets {Math.ceil(12 * formData.multiplier)} strokes on the hardest {Math.ceil(12 * formData.multiplier)} holes</p>
                  <p>Example: On hole with index 5 (top 5 hardest hole)</p>
                  <p>Gross 5 with 1 stroke = <span className="font-medium">Net 4</span></p>
                </div>
              ) : formData.formatName.toLowerCase().includes('scramble') ? (
                <div>
                  <p className="font-medium">Scramble Format (35% low + 15% high):</p>
                  <p>Players: 10 & 20 handicap</p>
                  <p>Base: (10 × 0.35) + (20 × 0.15) = 3.5 + 3 = 6.5</p>
                  <p>Team handicap: 6.5 × {formData.multiplier} = {(6.5 * formData.multiplier).toFixed(1)} rounded to {Math.ceil(6.5 * formData.multiplier)}</p>
                  <p>For match play: Team gets {Math.ceil(6.5 * formData.multiplier)} strokes on the hardest {Math.ceil(6.5 * formData.multiplier)} holes</p>
                  <p>Example: On hole with index 3 (top 3 hardest hole)</p>
                  <p>Gross 4 with 1 stroke = <span className="font-medium">Net 3</span></p>
                </div>
              ) : formData.formatName.toLowerCase().includes('alternate') || formData.formatName.toLowerCase().includes('alt shot') || formData.formatName.toLowerCase().includes('modified') ? (
                <div>
                  <p className="font-medium">Alternate Shot Format (Average):</p>
                  <p>Players: 12 & 18 handicap</p>
                  <p>Average: (12 + 18) ÷ 2 = 15</p>
                  <p>Team handicap: 15 × {formData.multiplier} = {(15 * formData.multiplier).toFixed(1)} rounded to {Math.ceil(15 * formData.multiplier)}</p>
                  <p>For match play: Team gets {Math.ceil(15 * formData.multiplier)} strokes on the hardest {Math.ceil(15 * formData.multiplier)} holes</p>
                  <p>Example: On hole with index 9 (top 9 hardest hole)</p>
                  <p>Gross 5 with 1 stroke = <span className="font-medium">Net 4</span></p>
                </div>
              ) : formData.formatName.toLowerCase().includes('chapman') ? (
                <div>
                  <p className="font-medium">Chapman Format (60% low + 40% high):</p>
                  <p>Players: 10 & 20 handicap</p>
                  <p>Base: (10 × 0.6) + (20 × 0.4) = 6 + 8 = 14</p>
                  <p>Team handicap: 14 × {formData.multiplier} = {(14 * formData.multiplier).toFixed(1)} rounded to {Math.ceil(14 * formData.multiplier)}</p>
                  <p>For match play: Team gets {Math.ceil(14 * formData.multiplier)} strokes on the hardest {Math.ceil(14 * formData.multiplier)} holes</p>
                  <p>Example: On hole with index 7 (top 7 hardest hole)</p>
                  <p>Gross 5 with 1 stroke = <span className="font-medium">Net 4</span></p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Custom Format:</p>
                  <p>Calculated handicap × {formData.multiplier} multiplier (rounded up)</p>
                  <p>Player gets strokes on hardest holes up to their handicap</p>
                  <p>Example: 15 handicap gets strokes on holes with indexes 1-15</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isFourManTeam"
              id="isFourManTeam"
              checked={formData.isFourManTeam}
              onChange={handleChange}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="isFourManTeam" className="ml-2 block text-sm text-gray-700">
              This is a 4-man team event (no handicaps applied)
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            If checked, handicaps will not be applied when calculating scores for this format
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/formats')}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditFormatPage;