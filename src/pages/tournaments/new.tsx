import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { createTournament } from '@/hooks/useTournaments';

// Schema for form validation
const tournamentSchema = z.object({
  name: z.string().min(3, { message: 'Tournament name must be at least 3 characters' }),
  year: z.coerce.number().int().min(2020).max(2030),
  location: z.string().min(3, { message: 'Location must be at least 3 characters' }),
  startDate: z.string(),
  endDate: z.string(),
  teamNames: z.array(
    z.object({
      name: z.string().min(1, { message: 'Team name is required' }),
    })
  ).min(2, { message: 'At least 2 teams are required' }),
  formatMultipliers: z.array(
    z.object({
      formatName: z.string(),
      multiplier: z.number(),
    })
  ).optional(),
});

type TournamentFormData = z.infer<typeof tournamentSchema>;

export default function NewTournament() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { 
    register, 
    handleSubmit, 
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: 'Spring Classic',
      year: new Date().getFullYear(),
      location: 'Gull Lake',
      teamNames: [
        { name: 'Spartan Dawgs' },
        { name: 'Invited Guests' },
      ],
      formatMultipliers: [
        { formatName: 'Best Ball', multiplier: 1.0 },
        { formatName: 'Scramble', multiplier: 0.4 },
        { formatName: 'Alternate Shot', multiplier: 0.7 },
        { formatName: 'Chapman', multiplier: 0.6 },
      ],
    },
  });

  const onSubmit = async (data: TournamentFormData) => {
    setLoading(true);
    setError('');
    console.log('Form submitted:', data);
    
    try {
      const tournament = await createTournament(data);
      console.log('Tournament created:', tournament);
      router.push(`/tournaments/${tournament.id}`);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError('Failed to create tournament. Please try again.');
      setLoading(false);
    }
  };

  const watchStartDate = watch('startDate');
  const watchFormatMultipliers = watch('formatMultipliers');

  return (
    <>
      <Head>
        <title>Create New Tournament | Gull Lake Golf Tournament</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/tournaments" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Tournaments
          </Link>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8">
            <h1 className="text-2xl font-semibold text-gray-900">Create New Tournament</h1>
            <p className="mt-2 text-sm text-gray-700">
              Set up your tournament details, teams, and format.
            </p>
            
            {/* Progress steps */}
            <div className="mt-6">
              <nav aria-label="Progress">
                <ol role="list" className="flex items-center">
                  {[{ name: 'Tournament Details' }, { name: 'Teams' }, { name: 'Format & Schedule' }, { name: 'Review' }].map((item, index) => (
                    <li key={item.name} className={`${index > 0 ? 'ml-8 sm:ml-16' : ''} relative`}>
                      <div className="flex items-center">
                        <div aria-current={step === index + 1 ? 'step' : undefined} className={`${step > index + 1 ? 'bg-primary' : step === index + 1 ? 'bg-primary' : 'bg-gray-200'} h-8 w-8 rounded-full flex items-center justify-center text-white`}>
                          {step > index + 1 ? (
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>
                        <span className="hidden sm:ml-4 sm:block text-sm text-gray-500">{item.name}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
              {/* Step 1: Tournament Details */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-4">
                      <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                        Tournament Name
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          id="name"
                          {...register('name')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                        />
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="year" className="block text-sm font-medium leading-6 text-gray-900">
                        Year
                      </label>
                      <div className="mt-2">
                        <input
                          type="number"
                          id="year"
                          {...register('year')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                        />
                        {errors.year && (
                          <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="location" className="block text-sm font-medium leading-6 text-gray-900">
                        Location
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          id="location"
                          {...register('location')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                        />
                        {errors.location && (
                          <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="startDate" className="block text-sm font-medium leading-6 text-gray-900">
                        Start Date
                      </label>
                      <div className="mt-2">
                        <input
                          type="date"
                          id="startDate"
                          {...register('startDate')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                        />
                        {errors.startDate && (
                          <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="endDate" className="block text-sm font-medium leading-6 text-gray-900">
                        End Date
                      </label>
                      <div className="mt-2">
                        <input
                          type="date"
                          id="endDate"
                          {...register('endDate')}
                          min={watchStartDate}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                        />
                        {errors.endDate && (
                          <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Team Setup */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-semibold leading-7 text-gray-900">Team Configuration</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600">Configure the teams participating in this tournament.</p>
                  </div>

                  <Controller
                    control={control}
                    name="teamNames"
                    render={({ field }) => (
                      <div className="space-y-4">
                        {field.value.map((team, index) => (
                          <div key={index} className="flex items-center">
                            <div className="flex-grow">
                              <label htmlFor={`team-${index}`} className="block text-sm font-medium leading-6 text-gray-900">
                                Team {index + 1} Name
                              </label>
                              <div className="mt-2">
                                <input
                                  type="text"
                                  id={`team-${index}`}
                                  value={team.name}
                                  onChange={(e) => {
                                    const newTeams = [...field.value];
                                    newTeams[index] = { name: e.target.value };
                                    field.onChange(newTeams);
                                  }}
                                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                />
                              </div>
                            </div>
                            {field.value.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newTeams = field.value.filter((_, i) => i !== index);
                                  field.onChange(newTeams);
                                }}
                                className="ml-4 mt-8 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange([...field.value, { name: '' }]);
                          }}
                          className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          Add Team
                        </button>
                        {errors.teamNames && (
                          <p className="mt-1 text-sm text-red-600">{errors.teamNames.message}</p>
                        )}
                      </div>
                    )}
                  />
                </div>
              )}

              {/* Step 3: Format & Schedule */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-semibold leading-7 text-gray-900">Format & Schedule</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600">Configure match formats and handicap multipliers for the tournament.</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Format Multipliers</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Set handicap multipliers for each match format. These values are used to adjust handicaps based on the format difficulty.
                    </p>
                    
                    <Controller
                      control={control}
                      name="formatMultipliers"
                      render={({ field }) => (
                        <div className="space-y-4">
                          {field.value?.map((format, index) => (
                            <div key={index} className="flex items-center gap-4">
                              <div className="flex-grow">
                                <label htmlFor={`format-${index}`} className="block text-sm font-medium leading-6 text-gray-900">
                                  Format Name
                                </label>
                                <div className="mt-1">
                                  <input
                                    type="text"
                                    id={`format-${index}`}
                                    value={format.formatName}
                                    onChange={(e) => {
                                      const newFormats = [...field.value || []];
                                      newFormats[index] = { 
                                        ...newFormats[index], 
                                        formatName: e.target.value 
                                      };
                                      field.onChange(newFormats);
                                    }}
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                  />
                                </div>
                              </div>
                              
                              <div className="w-24">
                                <label htmlFor={`multiplier-${index}`} className="block text-sm font-medium leading-6 text-gray-900">
                                  Multiplier
                                </label>
                                <div className="mt-1">
                                  <input
                                    type="number"
                                    id={`multiplier-${index}`}
                                    value={format.multiplier}
                                    onChange={(e) => {
                                      const newFormats = [...field.value || []];
                                      newFormats[index] = { 
                                        ...newFormats[index], 
                                        multiplier: parseFloat(e.target.value) 
                                      };
                                      field.onChange(newFormats);
                                    }}
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                  />
                                </div>
                              </div>
                              
                              {field.value && field.value.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newFormats = field.value?.filter((_, i) => i !== index);
                                    field.onChange(newFormats);
                                  }}
                                  className="mt-8 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={() => {
                              field.onChange([...(field.value || []), { formatName: '', multiplier: 0.5 }]);
                            }}
                            className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                          >
                            Add Format
                          </button>
                        </div>
                      )}
                    />
                  </div>
                  
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Schedule</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Schedule setup will be available after creating the tournament. You'll be able to set up match days and pairings.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-semibold leading-7 text-gray-900">Review Tournament Details</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600">Review the information before creating the tournament.</p>
                  </div>

                  <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                        <dt className="text-sm font-medium text-gray-500">Tournament Name</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{watch('name')}</dd>
                      </div>
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                        <dt className="text-sm font-medium text-gray-500">Year</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{watch('year')}</dd>
                      </div>
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                        <dt className="text-sm font-medium text-gray-500">Location</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{watch('location')}</dd>
                      </div>
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                        <dt className="text-sm font-medium text-gray-500">Dates</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          {watch('startDate') && new Date(watch('startDate')).toLocaleDateString()} to {watch('endDate') && new Date(watch('endDate')).toLocaleDateString()}
                        </dd>
                      </div>
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                        <dt className="text-sm font-medium text-gray-500">Teams</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          <ul className="list-disc pl-5">
                            {watch('teamNames').map((team, index) => (
                              <li key={index}>{team.name === 'Spartan Dawgs' ? <span className="text-forest-green">Spartan Dawgs</span> : team.name}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                      
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                        <dt className="text-sm font-medium text-gray-500">Format Multipliers</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          <ul className="list-disc pl-5">
                            {watch('formatMultipliers')?.map((format, index) => (
                              <li key={index}>{format.formatName}: {format.multiplier}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-between">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                )}

                <div className="flex-grow"></div>

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="btn-primary"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className={`btn-primary ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Creating...' : 'Create Tournament'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
