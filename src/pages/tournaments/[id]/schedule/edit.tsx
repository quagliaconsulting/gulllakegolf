import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import useSWR from 'swr';
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  TrashIcon, 
  ArrowPathIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function EditSchedule() {
  const router = useRouter();
  const { id } = router.query;
  const [saving, setSaving] = useState(false);
  const [scheduleData, setScheduleData] = useState<any[]>([]);

  // Fetch tournament data
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/tournaments/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000 // 10 seconds
    }
  );

  // Extract tournament and formats
  const tournament = data?.tournament;
  const formatOptions = tournament?.formatMultipliers?.map((format: any) => format.formatName) || [];
  
  // Initialize schedule data when tournament data is loaded
  useEffect(() => {
    if (tournament?.schedules) {
      // Convert existing schedules to new format if needed
      const convertedSchedules = tournament.schedules.map((day: any) => {
        // Group matches by tee time to create tee slots
        const teeSlots: Record<string, any[]> = {};
        
        if (day.matches) {
          day.matches.forEach((match: any) => {
            if (!teeSlots[match.time]) {
              teeSlots[match.time] = [];
            }
            teeSlots[match.time].push({
              ...match,
              holes: match.holes || 9, // Default to 9 holes if not specified
            });
          });
        }
        
        // Convert to array of tee slots
        const teeTimes = Object.keys(teeSlots).map(time => ({
          id: `teetime-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          time,
          matches: teeSlots[time]
        }));
        
        return {
          ...day,
          teeTimes: teeTimes.length > 0 ? teeTimes : []
        };
      });
      
      setScheduleData(convertedSchedules);
    } else if (tournament && !scheduleData.length) {
      // Initialize with empty schedule if none exists
      const days = Math.round((new Date(tournament.endDate).getTime() - new Date(tournament.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const initialSchedule = [];
      let currentDate = new Date(tournament.startDate);
      
      for (let i = 0; i < days; i++) {
        initialSchedule.push({
          id: `day-${i+1}`,
          day: i + 1,
          date: new Date(currentDate).toISOString().split('T')[0],
          teeTimes: []
        });
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setScheduleData(initialSchedule);
    }
  }, [tournament]);

  // Add a new tee time to a day
  const addTeeTime = (dayIndex: number) => {
    const updatedSchedule = [...scheduleData];
    const newTeeTime = {
      id: `teetime-${Date.now()}`,
      time: '08:00',
      matches: []
    };
    
    updatedSchedule[dayIndex].teeTimes.push(newTeeTime);
    setScheduleData(updatedSchedule);
  };

  // Remove a tee time
  const removeTeeTime = (dayIndex: number, teeTimeIndex: number) => {
    const updatedSchedule = [...scheduleData];
    updatedSchedule[dayIndex].teeTimes.splice(teeTimeIndex, 1);
    setScheduleData(updatedSchedule);
  };

  // Add a new match to a tee time
  const addMatch = (dayIndex: number, teeTimeIndex: number) => {
    const updatedSchedule = [...scheduleData];
    const newMatch = {
      id: `match-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      format: formatOptions[0] || 'Four-Ball',
      holes: 9, // Default to 9 holes
      teams: [tournament?.teams?.[0]?.name || 'Team A', tournament?.teams?.[1]?.name || 'Team B'],
      course: tournament?.courses?.[0]?.name || 'Main Course',
      homeTeam: tournament?.teams?.[0]?.name || 'Team A',
      awayTeam: tournament?.teams?.[1]?.name || 'Team B',
      startingHole: 1
    };
    
    updatedSchedule[dayIndex].teeTimes[teeTimeIndex].matches.push(newMatch);
    setScheduleData(updatedSchedule);
  };

  // Remove a match
  const removeMatch = (dayIndex: number, teeTimeIndex: number, matchIndex: number) => {
    const updatedSchedule = [...scheduleData];
    updatedSchedule[dayIndex].teeTimes[teeTimeIndex].matches.splice(matchIndex, 1);
    setScheduleData(updatedSchedule);
  };

  // Update tee time
  const updateTeeTime = (dayIndex: number, teeTimeIndex: number, field: string, value: any) => {
    const updatedSchedule = [...scheduleData];
    updatedSchedule[dayIndex].teeTimes[teeTimeIndex] = {
      ...updatedSchedule[dayIndex].teeTimes[teeTimeIndex],
      [field]: value
    };
    setScheduleData(updatedSchedule);
  };

  // Update match data
  const updateMatch = (dayIndex: number, teeTimeIndex: number, matchIndex: number, field: string, value: any) => {
    const updatedSchedule = [...scheduleData];
    updatedSchedule[dayIndex].teeTimes[teeTimeIndex].matches[matchIndex] = {
      ...updatedSchedule[dayIndex].teeTimes[teeTimeIndex].matches[matchIndex],
      [field]: value
    };
    
    // Special case for teams selection
    if (field === 'homeTeam' || field === 'awayTeam') {
      const teams = [
        field === 'homeTeam' ? value : updatedSchedule[dayIndex].teeTimes[teeTimeIndex].matches[matchIndex].homeTeam,
        field === 'awayTeam' ? value : updatedSchedule[dayIndex].teeTimes[teeTimeIndex].matches[matchIndex].awayTeam
      ];
      updatedSchedule[dayIndex].teeTimes[teeTimeIndex].matches[matchIndex].teams = teams;
    }
    
    setScheduleData(updatedSchedule);
  };

  // Update day data
  const updateDay = (dayIndex: number, field: string, value: any) => {
    const updatedSchedule = [...scheduleData];
    updatedSchedule[dayIndex] = {
      ...updatedSchedule[dayIndex],
      [field]: value
    };
    setScheduleData(updatedSchedule);
  };

  // Flatten schedule data for API
  const flattenScheduleData = (dataToFlatten = scheduleData) => {
    return dataToFlatten.map(day => {
      const matches = day.teeTimes.flatMap((teeTime: any) => 
        teeTime.matches.map((match: any) => ({
          ...match,
          time: teeTime.time // Set the time from the tee time
        }))
      );
      
      return {
        ...day,
        matches
      };
    });
  };

  // Save schedule
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Format dates to ensure consistent UTC handling
      const formattedSchedule = scheduleData.map(day => {
        // Ensure date is in YYYY-MM-DD format without time component
        const dateObj = new Date(day.date);
        const formattedDate = dateObj.toISOString().split('T')[0];
        
        return {
          ...day,
          date: formattedDate,
          teeTimes: day.teeTimes.map((teeTime: any) => ({
            ...teeTime,
            matches: teeTime.matches.map((match: any) => ({
              ...match,
              // Ensure time is in HH:MM format
              time: teeTime.time && teeTime.time.includes(':') 
                ? teeTime.time 
                : teeTime.time + ':00'
            }))
          }))
        };
      });
      
      // Flatten schedule data for API
      const flattenedSchedule = flattenScheduleData(formattedSchedule);
      
      // Log the data being sent to help debug
      console.log('Sending schedule data:', JSON.stringify(flattenedSchedule, null, 2));
      
      const response = await axios.post(`/api/tournaments/${id}/schedule`, {
        schedule: flattenedSchedule
      });
      
      console.log('Save response:', response);
      alert('Schedule saved successfully');
      router.push(`/tournaments/${id}`);
    } catch (error) {
      console.error('Error saving schedule:', error);
      let errorMessage = 'Failed to save schedule. Please try again.';
      
      // Type assertion for error object
      const err = error as any;
      if (err.response && err.response.data) {
        errorMessage += ' Error: ' + (err.response.data.details || err.response.data.error || err.message);
      }
      
      alert(errorMessage);
      setSaving(false);
    }
  };

  // If tournament doesn't exist or is still loading
  if (isLoading) {
    return <div className="p-8 text-center">Loading tournament details...</div>;
  }
  
  if (error || !tournament) {
    return <div className="p-8 text-center text-red-600">Error loading tournament. Please try again.</div>;
  }

  return (
    <>
      <Head>
        <title>Edit Schedule | {tournament.name}</title>
      </Head>

      <div>
        <div className="mb-8">
          <Link href={`/tournaments/${id}`} passHref legacyBehavior={false} className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Tournament
          </Link>
        </div>

        <div className="mb-6 sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tournament Schedule</h1>
            <p className="mt-2 text-sm text-gray-700">
              Configure tee times and matches for {tournament.name}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-4 sm:mt-0 btn-primary flex items-center"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                Saving...
              </>
            ) : (
              'Save Schedule'
            )}
          </button>
        </div>

        {scheduleData.length === 0 ? (
          <div className="bg-white shadow sm:rounded-lg p-6 text-center">
            <p className="text-gray-500">No schedule days configured yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {scheduleData.map((day, dayIndex) => (
              <div key={day.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Day {day.day}</h3>
                        <input
                          type="date"
                          value={typeof day.date === 'string' ? day.date.split('T')[0] : new Date(day.date).toISOString().split('T')[0]}
                          onChange={(e) => updateDay(dayIndex, 'date', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addTeeTime(dayIndex)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      <PlusIcon className="-ml-1 mr-1 h-4 w-4" />
                      Add Tee Time
                    </button>
                  </div>
                </div>
                
                {/* Tee Times and Matches */}
                <div className="bg-white">
                  {day.teeTimes.length === 0 ? (
                    <div className="text-center py-6 px-4 sm:px-6">
                      <p className="text-sm text-gray-500">No tee times scheduled for this day.</p>
                      <button
                        type="button"
                        onClick={() => addTeeTime(dayIndex)}
                        className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        <PlusIcon className="-ml-1 mr-1 h-4 w-4" />
                        Add Tee Time
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {day.teeTimes.map((teeTime: any, teeTimeIndex: number) => (
                        <div key={teeTime.id} className="p-4 sm:px-6">
                          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md mb-4">
                            <div>
                              <h4 className="text-md font-medium text-gray-800 flex items-center">
                                <ClockIcon className="h-4 w-4 text-gray-500 mr-2" />
                                Tee Time {teeTimeIndex + 1}
                              </h4>
                              <div className="mt-1 max-w-sm">
                                <input
                                  type="time"
                                  value={teeTime.time}
                                  onChange={(e) => updateTeeTime(dayIndex, teeTimeIndex, 'time', e.target.value)}
                                  className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                />
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => addMatch(dayIndex, teeTimeIndex)}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary hover:bg-primary/20"
                              >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Add Match
                              </button>
                              <button
                                type="button"
                                onClick={() => removeTeeTime(dayIndex, teeTimeIndex)}
                                className="inline-flex items-center p-1 text-xs rounded-full text-red-600 hover:bg-red-50"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Matches for this tee time */}
                          <div className="pl-4">
                            {teeTime.matches.length === 0 ? (
                              <div className="text-center py-4">
                                <p className="text-sm text-gray-500">No matches yet for this tee time</p>
                                <button
                                  type="button"
                                  onClick={() => addMatch(dayIndex, teeTimeIndex)}
                                  className="mt-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary hover:bg-primary/20"
                                >
                                  <PlusIcon className="h-3 w-3 mr-1" />
                                  Add Match
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {teeTime.matches.map((match: any, matchIndex: number) => (
                                  <div key={match.id} className="border border-gray-200 rounded-md p-3 relative">
                                    <button
                                      type="button"
                                      onClick={() => removeMatch(dayIndex, teeTimeIndex, matchIndex)}
                                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                    
                                    <div className="mb-3">
                                      <span className="text-sm font-medium text-primary">Match {matchIndex + 1}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                      {/* Format */}
                                      <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-700">Format</label>
                                        <select
                                          value={match.format}
                                          onChange={(e) => updateMatch(dayIndex, teeTimeIndex, matchIndex, 'format', e.target.value)}
                                          className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                          {formatOptions.length > 0 ? (
                                            formatOptions.map((format: any) => (
                                              <option key={format} value={format}>
                                                {format}
                                              </option>
                                            ))
                                          ) : (
                                            <>
                                              <option value="Four-Ball">Four-Ball</option>
                                              <option value="Foursomes">Foursomes</option>
                                              <option value="Singles">Singles</option>
                                            </>
                                          )}
                                        </select>
                                      </div>
                                      
                                      {/* Number of Holes */}
                                      <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-700">Holes</label>
                                        <select
                                          value={match.holes}
                                          onChange={(e) => updateMatch(dayIndex, teeTimeIndex, matchIndex, 'holes', parseInt(e.target.value))}
                                          className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                          <option value="9">9 Holes</option>
                                          <option value="18">18 Holes</option>
                                        </select>
                                      </div>
                                      
                                      {/* Course */}
                                      <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-700">Course</label>
                                        <select
                                          value={match.course}
                                          onChange={(e) => updateMatch(dayIndex, teeTimeIndex, matchIndex, 'course', e.target.value)}
                                          className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                          {tournament.courses && tournament.courses.length > 0 ? (
                                            tournament.courses.map((course: any) => (
                                              <option key={course.id} value={course.name}>
                                                {course.name}
                                              </option>
                                            ))
                                          ) : (
                                            <option value="Main Course">Main Course</option>
                                          )}
                                        </select>
                                      </div>
                                      
                                      {/* Starting Hole */}
                                      <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-700">Starting Hole</label>
                                        <select
                                          value={match.startingHole || 1}
                                          onChange={(e) => updateMatch(dayIndex, teeTimeIndex, matchIndex, 'startingHole', parseInt(e.target.value))}
                                          className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                          <option value="1">Hole 1</option>
                                          <option value="10">Hole 10</option>
                                        </select>
                                      </div>
                                      
                                      {/* Home Team */}
                                      <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-700">Home Team</label>
                                        <select
                                          value={match.homeTeam}
                                          onChange={(e) => updateMatch(dayIndex, teeTimeIndex, matchIndex, 'homeTeam', e.target.value)}
                                          className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                          {tournament.teams && tournament.teams.length > 0 ? (
                                            tournament.teams.map((team: any) => (
                                              <option key={team.id} value={team.name}>
                                                {team.name}
                                              </option>
                                            ))
                                          ) : (
                                            <>
                                              <option value="Team A">Team A</option>
                                              <option value="Team B">Team B</option>
                                            </>
                                          )}
                                        </select>
                                      </div>
                                      
                                      {/* Away Team */}
                                      <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-700">Away Team</label>
                                        <select
                                          value={match.awayTeam}
                                          onChange={(e) => updateMatch(dayIndex, teeTimeIndex, matchIndex, 'awayTeam', e.target.value)}
                                          className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                          {tournament.teams && tournament.teams.length > 0 ? (
                                            tournament.teams.map((team: any) => (
                                              <option key={team.id} value={team.name}>
                                                {team.name}
                                              </option>
                                            ))
                                          ) : (
                                            <>
                                              <option value="Team A">Team A</option>
                                              <option value="Team B">Team B</option>
                                            </>
                                          )}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <Link
            href={`/tournaments/${id}`}
            passHref
            legacyBehavior={false}
            className="mr-4 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                Saving...
              </>
            ) : (
              'Save Schedule'
            )}
          </button>
        </div>
      </div>
    </>
  );
}