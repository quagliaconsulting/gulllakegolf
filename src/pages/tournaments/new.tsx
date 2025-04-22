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
  // Money settings
  buyIn: z.number().min(0).optional(),
  totalPrize: z.number().min(0).optional(),
  hasCTP: z.boolean().default(false),
  ctpPrizeAmount: z.number().min(0).optional(),
  hasSkins: z.boolean().default(false),
  skinsPrizeAmount: z.number().min(0).optional(),
  payoutStructure: z.record(z.string(), z.number()).optional(),
  teamNames: z.array(
    z.object({
      name: z.string().min(1, { message: 'Team name is required' }),
    })
  ).min(2, { message: 'At least 2 teams are required' }),
  formatMultipliers: z.array(
    z.object({
      formatName: z.string(),
      multiplier: z.number(),
      points: z.number().default(1.0),
      halfPoints: z.number().optional(),
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
    resolver: zodResolver(tournamentSchema) as any,
    defaultValues: {
      name: 'Spring Classic',
      year: new Date().getFullYear(),
      location: 'Gull Lake',
      // Money settings
      buyIn: 100,
      totalPrize: 0, // Will be calculated automatically
      hasCTP: true,
      ctpPrizeAmount: 20, 
      hasSkins: true,
      skinsPrizeAmount: 20,
      payoutStructure: {
        "1": 50,
        "2": 30,
        "3": 20
      },
      teamNames: [
        { name: 'Spartan Dawgs' },
        { name: 'Invited Guests' },
      ],
      formatMultipliers: [
        { formatName: 'Singles', multiplier: 1.0, points: 1.0, halfPoints: 0.5 },
        { formatName: 'Best Ball', multiplier: 0.9, points: 1.0, halfPoints: 0.5 },
        { formatName: 'Scramble', multiplier: 0.4, points: 1.0, halfPoints: 0.5 },
        { formatName: 'Alternate Shot', multiplier: 0.7, points: 1.0, halfPoints: 0.5 },
        { formatName: 'Chapman', multiplier: 0.6, points: 1.0, halfPoints: 0.5 },
        { formatName: '4-Man Team', multiplier: 0.8, points: 1.0, halfPoints: 0.5, isFourManTeam: true },
      ],
    },
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError('');
    console.log('Form submitted:', data);
    
    // Ensure we have default values for required fields
    const formattedData = {
      ...data,
      year: Number(data.year),
      buyIn: Number(data.buyIn) || 0,
      totalPrize: Number(data.totalPrize) || null,
      hasCTP: Boolean(data.hasCTP),
      ctpPrizeAmount: data.hasCTP ? Number(data.ctpPrizeAmount) || 0 : null,
      hasSkins: Boolean(data.hasSkins),
      skinsPrizeAmount: data.hasSkins ? Number(data.skinsPrizeAmount) || 0 : null,
      // Ensure dates are valid
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date().toISOString().split('T')[0],
      // Ensure we have at least two teams
      teamNames: data.teamNames && data.teamNames.length >= 2 ? 
        data.teamNames : 
        [{ name: 'Spartan Dawgs' }, { name: 'Invited Guests' }],
      // Ensure we have format multipliers
      formatMultipliers: data.formatMultipliers || [
        { formatName: 'Singles', multiplier: 1.0, points: 1.0, halfPoints: 0.5 },
        { formatName: 'Best Ball', multiplier: 0.9, points: 1.0, halfPoints: 0.5 },
        { formatName: 'Scramble', multiplier: 0.4, points: 1.0, halfPoints: 0.5 },
        { formatName: 'Alternate Shot', multiplier: 0.7, points: 1.0, halfPoints: 0.5 },
        { formatName: 'Chapman', multiplier: 0.6, points: 1.0, halfPoints: 0.5 },
        { formatName: '4-Man Team', multiplier: 0.8, points: 1.0, halfPoints: 0.5, isFourManTeam: true },
      ]
    };
    
    console.log('Formatted data:', formattedData);
    
    try {
      const tournament = await createTournament(formattedData);
      console.log('Tournament created:', tournament);
      
      if (tournament && tournament.id) {
        router.push(`/tournaments/${tournament.id}`);
      } else {
        console.error('No tournament ID returned from API');
        setError('Failed to create tournament. Server returned incomplete data.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error creating tournament:', err);
      setError(err?.response?.data?.error || 'Failed to create tournament. Please try again.');
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/tournaments" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Tournaments
          </Link>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl w-full">
          <div className="px-4 py-6 sm:p-8">
            <h1 className="text-2xl font-semibold text-gray-900">Create New Tournament</h1>
            <p className="mt-2 text-sm text-gray-700">
              Set up your tournament details, teams, and format.
            </p>
            
            {/* Progress steps */}
            <div className="mt-6">
              <nav aria-label="Progress">
                <div className="overflow-x-auto pb-2">
                  <ol role="list" className="flex items-center min-w-max px-2">
                    {[{ name: 'Tournament Details' }, { name: 'Teams' }, { name: 'Money' }, { name: 'Format & Schedule' }, { name: 'Review' }].map((item, index) => (
                      <li key={item.name} className={`${index > 0 ? 'ml-3 sm:ml-6' : ''} relative`}>
                        <button 
                          type="button"
                          onClick={() => setStep(index + 1)}
                          className="flex flex-col sm:flex-row items-center group"
                        >
                          <div aria-current={step === index + 1 ? 'step' : undefined} className={`${step > index + 1 ? 'bg-primary' : step === index + 1 ? 'bg-primary' : 'bg-gray-200'} h-8 w-8 rounded-full flex items-center justify-center text-white group-hover:bg-primary/90`}>
                            {step > index + 1 ? (
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </div>
                          <span className={`sm:ml-2 text-center sm:text-left text-xs sm:text-sm ${step === index + 1 ? 'text-primary font-medium' : 'text-gray-500'}`}>
                            {item.name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </nav>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 sm:mt-8 max-w-full overflow-visible">
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

              {/* Step 3: Money */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-semibold leading-7 text-gray-900">Money & Prize Structure</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600">Configure tournament buy-in and prize distribution.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="buyIn" className="block text-sm font-medium leading-6 text-gray-900">
                        Buy-in Amount (per player)
                      </label>
                      <div className="mt-2 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          id="buyIn"
                          {...register('buyIn', { valueAsNumber: true })}
                          className="block w-full rounded-md border-0 py-1.5 pl-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                          min="0"
                          step="5"
                        />
                      </div>
                      {errors.buyIn && (
                        <p className="mt-1 text-sm text-red-600">{errors.buyIn.message}</p>
                      )}
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="totalPrize" className="block text-sm font-medium leading-6 text-gray-900">
                        Total Prize Pool (calculated)
                      </label>
                      <div className="mt-2 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          id="totalPrize"
                          value={(watch('buyIn') || 0) * 12} // Assuming 12 players total
                          disabled
                          className="bg-gray-100 block w-full rounded-md border-0 py-1.5 pl-7 text-gray-500 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Based on 12 players</p>
                    </div>
                    
                    {/* CTP Competition */}
                    <div className="sm:col-span-6 bg-white p-4 rounded-md border border-gray-200">
                      <div className="flex items-start">
                        <div className="flex h-6 items-center">
                          <input
                            id="hasCTP"
                            type="checkbox"
                            {...register('hasCTP')}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>
                        <div className="ml-3">
                          <label htmlFor="hasCTP" className="text-sm font-medium leading-6 text-gray-900">
                            Include Closest-to-Pin (CTP) Competition
                          </label>
                          <p className="text-xs text-gray-500">
                            Players can win prizes for getting closest to the pin on par-3 holes
                          </p>
                        </div>
                      </div>
                      
                      {watch('hasCTP') && (
                        <div className="mt-4 sm:col-span-3">
                          <label htmlFor="ctpPrizeAmount" className="block text-sm font-medium leading-6 text-gray-900">
                            CTP Entry Fee (per player)
                          </label>
                          <div className="mt-2 relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                              type="number"
                              id="ctpPrizeAmount"
                              {...register('ctpPrizeAmount', { valueAsNumber: true })}
                              className="block w-full rounded-md border-0 py-1.5 pl-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                              min="0"
                              step="5"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Typical amount: $20 per player for entire tournament
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Skins Competition */}
                    <div className="sm:col-span-6 bg-white p-4 rounded-md border border-gray-200">
                      <div className="flex items-start">
                        <div className="flex h-6 items-center">
                          <input
                            id="hasSkins"
                            type="checkbox"
                            {...register('hasSkins')}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>
                        <div className="ml-3">
                          <label htmlFor="hasSkins" className="text-sm font-medium leading-6 text-gray-900">
                            Include Skins Game
                          </label>
                          <p className="text-xs text-gray-500">
                            Players can win prizes for scoring the lowest on a hole (that no one else matches)
                          </p>
                        </div>
                      </div>
                      
                      {watch('hasSkins') && (
                        <div className="mt-4 sm:col-span-3">
                          <label htmlFor="skinsPrizeAmount" className="block text-sm font-medium leading-6 text-gray-900">
                            Skins Entry Fee (per player)
                          </label>
                          <div className="mt-2 relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                              type="number"
                              id="skinsPrizeAmount"
                              {...register('skinsPrizeAmount', { valueAsNumber: true })}
                              className="block w-full rounded-md border-0 py-1.5 pl-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                              min="0"
                              step="5"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Typical amount: $20 per player for entire tournament
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Payout Structure */}
                    <div className="sm:col-span-6 bg-white p-4 rounded-md border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Payout Structure</h3>
                      <p className="text-xs text-gray-500 mb-4">
                        Define how the prize pool should be distributed among winning teams (percentages must total 100%).
                      </p>
                      
                      <div className="space-y-4">
                        {['1', '2', '3'].map((place) => (
                          <div key={place} className="flex items-center gap-4">
                            <div>
                              <label className="block text-sm font-medium leading-6 text-gray-900">
                                {place === '1' ? '1st Place' : place === '2' ? '2nd Place' : '3rd Place'}
                              </label>
                            </div>
                            
                            <div className="w-24 relative">
                              <input
                                type="number"
                                value={watch(`payoutStructure.${place}`) || 0}
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value);
                                  const currentValues = watch('payoutStructure') || {};
                                  setValue('payoutStructure', { 
                                    ...currentValues, 
                                    [place]: newValue
                                  });
                                }}
                                min="0"
                                max="100"
                                className="block w-full rounded-md border-0 py-1.5 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                              />
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-gray-500 sm:text-sm">%</span>
                              </div>
                            </div>
                            
                            <div className="w-32 relative">
                              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 sm:text-sm">$</span>
                              </div>
                              <input
                                type="text"
                                value={((watch('buyIn') || 0) * 12 * (watch(`payoutStructure.${place}`) || 0) / 100).toFixed(2)}
                                disabled
                                className="bg-gray-100 block w-full rounded-md border-0 py-1.5 pl-7 text-gray-500 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                              />
                            </div>
                          </div>
                        ))}
                        
                        <div className="flex items-center gap-4 border-t border-gray-200 pt-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900">
                              Total
                            </label>
                          </div>
                          
                          <div className="w-24 relative">
                            <input
                              type="text"
                              value={Object.values(watch('payoutStructure') || {}).reduce((sum, value) => sum + (Number(value) || 0), 0) + '%'}
                              disabled
                              className="bg-gray-100 block w-full rounded-md border-0 py-1.5 text-gray-500 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                            />
                          </div>
                          
                          <div className="w-32 relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                              type="text"
                              value={(watch('buyIn') || 0) * 12}
                              disabled
                              className="bg-gray-100 block w-full rounded-md border-0 py-1.5 pl-7 text-gray-500 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 4: Format & Schedule */}
              {step === 4 && (
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
                            <div key={index} className="border border-gray-100 rounded-md p-4 bg-gray-50">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="sm:col-span-2">
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
                                
                                <div>
                                  <label htmlFor={`multiplier-${index}`} className="block text-sm font-medium leading-6 text-gray-900">
                                    Handicap Multiplier
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
                                
                                <div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label htmlFor={`points-${index}`} className="block text-sm font-medium leading-6 text-gray-900 whitespace-nowrap">
                                        Match Points
                                      </label>
                                      <div className="mt-1">
                                        <input
                                          type="number"
                                          id={`points-${index}`}
                                          value={format.points || 1.0}
                                          onChange={(e) => {
                                            const newFormats = [...field.value || []];
                                            newFormats[index] = { 
                                              ...newFormats[index], 
                                              points: parseFloat(e.target.value) 
                                            };
                                            field.onChange(newFormats);
                                          }}
                                          min="0"
                                          step="0.5"
                                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                        />
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <label htmlFor={`halfPoints-${index}`} className="block text-sm font-medium leading-6 text-gray-900 whitespace-nowrap">
                                        Tie Points
                                      </label>
                                      <div className="mt-1">
                                        <input
                                          type="number"
                                          id={`halfPoints-${index}`}
                                          value={format.halfPoints || 0.5}
                                          onChange={(e) => {
                                            const newFormats = [...field.value || []];
                                            newFormats[index] = { 
                                              ...newFormats[index], 
                                              halfPoints: parseFloat(e.target.value) 
                                            };
                                            field.onChange(newFormats);
                                          }}
                                          min="0"
                                          step="0.5"
                                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {field.value && field.value.length > 2 && (
                                <div className="flex justify-end mt-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newFormats = field.value?.filter((_, i) => i !== index);
                                      field.onChange(newFormats);
                                    }}
                                    className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-red-600 hover:text-red-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                  >
                                    Remove Format
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={() => {
                              field.onChange([...(field.value || []), { formatName: '', multiplier: 0.5, points: 1.0, halfPoints: 0.5 }]);
                            }}
                            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm ring-1 ring-inset ring-primary/30 hover:bg-primary/5 flex items-center"
                          >
                            <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                            </svg>
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

              {/* Step 5: Review */}
              {step === 5 && (
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
                              <li key={index}>{format.formatName}: {format.multiplier} (Points: {format.points}, Tie: {format.halfPoints})</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                      
                      {/* Money section */}
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 border-t border-gray-200">
                        <dt className="text-sm font-medium text-gray-500">Financial Settings</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          <div className="space-y-2">
                            <p><span className="font-medium">Buy-in:</span> ${watch('buyIn')}</p>
                            <p><span className="font-medium">Total prize pool:</span> ${(watch('buyIn') || 0) * 12}</p>
                            <p><span className="font-medium">CTP competition:</span> {watch('hasCTP') ? `Yes (Entry: $${watch('ctpPrizeAmount')})` : 'No'}</p>
                            <p><span className="font-medium">Skins game:</span> {watch('hasSkins') ? `Yes (Entry: $${watch('skinsPrizeAmount')})` : 'No'}</p>
                            
                            <div className="mt-3">
                              <p className="font-medium">Payout structure:</p>
                              <ul className="list-disc pl-5 mt-1">
                                {Object.entries(watch('payoutStructure') || {}).map(([place, percentage]) => (
                                  <li key={place}>
                                    {place === '1' ? '1st' : place === '2' ? '2nd' : '3rd'} place: {percentage}% 
                                    (${((watch('buyIn') || 0) * 12 * (Number(percentage) || 0) / 100).toFixed(2)})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
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

              <div className="mt-8 flex justify-between border-t pt-6">
                <div>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center"
                    >
                      <svg className="mr-1 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                      Previous
                    </button>
                  )}
                </div>

                <div>
                  {step < 5 ? (
                    <button
                      type="button"
                      onClick={() => setStep(step + 1)}
                      className="btn-primary inline-flex items-center justify-center px-4 py-2 min-w-[100px]"
                    >
                      Next
                      <svg className="ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className={`btn-primary inline-flex items-center justify-center px-4 py-2 min-w-[160px] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : (
                        'Create Tournament'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
