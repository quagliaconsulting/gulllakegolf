import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeftIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SelectOption } from '../../../types/models';

export default function NewCourse() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tournaments, setTournaments] = useState<SelectOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    tournamentId: '',
    holes: Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: 4,
      handicap: i + 1,
      distance: 350
    }))
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch tournaments for the dropdown
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        // Fetch data from the API
        const response = await axios.get('/api/tournaments', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        // Set tournaments from response
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          setTournaments(response.data.data);
        } else {
          console.error('Unexpected response format:', response.data);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        // Fallback to demo data if API fails
        // No tournaments available
        setTournaments([]);
      }
    };

    fetchTournaments();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleHoleChange = (index: number, field: string, value: string | number) => {
    const newHoles = [...formData.holes];
    newHoles[index] = { ...newHoles[index], [field]: typeof value === 'string' ? parseInt(value, 10) || 0 : value };
    setFormData(prev => ({ ...prev, holes: newHoles }));
    
    // Clear error
    const errorKey = `holes.${index}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Course name is required';
    }
    
    if (!formData.tournamentId) {
      newErrors.tournamentId = 'Please select a tournament';
    }
    
    formData.holes.forEach((hole, index) => {
      if (hole.par < 3 || hole.par > 5) {
        newErrors[`holes.${index}.par`] = 'Par must be between 3 and 5';
      }
      
      if (hole.handicap < 1 || hole.handicap > 18) {
        newErrors[`holes.${index}.handicap`] = 'Handicap must be between 1 and 18';
      }
      
      if (hole.distance < 100 || hole.distance > 700) {
        newErrors[`holes.${index}.distance`] = 'Distance must be between 100 and 700 yards';
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
      const response = await axios.post('/api/courses/create', formData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Course created:', response.data);
      alert('Course created successfully!');
      router.push('/courses');
    } catch (error: any) {
      console.error('Error creating course:', error);
      alert(error.response?.data?.error || 'Failed to create course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Utility function to chunk the holes array into groups of 9
  const chunkArray = (array: any[], size: number) => {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size)
    );
  };

  const frontNine = formData.holes.slice(0, 9);
  const backNine = formData.holes.slice(9, 18);

  return (
    <>
      <Head>
        <title>Add New Course | Gull Lake Golf Tournament</title>
      </Head>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/courses" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Courses
          </Link>
        </div>

        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Add New Course
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                    Course Name
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                        errors.name ? 'ring-red-500' : 'ring-gray-300'
                      } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6`}
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>
                </div>

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
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div>
                <h3 className="text-base font-semibold leading-6 text-gray-900">Course Holes</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enter information for each hole on the course.
                </p>
                
                <div className="mt-5 space-y-8">
                  {/* Front Nine */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Front Nine</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead>
                          <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Hole</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Par</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Handicap</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Distance (yards)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {frontNine.map((hole, index) => (
                            <tr key={index}>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                                {hole.number}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <input
                                  type="number"
                                  min="3"
                                  max="5"
                                  value={hole.par}
                                  onChange={(e) => handleHoleChange(index, 'par', e.target.value)}
                                  className={`w-16 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                                    errors[`holes.${index}.par`] ? 'border-red-500' : ''
                                  }`}
                                />
                                {errors[`holes.${index}.par`] && (
                                  <p className="mt-1 text-xs text-red-600">{errors[`holes.${index}.par`]}</p>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <input
                                  type="number"
                                  min="1"
                                  max="18"
                                  value={hole.handicap}
                                  onChange={(e) => handleHoleChange(index, 'handicap', e.target.value)}
                                  className={`w-16 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                                    errors[`holes.${index}.handicap`] ? 'border-red-500' : ''
                                  }`}
                                />
                                {errors[`holes.${index}.handicap`] && (
                                  <p className="mt-1 text-xs text-red-600">{errors[`holes.${index}.handicap`]}</p>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <input
                                  type="number"
                                  min="100"
                                  max="700"
                                  value={hole.distance}
                                  onChange={(e) => handleHoleChange(index, 'distance', e.target.value)}
                                  className={`w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                                    errors[`holes.${index}.distance`] ? 'border-red-500' : ''
                                  }`}
                                />
                                {errors[`holes.${index}.distance`] && (
                                  <p className="mt-1 text-xs text-red-600">{errors[`holes.${index}.distance`]}</p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Back Nine */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Back Nine</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead>
                          <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Hole</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Par</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Handicap</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Distance (yards)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {backNine.map((hole, index) => (
                            <tr key={index + 9}>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                                {hole.number}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <input
                                  type="number"
                                  min="3"
                                  max="5"
                                  value={hole.par}
                                  onChange={(e) => handleHoleChange(index + 9, 'par', e.target.value)}
                                  className={`w-16 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                                    errors[`holes.${index + 9}.par`] ? 'border-red-500' : ''
                                  }`}
                                />
                                {errors[`holes.${index + 9}.par`] && (
                                  <p className="mt-1 text-xs text-red-600">{errors[`holes.${index + 9}.par`]}</p>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <input
                                  type="number"
                                  min="1"
                                  max="18"
                                  value={hole.handicap}
                                  onChange={(e) => handleHoleChange(index + 9, 'handicap', e.target.value)}
                                  className={`w-16 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                                    errors[`holes.${index + 9}.handicap`] ? 'border-red-500' : ''
                                  }`}
                                />
                                {errors[`holes.${index + 9}.handicap`] && (
                                  <p className="mt-1 text-xs text-red-600">{errors[`holes.${index + 9}.handicap`]}</p>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <input
                                  type="number"
                                  min="100"
                                  max="700"
                                  value={hole.distance}
                                  onChange={(e) => handleHoleChange(index + 9, 'distance', e.target.value)}
                                  className={`w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                                    errors[`holes.${index + 9}.distance`] ? 'border-red-500' : ''
                                  }`}
                                />
                                {errors[`holes.${index + 9}.distance`] && (
                                  <p className="mt-1 text-xs text-red-600">{errors[`holes.${index + 9}.distance`]}</p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/courses"
              className="rounded-md px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ml-3 inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
            >
              {isSubmitting ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}