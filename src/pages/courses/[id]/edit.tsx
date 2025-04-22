import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import { ArrowLeftIcon, ArrowPathIcon, MapPinIcon } from '@heroicons/react/24/outline';

type CourseFormData = {
  id: string;
  name: string;
  tournamentId: string;
  holes: {
    id?: string;
    number: number;
    par: number;
    handicap: number;
    distance: number;
    isPar3?: boolean;
  }[];
};

export default function EditCourse() {
  const router = useRouter();
  const { id } = router.query;
  const [courseData, setCourseData] = useState<CourseFormData | null>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Fetch course data when ID is available
  useEffect(() => {
    if (id) {
      const fetchCourseData = async () => {
        try {
          console.log(`Fetching course data for ID: ${id}`);
          const response = await axios.get(`/api/courses/${id}`);
          console.log('Raw API response:', response.data);
          
          if (response.data) {
            // Handle different API response formats
            let course;
            
            if (response.data.success && response.data.data) {
              // New API format with success/data wrapper
              console.log('Using new API format (success/data)');
              course = response.data.data;
            } else {
              // Old format (direct object)
              console.log('Using old API format (direct object)');
              course = response.data;
            }
            
            console.log('Processed course data:', course);
            
            if (!course.id || !course.name) {
              console.error('Invalid course data structure:', course);
              setError('Course data is in an unexpected format.');
              return;
            }
            
            // Ensure we have the tournamentId, either directly or from the tournament relation
            const tournamentId = course.tournamentId || (course.tournament?.id);
            
            if (!tournamentId) {
              console.warn('No tournamentId found in course data:', course);
            }
            
            setCourseData({
              id: course.id,
              name: course.name,
              tournamentId: tournamentId || '',
              holes: course.holes?.map((hole: any) => ({
                id: hole.id,
                number: hole.number,
                par: hole.par,
                handicap: hole.handicap,
                distance: hole.distance,
                isPar3: hole.par === 3
              })) || []
            });
            console.log('Course data set successfully');
          } else {
            console.error('Empty response data');
            setError('Received empty response from server.');
          }
        } catch (err) {
          console.error('Error fetching course:', err);
          setError('Failed to load course data. Please try again.');
        }
      };

      fetchCourseData();
    }
  }, [id]);

  // Fetch tournaments on component mount
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        console.log('Fetching tournaments');
        const response = await axios.get('/api/tournaments');
        console.log('Tournaments API response:', response.data);
        
        if (response.data) {
          let tournamentsData;
          
          if (response.data.success && Array.isArray(response.data.data)) {
            // New API format with success/data
            tournamentsData = response.data.data;
          } else if (Array.isArray(response.data)) {
            // Old format (array)
            tournamentsData = response.data;
          } else {
            // Unknown format
            console.error('Unknown tournaments data format:', response.data);
            tournamentsData = [];
          }
          
          setTournaments(tournamentsData);
          console.log('Tournaments set:', tournamentsData.length);
        }
      } catch (err) {
        console.error('Error fetching tournaments:', err);
        setError('Failed to load tournaments. Please try again.');
      }
    };

    fetchTournaments();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    if (courseData) {
      setCourseData({
        ...courseData,
        [field]: value
      });
    }
    // Reset saved state when making changes
    setIsSaved(false);
  };

  const handleHoleChange = (index: number, field: string, value: any) => {
    if (courseData) {
      const newHoles = [...courseData.holes];
      
      // Parse value to number safely
      let parsedValue = value;
      if (typeof value === 'string') {
        if (['number', 'par', 'handicap', 'distance'].includes(field)) {
          const num = parseInt(value);
          parsedValue = isNaN(num) ? 0 : num;
        }
      }
      
      newHoles[index] = {
        ...newHoles[index],
        [field]: parsedValue
      };
      
      if (field === 'par') {
        newHoles[index].isPar3 = parsedValue === 3;
      }
      
      setCourseData({
        ...courseData,
        holes: newHoles
      });
      
      setIsSaved(false);
    }
  };

  const addHole = () => {
    if (courseData) {
      const nextNumber = courseData.holes.length > 0 ? 
        Math.max(...courseData.holes.map(h => h.number)) + 1 : 1;
      
      setCourseData({
        ...courseData,
        holes: [
          ...courseData.holes,
          {
            number: nextNumber,
            par: 4,
            handicap: nextNumber,
            distance: 400,
            isPar3: false
          }
        ]
      });
      
      setIsSaved(false);
    }
  };

  const removeHole = (index: number) => {
    if (courseData) {
      const newHoles = [...courseData.holes];
      newHoles.splice(index, 1);
      
      setCourseData({
        ...courseData,
        holes: newHoles
      });
      
      setIsSaved(false);
    }
  };

  const validateForm = () => {
    if (!courseData) return false;
    
    if (!courseData.name || !courseData.tournamentId) {
      setError('Course must have a name and tournament.');
      return false;
    }
    
    if (courseData.holes.length === 0) {
      setError('Course must have at least one hole.');
      return false;
    }
    
    for (const hole of courseData.holes) {
      if (
        !hole.number || 
        !hole.par || 
        !hole.handicap || 
        !hole.distance
      ) {
        setError('All hole fields must be filled.');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !courseData) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Ensure all numeric fields are actually numbers
      const sanitizedHoles = courseData.holes.map(hole => ({
        number: Number(hole.number) || 0,
        par: Number(hole.par) || 4,
        handicap: Number(hole.handicap) || 0,
        distance: Number(hole.distance) || 0,
        isPar3: Boolean(hole.isPar3)
      }));
      
      // Print debug info
      console.log('Submitting course update:', {
        name: courseData.name,
        tournamentId: courseData.tournamentId,
        holes: sanitizedHoles.length
      });
      
      const response = await axios.put(`/api/courses/${id}`, {
        name: courseData.name,
        tournamentId: courseData.tournamentId,
        holes: sanitizedHoles
      });
      
      console.log('Update response:', response.data);
      
      setIsSaved(true);
      setLoading(false);
      
      // Auto-navigate back after brief delay
      setTimeout(() => {
        router.push('/courses');
      }, 1500);
    } catch (err: any) {
      console.error('Error updating course:', err);
      // Get more detailed error info
      let errorMessage = 'Failed to update course. Please try again.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        // Use the main error message from the API
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        // If there's detailed information, use that too
        if (errorData.details) {
          if (typeof errorData.details === 'string') {
            // If details is just a string, append it
            errorMessage += `: ${errorData.details}`;
          } else if (errorData.details.message) {
            // If details has a message property, use that
            errorMessage += `: ${errorData.details.message}`;
          }
        }
        
        // Special handling for foreign key constraint errors
        if (errorData.statusCode === 409) {
          errorMessage = 'This course has match data and cannot be modified. Please contact an administrator for assistance.';
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Handle deleting course
  const handleDeleteCourse = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this course?')) {
      return;
    }

    setLoading(true);
    
    try {
      await axios.delete(`/api/courses/${id}`);
      router.push('/courses');
    } catch (err: any) {
      console.error('Error deleting course:', err);
      setError(err.response?.data?.error || 'Failed to delete course. Please try again.');
      setLoading(false);
    }
  };

  if (!courseData && !error) {
    return <div className="p-8 text-center">Loading course data...</div>;
  }

  return (
    <>
      <Head>
        <title>Edit Course | Gull Lake Golf Tournament</title>
      </Head>

      <div>
        <div className="mb-8">
          <Link href="/courses" passHref legacyBehavior={false} className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Courses
          </Link>
        </div>

        <div className="md:flex md:items-center md:justify-between md:space-x-5 mb-8">
          <div className="flex items-start space-x-5">
            <div className="flex-shrink-0">
              <div className="relative">
                <MapPinIcon className="h-16 w-16 text-gray-300" aria-hidden="true" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {courseData?.name || 'Edit Course'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Update course information and hole details.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isSaved && (
          <div className="rounded-md bg-green-50 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Course updated successfully! Redirecting...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {courseData && (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  {/* Course Name */}
                  <div className="sm:col-span-3">
                    <label htmlFor="course-name" className="block text-sm font-medium text-gray-700">
                      Name *
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="course-name"
                        value={courseData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Tournament */}
                  <div className="sm:col-span-3">
                    <label htmlFor="course-tournament" className="block text-sm font-medium text-gray-700">
                      Tournament *
                    </label>
                    <div className="mt-1">
                      <select
                        id="course-tournament"
                        value={courseData.tournamentId}
                        onChange={(e) => handleInputChange('tournamentId', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        required
                      >
                        <option value="">Select a tournament</option>
                        {tournaments.map((tournament: any) => (
                          <option key={tournament.id} value={tournament.id}>
                            {tournament.name} ({tournament.year})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Holes Section */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Hole Information</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add or edit holes for this course. Par 3 holes will be automatically marked for CTP competitions.
                </p>

                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-5 gap-6 font-medium text-sm text-gray-500 mb-3">
                    <div>Number</div>
                    <div>Par</div>
                    <div>Handicap</div>
                    <div>Distance (yards)</div>
                    <div></div>
                  </div>

                  {courseData.holes.map((hole, index) => (
                    <div key={index} className="grid grid-cols-5 gap-6 mb-4">
                      <div>
                        <input
                          type="number"
                          min="1"
                          max="18"
                          value={hole.number}
                          onChange={(e) => handleHoleChange(index, 'number', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        />
                      </div>
                      <div>
                        <select
                          value={hole.par}
                          onChange={(e) => handleHoleChange(index, 'par', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        >
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="1"
                          max="18"
                          value={hole.handicap}
                          onChange={(e) => handleHoleChange(index, 'handicap', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="50"
                          max="700"
                          value={hole.distance}
                          onChange={(e) => handleHoleChange(index, 'distance', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => removeHole(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={addHole}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Add Hole
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleDeleteCourse}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Course
              </button>
              
              <div className="flex space-x-3">
                <Link
                  href="/courses"
                  passHref
                  legacyBehavior={false}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  );
}