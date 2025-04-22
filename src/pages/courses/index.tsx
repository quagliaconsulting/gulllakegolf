import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import axios from 'axios';
import useSWR from 'swr';
import { MapPinIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Track if we should show error state (only for non-404 errors)
  const [showError, setShowError] = useState(false);
  
  // Fetch courses from API
  const { data, error, isLoading, mutate } = useSWR(
    '/api/courses',
    async (url) => {
      try {
        const response = await axios.get(url);
        setShowError(false);
        
        // Handle different response formats
        if (response.data.success && response.data.data) {
          // New API format with success/data wrapper
          return response.data.data;
        } else if (Array.isArray(response.data)) {
          // Old format (direct array)
          return { courses: response.data };
        } else {
          // Assume it's in the expected format already
          return response.data;
        }
      } catch (error) {
        // Don't show error state for 404s
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log('Courses API endpoint not implemented yet');
          setShowError(false);
          return { courses: [] };
        }
        setShowError(true);
        throw error;
      }
    },
    {
      fallbackData: { courses: [] },
      revalidateOnFocus: false,
      shouldRetryOnError: false
    }
  );

  // Replace fallback data with API call
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        console.log('Fetching courses data from API...');
        
        // Include auth token in headers
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get('/api/courses', { headers });
        console.log('Courses API response:', response.data);
        
        if (response.data) {
          // Handle different API response formats
          if (response.data.success && response.data.data && response.data.data.courses) {
            // New API format with success/data/courses
            mutate({ courses: response.data.data.courses }, false);
          } else if (Array.isArray(response.data.courses)) {
            // Format: { courses: [...] }
            mutate({ courses: response.data.courses }, false);
          } else if (Array.isArray(response.data)) {
            // Format: [...]
            mutate({ courses: response.data }, false);
          } else if (response.data.success && Array.isArray(response.data.data)) {
            // Format: { success: true, data: [...] }
            mutate({ courses: response.data.data }, false);
          }
        }
      } catch (error) {
        // Suppress 404 errors since the endpoint might not exist yet
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log('Courses API endpoint not implemented yet, using fallback data');
        } else {
          console.error('Error fetching courses:', error);
        }
      }
    };
    
    fetchCourses();
  }, [mutate]);

  // Filter courses by search term
  const filteredCourses = data?.courses?.filter((course: any) => 
    !searchTerm || course?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Handle course deletion
  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      // Call API to delete course
      await axios.delete(`/api/courses/${id}`);
      
      // Update local data
      const updatedCourses = data.courses.filter((course: any) => course.id !== id);
      mutate({ courses: updatedCourses }, false);
      
      alert('Course deleted successfully');
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course');
    }
  };

  return (
    <>
      <Head>
        <title>Courses | Gull Lake Golf Tournament</title>
      </Head>
    
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Courses</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all golf courses used in tournaments.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href="/courses/new"
              className="btn-primary inline-flex"
            >
              Add Course
            </Link>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="mt-8">
          <div className="flex flex-1 items-center justify-between">
            <div>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  placeholder="Search courses..."
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Course list */}
        {isLoading ? (
          <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
            <div className="p-8 text-center text-gray-500">
              <p>Loading courses...</p>
            </div>
          </div>
        ) : showError && error ? (
          <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
            <div className="p-8 text-center text-red-500">
              <p>Error loading courses. Please try again.</p>
            </div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
            <div className="p-8 text-center text-gray-500">
              <p>No courses found. Add a course to get started!</p>
            </div>
          </div>
        ) : (
          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Course Name
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Tournament
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Holes
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredCourses.map((course: any) => (
                        <tr key={course.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {course.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {course.tournament?.name || 'Unknown Tournament'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {course.holes?.length || '18'}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              href={`/courses/${course.id}/edit`}
                              passHref
                              legacyBehavior={false}
                              className="text-primary hover:text-primary/80 mr-4 inline-block"
                            >
                              <PencilIcon className="h-5 w-5" />
                              <span className="sr-only">Edit</span>
                            </Link>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="h-5 w-5" />
                              <span className="sr-only">Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}