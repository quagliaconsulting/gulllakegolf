import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import useSWR from 'swr';

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ScoringPage() {
  const router = useRouter();
  const { id } = router.query;
  const [dayIndex, setDayIndex] = useState(0);
  const [matchIndex, setMatchIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch tournament data from API
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/tournaments/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000 // 10 seconds
    }
  );

  // Extract tournament and schedules
  const tournament = data?.tournament;
  const schedules = tournament?.schedules || [];
  
  // Get current match based on selected indices
  const currentDay = schedules[dayIndex];
  const currentMatch = currentDay?.matches?.[matchIndex];

  // Reset indices if necessary when data changes
  useEffect(() => {
    if (schedules && schedules.length > 0) {
      if (dayIndex >= schedules.length) {
        setDayIndex(0);
      }
      
      const matches = schedules[dayIndex]?.matches || [];
      if (matchIndex >= matches.length) {
        setMatchIndex(0);
      }
    }
  }, [schedules, dayIndex, matchIndex]);

  // Initialize scores when match changes
  useEffect(() => {
    if (currentMatch) {
      const initialScores: Record<string, any> = {};
      // If using holeResults from the database
      if (currentMatch.holeResults && currentMatch.holeResults.length > 0) {
        currentMatch.holeResults.forEach((result: any) => {
          const holeNumber = result.hole.number;
          initialScores[`home-${holeNumber}`] = result.homeTeamGrossScore || '';
          initialScores[`away-${holeNumber}`] = result.awayTeamGrossScore || '';
        });
      } else if (currentMatch.holes) {
        // If using local holes array
        currentMatch.holes.forEach((hole: any) => {
          initialScores[`home-${hole.number}`] = hole.homeGross || '';
          initialScores[`away-${hole.number}`] = hole.awayGross || '';
        });
      }
      setScores(initialScores);
    }
  }, [currentMatch]);

  // Handle score changes
  const handleScoreChange = (team: string, holeNumber: any, value: string) => {
    const key = `${team}-${holeNumber}`;
    const newScores = { ...scores, [key]: value === '' ? '' : parseInt(value, 10) };
    setScores(newScores);
    setSaved(false);
    
    // Calculate net scores and winners
    if (currentMatch) {
      const homeHandicap = currentMatch.homeTeamHandicap * currentMatch.formatMultiplier;
      const awayHandicap = currentMatch.awayTeamHandicap * currentMatch.formatMultiplier;
      const isFourManTeam = currentMatch.format?.isFourManTeam || false;
      
      const homeGross = newScores[`home-${holeNumber}`];
      const awayGross = newScores[`away-${holeNumber}`];
      
      if (homeGross !== '' && awayGross !== '') {
        // Find hole details to get handicap index
        const hole = currentMatch.holes.find((h: any) => h.number === holeNumber);
        if (!hole) return;
        
        // Get strokes for this hole based on handicap and hole index
        const getStrokesOnHole = (handicap: number, holeHandicapIndex: number): number => {
          if (handicap <= 0) return 0;
          
          // For handicaps 1-18, give one stroke on holes with index <= handicap
          if (handicap <= 18) {
            return holeHandicapIndex <= handicap ? 1 : 0;
          }
          
          // For handicaps > 18, give multiple strokes on some holes
          let strokes = 1;
          
          // Add additional strokes based on remaining handicap
          const remainingHandicap = handicap - 18;
          if (holeHandicapIndex <= remainingHandicap) {
            strokes += 1;
          }
          
          // For very high handicaps (> 36), continue the pattern
          if (remainingHandicap > 18) {
            const additionalStrokes = Math.floor((remainingHandicap - 18) / 18);
            strokes += additionalStrokes;
            
            const finalRemainder = remainingHandicap - (additionalStrokes * 18);
            if (holeHandicapIndex <= finalRemainder) {
              strokes += 1;
            }
          }
          
          return strokes;
        };
        
        // For 4-man team events, use gross score directly
        // Otherwise apply proper match play handicap calculation
        const homeStrokesOnHole = isFourManTeam ? 0 : getStrokesOnHole(homeHandicap, hole.handicap);
        const awayStrokesOnHole = isFourManTeam ? 0 : getStrokesOnHole(awayHandicap, hole.handicap);
        
        const homeNet = Math.max(1, homeGross - homeStrokesOnHole);
        const awayNet = Math.max(1, awayGross - awayStrokesOnHole);
        
        // Update the hole result in the UI
        const holeIndex = currentMatch.holes.findIndex((h: any) => h.number === holeNumber);
        if (holeIndex !== -1) {
          const updatedHoles = [...currentMatch.holes];
          updatedHoles[holeIndex] = {
            ...updatedHoles[holeIndex],
            homeGross: homeGross as any,
            awayGross: awayGross as any,
            homeNet: homeNet as any,
            awayNet: awayNet as any,
            winner: (homeNet < awayNet ? 'home' : homeNet > awayNet ? 'away' : 'tie') as any
          };
          
          // In a real app, we would update the match state here
          console.log('Updated hole:', updatedHoles[holeIndex]);
        }
      }
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!currentMatch) return;
    
    setSaving(true);
    
    try {
      // Format the scores for API
      const holeResults = Object.entries(scores).map(([key, value]) => {
        const [team, holeNumber] = key.split('-');
        return {
          holeNumber: parseInt(holeNumber, 10),
          [team === 'home' ? 'homeGross' : 'awayGross']: value
        };
      }).reduce((acc, curr) => {
        const existing = acc.find((item) => item.holeNumber === curr.holeNumber);
        if (existing) {
          return acc.map((item) => {
            if (item.holeNumber === curr.holeNumber) {
              return { ...item, ...curr };
            }
            return item;
          });
        }
        return [...acc, curr];
      }, [] as any[]);
      
      // Call API to save scores
      await axios.post(`/api/matches/${currentMatch.id}/scores`, {
        holeResults
      });
      
      // Refresh data
      mutate();
      
      setSaved(true);
      
      // Reset saved status after 3 seconds
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving scores:', error);
      alert('Failed to save scores. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // If tournament doesn't exist or is still loading
  if (!tournament) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Enter Scores | {tournament.name}</title>
      </Head>

      <div>
        <div className="mb-8">
          <Link href={`/tournaments/${id}`} passHref legacyBehavior={false} className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Tournament
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Enter Scores</h1>
          <p className="mt-2 text-sm text-gray-700">
            Enter hole-by-hole scores for each match in the tournament.
          </p>
        </div>

        {/* Match Selection */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="day-select" className="block text-sm font-medium text-gray-700">
              Day
            </label>
            <select
              id="day-select"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              value={dayIndex}
              onChange={(e) => {
                setDayIndex(parseInt(e.target.value, 10));
                setMatchIndex(0); // Reset match index when day changes
              }}
            >
              {schedules.map((day: any, idx: number) => (
                <option key={day.id} value={idx}>
                  Day {day.day} - {new Date(day.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="match-select" className="block text-sm font-medium text-gray-700">
              Match
            </label>
            <select
              id="match-select"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              value={matchIndex}
              onChange={(e) => setMatchIndex(parseInt(e.target.value, 10))}
            >
              {currentDay?.matches?.map((match: any, idx: number) => (
                <option key={match.id} value={idx}>
                  {match.homeTeam.name} vs {match.awayTeam.name} - {new Date(match.teeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Match Details */}
        {currentMatch && (
          <div className="mb-8">
            <div className="overflow-hidden bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Match Details</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {currentMatch.format.formatName} - {currentMatch.course.name}
                </p>
                {currentMatch.format?.isFourManTeam ? (
                  <p className="mt-1 text-sm font-medium text-blue-600">
                    4-Man Team Event (No handicaps applied)
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">
                    Match Play Scoring: Strokes are allocated based on hole difficulty index.
                    <br />
                    Players receive strokes on the most difficult holes first (holes with lower handicap index).
                  </p>
                )}
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Home Team</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                      {currentMatch.homeTeam.name}
                      {!currentMatch.format?.isFourManTeam && (
                        <span className="ml-2 text-gray-500">
                          (Handicap: {(currentMatch.homeTeamHandicap * currentMatch.formatMultiplier).toFixed(1)})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Away Team</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                      {currentMatch.awayTeam.name}
                      {!currentMatch.format?.isFourManTeam && (
                        <span className="ml-2 text-gray-500">
                          (Handicap: {(currentMatch.awayTeamHandicap * currentMatch.formatMultiplier).toFixed(1)})
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* Score Entry Form */}
        {currentMatch && (
          <div className="mb-8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Hole
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Par
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Handicap
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {currentMatch.homeTeam.name} (Gross)
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {currentMatch.awayTeam.name} (Gross)
                    </th>
                    {!currentMatch.format?.isFourManTeam && (
                      <>
                        <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                          <div>Match Play Strokes</div>
                          <div className="text-xs font-normal">
                            <span className="text-blue-600 mr-2">{currentMatch.homeTeam.name}</span>/
                            <span className="text-red-600 ml-2">{currentMatch.awayTeam.name}</span>
                          </div>
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          {currentMatch.homeTeam.name} (Net)
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          {currentMatch.awayTeam.name} (Net)
                        </th>
                      </>
                    )}
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Winner
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {currentMatch.holes?.map((hole: any) => {
                    const homeGross = scores[`home-${hole.number}`];
                    const awayGross = scores[`away-${hole.number}`];
                    
                    // Calculate net scores
                    const homeHandicap = currentMatch.homeTeamHandicap * currentMatch.formatMultiplier;
                    const awayHandicap = currentMatch.awayTeamHandicap * currentMatch.formatMultiplier;
                    const isFourManTeam = currentMatch.format?.isFourManTeam || false;
                    
                    // Get strokes for match play scoring
                    const getStrokesOnHole = (handicap: number, holeHandicapIndex: number): number => {
                      if (handicap <= 0) return 0;
                      
                      // For handicaps 1-18, give one stroke on holes with index <= handicap
                      if (handicap <= 18) {
                        return holeHandicapIndex <= handicap ? 1 : 0;
                      }
                      
                      // For handicaps > 18, give multiple strokes on some holes
                      let strokes = 1;
                      
                      // Add additional strokes based on remaining handicap
                      const remainingHandicap = handicap - 18;
                      if (holeHandicapIndex <= remainingHandicap) {
                        strokes += 1;
                      }
                      
                      // For very high handicaps (> 36), continue the pattern
                      if (remainingHandicap > 18) {
                        const additionalStrokes = Math.floor((remainingHandicap - 18) / 18);
                        strokes += additionalStrokes;
                        
                        const finalRemainder = remainingHandicap - (additionalStrokes * 18);
                        if (holeHandicapIndex <= finalRemainder) {
                          strokes += 1;
                        }
                      }
                      
                      return strokes;
                    };
                    
                    // For 4-man team events, net score equals gross score
                    // Otherwise calculate proper match play strokes
                    const homeStrokesOnHole = !isFourManTeam && typeof homeGross === 'number'
                      ? getStrokesOnHole(homeHandicap, hole.handicap)
                      : 0;
                    
                    const awayStrokesOnHole = !isFourManTeam && typeof awayGross === 'number'
                      ? getStrokesOnHole(awayHandicap, hole.handicap)
                      : 0;
                    
                    const homeNet = typeof homeGross === 'number' 
                      ? (isFourManTeam ? homeGross : Math.max(1, homeGross - homeStrokesOnHole))
                      : null;
                      
                    const awayNet = typeof awayGross === 'number'
                      ? (isFourManTeam ? awayGross : Math.max(1, awayGross - awayStrokesOnHole))
                      : null;
                    
                    // Determine winner
                    let winner = null;
                    if (homeNet !== null && awayNet !== null) {
                      if (homeNet < awayNet) {
                        winner = 'home';
                      } else if (awayNet < homeNet) {
                        winner = 'away';
                      } else {
                        winner = 'tie';
                      }
                    }
                    
                    return (
                      <tr key={hole.number}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {hole.number}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {hole.par}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {hole.handicap}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <input
                            type="number"
                            min="1"
                            value={homeGross === '' ? '' : homeGross}
                            onChange={(e) => handleScoreChange('home', hole.number, e.target.value)}
                            className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <input
                            type="number"
                            min="1"
                            value={awayGross === '' ? '' : awayGross}
                            onChange={(e) => handleScoreChange('away', hole.number, e.target.value)}
                            className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                          />
                        </td>
                        {!currentMatch.format?.isFourManTeam && (
                          <>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                              <span className="inline-flex items-center justify-center">
                                <span className={`mr-2 ${homeStrokesOnHole > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                                  {homeStrokesOnHole > 0 ? 
                                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold">
                                      {homeStrokesOnHole > 1 ? homeStrokesOnHole : '✓'}
                                    </span> : '-'}
                                </span>
                                /
                                <span className={`ml-2 ${awayStrokesOnHole > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                                  {awayStrokesOnHole > 0 ? 
                                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold">
                                      {awayStrokesOnHole > 1 ? awayStrokesOnHole : '✓'}
                                    </span> : '-'}
                                </span>
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {homeNet !== null ? homeNet : '-'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {awayNet !== null ? awayNet : '-'}
                            </td>
                          </>
                        )}
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {winner === 'home' ? (
                            <span className="font-medium text-green-600">{currentMatch.homeTeam.name}</span>
                          ) : winner === 'away' ? (
                            <span className="font-medium text-green-600">{currentMatch.awayTeam.name}</span>
                          ) : winner === 'tie' ? (
                            <span className="font-medium text-gray-500">Tie</span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={classNames(
                  saving ? 'cursor-not-allowed bg-gray-300' : 'bg-green-600 hover:bg-green-700',
                  'inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                )}
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="mr-2 -ml-1 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Scores'
                )}
              </button>
              
              {saved && (
                <span className="text-sm font-medium text-green-600">
                  Scores saved successfully!
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}