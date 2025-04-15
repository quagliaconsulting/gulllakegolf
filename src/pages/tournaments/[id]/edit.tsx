import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import useSWR from 'swr';

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function EditTournament() {
  const router = useRouter();
  const { id } = router.query;
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tournament data
  const { data, error: fetchError, isLoading } = useSWR(
    id ? `/api/tournaments/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  // Initialize form with tournament data
  useEffect(() => {
    if (data?.tournament) {
      const tournament = data.tournament;
      setName(tournament.name || '');
      setYear(tournament.year || new Date().getFullYear());
      setLocation(tournament.location || '');
      
      // Format dates for input fields (YYYY-MM-DD)
      if (tournament.startDate) {
        // Fix timezone issues by creating a UTC date
        const date = new Date(tournament.startDate);
        // Format as YYYY-MM-DD ensuring we get the correct date in UTC
        const formattedStartDate = date.getUTCFullYear() + '-' + 
          String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + 
          String(date.getUTCDate()).padStart(2, '0');
        setStartDate(formattedStartDate);
      }
      
      if (tournament.endDate) {
        // Fix timezone issues by creating a UTC date
        const date = new Date(tournament.endDate);
        // Format as YYYY-MM-DD ensuring we get the correct date in UTC
        const formattedEndDate = date.getUTCFullYear() + '-' + 
          String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + 
          String(date.getUTCDate()).padStart(2, '0');
        setEndDate(formattedEndDate);
      }
    }
  }, [data]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await axios.put(`/api/tournaments/${id}`, {
        name,
        year,
        location,
        startDate,
        endDate
      });
      
      // Navigate back to tournament details
      router.push(`/tournaments/${id}`);
    } catch (err: any) {
      console.error('Error updating tournament:', err);
      setError(err.response?.data?.error || 'Failed to update tournament');
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading tournament data...</div>;
  }
  
  if (fetchError) {
    return <div className="p-8 text-center text-red-600">Error loading tournament. Please try again.</div>;
  }

  return (
    <>
      <Head>
        <title>Edit Tournament</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href={`/tournaments/${id}`} className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Tournament
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Tournament</h1>
          <p className="mt-2 text-sm text-gray-700">
            Update tournament details
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

        <form onSubmit={handleSubmit} className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
          <div className="px-4 py-6 sm:p-8">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              {/* Tournament Name */}
              <div className="sm:col-span-4">
                <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                  Tournament Name
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              {/* Year */}
              <div className="sm:col-span-2">
                <label htmlFor="year" className="block text-sm font-medium leading-6 text-gray-900">
                  Year
                </label>
                <div className="mt-2">
                  <input
                    type="number"
                    name="year"
                    id="year"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="sm:col-span-6">
                <label htmlFor="location" className="block text-sm font-medium leading-6 text-gray-900">
                  Location
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="location"
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div className="sm:col-span-3">
                <label htmlFor="startDate" className="block text-sm font-medium leading-6 text-gray-900">
                  Start Date
                </label>
                <div className="mt-2">
                  <input
                    type="date"
                    name="startDate"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="sm:col-span-3">
                <label htmlFor="endDate" className="block text-sm font-medium leading-6 text-gray-900">
                  End Date
                </label>
                <div className="mt-2">
                  <input
                    type="date"
                    name="endDate"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
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
                'Save Tournament'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}