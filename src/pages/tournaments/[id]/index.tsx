import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import useSWR from 'swr';
import {
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  TrophyIcon,
  PencilIcon,
  TrashIcon,
  TableCellsIcon,
  UsersIcon,
  ArrowLeftIcon,
  UserIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// Helper function to format dates consistently
function formatDate(dateString: string) {
  if (!dateString) return '';
  
  // Create a date object and handle timezone issues
  const date = new Date(dateString);
  
  // Format the date consistently with month/day/year
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC' // Use UTC to avoid timezone shifts
  });
}

// Helper function to calculate duration in days
function calculateDurationDays(startDateStr: string, endDateStr: string) {
  if (!startDateStr || !endDateStr) return 0;
  
  try {
    // Parse dates and force noon UTC time to avoid timezone issues
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Set both to noon UTC
    startDate.setUTCHours(12, 0, 0, 0);
    endDate.setUTCHours(12, 0, 0, 0);
    
    // Calculate difference in days
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  } catch (error) {
    console.error("Error calculating duration:", error);
    return 0;
  }
}

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
        // If past the target date
        if (status === 'upcoming') {
          setCountdownLabel('Starting today');
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        } else {
          setCountdownLabel('Completed');
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        }
        return;
      }
      
      // Calculate remaining time
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown({ days, hours, minutes, seconds });
    };

    // Initial calculation
    calculateCountdown();
    
    // Update every second
    const interval = setInterval(calculateCountdown, 1000);
    
    // Clean up
    return () => clearInterval(interval);
  }, [targetDate, status]);

  // If tournament is completed, don't show countdown
  if (status === 'completed') {
    return <div className="text-sm text-gray-500">Tournament completed</div>;
  }

  return (
    <div className="text-sm">
      <div className="font-medium text-gray-600 mb-1">{countdownLabel}</div>
      <div className="grid grid-cols-4 gap-1 text-center">
        <div className="bg-primary/5 rounded-lg py-1 px-2">
          <div className="text-lg font-bold text-primary">{countdown.days}</div>
          <div className="text-xs text-gray-500">Days</div>
        </div>
        <div className="bg-primary/5 rounded-lg py-1 px-2">
          <div className="text-lg font-bold text-primary">{countdown.hours}</div>
          <div className="text-xs text-gray-500">Hours</div>
        </div>
        <div className="bg-primary/5 rounded-lg py-1 px-2">
          <div className="text-lg font-bold text-primary">{countdown.minutes}</div>
          <div className="text-xs text-gray-500">Mins</div>
        </div>
        <div className="bg-primary/5 rounded-lg py-1 px-2">
          <div className="text-lg font-bold text-primary">{countdown.seconds}</div>
          <div className="text-xs text-gray-500">Secs</div>
        </div>
      </div>
    </div>
  );
}

export default function TournamentDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState('overview');
  const [matchPlayerData, setMatchPlayerData] = useState<Record<string, any>>({});

  // Fetch tournament data only when ID is available
  const { data, error, isLoading } = useSWR(
    id ? `/api/tournaments/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000 // 30 seconds
    }
  );

  // Extract tournament from API response
  const tournament = data?.tournament;
  
  // Use SWR to fetch schedules
  const { data: schedulesData } = useSWR(
    id ? `/api/schedules?tournamentId=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000 // 30 seconds
    }
  );
  
  // Use schedules from API if available, fallback to empty array
  const schedules = schedulesData?.schedules || [];

  // Effect to load player data for matches when on scorecards tab
  useEffect(() => {
    if (activeTab === 'scorecards' && schedules && schedules.length > 0) {
      // For each match, fetch player data if not already loaded
      const loadMatchPlayers = async () => {
        try {
          const updatedMatchData = { ...matchPlayerData };
          let needsUpdate = false;

          for (const day of schedules) {
            for (const match of day.matches) {
              // Only fetch if we don't have this match's data
              if (!updatedMatchData[match.id]) {
                try {
                  const { data } = await axios.get(`/api/matches/${match.id}/players`);
                  if (data) {
                    updatedMatchData[match.id] = {
                      homePlayers: data.homePlayers || [],
                      awayPlayers: data.awayPlayers || [],
                    };
                    needsUpdate = true;
                  }
                } catch (err) {
                  console.error(`Error loading players for match ${match.id}:`, err);
                }
              }
            }
          }

          if (needsUpdate) {
            setMatchPlayerData(updatedMatchData);
          }
        } catch (err) {
          console.error("Error loading match players:", err);
        }
      };
      
      loadMatchPlayers();
    }
  }, [activeTab, schedules, matchPlayerData]);

  const tabs = [
    { name: 'Overview', id: 'overview' },
    { name: 'Schedule & Matches', id: 'schedule' },
    { name: 'Scorecards', id: 'scorecards' },
    { name: 'Leaderboard', id: 'leaderboard' },
    { name: 'Teams & Players', id: 'teams' },
    { name: 'Settings', id: 'settings' },
  ];

  // Handle tournament deletion
  const handleDeleteTournament = async () => {
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axios.delete(`/api/tournaments/${id}`);
      router.push('/tournaments');
      alert('Tournament deleted successfully');
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Failed to delete tournament');
    }
  };

  // If tournament doesn't exist or is still loading
  if (isLoading) {
    return <div className="p-8 text-center">Loading tournament details...</div>;
  }
  
  if (error) {
    return <div className="p-8 text-center text-red-600">Error loading tournament. Please try again.</div>;
  }
  
  if (!tournament) {
    return <div className="p-8 text-center">Tournament not found</div>;
  }

  return (
    <>
      <Head>
        <title>{`${tournament.name} | Gull Lake Golf Tournament`}</title>
      </Head>

      <div>
        <div className="mb-8">
          <Link href="/tournaments" passHref legacyBehavior={false} className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Tournaments
          </Link>
        </div>

        {/* Tournament header */}
        <div className="md:flex md:items-center md:justify-between md:space-x-5">
          <div className="flex items-start space-x-5">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                  <TrophyIcon className="h-8 w-8 text-white" aria-hidden="true" />
                </div>
                <span className="absolute inset-0 rounded-full shadow-inner" aria-hidden="true" />
              </div>
            </div>
            <div className="pt-1.5">
              <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
              <div className="flex items-center mt-2">
                <MapPinIcon className="h-5 w-5 text-gray-400" />
                <p className="text-sm font-medium text-gray-600 ml-1">{tournament.location}</p>
                <span className="mx-2 text-gray-300">|</span>
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <p className="text-sm font-medium text-gray-600 ml-1">
                  {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                </p>
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    tournament.status === 'upcoming'
                      ? 'bg-blue-100 text-blue-800'
                      : tournament.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
          <div className="justify-stretch mt-6 flex flex-col-reverse space-y-4 space-y-reverse sm:flex-row-reverse sm:justify-end sm:space-y-0 sm:space-x-3 sm:space-x-reverse md:mt-0 md:flex-row md:space-x-3">
            <Link href={`/tournaments/${id}/edit`} passHref legacyBehavior={false} className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              <PencilIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
              Edit
            </Link>
            <Link href="#" onClick={() => setActiveTab('schedule')} passHref legacyBehavior={false} className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <TableCellsIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              View Matches
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 sm:mt-8 border-b border-gray-200">
          <div className="sm:flex sm:items-baseline">
            <div className="mt-4 sm:mt-0">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={classNames(
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                      'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                    )}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              {/* Tournament Stats Summary */}
              <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                        <UserGroupIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Teams</dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">{tournament.teams.length}</div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="#" className="font-medium text-primary hover:text-primary/80" onClick={() => setActiveTab('teams')}>
                        View all teams
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                        <UserIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Players</dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {tournament.teams.reduce((acc: number, team: any) => acc + (team.playerCount || (team.players ? team.players.length : 0)), 0)}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="#" className="font-medium text-primary hover:text-primary/80" onClick={() => setActiveTab('teams')}>
                        View all players
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                        <TableCellsIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Matches</dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {schedules.reduce((total, day) => total + day.matches.length, 0)}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="#" className="font-medium text-primary hover:text-primary/80" onClick={() => setActiveTab('schedule')}>
                        View schedule
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                        <CalendarIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Duration</dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {calculateDurationDays(tournament.startDate, tournament.endDate)} days
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm mb-2">
                      <div className="font-medium text-gray-500">
                        {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                      </div>
                    </div>
                    
                    {/* Tournament countdown */}
                    <TournamentCountdown 
                      targetDate={tournament.status === 'upcoming' ? tournament.startDate : tournament.endDate} 
                      status={tournament.status} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Current Standings */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-base font-semibold text-gray-900">Current Standings</h3>
                    <Link 
                      href="#" 
                      className="text-sm font-medium text-primary hover:text-primary/80"
                      onClick={() => setActiveTab('leaderboard')}
                    >
                      View full leaderboard
                    </Link>
                  </div>
                  
                  <div className="px-5 py-3">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">W/L/T</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tournament.teams.map((team: any, index: number) => {
                            // Calculate team stats
                            const stats = {
                              points: 0,
                              won: 0,
                              tied: 0,
                              lost: 0,
                            };
                            
                            if (schedules && schedules.length > 0) {
                              schedules.forEach((schedule: any) => {
                                schedule.matches.forEach((match: any) => {
                                  if (match.points) {
                                    if (match.homeTeam === team.name) {
                                      stats.points += match.points.homeTeamPoints || 0;
                                      if (match.points.homeTeamPoints > match.points.awayTeamPoints) {
                                        stats.won++;
                                      } else if (match.points.homeTeamPoints < match.points.awayTeamPoints) {
                                        stats.lost++;
                                      } else {
                                        stats.tied++;
                                      }
                                    } else if (match.awayTeam === team.name) {
                                      stats.points += match.points.awayTeamPoints || 0;
                                      if (match.points.awayTeamPoints > match.points.homeTeamPoints) {
                                        stats.won++;
                                      } else if (match.points.awayTeamPoints < match.points.homeTeamPoints) {
                                        stats.lost++;
                                      } else {
                                        stats.tied++;
                                      }
                                    }
                                  }
                                });
                              });
                            }
                            
                            return (
                              <tr key={team.id}>
                                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                <td className="px-3 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    team.name === 'Spartan Dawgs' ? 'bg-green-100 text-forest-green' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {team.name}
                                  </span>
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stats.points}</td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {stats.won}/{stats.lost}/{stats.tied}
                                </td>
                              </tr>
                            );
                          })}
                          
                          {tournament.teams.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                                No teams available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
                  </div>
                  
                  <div className="px-5 py-3">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Link
                        href="#"
                        onClick={() => setActiveTab('schedule')}
                        className="rounded-lg bg-white p-4 text-center shadow ring-1 ring-gray-900/5 hover:bg-gray-50 transition"
                      >
                        <TableCellsIcon className="mx-auto h-6 w-6 text-primary" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">View Scorecards</h3>
                        <p className="mt-1 text-xs text-gray-500">Enter and view match scores</p>
                      </Link>
                      
                      <Link
                        href="#"
                        onClick={() => setActiveTab('schedule')}
                        className="rounded-lg bg-white p-4 text-center shadow ring-1 ring-gray-900/5 hover:bg-gray-50 transition"
                      >
                        <CalendarIcon className="mx-auto h-6 w-6 text-primary" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Manage Schedule</h3>
                        <p className="mt-1 text-xs text-gray-500">View or edit matches</p>
                      </Link>
                      
                      <Link
                        href="#"
                        onClick={() => setActiveTab('teams')}
                        className="rounded-lg bg-white p-4 text-center shadow ring-1 ring-gray-900/5 hover:bg-gray-50 transition"
                      >
                        <UserGroupIcon className="mx-auto h-6 w-6 text-primary" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Manage Teams</h3>
                        <p className="mt-1 text-xs text-gray-500">Add or edit teams</p>
                      </Link>
                      
                      <Link
                        href="#"
                        onClick={() => setActiveTab('settings')}
                        className="rounded-lg bg-white p-4 text-center shadow ring-1 ring-gray-900/5 hover:bg-gray-50 transition"
                      >
                        <PencilIcon className="mx-auto h-6 w-6 text-primary" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Edit Tournament</h3>
                        <p className="mt-1 text-xs text-gray-500">Modify settings</p>
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Tournament Details */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">Tournament Details</h3>
                  </div>
                  
                  <div className="px-5 py-3">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{tournament.name}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Location</dt>
                        <dd className="mt-1 text-sm text-gray-900">{tournament.location}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">{new Date(tournament.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">End Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">{new Date(tournament.endDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Courses</dt>
                        <dd className="mt-1 text-sm text-gray-900">{tournament.courses.map((course: any) => course.name).join(', ')}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
                
                {/* Format Multipliers */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">Format Handicap Multipliers</h3>
                  </div>
                  
                  <div className="px-5 py-3">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Multiplier</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tournament.formatMultipliers.map((format: any) => (
                            <tr key={format.id}>
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{format.formatName}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{format.multiplier}</td>
                            </tr>
                          ))}
                          
                          {tournament.formatMultipliers.length === 0 && (
                            <tr>
                              <td colSpan={2} className="px-3 py-4 text-center text-sm text-gray-500">
                                No format multipliers defined
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Recent Matches */}
                <div className="bg-white overflow-hidden shadow rounded-lg lg:col-span-2">
                  <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-base font-semibold text-gray-900">Recent Matches</h3>
                    <Link 
                      href="#"
                      onClick={() => setActiveTab('schedule')}
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      View all matches
                    </Link>
                  </div>
                  
                  <div className="px-5 py-3">
                    <div className="overflow-x-auto">
                      <ul className="divide-y divide-gray-200">
                        {schedules.flatMap((day) => day.matches).slice(0, 5).map((match: any) => (
                          <li key={match.id} className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100">{match.format}</span>
                                <span className="text-sm text-gray-500">{match.time}</span>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/tournaments/${id}/matches/${match.id}/players`}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <UserGroupIcon className="h-4 w-4" />
                                </Link>
                                <Link 
                                  href={`/tournaments/${id}/matches/${match.id}/scorecard`}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <DocumentTextIcon className="h-4 w-4" />
                                </Link>
                              </div>
                            </div>
                            
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex space-x-12">
                                <div>
                                  <p className="text-sm font-medium text-blue-600">{match.homeTeam}</p>
                                  <p className="text-xs text-gray-500">
                                    {match.points ? `${match.points.homeTeamPoints} pts` : 'Pending'}
                                  </p>
                                </div>
                                
                                <div>
                                  <p className="text-sm font-medium text-red-600">{match.awayTeam}</p>
                                  <p className="text-xs text-gray-500">
                                    {match.points ? `${match.points.awayTeamPoints} pts` : 'Pending'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-sm text-gray-500">
                                {match.course}
                              </div>
                            </div>
                          </li>
                        ))}
                        
                        {schedules.flatMap((day) => day.matches).length === 0 && (
                          <li className="py-4 text-center text-sm text-gray-500">
                            No matches scheduled yet
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Tournament Schedule</h3>
                <div className="flex space-x-3">
                  <Link 
                    href={`/tournaments/${id}/batch-assign`} 
                    passHref
                    legacyBehavior={false}
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <UserGroupIcon className="-ml-0.5 mr-1.5 h-4 w-4 text-gray-400" />
                    Batch Assign Players
                  </Link>
                  <Link 
                    href={`/tournaments/${id}/schedule/edit`} 
                    passHref
                    legacyBehavior={false}
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <PencilIcon className="-ml-0.5 mr-1.5 h-4 w-4 text-gray-400" />
                    Edit Schedule
                  </Link>
                </div>
              </div>

              <div className="space-y-8">
                {schedules.map((day: any) => (
                  <div key={day.id} className="card">
                    <h4 className="text-base font-semibold leading-6 text-gray-900">
                      Day {day.day} - {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </h4>
                    <div className="mt-6 overflow-hidden">
                      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                          <table className="min-w-full divide-y divide-gray-300">
                            <thead>
                              <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Time</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Format</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Teams</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Course</th>
                                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {day.matches.map((match: any) => (
                                <tr key={match.id}>
                                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{match.time}</td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{match.format}</td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {match.teams && Array.isArray(match.teams) ? match.teams.join(' vs. ') : (match.homeTeam && match.awayTeam ? `${match.homeTeam} vs. ${match.awayTeam}` : 'TBD')}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{match.course}</td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right space-x-2">
                                    <Link 
                                      href={`/tournaments/${id}/matches/${match.id}/players`}
                                      className="text-primary hover:text-primary/80"
                                      title="Assign Players"
                                    >
                                      <UserGroupIcon className="inline-block h-5 w-5" />
                                    </Link>
                                    <Link 
                                      href={`/tournaments/${id}/matches/${match.id}/scorecard`}
                                      className="text-primary hover:text-primary/80"
                                      title="Scorecard (View/Edit)"
                                    >
                                      <TableCellsIcon className="inline-block h-5 w-5" />
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teams & Players Tab */}
          {activeTab === 'teams' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Teams & Players</h3>
                <div className="flex space-x-3">
                  <Link 
                    href={`/tournaments/${id}/players/add`} 
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <UserIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                    Add Player
                  </Link>
                  <Link 
                    href={`/tournaments/${id}/teams/new`} 
                    className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                  >
                    <UserGroupIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                    Add Team
                  </Link>
                </div>
              </div>

              {/* Teams Section */}
              <div className="mb-8">
                <h4 className="text-base font-medium text-gray-700 mb-4">Tournament Teams</h4>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {tournament.teams.map((team: any) => (
                    <div key={team.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-lg font-semibold ${team.name === 'Spartan Dawgs' ? 'text-forest-green' : 'text-blue-700'}`}>{team.name}</h4>
                          <div className="flex items-center space-x-2">
                            <Link 
                              href={`/tournaments/${id}/teams/${team.id}/edit`} 
                              className="text-gray-400 hover:text-primary"
                            >
                              <PencilIcon className="h-5 w-5" />
                              <span className="sr-only">Edit</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        {/* Team Stats */}
                        <div className="mb-3 flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2 text-gray-500">
                            <UserGroupIcon className="h-5 w-5 text-gray-400" />
                            <span>{team.playerCount || (team.players ? team.players.length : 0)} Players</span>
                          </div>
                          
                          {/* Team Performance (if available) */}
                          {schedules && schedules.length > 0 && (
                            <div className="text-right">
                              <span className="text-xs font-medium text-gray-500">
                                {schedules.reduce((points, day) => {
                                  return points + day.matches.reduce((matchPoints, match) => {
                                    if (match.points) {
                                      if (match.homeTeam === team.name) {
                                        return matchPoints + (match.points.homeTeamPoints || 0);
                                      } else if (match.awayTeam === team.name) {
                                        return matchPoints + (match.points.awayTeamPoints || 0);
                                      }
                                    }
                                    return matchPoints;
                                  }, 0);
                                }, 0)} Points
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Player List */}
                        {team.players && team.players.length > 0 ? (
                          <ul className="divide-y divide-gray-200">
                            {team.players.slice(0, 4).map((player: any) => (
                              <li key={player.id} className="py-2 flex justify-between items-center">
                                <div className="flex items-center">
                                  <div className="h-7 w-7 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                                    <UserIcon className="h-4 w-4 text-gray-500" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">{player.name}</span>
                                </div>
                                <span className="text-xs text-gray-500">HCP: {player.handicapIndex}</span>
                              </li>
                            ))}
                            {team.players.length > 4 && (
                              <li className="py-2 text-center">
                                <span className="text-xs text-gray-500">
                                  + {team.players.length - 4} more players
                                </span>
                              </li>
                            )}
                          </ul>
                        ) : (
                          <div className="py-4 text-center text-sm text-gray-500">
                            No players assigned to this team
                          </div>
                        )}
                        
                        {/* Team Actions */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
                          <Link
                            href={`/tournaments/${id}/teams/${team.id}`}
                            className="text-sm font-medium text-primary hover:text-primary/80"
                          >
                            View Team
                          </Link>
                          <Link
                            href={`/tournaments/${id}/teams/${team.id}/add-player`}
                            className="text-sm font-medium text-gray-500 hover:text-gray-700"
                          >
                            Add Player
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {tournament.teams.length === 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-gray-500">No teams created yet. Add a team to get started.</p>
                  </div>
                )}
              </div>
              
              {/* All Players Section */}
              <div className="mt-10">
                <h4 className="text-base font-medium text-gray-700 mb-4">All Tournament Players</h4>
                
                <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Handicap
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tournament.teams.flatMap((team: any) => {
                          if (!team.players) return [];
                          return team.players.map((player: any, idx: number) => (
                            <tr key={player.id || idx}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 flex-shrink-0">
                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                      <UserIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                    </div>
                                  </div>
                                  <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900">{player.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  team.name === 'Spartan Dawgs' ? 'bg-green-100 text-forest-green' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {team.name}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {player.handicapIndex}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {player.email || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link href={`/tournaments/${id}/players/${player.id}/edit`} className="text-primary hover:text-primary/80">
                                  Edit
                                </Link>
                              </td>
                            </tr>
                          ));
                        })}
                        
                        {/* If no players */}
                        {tournament.teams.flatMap(team => team.players || []).length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                              No players assigned to any team yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scorecards Tab */}
          {activeTab === 'scorecards' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Match Scorecards</h3>
                <div className="flex items-center space-x-3">
                  <select 
                    className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                    defaultValue="all"
                  >
                    <option value="all">All Days</option>
                    {schedules.map((day: any) => (
                      <option key={day.id} value={day.id}>Day {day.day}</option>
                    ))}
                  </select>
                  <Link 
                    href={`/tournaments/${id}/batch-assign`} 
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <UserGroupIcon className="h-4 w-4 mr-1" />
                    Batch Assign
                  </Link>
                  <button 
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    onClick={() => mutate()}
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-1" />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Multi-match Scorecard View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {schedules.flatMap(day => day.matches).map((match: any) => {
                  // Calculate match statistics
                  const homeWins = match.holeResults?.filter((h: any) => 
                    h.homeTeamNetScore !== null && h.awayTeamNetScore !== null && 
                    h.homeTeamNetScore < h.awayTeamNetScore
                  ).length || 0;
                  
                  const awayWins = match.holeResults?.filter((h: any) => 
                    h.homeTeamNetScore !== null && h.awayTeamNetScore !== null && 
                    h.homeTeamNetScore > h.awayTeamNetScore
                  ).length || 0;
                  
                  const ties = match.holeResults?.filter((h: any) => 
                    h.homeTeamNetScore !== null && h.awayTeamNetScore !== null && 
                    h.homeTeamNetScore === h.awayTeamNetScore
                  ).length || 0;
                  
                  const completedHoles = match.holeResults?.filter((h: any) => 
                    h.homeTeamNetScore !== null && h.awayTeamNetScore !== null
                  ).length || 0;
                  
                  // Determine match status
                  let status = 'Not Started';
                  let statusColor = 'gray';
                  
                  if (completedHoles === 18) {
                    status = 'Completed';
                    statusColor = 'green';
                  } else if (completedHoles > 0) {
                    status = `In Progress (${completedHoles}/18)`;
                    statusColor = 'blue';
                  }
                  
                  // Determine winner
                  let winner = '';
                  if (completedHoles === 18) {
                    if (homeWins > awayWins) {
                      winner = match.homeTeam;
                    } else if (awayWins > homeWins) {
                      winner = match.awayTeam;
                    } else {
                      winner = 'Tie';
                    }
                  }
                  
                  return (
                    <div key={match.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                        <div>
                          <h3 className="text-base font-semibold leading-6 text-gray-900">
                            {match.format}
                          </h3>
                          <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            {match.time} - {match.course}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold text-${statusColor}-800 bg-${statusColor}-100`}>
                          {status}
                        </span>
                      </div>
                      
                      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                        <div className="grid grid-cols-3 gap-4">
                          {/* Home Team */}
                          <div className="col-span-1 text-center">
                            <div className="text-sm font-medium">{match.homeTeam === 'Spartan Dawgs' ? <span className="text-forest-green">Spartan Dawgs</span> : <span className="text-blue-700">{match.homeTeam}</span>}</div>
                            <div className="mt-1 text-3xl font-bold">{homeWins}</div>
                            <div className="mt-1 text-xs text-gray-500">holes won</div>
                            
                            {/* Home Players */}
                            <div className="mt-3 text-xs text-left">
                              {(matchPlayerData[match.id]?.homePlayers?.length > 0 
                                ? matchPlayerData[match.id].homePlayers 
                                : match.homePlayers || []
                              ).map((player: any) => (
                                <div key={player.id} className="mb-1">
                                  {player.name} (HCP: {player.handicapIndex})
                                </div>
                              ))}
                              {(!matchPlayerData[match.id]?.homePlayers?.length && (!match.homePlayers || match.homePlayers.length === 0)) && (
                                <div className="italic text-gray-400">No players assigned</div>
                              )}
                            </div>
                          </div>
                          
                          {/* Match Status */}
                          <div className="col-span-1 flex flex-col items-center justify-center">
                            <div className="text-xs text-gray-500 uppercase">Match Result</div>
                            <div className="mt-1 text-xl font-semibold">
                              {completedHoles === 18 ? (
                                <span>
                                  {homeWins > awayWins ? (
                                    <span className={match.homeTeam === 'Spartan Dawgs' ? 'text-forest-green' : 'text-blue-700'}>
                                      {match.homeTeam} wins
                                    </span>
                                  ) : awayWins > homeWins ? (
                                    <span className={match.awayTeam === 'Spartan Dawgs' ? 'text-forest-green' : 'text-blue-700'}>
                                      {match.awayTeam} wins
                                    </span>
                                  ) : (
                                    <span className="text-gray-600">Tie</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  {completedHoles > 0 ? 'In Progress' : 'Not Started'}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-sm">
                              {homeWins} - {awayWins} {ties > 0 ? `(${ties} tied)` : ''}
                            </div>
                            
                            {/* Actions */}
                            <div className="mt-5 flex space-x-3">
                              <Link
                                href={`/tournaments/${id}/matches/${match.id}/players`}
                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <UserGroupIcon className="h-3.5 w-3.5 mr-1" />
                                Assign
                              </Link>
                              <Link
                                href={`/tournaments/${id}/matches/${match.id}/scorecard`}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary hover:bg-primary/90"
                              >
                                <DocumentTextIcon className="h-3.5 w-3.5 mr-1" />
                                View
                              </Link>
                            </div>
                          </div>
                          
                          {/* Away Team */}
                          <div className="col-span-1 text-center">
                            <div className="text-sm font-medium">{match.awayTeam === 'Spartan Dawgs' ? <span className="text-forest-green">Spartan Dawgs</span> : <span className="text-blue-700">{match.awayTeam}</span>}</div>
                            <div className="mt-1 text-3xl font-bold">{awayWins}</div>
                            <div className="mt-1 text-xs text-gray-500">holes won</div>
                            
                            {/* Away Players */}
                            <div className="mt-3 text-xs text-left">
                              {(matchPlayerData[match.id]?.awayPlayers?.length > 0 
                                ? matchPlayerData[match.id].awayPlayers 
                                : match.awayPlayers || []
                              ).map((player: any) => (
                                <div key={player.id} className="mb-1">
                                  {player.name} (HCP: {player.handicapIndex})
                                </div>
                              ))}
                              {(!matchPlayerData[match.id]?.awayPlayers?.length && (!match.awayPlayers || match.awayPlayers.length === 0)) && (
                                <div className="italic text-gray-400">No players assigned</div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Holes Summary */}
                        {completedHoles > 0 && (
                          <div className="mt-6 border-t border-gray-100 pt-4">
                            <div className="text-xs text-center">
                              <div className="grid grid-cols-18 gap-0.5 mb-1">
                                {[...Array(18)].map((_, i) => (
                                  <div key={i} className="text-gray-500 text-center">{i + 1}</div>
                                ))}
                              </div>
                              <div className="grid grid-cols-18 gap-0.5">
                                {[...Array(18)].map((_, i) => {
                                  const holeResult = match.holeResults?.find((h: any) => h.hole?.number === i + 1);
                                  let bgColor = 'bg-gray-100';
                                  
                                  if (holeResult) {
                                    if (holeResult.homeTeamNetScore < holeResult.awayTeamNetScore) {
                                      bgColor = 'bg-blue-100';
                                    } else if (holeResult.homeTeamNetScore > holeResult.awayTeamNetScore) {
                                      bgColor = 'bg-red-100';
                                    } else if (holeResult.homeTeamNetScore === holeResult.awayTeamNetScore) {
                                      bgColor = 'bg-gray-200';
                                    }
                                  }
                                  
                                  return (
                                    <div key={i} className={`${bgColor} p-1 text-center rounded-sm`}>
                                      {holeResult ? (
                                        holeResult.homeTeamNetScore < holeResult.awayTeamNetScore ? (
                                          <span className="text-blue-800">H</span>
                                        ) : holeResult.homeTeamNetScore > holeResult.awayTeamNetScore ? (
                                          <span className="text-red-800">A</span>
                                        ) : (
                                          <span className="text-gray-800">T</span>
                                        )
                                      ) : (
                                        '-'
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {schedules.flatMap(day => day.matches).length === 0 && (
                  <div className="col-span-2 bg-white shadow overflow-hidden sm:rounded-lg p-6">
                    <div className="text-center text-gray-500">
                      No matches scheduled yet
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Tournament Leaderboard</h3>
                <div className="flex items-center space-x-2">
                  <select 
                    className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                    defaultValue="all"
                  >
                    <option value="all">All Days</option>
                    {schedules.map((day: any, index: number) => (
                      <option key={day.id} value={`day${index + 1}`}>
                        Day {day.day} - {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </option>
                    ))}
                  </select>
                  <button 
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    onClick={() => mutate()}
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-1" />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Team Standings */}
              <div className="bg-white shadow sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">Team Standings</h3>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">
                      Last updated: {new Date().toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holes Won</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match W/L/T</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tournament.teams.map((team: any, index: number) => {
                        // Initialize team stats
                        const stats = {
                          points: 0,
                          won: 0,
                          tied: 0,
                          lost: 0,
                          totalHolesWon: 0,
                          totalHolesLost: 0,
                          totalHolesTied: 0,
                          matchesPlayed: 0
                        };
                        
                        // Get team stats from matches if available
                        if (schedules && schedules.length > 0) {
                          schedules.forEach((schedule: any) => {
                            schedule.matches.forEach((match: any) => {
                              // First check points for match results
                              if (match.homeTeam === team.name || match.awayTeam === team.name) {
                                // Only count if points exist
                                if (match.points) {
                                  stats.matchesPlayed++;
                                  
                                  if (match.homeTeam === team.name) {
                                    stats.points += match.points.homeTeamPoints || 0;
                                    if (match.points.homeTeamPoints > match.points.awayTeamPoints) {
                                      stats.won++;
                                    } else if (match.points.homeTeamPoints < match.points.awayTeamPoints) {
                                      stats.lost++;
                                    } else {
                                      stats.tied++;
                                    }
                                  } else if (match.awayTeam === team.name) {
                                    stats.points += match.points.awayTeamPoints || 0;
                                    if (match.points.awayTeamPoints > match.points.homeTeamPoints) {
                                      stats.won++;
                                    } else if (match.points.awayTeamPoints < match.points.homeTeamPoints) {
                                      stats.lost++;
                                    } else {
                                      stats.tied++;
                                    }
                                  }
                                }
                                
                                // Also check individual hole results if available
                                if (match.holeResults && match.holeResults.length > 0) {
                                  match.holeResults.forEach((result: any) => {
                                    if (result.homeTeamNetScore !== null && result.awayTeamNetScore !== null) {
                                      if (match.homeTeam === team.name) {
                                        if (result.homeTeamNetScore < result.awayTeamNetScore) {
                                          stats.totalHolesWon++;
                                        } else if (result.homeTeamNetScore > result.awayTeamNetScore) {
                                          stats.totalHolesLost++;
                                        } else {
                                          stats.totalHolesTied++;
                                        }
                                      } else if (match.awayTeam === team.name) {
                                        if (result.awayTeamNetScore < result.homeTeamNetScore) {
                                          stats.totalHolesWon++;
                                        } else if (result.awayTeamNetScore > result.homeTeamNetScore) {
                                          stats.totalHolesLost++;
                                        } else {
                                          stats.totalHolesTied++;
                                        }
                                      }
                                    }
                                  });
                                }
                              }
                            });
                          });
                        }
                        
                        // Calculate win rate
                        const winRate = stats.matchesPlayed > 0 
                          ? ((stats.won / stats.matchesPlayed) * 100).toFixed(1) 
                          : '0.0';
                        
                        return (
                          <tr key={team.id}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                team.name === 'Spartan Dawgs' ? 'bg-green-100 text-forest-green' : 
                                index === 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {team.name}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {stats.points}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {stats.totalHolesWon}
                              <span className="text-xs text-gray-400 ml-1">
                                ({Math.round((stats.totalHolesWon / (stats.totalHolesWon + stats.totalHolesLost + stats.totalHolesTied || 1)) * 100)}%)
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {stats.won}/{stats.lost}/{stats.tied}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {winRate}%
                            </td>
                          </tr>
                        );
                      })}
                      
                      {tournament.teams.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                            No team data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Individual Player Leaderboard */}
              <div className="bg-white shadow sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">Player Leaderboard</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matches</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Collect all players and their stats */}
                      {tournament.teams.flatMap(team => 
                        (team.players || []).map((player: any) => {
                          // Initialize player stats
                          const stats = {
                            player,
                            team,
                            points: 0,
                            matchesPlayed: 0,
                            matchesWon: 0,
                            holesPlayed: 0,
                            holesWon: 0
                          };
                          
                          // Calculate stats from matches
                          if (schedules && schedules.length > 0) {
                            schedules.forEach((schedule: any) => {
                              schedule.matches.forEach((match: any) => {
                                // Check if player participated in this match
                                const isHomePlayer = match.homePlayers?.some((p: any) => p.id === player.id);
                                const isAwayPlayer = match.awayPlayers?.some((p: any) => p.id === player.id);
                                
                                if (isHomePlayer || isAwayPlayer) {
                                  stats.matchesPlayed++;
                                  
                                  // Add points if match has results
                                  if (match.points) {
                                    if (isHomePlayer) {
                                      stats.points += match.points.homeTeamPoints || 0;
                                      if (match.points.homeTeamPoints > match.points.awayTeamPoints) {
                                        stats.matchesWon++;
                                      }
                                    } else if (isAwayPlayer) {
                                      stats.points += match.points.awayTeamPoints || 0;
                                      if (match.points.awayTeamPoints > match.points.homeTeamPoints) {
                                        stats.matchesWon++;
                                      }
                                    }
                                  }
                                  
                                  // Count holes
                                  if (match.holeResults) {
                                    match.holeResults.forEach((result: any) => {
                                      if (result.homeTeamNetScore !== null && result.awayTeamNetScore !== null) {
                                        stats.holesPlayed++;
                                        
                                        if (isHomePlayer && result.homeTeamNetScore < result.awayTeamNetScore) {
                                          stats.holesWon++;
                                        } else if (isAwayPlayer && result.awayTeamNetScore < result.homeTeamNetScore) {
                                          stats.holesWon++;
                                        }
                                      }
                                    });
                                  }
                                }
                              });
                            });
                          }
                          
                          return stats;
                        })
                      )
                      // Sort by points
                      .sort((a, b) => b.points - a.points || b.holesWon - a.holesWon)
                      // Generate rows
                      .map((playerStats, index) => {
                        const winRate = playerStats.matchesPlayed > 0 
                          ? ((playerStats.matchesWon / playerStats.matchesPlayed) * 100).toFixed(1) 
                          : '0.0';
                          
                        return (
                          <tr key={playerStats.player.id}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <UserIcon className="h-4 w-4 text-gray-500" />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">{playerStats.player.name}</div>
                                  <div className="text-xs text-gray-500">HCP: {playerStats.player.handicapIndex}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                playerStats.team.name === 'Spartan Dawgs' ? 'bg-green-100 text-forest-green' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {playerStats.team.name}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {playerStats.matchesPlayed}
                              <span className="text-xs text-gray-400 ml-1">
                                ({playerStats.matchesWon} won)
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {playerStats.points}
                              <span className="text-xs text-gray-400 ml-1">
                                ({playerStats.holesWon} holes)
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {winRate}%
                              {playerStats.holesPlayed > 0 && (
                                <span className="text-xs text-gray-400 ml-1">
                                  {Math.round((playerStats.holesWon / playerStats.holesPlayed) * 100)}% holes
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      
                      {tournament.teams.flatMap(team => team.players || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                            No player data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Match Results */}
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">Match Results</h3>
                </div>
                
                {schedules.map((day: any) => (
                  <div key={day.id} className="border-b border-gray-200 last:border-b-0">
                    <div className="px-4 py-3 bg-gray-50">
                      <h4 className="text-sm font-medium text-gray-700">
                        Day {day.day} - {new Date(day.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {day.matches.map((match: any) => (
                        <div key={match.id} className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-500">{match.time}</span>
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                {match.format}
                              </span>
                            </div>
                            <div className="flex space-x-3">
                              <Link 
                                href={`/tournaments/${id}/matches/${match.id}/players`}
                                className="text-xs text-primary hover:text-primary/80 font-medium"
                              >
                                <UserGroupIcon className="h-4 w-4 inline-block mr-1" />
                                Players
                              </Link>
                              <Link 
                                href={`/tournaments/${id}/matches/${match.id}/scorecard`}
                                className="text-xs text-primary hover:text-primary/80 font-medium"
                              >
                                <DocumentTextIcon className="h-4 w-4 inline-block mr-1" />
                                Scorecard
                              </Link>
                            </div>
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="sm:flex sm:space-x-12">
                              <div>
                                <p className="text-sm font-medium text-blue-600">{match.homeTeam}</p>
                                <p className="mt-1 text-sm text-gray-600 font-semibold">
                                  {match.points ? `${match.points.homeTeamPoints} pts` : 'Pending'}
                                </p>
                                {match.holeResults && match.holeResults.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    {match.holeResults.filter((h: any) => 
                                      h.homeTeamNetScore !== null && 
                                      h.awayTeamNetScore !== null && 
                                      h.homeTeamNetScore < h.awayTeamNetScore
                                    ).length} holes won
                                  </p>
                                )}
                              </div>
                              <div className="mt-2 sm:mt-0">
                                <p className="text-sm font-medium text-red-600">{match.awayTeam}</p>
                                <p className="mt-1 text-sm text-gray-600 font-semibold">
                                  {match.points ? `${match.points.awayTeamPoints} pts` : 'Pending'}
                                </p>
                                {match.holeResults && match.holeResults.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    {match.holeResults.filter((h: any) => 
                                      h.homeTeamNetScore !== null && 
                                      h.awayTeamNetScore !== null && 
                                      h.homeTeamNetScore > h.awayTeamNetScore
                                    ).length} holes won
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-col items-end text-sm text-gray-500 sm:mt-0">
                              <div className="flex items-center">
                                <MapPinIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                <p>{match.course}</p>
                              </div>
                              {match.holeResults && match.holeResults.length > 0 && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {match.holeResults.filter((h: any) => 
                                    h.homeTeamNetScore !== null && h.awayTeamNetScore !== null
                                  ).length} of 18 holes completed
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Tournament Settings</h3>
                <Link 
                  href={`/tournaments/${id}/edit`} 
                  className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  <PencilIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                  Edit Tournament
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Basic Settings */}
                <div className="card">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">Basic Information</h3>
                  <div className="mt-6 border-t border-gray-100">
                    <dl className="divide-y divide-gray-100">
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900">Tournament Name</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {tournament.name}
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900">Year</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {tournament.year}
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900">Location</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {tournament.location}
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900">Date Range</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {new Date(tournament.startDate).toLocaleDateString()} to {new Date(tournament.endDate).toLocaleDateString()}
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900">Status</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            tournament.status === 'upcoming'
                              ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                              : tournament.status === 'active'
                              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                              : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
                          }`}>
                            {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Format Multipliers */}
                <div className="card">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">Format Handicap Multipliers</h3>
                    <button className="text-sm font-medium text-primary hover:text-primary/80">
                      Edit Multipliers
                    </button>
                  </div>
                  
                  <div className="mt-6 border-t border-gray-100">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Multiplier</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tournament.formatMultipliers.map((format: any) => (
                            <tr key={format.id}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{format.formatName}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{format.multiplier}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="card">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">Advanced Settings</h3>
                  <div className="mt-6 border-t border-gray-100">
                    <div className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">Enable Real-time Scoring</span>
                          <span className="text-xs text-gray-500">Allow players to enter scores from mobile devices</span>
                        </div>
                        <button
                          type="button"
                          className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          <span className="sr-only">Use setting</span>
                          <span className="translate-x-5 pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out">
                            <span className="absolute inset-0 flex h-full w-full items-center justify-center opacity-100 transition-opacity duration-200 ease-in"></span>
                          </span>
                        </button>
                      </div>
                    </div>
                    <div className="py-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">Public Leaderboard</span>
                          <span className="text-xs text-gray-500">Make leaderboard visible to non-logged in users</span>
                        </div>
                        <button
                          type="button"
                          className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          <span className="sr-only">Use setting</span>
                          <span className="translate-x-5 pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out">
                            <span className="absolute inset-0 flex h-full w-full items-center justify-center opacity-100 transition-opacity duration-200 ease-in"></span>
                          </span>
                        </button>
                      </div>
                    </div>
                    <div className="py-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">Score Verification Required</span>
                          <span className="text-xs text-gray-500">Require both teams to verify scores before finalizing</span>
                        </div>
                        <button
                          type="button"
                          className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          <span className="sr-only">Use setting</span>
                          <span className="translate-x-5 pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out">
                            <span className="absolute inset-0 flex h-full w-full items-center justify-center opacity-100 transition-opacity duration-200 ease-in"></span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="card border border-red-200">
                  <h3 className="text-base font-semibold leading-6 text-red-700">Danger Zone</h3>
                  <div className="mt-6 space-y-4">
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <TrashIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Delete Tournament</h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>
                              Once you delete a tournament, there is no going back. Please be certain.
                            </p>
                          </div>
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={handleDeleteTournament}
                              className="inline-flex items-center rounded-md border border-transparent bg-red-100 px-3 py-2 text-sm font-medium leading-4 text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                              Delete Tournament
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md bg-yellow-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <ArrowPathIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Reset Scores</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              This will clear all match scores, but preserve the tournament structure, players, and teams.
                            </p>
                          </div>
                          <div className="mt-4">
                            <button
                              type="button"
                              className="inline-flex items-center rounded-md border border-transparent bg-yellow-100 px-3 py-2 text-sm font-medium leading-4 text-yellow-700 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                            >
                              Reset Scores
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
