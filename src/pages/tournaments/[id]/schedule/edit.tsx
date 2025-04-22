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

// Fetch function for SWR with enhanced handling of structured API responses
const fetcher = async (url: string) => {
  console.log(`Fetching data from: ${url}`);
  const response = await axios.get(url);
  const responseData = response.data;
  
  console.log(`Response from ${url}:`, responseData);
  
  // Handle both API response formats
  if (responseData && typeof responseData === 'object' && responseData.success === true) {
    // New API format with success field
    console.log(`Using new API response format for ${url}`);
    return responseData; // Return the full response including success, data, etc.
  } else {
    // Old direct data format
    console.log(`Using direct data format for ${url}`);
    return responseData;
  }
};

export default function EditSchedule() {
  const router = useRouter();
  const { id } = router.query;
  const [saving, setSaving] = useState(false);
  const [scheduleData, setScheduleData] = useState<any[]>([]);

  // Fetch tournament data - schedule display relies on getting formatted schedule data
  const { data: tournamentData, error: tournamentError, isLoading: tournamentLoading, mutate: mutateTournament } = useSWR(
    id ? `/api/tournaments/${id}?includeFull=true` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10 seconds
      onSuccess: (data) => {
        console.log("Tournament data fetched successfully:", data);
      },
      onError: (err) => {
        console.error("Error fetching tournament data:", err);
      }
    }
  );
  
  // Fetch format data specifically for this tournament
  const { data: formatData, error: formatError, isLoading: formatsLoading } = useSWR(
    id ? `/api/formats?tournamentId=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000 // 10 seconds
    }
  );

  // Extract tournament data with enhanced debugging
  console.log("Tournament data received:", tournamentData);
  
  let tournament;
  if (tournamentData?.success && tournamentData?.data) {
    // New API format
    console.log("Using new API format, tournament data in data field");
    tournament = tournamentData.data;
  } else if (tournamentData?.tournament) {
    // Old format with tournament field
    console.log("Using old format with tournament field");
    tournament = tournamentData.tournament;
  } else {
    // Direct object format
    console.log("Using direct tournament object");
    tournament = tournamentData;
  }
  
  console.log("Extracted tournament:", tournament);
  console.log("Tournament schedules:", tournament?.schedules);
  
  // Format data handling with debugging
  console.log("Raw format data:", formatData);
  
  // Extract formats array based on response structure
  let formatsArray: any[] = [];
  
  if (formatData) {
    if (Array.isArray(formatData)) {
      // Direct array format
      formatsArray = formatData;
    } else if (formatData.success && Array.isArray(formatData.data)) {
      // New API format with success and data fields
      formatsArray = formatData.data;
    } else if (formatData.data && Array.isArray(formatData.data)) {
      // Nested data field
      formatsArray = formatData.data;
    } else if (formatData.success && formatData.data) {
      // Try other potential paths in the response
      if (Array.isArray(formatData.data.formats)) {
        formatsArray = formatData.data.formats;
      } else if (typeof formatData.data === 'object' && formatData.data.formats) {
        formatsArray = formatData.data.formats;
      }
    }
  }
  
  console.log("Extracted formats array:", formatsArray);
  
  // Map formats to format options if we have a valid array
  const formatOptions = Array.isArray(formatsArray) ? formatsArray.map((format: any) => {
    // Debug log to inspect format data
    if (format && format.formatName && format.id) {
      console.log(`Format loaded: ${format.formatName} (ID: ${format.id})`);
      return {
        id: format.id,
        name: format.formatName
      };
    } else {
      console.warn("Skipping format with missing data:", format);
      return null;
    }
  }).filter(Boolean) : [];
  
  // Log format options summary
  console.log(`Loaded ${formatOptions.length} format options for tournament`);
  if (formatOptions.length === 0 && !formatsLoading) {
    console.warn('No format options available - this may cause issues with match creation');
  }
  
  // Initialize schedule data when tournament data is loaded
  useEffect(() => {
    console.log("Schedule initialization triggered");
    console.log("Tournament for schedule init:", tournament);
    
    // Check for schedules in various possible locations in the response
    const schedules = tournament?.schedules || // Direct schedules property
                    tournament?.data?.schedules || // In nested data object
                    (tournament?.success && tournament?.data?.schedules); // In new API format
    
    console.log("Found schedules:", schedules);
    
    if (schedules && Array.isArray(schedules) && schedules.length > 0) {
      console.log(`Found ${schedules.length} schedules to process`);
      
      // Convert existing schedules to new format if needed
      const convertedSchedules = schedules.map((day: any, index: number) => {
        console.log(`Processing schedule day ${index + 1}:`, day);
        
        // Group matches by tee time to create tee slots
        const teeSlots: Record<string, any[]> = {};
        
        if (day.matches && Array.isArray(day.matches)) {
          console.log(`Processing ${day.matches.length} matches for day ${index + 1}`);
          
          day.matches.forEach((match: any, matchIndex: number) => {
            console.log(`Match ${matchIndex + 1} time:`, match.time);
            
            if (!teeSlots[match.time]) {
              teeSlots[match.time] = [];
            }
            
            teeSlots[match.time].push({
              ...match,
              holes: match.holes || 9, // Default to 9 holes if not specified
            });
          });
        } else {
          console.warn(`No matches found for day ${index + 1} or matches is not an array:`, day.matches);
        }
        
        // Convert to array of tee slots
        const teeTimes = Object.keys(teeSlots).map(time => ({
          id: `teetime-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          time,
          matches: teeSlots[time]
        }));
        
        console.log(`Created ${teeTimes.length} tee times for day ${index + 1}`);
        
        return {
          ...day,
          teeTimes: teeTimes.length > 0 ? teeTimes : []
        };
      });
      
      console.log("Setting schedule data with converted schedules:", convertedSchedules);
      setScheduleData(convertedSchedules);
    } else if (tournament && !scheduleData.length) {
      console.log("No existing schedules found, creating empty schedule template");
      
      if (!tournament.startDate || !tournament.endDate) {
        console.error("Tournament missing start or end date:", 
          { startDate: tournament.startDate, endDate: tournament.endDate });
        return;
      }
      
      try {
        // Initialize with empty schedule if none exists
        const startDate = new Date(tournament.startDate);
        const endDate = new Date(tournament.endDate);
        
        console.log("Tournament date range:", 
          { startDate: startDate.toISOString(), endDate: endDate.toISOString() });
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error("Invalid date format for tournament start/end dates");
          return;
        }
        
        const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        console.log(`Creating schedule for ${days} days`);
        
        const initialSchedule = [];
        let currentDate = new Date(startDate);
        
        for (let i = 0; i < days; i++) {
          const dayObj = {
            id: `day-${i+1}`,
            day: i + 1,
            date: new Date(currentDate).toISOString().split('T')[0],
            teeTimes: []
          };
          
          initialSchedule.push(dayObj);
          console.log(`Created day ${i+1} for ${dayObj.date}`);
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log("Setting schedule data with initial template:", initialSchedule);
        setScheduleData(initialSchedule);
      } catch (error) {
        console.error("Error creating initial schedule:", error);
      }
    } else {
      console.warn("Could not initialize schedule data:", {
        hasSchedules: Boolean(tournament?.schedules),
        schedulesIsArray: Array.isArray(tournament?.schedules),
        schedulesLength: tournament?.schedules?.length
      });
    }
  }, [tournament, scheduleData.length]);

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
    // Ensure courses exist before accessing ID
    const defaultCourseId = tournament?.courses?.[0]?.id;

    const newMatch = {
      id: `match-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      format: formatOptions.length > 0 ? formatOptions[0].name : 'Four-Ball', // Default format name
      formatId: formatOptions.length > 0 ? formatOptions[0].id : undefined, // Store format ID
      holes: 9, // Default to 9 holes
      courseId: defaultCourseId, // Set default course ID
      startingHole: 1 // Default starting hole
    };

    // Optionally add validation or a message if no default course is available
    if (!defaultCourseId) {
        console.warn("No default course found when adding a new match.");
        // Decide how to handle: maybe leave courseId undefined, 
        // or prevent adding match, or require selection later.
        // For now, we allow adding it with undefined courseId, 
        // user must select one before saving.
    }
    
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
    
    // Special handling when format name changes - we need to update formatId too
    if (field === 'format') {
      const selectedFormat = formatOptions.find(format => format.name === value);
      if (selectedFormat) {
        updatedSchedule[dayIndex].teeTimes[teeTimeIndex].matches[matchIndex].formatId = selectedFormat.id;
      }
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
  if (tournamentLoading || formatsLoading) {
    return <div className="p-8 text-center">Loading tournament details and formats...</div>;
  }
  
  if ((tournamentError || formatError) || !tournament) {
    return <div className="p-8 text-center text-red-600">
      Error loading tournament data. Please try again.
      {tournamentError && <p className="text-sm">{tournamentError.message}</p>}
      {formatError && <p className="text-sm">{formatError.message}</p>}
    </div>;
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
            {formatOptions.length === 0 && (
              <p className="mt-1 text-xs text-red-600">
                Warning: No format options available. This will cause issues with match creation.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {formatOptions.length === 0 && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const defaultFormats = [
                      { formatName: 'Singles', multiplier: 1.0, points: 1.0, halfPoints: 0.5 },
                      { formatName: 'Best Ball', multiplier: 0.9, points: 1.0, halfPoints: 0.5 },
                      { formatName: 'Alternate Shot', multiplier: 0.7, points: 1.0, halfPoints: 0.5 },
                      { formatName: 'Chapman', multiplier: 0.6, points: 1.0, halfPoints: 0.5 },
                      { formatName: 'Scramble', multiplier: 0.4, points: 1.0, halfPoints: 0.5 },
                    ];
                    
                    for (const format of defaultFormats) {
                      await axios.post('/api/formats', {
                        ...format,
                        tournamentId: id
                      });
                    }
                    
                    // Refresh the formats
                    window.location.reload();
                  } catch (error) {
                    console.error('Error creating default formats:', error);
                    alert('Failed to create default formats. Please try again.');
                  }
                }}
                className="mt-4 sm:mt-0 bg-yellow-100 border border-yellow-500 text-yellow-800 px-3 py-2 rounded text-sm font-medium"
              >
                Create Default Formats
              </button>
            )}
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
                                              <option key={format.id} value={format.name}>
                                                {format.name}
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
                                          value={match.courseId || ''} // Use courseId for value
                                          onChange={(e) => updateMatch(dayIndex, teeTimeIndex, matchIndex, 'courseId', e.target.value)} // Update courseId
                                          className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                          required // Make course selection mandatory before save
                                        >
                                          <option value="" disabled>Select Course...</option> {/* Add placeholder */}
                                          {tournament.courses && tournament.courses.length > 0 ? (
                                            tournament.courses.map((course: any) => (
                                              <option key={course.id} value={course.id}> {/* Option value is ID */}
                                                {course.name}
                                              </option>
                                            ))
                                          ) : (
                                            <option value="" disabled>No courses available</option> /* Handle no courses case */
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