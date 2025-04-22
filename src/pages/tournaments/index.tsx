import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import axios from 'axios';
import { useApi } from '@/services/api/apiClient';
import { 
  TrophyIcon, 
  CalendarIcon, 
  MapPinIcon, 
  UserGroupIcon, 
  PencilSquareIcon, 
  TrashIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  EllipsisVerticalIcon,
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';

// Countdown component
function TournamentCountdown({ targetDate, status }: { targetDate: string, status: string }) {
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [countdownLabel, setCountdownLabel] = useState('');

  useEffect(() => {
    // Set up countdown timer
    const calculateCountdown = () => {
      // Force noon UTC to avoid timezone issues
      const now = new Date();
      const target = new Date(targetDate);
      target.setUTCHours(12, 0, 0, 0);

      // Different countdown logic based on tournament status
      if (status === 'upcoming') {
        setCountdownLabel('Starting in');
      } else if (status === 'active') {
        setCountdownLabel('Time remaining');
      } else {
        setCountdownLabel('Completed');
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      // Calculate time difference
      const diff = target.getTime() - now.getTime();
      
      if (diff <= 0) {
        // If past the target date for upcoming, or past end date for active
        if (status === 'upcoming') {
          setCountdownLabel('Starting today!');
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        } else {
          setCountdownLabel('Ending today!');
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        }
        return;
      }

      // Calculate days, hours, minutes, seconds
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    // Calculate immediately then set interval
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [targetDate, status]);

  // Don't show countdown for completed tournaments
  if (status === 'completed') {
    return <div className="text-sm text-gray-500">Tournament completed</div>;
  }

  return (
    <div className="mt-2">
      <div className="text-xs font-medium text-gray-500">{countdownLabel}</div>
      <div className="mt-1 flex items-center space-x-2">
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-primary">{countdown.days}</span>
          <span className="text-xs text-gray-500">days</span>
        </div>
        <span className="text-gray-400">:</span>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-primary">{countdown.hours}</span>
          <span className="text-xs text-gray-500">hours</span>
        </div>
        <span className="text-gray-400">:</span>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-primary">{countdown.minutes}</span>
          <span className="text-xs text-gray-500">min</span>
        </div>
        <span className="text-gray-400">:</span>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-primary">{countdown.seconds}</span>
          <span className="text-xs text-gray-500">sec</span>
        </div>
      </div>
    </div>
  );
}

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

// Filter options
const filterOptions = {
  status: ['all', 'upcoming', 'active', 'completed'],
  year: ['all', '2025', '2024', '2023', '2022'],
  view: ['cards', 'table']
};

export default function Tournaments() {
  const [filters, setFilters] = useState({ status: 'all', year: 'all', view: 'cards' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);
  const [isCreatingDummy, setIsCreatingDummy] = useState(false);
  const [isCleaningData, setIsCleaningData] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  // Always show in development mode
  const isDev = true;
  
  // Fetch cache-busting timestamp
  const { data: cacheBust } = useApi('/api/tournaments/cache-bust', {
    revalidateOnFocus: true,
    refreshInterval: 60000 // 1 minute
  });
  
  // Fetch tournaments from API with cache-busting
  const { data, error, isLoading, mutate } = useApi(
    `/api/tournaments?_=${cacheBust?.timestamp || Date.now()}`, 
    {
      revalidateOnFocus: false, 
      dedupingInterval: 10000 // 10 seconds
    }
  );
  
  // Filter tournaments based on selected filters
  const filteredTournaments = data ? data.filter((tournament: any) => {
    // Filter by status
    if (filters.status !== 'all' && tournament.status !== filters.status) {
      return false;
    }
    
    // Filter by year
    if (filters.year !== 'all') {
      const tournamentYear = new Date(tournament.startDate).getFullYear().toString();
      if (tournamentYear !== filters.year) {
        return false;
      }
    }
    
    return true;
  }) : [];
  
  // Handle tournament delete confirmation
  const handleDeleteConfirm = (id: string) => {
    setTournamentToDelete(id);
    setShowDeleteModal(true);
  };
  
  // Handle actual tournament deletion
  const handleDeleteTournament = async () => {
    if (!tournamentToDelete) return;
    
    try {
      // Make API call to delete tournament
      const response = await fetch(`/api/tournaments/${tournamentToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete tournament: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success === false) {
        throw new Error(result.error || 'Failed to delete tournament');
      }
      
      // Update local data
      mutate(data.filter((t: any) => t.id !== tournamentToDelete));
      
      // Show success message
      alert('Tournament deleted successfully');
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Failed to delete tournament');
    } finally {
      // Close the modal and reset state
      setShowDeleteModal(false);
      setTournamentToDelete(null);
    }
  };
  
  // Handle tournament duplication
  const handleDuplicateTournament = async (id: string) => {
    try {
      // In a real implementation we would call the API to duplicate the tournament
      // For now, we'll just log the action
      console.log(`Duplicating tournament: ${id}`);
      alert('Tournament duplication not implemented yet');
    } catch (error) {
      console.error('Error duplicating tournament:', error);
      alert('Failed to duplicate tournament');
    }
  };
  
  // Create a dummy tournament for development
  const createDummyTournament = async () => {
    try {
      setIsCreatingDummy(true);
      console.log('Creating dummy tournament...');
      
      // Call the API to create a dummy tournament
      const response = await fetch('/api/dev/create-dummy-tournament', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Created dummy tournament:', result);
      
      // Refresh the tournament list
      mutate();
      
      // Show success message
      if (result.success && result.data && result.data.tournamentId) {
        alert(`Development tournament created! ID: ${result.data.tournamentId}`);
      } else {
        alert('Development tournament created!');
      }
    } catch (error) {
      console.error('Error creating dummy tournament:', error);
      alert('Failed to create dummy tournament. See console for details.');
    } finally {
      setIsCreatingDummy(false);
    }
  };
  
  // Clean up all data for development
  const cleanupData = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL players, teams, matches, and related data. This cannot be undone. Continue?')) {
      return;
    }
    
    if (!confirm('Are you REALLY sure? This will delete EVERYTHING.')) {
      return;
    }
    
    try {
      setIsCleaningData(true);
      console.log('Cleaning up all data...');
      
      // Call the cleanup API
      const response = await fetch('/api/dev/cleanup-data', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Cleanup result:', result);
      
      // Refresh the tournament list
      mutate();
      
      // Show success message
      if (result.success && result.data) {
        alert(`Data cleanup successful!\n\nDeleted:\n- ${result.data.counts.deletedPlayers} players\n- ${result.data.counts.deletedTeams} teams\n- ${result.data.counts.deletedMatches} matches\n- ${result.data.counts.deletedPlayerPairings} player pairings`);
      } else {
        alert('Data cleanup completed successfully!');
      }
    } catch (error) {
      console.error('Error cleaning up data:', error);
      alert('Failed to clean up data. See console for details.');
    } finally {
      setIsCleaningData(false);
    }
  };

  return (
    <>
      <Head>
        <title>Tournaments | Gull Lake Golf Tournament</title>
      </Head>

      <div className="px-2 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-semibold leading-6 text-gray-900">Tournaments</h1>
              {isAdmin && (
                <span className="ml-3 inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  <ShieldCheckIcon className="mr-1 h-3 w-3" />
                  Admin Access
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-700 hidden sm:block">
              A list of all tournaments including their location, date, and status.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 flex space-x-2 sm:space-x-3">
            <button
              onClick={() => mutate()}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <ArrowPathIcon className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={createDummyTournament}
              disabled={isCreatingDummy}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-pink-500 shadow-sm text-sm leading-4 font-medium rounded-md text-pink-600 bg-white hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
            >
              <DocumentDuplicateIcon className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">{isCreatingDummy ? 'Creating...' : 'Create Dev Tournament'}</span>
            </button>
            <button
              onClick={cleanupData}
              disabled={isCleaningData}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-red-500 shadow-sm text-sm leading-4 font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">{isCleaningData ? 'Cleaning...' : 'Clean All Data'}</span>
            </button>
            <Link
              href="/tournaments/new"
              passHref
              legacyBehavior={false}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 bg-primary text-white text-sm font-medium rounded-md shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <PlusIcon className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">New Tournament</span>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 sm:mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:space-x-4">
            <div className="col-span-1">
              <label htmlFor="status-filter" className="block text-xs sm:text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status-filter"
                className="mt-1 block w-full rounded-md border-gray-300 py-1.5 sm:py-2 pl-2 sm:pl-3 pr-7 sm:pr-10 text-sm focus:border-primary focus:outline-none focus:ring-primary"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                {filterOptions.status.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <label htmlFor="year-filter" className="block text-xs sm:text-sm font-medium text-gray-700">
                Year
              </label>
              <select
                id="year-filter"
                className="mt-1 block w-full rounded-md border-gray-300 py-1.5 sm:py-2 pl-2 sm:pl-3 pr-7 sm:pr-10 text-sm focus:border-primary focus:outline-none focus:ring-primary"
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              >
                {filterOptions.year.map((year) => (
                  <option key={year} value={year}>
                    {year === 'all' ? 'All Years' : year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* View toggle */}
          <div className="mt-3 sm:mt-0">
            <div className="flex rounded-md shadow-sm justify-center sm:justify-start" role="group">
              <button
                type="button"
                className={`inline-flex items-center rounded-l-md px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium ${
                  filters.view === 'cards' 
                    ? 'bg-primary text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-gray-300`}
                onClick={() => setFilters({ ...filters, view: 'cards' })}
              >
                Cards
              </button>
              <button
                type="button"
                className={`inline-flex items-center rounded-r-md px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium ${
                  filters.view === 'table' 
                    ? 'bg-primary text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-gray-300 border-l-0`}
                onClick={() => setFilters({ ...filters, view: 'table' })}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Table View */}
        {filters.view === 'table' && (
          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Tournament
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Location
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Dates
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Teams
                        </th>
                        {isAdmin && (
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {isLoading ? (
                        <tr>
                          <td colSpan={isAdmin ? 6 : 5} className="text-center py-4">
                            Loading tournaments...
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td colSpan={isAdmin ? 6 : 5} className="text-center py-4 text-red-600">
                            Error loading tournaments. Please try again.
                          </td>
                        </tr>
                      ) : filteredTournaments.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 6 : 5} className="text-center py-4">
                            No tournaments found.
                          </td>
                        </tr>
                      ) : (
                        filteredTournaments.map((tournament: any) => (
                          <tr key={tournament.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              <Link href={`/tournaments/${tournament.id}`} passHref legacyBehavior={false} className="hover:text-primary">
                                {tournament.name}
                              </Link>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {tournament.location}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(tournament.startDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} - {new Date(tournament.endDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  tournament.status === 'upcoming'
                                    ? 'bg-green-100 text-green-800'
                                    : tournament.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {Array.isArray(tournament.teams) && tournament.teams.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {tournament.teams.map((team: any, index: number) => {
                                    const teamName = typeof team === 'object' ? team.name : team;
                                    return (
                                      <span key={index}>
                                        <span 
                                          className={teamName === 'Spartan Dawgs' ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}
                                        >
                                          {teamName}
                                        </span>
                                        {index < tournament.teams.length - 1 && <span className="text-gray-500 mx-1">vs</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : ''}
                            </td>
                            {isAdmin && (
                              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                <Menu as="div" className="relative inline-block text-left">
                                  <div>
                                    <Menu.Button className="inline-flex w-full justify-center bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                      <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
                                    </Menu.Button>
                                  </div>

                                  <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-100"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-75"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                  >
                                    <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                      <div className="py-1">
                                        <Menu.Item>
                                          {({ active }) => (
                                            <Link
                                              href={`/tournaments/${tournament.id}/edit`}
                                              passHref
                                              legacyBehavior={false}
                                              className={`${
                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                              } flex items-center px-4 py-2 text-sm`}
                                            >
                                              <PencilSquareIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                                              Edit
                                            </Link>
                                          )}
                                        </Menu.Item>
                                        <Menu.Item>
                                          {({ active }) => (
                                            <Link
                                              href={`/tournaments/${tournament.id}/scoring`}
                                              passHref
                                              legacyBehavior={false}
                                              className={`${
                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                              } flex items-center px-4 py-2 text-sm`}
                                            >
                                              <TrophyIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                                              Manage Scoring
                                            </Link>
                                          )}
                                        </Menu.Item>
                                        <Menu.Item>
                                          {({ active }) => (
                                            <button
                                              onClick={() => handleDuplicateTournament(tournament.id)}
                                              className={`${
                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                              } flex w-full items-center px-4 py-2 text-sm`}
                                            >
                                              <DocumentDuplicateIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                                              Duplicate
                                            </button>
                                          )}
                                        </Menu.Item>
                                        {tournament.status === 'upcoming' && (
                                          <Menu.Item>
                                            {({ active }) => (
                                              <button
                                                onClick={() => console.log(`Starting tournament: ${tournament.id}`)}
                                                className={`${
                                                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                                } flex w-full items-center px-4 py-2 text-sm`}
                                              >
                                                <ArrowPathIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                                                Start Tournament
                                              </button>
                                            )}
                                          </Menu.Item>
                                        )}
                                        <Menu.Item>
                                          {({ active }) => (
                                            <button
                                              onClick={() => handleDeleteConfirm(tournament.id)}
                                              className={`${
                                                active ? 'bg-red-50 text-red-700' : 'text-red-700'
                                              } flex w-full items-center px-4 py-2 text-sm`}
                                            >
                                              <TrashIcon className="mr-3 h-5 w-5 text-red-400" aria-hidden="true" />
                                              Delete
                                            </button>
                                          )}
                                        </Menu.Item>
                                      </div>
                                    </Menu.Items>
                                  </Transition>
                                </Menu>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card View */}
        {filters.view === 'cards' && (
          <div className="mt-4 sm:mt-8 grid grid-cols-1 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full text-center p-6 sm:p-12">Loading tournaments...</div>
            ) : error ? (
              <div className="col-span-full text-center p-6 sm:p-12 text-red-500">Error loading tournaments</div>
            ) : filteredTournaments.length === 0 ? (
              <div className="col-span-full text-center p-6 sm:p-12">No tournaments found</div>
            ) : (
              filteredTournaments.map((tournament: any) => (
                <div key={tournament.id} className="overflow-hidden rounded-lg bg-white shadow hover:shadow-md transition-shadow">
                  <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                            tournament.status === 'active' ? 'bg-green-100' : 
                            tournament.status === 'upcoming' ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <TrophyIcon className={`h-5 w-5 sm:h-6 sm:w-6 ${
                              tournament.status === 'active' ? 'text-green-600' : 
                              tournament.status === 'upcoming' ? 'text-green-600' : 'text-gray-600'
                            }`} />
                          </div>
                        </div>
                        <div className="ml-2 sm:ml-3">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
                            <Link href={`/tournaments/${tournament.id}`} passHref legacyBehavior={false} className="hover:text-primary">
                              {tournament.name}
                            </Link>
                          </h3>
                          <div className="flex items-center mt-1">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mr-2 ${
                                tournament.status === 'upcoming'
                                  ? 'bg-green-100 text-green-800'
                                  : tournament.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                            </span>
                            <MapPinIcon className="h-3 w-3 text-gray-500 mr-1" />
                            <p className="text-xs text-gray-500 truncate max-w-[80px] sm:max-w-full">{tournament.location}</p>
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <Menu as="div" className="relative inline-block text-left">
                          <div>
                            <Menu.Button className="inline-flex justify-center rounded-full p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-500">
                              <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
                            </Menu.Button>
                          </div>

                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              <div className="py-1">
                                <Menu.Item>
                                  {({ active }) => (
                                    <Link
                                      href={`/tournaments/${tournament.id}/edit`}
                                      passHref
                                      legacyBehavior={false}
                                      className={`${
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                      } flex items-center px-4 py-2 text-sm`}
                                    >
                                      <PencilSquareIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                                      Edit Tournament
                                    </Link>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleDuplicateTournament(tournament.id)}
                                      className={`${
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                      } flex w-full items-center px-4 py-2 text-sm`}
                                    >
                                      <DocumentDuplicateIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                                      Duplicate
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleDeleteConfirm(tournament.id)}
                                      className={`${
                                        active ? 'bg-red-50 text-red-700' : 'text-red-700'
                                      } flex w-full items-center px-4 py-2 text-sm`}
                                    >
                                      <TrashIcon className="mr-3 h-5 w-5 text-red-400" aria-hidden="true" />
                                      Delete
                                    </button>
                                  )}
                                </Menu.Item>
                              </div>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      )}
                    </div>
                  </div>

                  <div className="p-3 sm:p-4">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">
                        {new Date(tournament.startDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} to {new Date(tournament.endDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                      </p>
                    </div>
                    
                    {/* Countdown Timer */}
                    <TournamentCountdown 
                      targetDate={tournament.status === 'upcoming' ? tournament.startDate : tournament.endDate} 
                      status={tournament.status} 
                    />
                    
                    <div className="flex items-center mt-3 sm:mt-4">
                      <UserGroupIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2 flex-shrink-0" />
                      <div className="text-xs sm:text-sm text-gray-600">
                        {tournament.players || '0'} Players • {Array.isArray(tournament.teams) ? tournament.teams.length : '0'} Teams
                      </div>
                    </div>
                    
                    {/* Team cards */}
                    {Array.isArray(tournament.teams) && tournament.teams.length > 0 && (
                      <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2">
                        <h4 className="text-xs font-medium text-gray-500">Teams</h4>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {tournament.teams.map((team: any) => {
                            // Handle both object and string formats
                            const teamName = typeof team === 'object' ? team.name : team;
                            return (
                              <div 
                                key={typeof team === 'object' ? team.id : teamName} 
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  teamName === 'Spartan Dawgs' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {teamName}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Footer actions */}
                    <div className="mt-4 sm:mt-6 flex divide-x divide-gray-200 border-t pt-3 sm:pt-4">
                      <div className="flex w-0 flex-1">
                        <Link
                          href={`/tournaments/${tournament.id}`}
                          passHref
                          legacyBehavior={false}
                          className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-2 rounded-bl-lg py-2 sm:py-3 text-xs sm:text-sm font-medium text-primary hover:bg-gray-50"
                        >
                          View Details
                        </Link>
                      </div>
                      <div className="-ml-px flex w-0 flex-1">
                        <Link
                          href={`/tournaments/${tournament.id}`}
                          passHref
                          legacyBehavior={false}
                          className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-2 rounded-br-lg py-2 sm:py-3 text-xs sm:text-sm font-medium text-primary hover:bg-gray-50"
                        >
                          {tournament.status === 'upcoming' ? 'Setup' : 'Enter Scores'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {filteredTournaments.length === 0 && !isLoading && !error && (
          <div className="mt-8 text-center py-12 px-4 sm:px-6 lg:px-8">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No tournaments found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new tournament.</p>
            <div className="mt-6">
              <Link
                href="/tournaments/new"
                passHref
                legacyBehavior={false}
                className="btn-primary"
              >
                New Tournament
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">Delete Tournament</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this tournament? This action cannot be undone. 
                      All data associated with this tournament will be permanently removed.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                  onClick={handleDeleteTournament}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}