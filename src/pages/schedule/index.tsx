import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import axios from 'axios';
import useSWR from 'swr';
import { 
  CalendarIcon, 
  PencilIcon, 
  TrashIcon, 
  UserGroupIcon 
} from '@heroicons/react/24/outline';

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function SchedulePage() {
  // Track if we should show error state (only for non-404 errors)
  const [showError, setShowError] = useState(false);
  
  // Instead of SWR, use a regular state variable for schedules
  const [scheduleData, setScheduleData] = useState<{ schedules: any[] }>({ schedules: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Replace fallback data with API call
  // Add state to track available tournaments
  const [availableTournaments, setAvailableTournaments] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching schedule data directly...');
        
        // Include auth token in headers
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Fetch all schedules in one request - we updated the API to allow this
        // Add a cache-busting parameter
        const timestamp = new Date().getTime();
        const schedulesResponse = await axios.get(`/api/schedules?_=${timestamp}`, { headers });
        console.log('All schedules response:', JSON.stringify(schedulesResponse.data, null, 2));
        
        if (schedulesResponse.data && schedulesResponse.data.schedules) {
          console.log('Schedule count from API:', schedulesResponse.data.schedules.length);
          
          // Make sure every schedule has a matches array
          const processedSchedules = schedulesResponse.data.schedules.map((schedule: any) => {
            console.log('Processing schedule:', schedule.id, 'for tournament:', schedule.tournamentId, schedule.tournamentName);
            return {
              ...schedule,
              matches: schedule.matches || []
            };
          });
          
          // Update the schedule data state
          console.log('Updating data with schedules:', processedSchedules.length);
          setScheduleData({ schedules: processedSchedules });
          setIsLoading(false);
          
          // Also fetch all tournaments to have them available
          try {
            const tournamentsResponse = await axios.get('/api/tournaments', { headers });
            if (tournamentsResponse.data && Array.isArray(tournamentsResponse.data)) {
              setAvailableTournaments(tournamentsResponse.data);
            }
          } catch (error) {
            console.error('Error fetching tournaments:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
        
        if (axios.isAxiosError(error)) {
          // If the API doesn't support getting all schedules yet, fall back to the old method
          if (error.response?.status === 400) {
            console.log('Falling back to tournament-by-tournament schedule fetching...');
            fetchSchedulesByTournament();
          }
        }
      }
    };
    
    // Fallback method that fetches schedules tournament by tournament
    const fetchSchedulesByTournament = async () => {
      try {
        console.log('Fetching tournaments and schedule data tournament by tournament...');
        
        // Include auth token in headers
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // First get all tournaments
        const tournamentsResponse = await axios.get('/api/tournaments', { headers });
        console.log('Tournaments API response:', tournamentsResponse.data);
        
        if (tournamentsResponse.data && Array.isArray(tournamentsResponse.data)) {
          setAvailableTournaments(tournamentsResponse.data);
          
          // Now fetch schedules for each tournament
          const allSchedules: any[] = [];
          
          for (const tournament of tournamentsResponse.data) {
            try {
              const scheduleResponse = await axios.get(`/api/schedules?tournamentId=${tournament.id}`, { headers });
              
              if (scheduleResponse.data && scheduleResponse.data.schedules) {
                // Add tournament info to each schedule
                const schedulesWithTournament = scheduleResponse.data.schedules.map((schedule: any) => ({
                  ...schedule,
                  tournament: tournament,
                  // Make sure we have a matches array for safety
                  matches: schedule.matches || []
                }));
                
                allSchedules.push(...schedulesWithTournament);
              }
            } catch (error) {
              console.log(`No schedules for tournament: ${tournament.name}`);
            }
          }
          
          console.log('All schedules:', allSchedules);
          
          // Update the schedule data state
          setScheduleData({ schedules: allSchedules });
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error in fallback schedule fetching:', error);
      }
    };
    
    // Start with the simplified method
    fetchSchedules();
    
    // Only run this effect once on component mount
  }, []);

  // Group schedules by tournament and month
  console.log('Grouping schedules, count:', scheduleData.schedules.length);
  const groupedSchedules = (scheduleData.schedules || []).reduce((groups: any, schedule: any) => {
    console.log('Grouping schedule:', schedule.id, schedule.tournamentId, schedule.tournamentName || schedule.tournament?.name);
    
    // Ensure we have a valid tournamentId
    const tournamentId = schedule.tournamentId || 'unknown';
    
    // Determine tournament name from either the tournament object or a direct property
    let tournamentName = 'Unknown Tournament';
    if (schedule.tournament?.name) {
      tournamentName = schedule.tournament.name;
    } else if (schedule.tournamentName) {
      tournamentName = schedule.tournamentName;
    }
    
    console.log('Using tournament name:', tournamentName);
    
    // Create a group for this tournament if it doesn't exist
    if (!groups[tournamentId]) {
      groups[tournamentId] = {
        tournamentName,
        schedules: []
      };
    }
    
    // Add this schedule to the tournament group
    groups[tournamentId].schedules.push(schedule);
    return groups;
  }, {});
  
  console.log('Final grouped schedules:', Object.keys(groupedSchedules).length, 'tournaments');

  // Handle schedule deletion
  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled event?')) return;

    try {
      // Call API to delete schedule
      await axios.delete(`/api/schedules/${id}`);
      
      // Update local data
      const updatedSchedules = scheduleData.schedules.filter((schedule: any) => schedule.id !== id);
      setScheduleData({ schedules: updatedSchedules });
      
      alert('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete event');
    }
  };

  // Format date for display with UTC time handling
  const formatDate = (dateStr: string | Date) => {
    if (!dateStr) return 'No date';
    
    try {
      const date = new Date(dateStr);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // Force UTC timezone to avoid date shifts
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'UTC' // Use UTC to avoid timezone shifts
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date format';
    }
  };

  return (
    <>
      <Head>
        <title>Tournament Schedule | Gull Lake Golf Tournament</title>
      </Head>
    
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Tournament Schedule</h1>
            <p className="mt-2 text-sm text-gray-700">
              View and manage upcoming tournament dates.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href="/schedule/new"
              className="btn-primary inline-flex"
            >
              Add Event
            </Link>
          </div>
        </div>
        
        {/* Schedule list */}
        {isLoading ? (
          <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
            <div className="p-8 text-center text-gray-500">
              <p>Loading schedule...</p>
            </div>
          </div>
        ) : showError && error ? (
          <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
            <div className="p-8 text-center text-red-500">
              <p>Error loading schedule. Please try again.</p>
            </div>
          </div>
        ) : Object.keys(groupedSchedules).length === 0 ? (
          <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
            <div className="p-8 text-center text-gray-500">
              <p>No scheduled events found. Add an event to get started!</p>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {Object.entries(groupedSchedules).length === 0 ? (
              <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
                <div className="p-8 text-center text-gray-500">
                  <p>No scheduled events found. Add an event to get started!</p>
                </div>
              </div>
            ) : (
              Object.entries(groupedSchedules).map(([tournamentId, group]: [string, any]) => (
                <div key={tournamentId} className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">{group.tournamentName}</h2>
                  </div>
                  
                  <ul className="divide-y divide-gray-200">
                    {group.schedules.map((schedule: any) => (
                    <li key={schedule.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            Day {schedule.day}: {formatDate(schedule.date)}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          {schedule.tournamentId ? (
                            <Link
                              href={`/tournaments/${schedule.tournamentId}/schedule/edit?day=${schedule.day}`}
                              className="text-primary hover:text-primary/80"
                            >
                              <PencilIcon className="h-5 w-5" />
                              <span className="sr-only">Edit</span>
                            </Link>
                          ) : (
                            <button
                              className="text-gray-400"
                              title="Cannot edit - missing tournament ID"
                              disabled
                            >
                              <PencilIcon className="h-5 w-5" />
                              <span className="sr-only">Cannot Edit</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-5 w-5" />
                            <span className="sr-only">Delete</span>
                          </button>
                        </div>
                      </div>
                      
                      {schedule.matches && schedule.matches.length > 0 ? (
                        <div className="mt-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span>{schedule.matches.length} matches scheduled</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span>No matches scheduled yet</span>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )))}
          </div>
        )}
      </div>
    </>
  );
}