import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeftIcon, CheckIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SelectOption, FormatOption } from '@/types/models';

export default function ScheduleBuilder() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data sources
  const [tournaments, setTournaments] = useState<SelectOption[]>([]);
  const [courses, setCourses] = useState<SelectOption[]>([]);
  const [formats, setFormats] = useState<FormatOption[]>([]);
  
  // Selected tournament data
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  
  // Schedule configuration
  const [scheduleConfig, setScheduleConfig] = useState<{
    days: number;
    startDate: string;
    currentDay: number;
  }>({
    days: 3,  // Default to 3 days
    startDate: '',
    currentDay: 1
  });
  
  // Grid-based tee time slots across the entire tournament
  // Format: { day: number, time: string, slots: Array<slot data> }
  const [teeTimeGrid, setTeeTimeGrid] = useState<any[]>([]);
  
  // Template patterns
  const [savedTemplates, setSavedTemplates] = useState<any[]>([
    {
      name: "2-Team Standard",
      pattern: [
        { format: "Singles", holes: 9, startingHole: 1 },
        { format: "Best Ball", holes: 9, startingHole: 10 }
      ]
    },
    {
      name: "Mixed Format Day",
      pattern: [
        { format: "Alternate Shot", holes: 9, startingHole: 1 },
        { format: "Chapman", holes: 9, startingHole: 10 }
      ]
    }
  ]);
  
  // Time slot generation settings
  const [timeSettings, setTimeSettings] = useState({
    startTime: '08:00',
    endTime: '14:00',
    interval: 10 // minutes
  });
  
  // Fetch data for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const authHeaders = {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        };
        
        const [tournamentsRes, coursesRes, formatsRes] = await Promise.all([
          axios.get('/api/tournaments', authHeaders),
          axios.get('/api/courses', authHeaders),
          axios.get('/api/formats', authHeaders)
        ]);
        
        // Check for the new response format structure
        if (tournamentsRes.data && tournamentsRes.data.success && Array.isArray(tournamentsRes.data.data)) {
          setTournaments(tournamentsRes.data.data);
        } else {
          setTournaments(Array.isArray(tournamentsRes.data) ? tournamentsRes.data : []);
        }
        
        // Check for the new response format structure for courses
        console.log("Courses API response:", coursesRes.data);
        if (coursesRes.data && coursesRes.data.success && coursesRes.data.data && coursesRes.data.data.courses) {
          console.log("Using courses from data.data.courses");
          setCourses(coursesRes.data.data.courses);
        } else if (coursesRes.data && coursesRes.data.success && coursesRes.data.courses) {
          console.log("Using courses from data.courses");
          setCourses(coursesRes.data.courses);
        } else if (Array.isArray(coursesRes.data)) {
          console.log("Using courses from direct array");
          setCourses(coursesRes.data);
        } else {
          console.error("Unable to extract courses from response");
          setCourses([]);
        }
        
        // Check for the new response format structure for formats
        if (formatsRes.data && formatsRes.data.success && Array.isArray(formatsRes.data.data)) {
          setFormats(formatsRes.data.data);
        } else {
          setFormats(Array.isArray(formatsRes.data) ? formatsRes.data : []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);
  
  // Handle tournament selection
  useEffect(() => {
    const loadTournamentDetails = async () => {
      if (!selectedTournamentId) {
        setSelectedTournament(null);
        return;
      }
      
      try {
        const authHeaders = {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        };
        
        // Load tournament data
        const response = await axios.get(`/api/tournaments/${selectedTournamentId}`, authHeaders);
        
        // Also fetch tournament-specific courses when tournament changes
        try {
          console.log("Fetching courses for tournament:", selectedTournamentId);
          const coursesResponse = await axios.get(`/api/courses?tournamentId=${selectedTournamentId}`, authHeaders);
          console.log("Tournament-specific courses response:", coursesResponse.data);
          
          // Process course data
          if (coursesResponse.data && coursesResponse.data.success && coursesResponse.data.data && coursesResponse.data.data.courses) {
            console.log("Setting tournament-specific courses from data.data.courses");
            setCourses(coursesResponse.data.data.courses);
          } else if (coursesResponse.data && coursesResponse.data.success && coursesResponse.data.courses) {
            console.log("Setting tournament-specific courses from data.courses");
            setCourses(coursesResponse.data.courses);
          } else if (Array.isArray(coursesResponse.data)) {
            console.log("Setting tournament-specific courses from direct array");
            setCourses(coursesResponse.data);
          }
        } catch (courseError) {
          console.error("Error fetching tournament-specific courses:", courseError);
        }
        
        // Handle both response formats
        let tournament;
        if (response.data?.success && response.data?.data) {
          // New format
          tournament = response.data.data;
        } else if (response.data?.tournament) {
          // Old format
          tournament = response.data.tournament;
        } else if (response.data?.id) {
          // Direct tournament object
          tournament = response.data;
        } else {
          console.error("Unexpected tournament response format:", response.data);
          return;
        }
        
        setSelectedTournament(tournament);
        
        // Set tournament start date
        if (tournament.startDate) {
          const startDate = new Date(tournament.startDate);
          // Use date without time component in ISO format (YYYY-MM-DD)
          setScheduleConfig(prev => ({
            ...prev,
            startDate: startDate.toISOString().split('T')[0]
          }));
          
          // Determine number of days from tournament duration
          if (tournament.endDate) {
            const endDate = new Date(tournament.endDate);
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include end day
            
            setScheduleConfig(prev => ({
              ...prev,
              days: diffDays
            }));
          }
          
          // Initialize tee time grid based on tournament duration
          generateTimeGrid(startDate, tournament.endDate);
        } else {
          console.error("Tournament is missing startDate:", tournament);
        }
      } catch (error) {
        console.error('Error loading tournament details:', error);
      }
    };
    
    loadTournamentDetails();
  }, [selectedTournamentId]);
  
  // Generate array of time slots based on settings
  const generateTimeGrid = (startDate: Date, endDate: string) => {
    console.log("Generating time grid with:", { startDate, endDate });
    if (!startDate) {
      console.error("Cannot generate time grid: startDate is null or undefined");
      return;
    }
    
    // Calculate number of days
    const end = new Date(endDate);
    console.log("End date parsed as:", end);
    const dayDiff = Math.ceil(Math.abs(end.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    console.log("Calculated day difference:", dayDiff);
    
    // Generate time slots for each day
    const grid = [];
    
    console.log("Time settings:", timeSettings);
    
    for (let day = 1; day <= dayDiff; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + (day - 1)); // Day 1 is start date
      console.log(`Generating slots for day ${day}, date: ${date.toISOString()}`);
      
      // Parse start and end times
      const [startHour, startMinute] = timeSettings.startTime.split(':').map(Number);
      const [endHour, endMinute] = timeSettings.endTime.split(':').map(Number);
      console.log("Time range:", { startHour, startMinute, endHour, endMinute });
      
      // Convert to minutes for easier calculation
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      console.log("Minutes range:", { startTotalMinutes, endTotalMinutes });
      
      // Create time slots
      const daySlots = [];
      for (let minutes = startTotalMinutes; minutes <= endTotalMinutes; minutes += timeSettings.interval) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        daySlots.push({
          time: timeString,
          dateString: date.toISOString().split('T')[0],
          slots: [
            // Default to empty slots
            { courseId: '', format: '', startingHole: 1, holes: 9, teams: [] },
            { courseId: '', format: '', startingHole: 10, holes: 9, teams: [] }
          ]
        });
      }
      
      grid.push({
        day,
        date: date.toISOString().split('T')[0],
        dateFormatted: date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric'
        }),
        slots: daySlots
      });
    }
    
    console.log("Setting tee time grid with", grid.length, "days and", 
                grid.reduce((total, day) => total + day.slots.length, 0), "total time slots");
    try {
      setTeeTimeGrid(grid);
      console.log("Tee time grid set successfully");
    } catch (error) {
      console.error("Error setting tee time grid:", error);
    }
  };
  
  // Handle time settings change
  const updateTimeSettings = () => {
    if (selectedTournament?.startDate) {
      generateTimeGrid(
        new Date(selectedTournament.startDate), 
        selectedTournament.endDate
      );
    }
  };
  
  // Filter courses for the selected tournament
  const filteredCourses = useMemo(() => {
    console.log("Filtering courses for tournament:", selectedTournamentId);
    console.log("Available courses:", courses);
    
    // Check different possible structures for tournament ID
    const filteredCourses = courses.filter(course => {
      // Handle tournament ID as direct property
      if (course.tournamentId === selectedTournamentId) {
        return true;
      }
      
      // Handle tournament ID inside tournament object
      if (course.tournament && course.tournament.id === selectedTournamentId) {
        return true;
      }
      
      return false;
    });
    
    console.log("Filtered courses:", filteredCourses);
    return filteredCourses;
  }, [courses, selectedTournamentId]);
  
  // Update slot data
  const updateSlot = (dayIndex: number, timeIndex: number, slotIndex: number, field: string, value: any) => {
    const updatedGrid = [...teeTimeGrid];
    updatedGrid[dayIndex].slots[timeIndex].slots[slotIndex] = {
      ...updatedGrid[dayIndex].slots[timeIndex].slots[slotIndex],
      [field]: value
    };
    setTeeTimeGrid(updatedGrid);
  };
  
  // Apply a template to a specific time slot
  const applyTemplate = (dayIndex: number, timeIndex: number, templateIndex: number) => {
    const template = savedTemplates[templateIndex];
    const updatedGrid = [...teeTimeGrid];
    
    // Apply template pattern to slots
    template.pattern.forEach((patternSlot: any, slotIndex: number) => {
      if (slotIndex < updatedGrid[dayIndex].slots[timeIndex].slots.length) {
        updatedGrid[dayIndex].slots[timeIndex].slots[slotIndex] = {
          ...updatedGrid[dayIndex].slots[timeIndex].slots[slotIndex],
          ...patternSlot,
          // Keep existing courseId if it exists
          courseId: updatedGrid[dayIndex].slots[timeIndex].slots[slotIndex].courseId || 
                    (filteredCourses.length > 0 ? filteredCourses[0].id : '')
        };
      }
    });
    
    setTeeTimeGrid(updatedGrid);
  };
  
  // Apply a template to all time slots in a day
  const applyTemplateToDay = (dayIndex: number, templateIndex: number) => {
    const template = savedTemplates[templateIndex];
    const updatedGrid = [...teeTimeGrid];
    
    updatedGrid[dayIndex].slots.forEach((timeSlot: any, timeIndex: number) => {
      template.pattern.forEach((patternSlot: any, slotIndex: number) => {
        if (slotIndex < timeSlot.slots.length) {
          updatedGrid[dayIndex].slots[timeIndex].slots[slotIndex] = {
            ...updatedGrid[dayIndex].slots[timeIndex].slots[slotIndex],
            ...patternSlot,
            // Keep existing courseId if it exists
            courseId: updatedGrid[dayIndex].slots[timeIndex].slots[slotIndex].courseId || 
                     (filteredCourses.length > 0 ? filteredCourses[0].id : '')
          };
        }
      });
    });
    
    setTeeTimeGrid(updatedGrid);
  };
  
  // Set/clear all slots on a day
  const clearDay = (dayIndex: number) => {
    const updatedGrid = [...teeTimeGrid];
    
    updatedGrid[dayIndex].slots.forEach((timeSlot: any, timeIndex: number) => {
      updatedGrid[dayIndex].slots[timeIndex].slots = updatedGrid[dayIndex].slots[timeIndex].slots.map(() => ({
        courseId: '',
        format: '',
        startingHole: 1,
        holes: 9,
        teams: []
      }));
    });
    
    setTeeTimeGrid(updatedGrid);
  };
  
  // Save the current schedule
  const saveSchedule = async () => {
    if (!selectedTournamentId) {
      alert('Please select a tournament');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Process the tee time grid into API-compatible format
      for (const day of teeTimeGrid) {
        // Skip days with no configured slots
        if (!day.slots.some((slot: any) => 
          slot.slots.some((s: any) => s.format && s.courseId)
        )) {
          continue;
        }
        
        // Collect all matches for this day
        const matches = [];
        
        for (const timeSlot of day.slots) {
          // Skip time slots with no configured slots
          if (!timeSlot.slots.some((s: any) => s.format && s.courseId)) {
            continue;
          }
          
          // Add configured slots as matches
          for (const slot of timeSlot.slots) {
            if (slot.format && slot.courseId) {
              matches.push({
                // Keep time in HH:MM format - stored as is by the API in UTC
                time: timeSlot.time,
                format: slot.format,
                courseId: slot.courseId,
                startingHole: slot.startingHole || 1,
                holes: slot.holes || 9
              });
            }
          }
        }
        
        // Skip if no matches for this day
        if (matches.length === 0) continue;
        
        // Create schedule day with matches
        const scheduleData = {
          tournamentId: selectedTournamentId,
          day: day.day,
          date: day.date,
          matches
        };
        
        await axios.post('/api/schedule/create', scheduleData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      }
      
      alert('Schedule created successfully!');
      router.push('/schedule');
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      alert(error.response?.data?.error || 'Failed to create schedule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render select dropdown options for formats by type
  const renderFormatOptions = () => {
    // Group formats by type
    const singleFormats = formats.filter(f => f.formatName.toLowerCase() === 'singles');
    const twoPersonFormats = formats.filter(f => 
      ['best ball', 'scramble', 'alternate shot', 'mod alt shot', 'modified alternate shot', 'chapman']
      .includes(f.formatName.toLowerCase()) || f.formatName.toLowerCase().includes('2 man')
    );
    const teamFormats = formats.filter(f => f.isFourManTeam);
    
    return (
      <>
        <optgroup label="Individual Formats">
          {singleFormats.map(format => (
            <option key={format.id} value={format.formatName}>
              {format.formatName} (1v1)
            </option>
          ))}
        </optgroup>
        <optgroup label="Two-Person Formats">
          {twoPersonFormats.map(format => (
            <option key={format.id} value={format.formatName}>
              {format.formatName} (2v2)
            </option>
          ))}
        </optgroup>
        <optgroup label="Team Formats">
          {teamFormats.map(format => (
            <option key={format.id} value={format.formatName}>
              {format.formatName} (4-man)
            </option>
          ))}
        </optgroup>
      </>
    );
  };
  
  return (
    <>
      <Head>
        <title>Schedule Builder | Gull Lake Golf Tournament</title>
      </Head>

      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-full">
        <div className="mb-6">
          <Link href="/schedule" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Schedule
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Left sidebar - Configuration */}
          <div className="lg:w-80 flex-shrink-0 space-y-4">
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Tournament</h2>
              </div>
              <div className="p-4">
                <select
                  className="block w-full rounded-md border-0 py-1.5 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary"
                  value={selectedTournamentId}
                  onChange={(e) => setSelectedTournamentId(e.target.value)}
                >
                  <option value="">Select a tournament</option>
                  {tournaments.map((tournament) => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </option>
                  ))}
                </select>
                
                {selectedTournament && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Start: {new Date(selectedTournament.startDate).toLocaleDateString()}</p>
                    <p>End: {new Date(selectedTournament.endDate).toLocaleDateString()}</p>
                    <p>Duration: {scheduleConfig.days} days</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Time Settings</h2>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="time"
                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                    value={timeSettings.startTime}
                    onChange={(e) => setTimeSettings({...timeSettings, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="time"
                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                    value={timeSettings.endTime}
                    onChange={(e) => setTimeSettings({...timeSettings, endTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Interval (minutes)</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                    value={timeSettings.interval}
                    onChange={(e) => setTimeSettings({...timeSettings, interval: parseInt(e.target.value)})}
                  >
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={updateTimeSettings}
                  className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                >
                  Update Time Grid
                </button>
              </div>
            </div>
            
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Templates</h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {savedTemplates.map((template, idx) => (
                    <div key={idx} className="p-2 border border-gray-200 rounded-md bg-gray-50">
                      <p className="text-sm font-medium">{template.name}</p>
                      <div className="mt-1 text-xs text-gray-600">
                        {template.pattern.map((p: any, i: number) => (
                          <div key={i}>
                            {p.format} ({p.holes} holes, starts at {p.startingHole})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
              </div>
              <div className="p-4">
                <button
                  type="button"
                  onClick={saveSchedule}
                  disabled={isSubmitting || !selectedTournamentId}
                  className="w-full inline-flex justify-center items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Main content - Schedule Grid */}
          <div className="flex-grow">
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Schedule Builder</h2>
                {teeTimeGrid.length > 0 && (
                  <div className="flex space-x-2">
                    {teeTimeGrid.map((day, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`px-3 py-1 text-sm rounded-md ${
                          scheduleConfig.currentDay === day.day
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setScheduleConfig({...scheduleConfig, currentDay: day.day})}
                      >
                        Day {day.day}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {!selectedTournamentId ? (
                <div className="p-8 text-center text-gray-500">
                  <p>Please select a tournament to start building the schedule</p>
                </div>
              ) : teeTimeGrid.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>Generating time grid...</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  {/* Current day */}
                  {teeTimeGrid.map((day, dayIndex) => (
                    <div key={dayIndex} className={day.day === scheduleConfig.currentDay ? 'block' : 'hidden'}>
                      <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-md font-medium text-gray-900">
                          Day {day.day} - {day.dateFormatted}
                        </h3>
                        <div className="flex space-x-2">
                          <div className="relative">
                            <select
                              className="appearance-none pl-3 pr-10 py-1 text-xs bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                              onChange={(e) => applyTemplateToDay(dayIndex, parseInt(e.target.value))}
                              defaultValue=""
                            >
                              <option value="" disabled>Apply template...</option>
                              {savedTemplates.map((template, idx) => (
                                <option key={idx} value={idx}>{template.name}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => clearDay(dayIndex)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100"
                          >
                            <TrashIcon className="h-3 w-3 mr-1" />
                            Clear Day
                          </button>
                        </div>
                      </div>
                      
                      {/* Time slots grid */}
                      <div className="p-4">
                        <div className="grid grid-cols-1 gap-3">
                          {day.slots.map((timeSlot: any, timeIndex: number) => (
                            <div key={timeIndex} className="border border-gray-200 rounded-md overflow-hidden">
                              <div className="bg-gray-50 px-3 py-2 flex justify-between items-center">
                                <div className="text-sm font-medium">{timeSlot.time}</div>
                                <div className="relative">
                                  <select
                                    className="appearance-none pl-2 pr-8 py-1 text-xs bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    onChange={(e) => applyTemplate(dayIndex, timeIndex, parseInt(e.target.value))}
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Apply template...</option>
                                    {savedTemplates.map((template, idx) => (
                                      <option key={idx} value={idx}>{template.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                                {timeSlot.slots.map((slot: any, slotIndex: number) => (
                                  <div key={slotIndex} className="p-2 border border-gray-100 rounded bg-gray-50">
                                    <div className="grid grid-cols-2 gap-2">
                                      {/* Format selection */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700">Format</label>
                                        <select
                                          className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                          value={slot.format}
                                          onChange={(e) => updateSlot(dayIndex, timeIndex, slotIndex, 'format', e.target.value)}
                                        >
                                          <option value="">Select format</option>
                                          {renderFormatOptions()}
                                        </select>
                                      </div>
                                      
                                      {/* Course selection */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700">Course</label>
                                        <select
                                          className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                          value={slot.courseId}
                                          onChange={(e) => updateSlot(dayIndex, timeIndex, slotIndex, 'courseId', e.target.value)}
                                        >
                                          <option value="">Select course</option>
                                          {filteredCourses.length === 0 && (
                                            <option value="" disabled>No courses available for this tournament</option>
                                          )}
                                          {filteredCourses.map(course => {
                                            // Check if course has necessary data
                                            const displayName = course.name || 
                                                              (course.tournament ? `Course for ${course.tournament.name}` : 
                                                              'Unnamed Course');
                                            
                                            return (
                                              <option key={course.id} value={course.id}>
                                                {displayName}
                                              </option>
                                            );
                                          })}
                                        </select>
                                      </div>
                                      
                                      {/* Holes */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700">Holes</label>
                                        <select
                                          className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                          value={slot.holes}
                                          onChange={(e) => updateSlot(dayIndex, timeIndex, slotIndex, 'holes', parseInt(e.target.value))}
                                        >
                                          <option value="9">9 Holes</option>
                                          <option value="18">18 Holes</option>
                                        </select>
                                      </div>
                                      
                                      {/* Starting hole */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700">Starting Hole</label>
                                        <select
                                          className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                          value={slot.startingHole}
                                          onChange={(e) => updateSlot(dayIndex, timeIndex, slotIndex, 'startingHole', parseInt(e.target.value))}
                                        >
                                          <option value="1">Front 9 (Hole 1)</option>
                                          <option value="10">Back 9 (Hole 10)</option>
                                        </select>
                                      </div>
                                    </div>
                                    
                                    {/* Status indicator */}
                                    {slot.format && slot.courseId ? (
                                      <div className="mt-2 flex items-center text-xs text-green-700">
                                        <CheckIcon className="h-3 w-3 mr-1" />
                                        Configured
                                      </div>
                                    ) : (
                                      <div className="mt-2 text-xs text-gray-400">
                                        Not configured
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}