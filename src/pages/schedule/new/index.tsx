import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeftIcon, PlusIcon, XMarkIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { SelectOption, TeamOption, FormatOption } from '../../../types/models';

export default function NewSchedule() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tournaments, setTournaments] = useState<SelectOption[]>([]);
  const [courses, setCourses] = useState<SelectOption[]>([]);
  const [formats, setFormats] = useState<FormatOption[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [formData, setFormData] = useState({
    tournamentId: '',
    day: 1,
    date: new Date().toISOString().split('T')[0],
    teeTimes: [
      {
        id: `teetime-${Date.now()}`,
        time: '08:00',
        format: '',
        courseId: '',
        startingHole: 1,
        holes: 9
      }
    ]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch data for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const authHeaders = {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        };
        
        // Fetch tournaments from API
        const tournamentsResponse = await axios.get('/api/tournaments', authHeaders);
        if (Array.isArray(tournamentsResponse.data)) {
          setTournaments(tournamentsResponse.data);
        }
        
        // Fetch courses from API
        const coursesResponse = await axios.get('/api/courses', authHeaders);
        if (Array.isArray(coursesResponse.data)) {
          setCourses(coursesResponse.data);
        }
        
        // Get formats from the API
        const formatsResponse = await axios.get('/api/formats', authHeaders);
        if (Array.isArray(formatsResponse.data)) {
          setFormats(formatsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        
        // No fallback data - use empty arrays
        setTournaments([]);
        setCourses([]);
        setFormats([]);
      }
    };

    fetchData();
  }, []);

  // Update date when tournament or day changes
  useEffect(() => {
    if (selectedTournament && selectedTournament.startDate && formData.day) {
      // Calculate date based on start date and day number
      const startDate = new Date(selectedTournament.startDate);
      const dayOffset = formData.day - 1; // Day 1 = start date, Day 2 = start date + 1, etc.
      const calculatedDate = new Date(startDate);
      calculatedDate.setDate(startDate.getDate() + dayOffset);
      
      setFormData(prev => ({
        ...prev,
        date: calculatedDate.toISOString().split('T')[0]
      }));
    }
  }, [selectedTournament, formData.day]);

  // Handle tournament change
  const handleTournamentChange = async (tournamentId: string) => {
    setFormData(prev => ({
      ...prev,
      tournamentId,
      teeTimes: [
        {
          id: `teetime-${Date.now()}`,
          time: '08:00',
          format: '',
          courseId: '',
          startingHole: 1,
          holes: 9
        }
      ]
    }));
    
    // Clear error
    if (errors.tournamentId) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.tournamentId;
        return newErrors;
      });
    }
    
    // Fetch tournament details to get start date
    if (tournamentId) {
      try {
        const response = await axios.get(`/api/tournaments/${tournamentId}`);
        if (response.data && response.data.tournament) {
          setSelectedTournament(response.data.tournament);
        }
      } catch (error) {
        console.error('Error fetching tournament details:', error);
      }
    } else {
      setSelectedTournament(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'tournamentId') {
      handleTournamentChange(value);
    } else if (name === 'day') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 1 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Add a new tee time
  const addTeeTime = () => {
    setFormData(prev => ({
      ...prev,
      teeTimes: [
        ...prev.teeTimes,
        {
          id: `teetime-${Date.now()}`,
          time: '08:00',
          format: '',
          courseId: '',
          startingHole: 1,
          holes: 9
        }
      ]
    }));
  };

  // Remove a tee time
  const removeTeeTime = (teeTimeIndex: number) => {
    if (formData.teeTimes.length === 1) {
      return; // Keep at least one tee time
    }

    setFormData(prev => ({
      ...prev,
      teeTimes: prev.teeTimes.filter((_, i) => i !== teeTimeIndex)
    }));
  };

  // Update tee time
  const updateTeeTime = (teeTimeIndex: number, field: string, value: any) => {
    const newTeeTimes = [...formData.teeTimes];
    newTeeTimes[teeTimeIndex] = {
      ...newTeeTimes[teeTimeIndex],
      [field]: value
    };
    setFormData(prev => ({ ...prev, teeTimes: newTeeTimes }));
    
    // Clear error
    const errorKey = `teeTimes.${teeTimeIndex}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  // Flatten schedule data for API
  const flattenScheduleData = () => {
    const matches = formData.teeTimes.map(teeTime => ({
      id: `match-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      time: teeTime.time,
      format: teeTime.format,
      courseId: teeTime.courseId,
      startingHole: teeTime.startingHole,
      holes: teeTime.holes
    }));

    return {
      tournamentId: formData.tournamentId,
      day: formData.day,
      date: formData.date,
      matches: matches
    };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.tournamentId) {
      newErrors.tournamentId = 'Please select a tournament';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    formData.teeTimes.forEach((teeTime, teeTimeIndex) => {
      if (!teeTime.time) {
        newErrors[`teeTimes.${teeTimeIndex}.time`] = 'Tee time is required';
      }
      
      if (!teeTime.format) {
        newErrors[`teeTimes.${teeTimeIndex}.format`] = 'Format is required';
      }
      
      if (!teeTime.courseId) {
        newErrors[`teeTimes.${teeTimeIndex}.courseId`] = 'Course is required';
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
      // Submit to the API
      const formattedData = flattenScheduleData();
      const response = await axios.post('/api/schedule/create', formattedData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Schedule created:', response.data);
      alert('Schedule created successfully!');
      router.push('/schedule');
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      alert(error.response?.data?.error || 'Failed to create schedule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter courses based on selected tournament
  const filteredCourses = courses.filter(course => course.tournamentId === formData.tournamentId);

  return (
    <>
      <Head>
        <title>Create New Schedule | Gull Lake Golf Tournament</title>
      </Head>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/schedule" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Schedule
          </Link>
        </div>

        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Create New Schedule Day
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Basic Information */}
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
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

                <div className="sm:col-span-1">
                  <label htmlFor="day" className="block text-sm font-medium leading-6 text-gray-900">
                    Day Number
                  </label>
                  <div className="mt-2">
                    <input
                      type="number"
                      name="day"
                      id="day"
                      min="1"
                      value={formData.day}
                      onChange={handleChange}
                      className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                        errors.day ? 'ring-red-500' : 'ring-gray-300'
                      } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6`}
                    />
                    {errors.day && (
                      <p className="mt-2 text-sm text-red-600">{errors.day}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="date" className="block text-sm font-medium leading-6 text-gray-900">
                    Date <span className="text-xs text-gray-500">(Auto-calculated)</span>
                  </label>
                  <div className="mt-2">
                    <input
                      type="date"
                      name="date"
                      id="date"
                      value={formData.date}
                      readOnly
                      className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset bg-gray-50 ${
                        errors.date ? 'ring-red-500' : 'ring-gray-300'
                      } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6`}
                    />
                    {errors.date && (
                      <p className="mt-2 text-sm text-red-600">{errors.date}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tee Times */}
          {formData.tournamentId ? (
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
              <div className="px-4 py-6 sm:p-8">
                <div>
                  <h3 className="text-base font-semibold leading-6 text-gray-900">Tee Times</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Schedule tee times for this day.
                  </p>
                  
                  <div className="mt-5 space-y-8">
                    {formData.teeTimes.map((teeTime, teeTimeIndex) => (
                      <div key={teeTime.id} className="bg-gray-50 rounded-lg overflow-hidden">
                        {/* Tee Time Header */}
                        <div className="bg-gray-100 p-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <h4 className="text-sm font-medium text-gray-700">Tee Time {teeTimeIndex + 1}</h4>
                          </div>
                          <div className="flex items-center space-x-4">
                            <input
                              type="time"
                              value={teeTime.time}
                              onChange={(e) => updateTeeTime(teeTimeIndex, 'time', e.target.value)}
                              className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                            />
                            {formData.teeTimes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTeeTime(teeTimeIndex)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Match details */}
                        <div className="p-4">
                          <div className="border border-gray-200 rounded-md p-3 bg-white">
                            <div className="grid grid-cols-2 gap-3">
                              {/* Format */}
                              <div className="col-span-1">
                                <label className="block text-xs font-medium text-gray-700">Format</label>
                                <select
                                  value={teeTime.format}
                                  onChange={(e) => updateTeeTime(teeTimeIndex, 'format', e.target.value)}
                                  className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                >
                                  <option value="">Select format</option>
                                  <optgroup label="Individual Formats">
                                    {formats
                                      .filter((format: any) => format.formatName.toLowerCase() === 'singles')
                                      .map((format: any) => (
                                        <option key={format.id} value={format.formatName}>
                                          {format.formatName} (1v1)
                                        </option>
                                      ))
                                    }
                                  </optgroup>
                                  <optgroup label="Two-Person Formats">
                                    {formats
                                      .filter((format: any) => 
                                        format.formatName.toLowerCase().includes('2 man') ||
                                        ['best ball', 'scramble', 'alternate shot', 'mod alt shot', 'modified alternate shot', 'chapman'].includes(format.formatName.toLowerCase())
                                      )
                                      .map((format: any) => (
                                        <option key={format.id} value={format.formatName}>
                                          {format.formatName} (2v2)
                                        </option>
                                      ))
                                    }
                                  </optgroup>
                                  <optgroup label="Team Formats">
                                    {formats
                                      .filter((format: any) => format.isFourManTeam)
                                      .map((format: any) => (
                                        <option key={format.id} value={format.formatName}>
                                          {format.formatName} (No Handicaps)
                                        </option>
                                      ))
                                    }
                                  </optgroup>
                                </select>
                                {errors[`teeTimes.${teeTimeIndex}.format`] && (
                                  <p className="mt-1 text-xs text-red-600">{errors[`teeTimes.${teeTimeIndex}.format`]}</p>
                                )}
                                {teeTime.format && formats.find((f: any) => f.formatName === teeTime.format)?.isFourManTeam && (
                                  <p className="mt-1 text-xs text-blue-600 font-medium">
                                    Note: 4-Man Team format uses gross scoring only (no handicaps)
                                  </p>
                                )}
                              </div>
                              
                              {/* Course */}
                              <div className="col-span-1">
                                <label className="block text-xs font-medium text-gray-700">Course</label>
                                <select
                                  value={teeTime.courseId}
                                  onChange={(e) => updateTeeTime(teeTimeIndex, 'courseId', e.target.value)}
                                  className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                >
                                  <option value="">Select course</option>
                                  {filteredCourses.map((course: any) => (
                                    <option key={course.id} value={course.id}>
                                      {course.name}
                                    </option>
                                  ))}
                                </select>
                                {errors[`teeTimes.${teeTimeIndex}.courseId`] && (
                                  <p className="mt-1 text-xs text-red-600">{errors[`teeTimes.${teeTimeIndex}.courseId`]}</p>
                                )}
                              </div>
                              
                              {/* Number of Holes */}
                              <div className="col-span-1">
                                <label className="block text-xs font-medium text-gray-700">Holes</label>
                                <select
                                  value={teeTime.holes}
                                  onChange={(e) => updateTeeTime(teeTimeIndex, 'holes', parseInt(e.target.value))}
                                  className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                >
                                  <option value="9">9 Holes</option>
                                  <option value="18">18 Holes</option>
                                </select>
                                {teeTime.holes === 9 && (
                                  <p className="mt-1 text-xs text-blue-600">
                                    Tip: Create separate tee times for front 9 and back 9 if using different formats
                                  </p>
                                )}
                              </div>
                              
                              {/* Starting Hole */}
                              <div className="col-span-1">
                                <label className="block text-xs font-medium text-gray-700">Starting Hole</label>
                                <select
                                  value={teeTime.startingHole}
                                  onChange={(e) => updateTeeTime(teeTimeIndex, 'startingHole', parseInt(e.target.value))}
                                  className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                >
                                  <option value="1">Front 9 (Hole 1)</option>
                                  <option value="10">Back 9 (Hole 10)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Tee Time Button */}
                    <button
                      type="button"
                      onClick={addTeeTime}
                      className="flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                    >
                      <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                      Add New Tee Time
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 text-center">
              <p className="text-gray-500">Please select a tournament to configure tee times</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end">
            <Link
              href="/schedule"
              className="rounded-md px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !formData.tournamentId}
              className="ml-3 inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
            >
              {isSubmitting ? 'Creating...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}