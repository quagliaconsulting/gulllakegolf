import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import useSWR from 'swr';
import { ArrowLeftIcon, PrinterIcon, UserIcon, LockClosedIcon, LockOpenIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ScorecardView() {
  const router = useRouter();
  const { id, matchId } = router.query;
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Fetch match data with scores
  const { data, error, isLoading, mutate } = useSWR(
    matchId ? `/api/matches/${matchId}/scores` : null,
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  // Fetch match players
  const { data: playersData } = useSWR(
    matchId ? `/api/matches/${matchId}/players` : null,
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  // Initialize scores when match changes
  useEffect(() => {
    if (data?.match?.holes) {
      const initialScores: Record<string, any> = {};
      data.match.holes.forEach((hole: any) => {
        initialScores[`home-${hole.number}`] = hole.homeGross || '';
        initialScores[`away-${hole.number}`] = hole.awayGross || '';
      });
      setScores(initialScores);
    }
  }, [data?.match?.holes]);

  // Handle printing
  const handlePrint = () => {
    window.print();
  };

  // Navigate to player assignments
  const goToPlayerAssignments = () => {
    router.push(`/tournaments/${id}/matches/${matchId}/players`);
  };
  
  // Toggle edit mode with password protection
  const toggleEditMode = () => {
    if (editMode) {
      // If already in edit mode, just toggle it off
      setEditMode(false);
      setSaved(false);
      return;
    }
    
    // Show password modal
    setShowPasswordModal(true);
    setPasswordInput('');
  };
  
  // Handle password submission
  const handlePasswordSubmit = () => {
    const now = new Date();
    const currentTimePassword = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (passwordInput === currentTimePassword) {
      setEditMode(true);
      setSaved(false);
      setShowPasswordModal(false);
      setPasswordInput('');
    } else {
      alert("Incorrect password. Scores remain locked.");
    }
  };
  
  // Handle score changes
  const handleScoreChange = (team: string, holeNumber: number, value: string) => {
    const key = `${team}-${holeNumber}`;
    const newScores = { ...scores, [key]: value === '' ? '' : parseInt(value, 10) };
    setScores(newScores);
    setSaved(false);
  };
  
  // Save scores
  const handleSaveScores = async () => {
    if (!data?.match) return;
    
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
      await axios.post(`/api/matches/${matchId}/scores`, {
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

  // Group holes by front 9 and back 9
  const getFrontNine = () => {
    if (!data?.match?.holes) return [];
    return data.match.holes.filter((hole: any) => hole.number <= 9);
  };

  const getBackNine = () => {
    if (!data?.match?.holes) return [];
    return data.match.holes.filter((hole: any) => hole.number > 9);
  };

  // Calculate totals
  const calculateTotals = (holes: any[]) => {
    if (!holes || holes.length === 0) return { par: 0, homeGross: '-', awayGross: '-', homeNet: '-', awayNet: '-' };
    
    const totals = holes.reduce((acc: any, hole: any) => {
      return {
        par: acc.par + hole.par,
        homeGross: typeof acc.homeGross === 'number' && typeof hole.homeGross === 'number' ? 
          acc.homeGross + hole.homeGross : '-',
        awayGross: typeof acc.awayGross === 'number' && typeof hole.awayGross === 'number' ? 
          acc.awayGross + hole.awayGross : '-',
        homeNet: typeof acc.homeNet === 'number' && typeof hole.homeNet === 'number' ? 
          acc.homeNet + hole.homeNet : '-',
        awayNet: typeof acc.awayNet === 'number' && typeof hole.awayNet === 'number' ? 
          acc.awayNet + hole.awayNet : '-',
      };
    }, { par: 0, homeGross: 0, awayGross: 0, homeNet: 0, awayNet: 0 });
    
    return totals;
  };
  
  // Calculate handicap strokes for a given hole
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

  // Count match results
  const countResults = (holes: any[]) => {
    if (!holes || holes.length === 0) return { home: 0, away: 0, ties: 0 };
    
    const results = holes.reduce((acc: any, hole: any) => {
      if (hole.winner === 'home') {
        return { ...acc, home: acc.home + 1 };
      } else if (hole.winner === 'away') {
        return { ...acc, away: acc.away + 1 };
      } else if (hole.winner === 'tie') {
        return { ...acc, ties: acc.ties + 1 };
      }
      return acc;
    }, { home: 0, away: 0, ties: 0 });
    
    return results;
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading scorecard...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Error loading scorecard. Please try again.</div>;
  }

  if (!data?.match) {
    return <div className="p-8 text-center">Match not found</div>;
  }

  const match = data.match;
  const frontNine = getFrontNine();
  const backNine = getBackNine();
  const frontNineTotals = calculateTotals(frontNine);
  const backNineTotals = calculateTotals(backNine);
  const totalResults = countResults([...frontNine, ...backNine]);
  
  // Determine overall match result
  let matchResult = '';
  if (totalResults.home > totalResults.away) {
    matchResult = `${match.homeTeam} wins ${totalResults.home}-${totalResults.away}`;
  } else if (totalResults.away > totalResults.home) {
    matchResult = `${match.awayTeam} wins ${totalResults.away}-${totalResults.home}`;
  } else if (totalResults.home === totalResults.away && (totalResults.home > 0 || totalResults.away > 0)) {
    matchResult = 'Match tied';
  } else {
    matchResult = 'No score entered';
  }

  return (
    <>
      <Head>
        <title>Scorecard | {match.homeTeam} vs {match.awayTeam}</title>
        <style type="text/css" media="print">
          {`
            @media print {
              .print-hidden { display: none !important; }
              .print-full-width { width: 100% !important; max-width: 100% !important; }
            }
          `}
        </style>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-0 print:px-0">
        <div className="mb-8 print-hidden">
          <Link href={`/tournaments/${id}`} className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Tournament
          </Link>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Match Scorecard</h1>
            <p className="mt-1 text-sm text-gray-600">
              {match.format} - {match.course}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {match.startingHole ? `Starting Hole: ${match.startingHole}` : ''} 
              {match.time ? ` • Tee Time: ${match.time}` : ''}
            </p>
          </div>
          <div className="flex space-x-4 print-hidden">
            <button
              type="button"
              onClick={goToPlayerAssignments}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <UserIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              Assign Players
            </button>
            <button
              type="button"
              onClick={toggleEditMode}
              className={classNames(
                editMode ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-white text-gray-700 border-gray-300",
                "inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
              )}
            >
              {editMode ? (
                <>
                  <LockOpenIcon className="-ml-1 mr-2 h-5 w-5 text-yellow-500" />
                  Edit Mode (Unlocked)
                </>
              ) : (
                <>
                  <LockClosedIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                  Unlock Scores
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <PrinterIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              Print Scorecard
            </button>
          </div>
        </div>

        {/* Match Details */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden mb-6 print:shadow-none print:ring-0 print:mb-4">
          <div className="px-4 py-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-500">Home Team</span>
              <span className="text-base font-semibold text-forest-green">{match.homeTeam}</span>
              {!match.isFourManTeam && (
                <span className="text-sm text-gray-500">Handicap: {match.homeTeamHandicap.toFixed(1)}</span>
              )}
              {playersData?.homePlayers && (
                <div className="mt-1">
                  <span className="text-xs font-medium text-gray-500">Players:</span>
                  <ul className="text-xs text-gray-600">
                    {playersData.homePlayers.map((player: any) => (
                      <li key={player.id}>{player.name} (HCP: {player.handicapIndex})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex flex-col text-center">
              <span className="text-sm font-medium text-gray-500">Results</span>
              <span className="text-lg font-bold text-gray-900">{matchResult}</span>
              <span className="text-sm text-gray-600">
                {totalResults.home} holes to {totalResults.away} 
                {totalResults.ties > 0 ? ` (${totalResults.ties} tied)` : ''}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-sm font-medium text-gray-500">Away Team</span>
              <span className="text-base font-semibold text-blue-600">{match.awayTeam}</span>
              {!match.isFourManTeam && (
                <span className="text-sm text-gray-500">Handicap: {match.awayTeamHandicap.toFixed(1)}</span>
              )}
              {playersData?.awayPlayers && (
                <div className="mt-1">
                  <span className="text-xs font-medium text-gray-500">Players:</span>
                  <ul className="text-xs text-gray-600">
                    {playersData.awayPlayers.map((player: any) => (
                      <li key={player.id}>{player.name} (HCP: {player.handicapIndex})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Front Nine */}
        {frontNine.length > 0 && (
          <div className="mb-8 print:mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Front Nine</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-2 pl-3 pr-3 text-left text-xs font-semibold text-gray-900">Hole</th>
                    {frontNine.map((hole: any) => (
                      <th key={hole.number} scope="col" className="px-3 py-2 text-center text-xs font-semibold text-gray-900">
                        <div>{hole.number}</div>
                        {!match.isFourManTeam && (
                          <div className="mt-1">
                            <div className="text-[9px] text-gray-500 mb-0.5">HCP Index: {hole.handicap}</div>
                            <div className="flex justify-center space-x-1 items-center">
                              {(() => {
                                const homeHandicap = match.homeTeamHandicap * match.formatMultiplier;
                                const awayHandicap = match.awayTeamHandicap * match.formatMultiplier;
                                const homeStrokes = getStrokesOnHole(homeHandicap, hole.handicap);
                                const awayStrokes = getStrokesOnHole(awayHandicap, hole.handicap);
                                
                                return (
                                  <>
                                    {homeStrokes > 0 ? (
                                      <span className="inline-flex items-center justify-center rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-forest-green">
                                        {homeStrokes > 1 ? homeStrokes : '•'}
                                      </span>
                                    ) : (
                                      <span className="w-4"></span>
                                    )}
                                    <span className="text-gray-400 text-[8px]">/</span>
                                    {awayStrokes > 0 ? (
                                      <span className="inline-flex items-center justify-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                        {awayStrokes > 1 ? awayStrokes : '•'}
                                      </span>
                                    ) : (
                                      <span className="w-4"></span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2 text-center text-xs font-semibold text-gray-900">OUT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {/* Par Row */}
                  <tr>
                    <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-gray-900">Par</td>
                    {frontNine.map((hole: any) => (
                      <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs text-gray-700">{hole.par}</td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-900">{frontNineTotals.par}</td>
                  </tr>
                  
                  {/* Home Team Gross */}
                  <tr className="bg-green-50">
                    <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-forest-green">
                      {match.homeTeam} (Gross)
                    </td>
                    {frontNine.map((hole: any) => (
                      <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs text-forest-green">
                        {editMode ? (
                          <input
                            type="number"
                            min="1"
                            value={scores[`home-${hole.number}`] === '' ? '' : scores[`home-${hole.number}`]}
                            onChange={(e) => handleScoreChange('home', hole.number, e.target.value)}
                            className="w-12 h-6 text-center rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-xs"
                          />
                        ) : (
                          hole.homeGross !== null ? hole.homeGross : '-'
                        )}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-forest-green">
                      {frontNineTotals.homeGross}
                    </td>
                  </tr>
                  
                  {/* Away Team Gross */}
                  <tr className="bg-blue-50">
                    <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-blue-800">
                      {match.awayTeam} (Gross)
                    </td>
                    {frontNine.map((hole: any) => (
                      <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs text-blue-800">
                        {editMode ? (
                          <input
                            type="number"
                            min="1"
                            value={scores[`away-${hole.number}`] === '' ? '' : scores[`away-${hole.number}`]}
                            onChange={(e) => handleScoreChange('away', hole.number, e.target.value)}
                            className="w-12 h-6 text-center rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-xs"
                          />
                        ) : (
                          hole.awayGross !== null ? hole.awayGross : '-'
                        )}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-blue-800">
                      {frontNineTotals.awayGross}
                    </td>
                  </tr>
                  
                  {!match.isFourManTeam && (
                    <>
                      {/* Home Team Net */}
                      <tr>
                        <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-gray-900">
                          {match.homeTeam} (Net)
                        </td>
                        {frontNine.map((hole: any) => (
                          <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs text-gray-700">
                            {hole.homeNet !== null ? hole.homeNet : '-'}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-900">
                          {frontNineTotals.homeNet}
                        </td>
                      </tr>
                      
                      {/* Away Team Net */}
                      <tr>
                        <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-gray-900">
                          {match.awayTeam} (Net)
                        </td>
                        {frontNine.map((hole: any) => (
                          <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs text-gray-700">
                            {hole.awayNet !== null ? hole.awayNet : '-'}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-900">
                          {frontNineTotals.awayNet}
                        </td>
                      </tr>
                    </>
                  )}
                  
                  {/* Winner Row */}
                  <tr className="bg-gray-50">
                    <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-gray-900">Winner</td>
                    {frontNine.map((hole: any) => (
                      <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs">
                        {hole.winner === 'home' ? (
                          <span className="text-forest-green font-medium">H</span>
                        ) : hole.winner === 'away' ? (
                          <span className="text-blue-600 font-medium">A</span>
                        ) : hole.winner === 'tie' ? (
                          <span className="text-gray-500 font-medium">T</span>
                        ) : (
                          '-'
                        )}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-900">
                      {totalResults.home > totalResults.away ? (
                        <span className="text-forest-green">H</span>
                      ) : totalResults.away > totalResults.home ? (
                        <span className="text-blue-600">A</span>
                      ) : (
                        <span className="text-gray-500">T</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Back Nine */}
        {backNine.length > 0 && (
          <div className="mb-8 print:mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Back Nine</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-2 pl-3 pr-3 text-left text-xs font-semibold text-gray-900">Hole</th>
                    {backNine.map((hole: any) => (
                      <th key={hole.number} scope="col" className="px-3 py-2 text-center text-xs font-semibold text-gray-900">
                        <div>{hole.number}</div>
                        {!match.isFourManTeam && (
                          <div className="mt-1">
                            <div className="text-[9px] text-gray-500 mb-0.5">HCP Index: {hole.handicap}</div>
                            <div className="flex justify-center space-x-1 items-center">
                              {(() => {
                                const homeHandicap = match.homeTeamHandicap * match.formatMultiplier;
                                const awayHandicap = match.awayTeamHandicap * match.formatMultiplier;
                                const homeStrokes = getStrokesOnHole(homeHandicap, hole.handicap);
                                const awayStrokes = getStrokesOnHole(awayHandicap, hole.handicap);
                                
                                return (
                                  <>
                                    {homeStrokes > 0 ? (
                                      <span className="inline-flex items-center justify-center rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-forest-green">
                                        {homeStrokes > 1 ? homeStrokes : '•'}
                                      </span>
                                    ) : (
                                      <span className="w-4"></span>
                                    )}
                                    <span className="text-gray-400 text-[8px]">/</span>
                                    {awayStrokes > 0 ? (
                                      <span className="inline-flex items-center justify-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                        {awayStrokes > 1 ? awayStrokes : '•'}
                                      </span>
                                    ) : (
                                      <span className="w-4"></span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2 text-center text-xs font-semibold text-gray-900">IN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {/* Par Row */}
                  <tr>
                    <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-gray-900">Par</td>
                    {backNine.map((hole: any) => (
                      <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs text-gray-700">{hole.par}</td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-900">{backNineTotals.par}</td>
                  </tr>
                  
                  {/* Home Team Gross */}
                  <tr className="bg-green-50">
                    <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-forest-green">
                      {match.homeTeam} (Gross)
                    </td>
                    {backNine.map((hole: any) => (
                      <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs text-forest-green">
                        {editMode ? (
                          <input
                            type="number"
                            min="1"
                            value={scores[`home-${hole.number}`] === '' ? '' : scores[`home-${hole.number}`]}
                            onChange={(e) => handleScoreChange('home', hole.number, e.target.value)}
                            className="w-12 h-6 text-center rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-xs"
                          />
                        ) : (
                          hole.homeGross !== null ? hole.homeGross : '-'
                        )}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-forest-green">
                      {backNineTotals.homeGross}
                    </td>
                  </tr>
                  
                  {/* Away Team Gross */}
                  <tr className="bg-blue-50">
                    <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-blue-800">
                      {match.awayTeam} (Gross)
                    </td>
                    {backNine.map((hole: any) => (
                      <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs text-blue-800">
                        {editMode ? (
                          <input
                            type="number"
                            min="1"
                            value={scores[`away-${hole.number}`] === '' ? '' : scores[`away-${hole.number}`]}
                            onChange={(e) => handleScoreChange('away', hole.number, e.target.value)}
                            className="w-12 h-6 text-center rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-xs"
                          />
                        ) : (
                          hole.awayGross !== null ? hole.awayGross : '-'
                        )}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-blue-800">
                      {backNineTotals.awayGross}
                    </td>
                  </tr>
                  
                  {!match.isFourManTeam && (
                    <>
                      {/* Home Team Net */}
                      <tr>
                        <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-gray-900">
                          {match.homeTeam} (Net)
                        </td>
                        {backNine.map((hole: any) => (
                          <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs text-gray-700">
                            {hole.homeNet !== null ? hole.homeNet : '-'}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-900">
                          {backNineTotals.homeNet}
                        </td>
                      </tr>
                      
                      {/* Away Team Net */}
                      <tr>
                        <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-gray-900">
                          {match.awayTeam} (Net)
                        </td>
                        {backNine.map((hole: any) => (
                          <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs text-gray-700">
                            {hole.awayNet !== null ? hole.awayNet : '-'}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-900">
                          {backNineTotals.awayNet}
                        </td>
                      </tr>
                    </>
                  )}
                  
                  {/* Winner Row */}
                  <tr className="bg-gray-50">
                    <td className="whitespace-nowrap py-2 pl-3 pr-3 text-xs font-medium text-gray-900">Winner</td>
                    {backNine.map((hole: any) => (
                      <td key={hole.number} className="whitespace-nowrap px-3 py-2 text-center text-xs">
                        {hole.winner === 'home' ? (
                          <span className="text-forest-green font-medium">H</span>
                        ) : hole.winner === 'away' ? (
                          <span className="text-blue-600 font-medium">A</span>
                        ) : hole.winner === 'tie' ? (
                          <span className="text-gray-500 font-medium">T</span>
                        ) : (
                          '-'
                        )}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-900">
                      {totalResults.home > totalResults.away ? (
                        <span className="text-forest-green">H</span>
                      ) : totalResults.away > totalResults.home ? (
                        <span className="text-blue-600">A</span>
                      ) : (
                        <span className="text-gray-500">T</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Handicap Details */}
        {!match.isFourManTeam && (
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden mb-6 print:shadow-none print:ring-0 print:mb-4">
            <div className="px-4 py-4 sm:px-6">
              <h3 className="text-sm font-medium text-gray-900">Handicap Details</h3>
              <div className="mt-2 text-xs text-gray-600">
                <p>Format: {match.format} (Multiplier: {match.formatMultiplier})</p>
                <div className="flex mt-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2">
                    <span className="text-forest-green font-bold">H</span>
                  </div>
                  <div>
                    <p className="font-semibold text-forest-green">{match.homeTeam}</p>
                    <p>Base Handicap {(match.homeTeamHandicap / match.formatMultiplier).toFixed(1)} × {match.formatMultiplier} = {match.homeTeamHandicap.toFixed(1)} strokes</p>
                  </div>
                </div>
                
                <div className="flex mt-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <span className="text-blue-700 font-bold">A</span>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700">{match.awayTeam}</p>
                    <p>Base Handicap {(match.awayTeamHandicap / match.formatMultiplier).toFixed(1)} × {match.formatMultiplier} = {match.awayTeamHandicap.toFixed(1)} strokes</p>
                  </div>
                </div>
                
                <div className="mt-3 bg-gray-50 p-2 rounded">
                  <p className="font-medium">How Handicap Strokes Work:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Strokes are allocated based on hole difficulty (handicap index)</li>
                    <li>Lower handicap index holes (1-9) are more difficult and receive strokes first</li>
                    <li>A <span className="inline-flex items-center justify-center rounded bg-green-100 px-1.5 text-[10px] font-medium text-forest-green">•</span> or <span className="inline-flex items-center justify-center rounded bg-blue-100 px-1.5 text-[10px] font-medium text-blue-700">•</span> by a hole number indicates 1 stroke</li>
                    <li>Numbers (2, 3, etc.) indicate multiple strokes on very difficult holes for high handicappers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Match Summary */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden mb-6 print:shadow-none print:ring-0 print:mb-4">
          <div className="px-4 py-4 sm:px-6">
            <h3 className="text-sm font-medium text-gray-900">Match Summary</h3>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-xs font-medium text-forest-green">{match.homeTeam}</h4>
                <p className="text-xs text-gray-600">Won {totalResults.home} holes</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-800">Tied</h4>
                <p className="text-xs text-gray-600">{totalResults.ties} holes</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-blue-800">{match.awayTeam}</h4>
                <p className="text-xs text-gray-600">Won {totalResults.away} holes</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-900">
              {matchResult}
            </p>
          </div>
        </div>

        <div className="print-hidden">
          <div className="flex justify-between items-center">
            {editMode ? (
              <div className="flex space-x-4 items-center">
                <button
                  type="button"
                  onClick={handleSaveScores}
                  disabled={saving}
                  className={classNames(
                    saving ? "cursor-not-allowed bg-gray-300" : "bg-green-600 hover:bg-green-700",
                    "inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
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
            ) : (
              <div>
                <span className="text-xs text-gray-500">
                  Click "Unlock Scores" to edit scores
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
            >
              <PrinterIcon className="-ml-1 mr-2 h-5 w-5" />
              Print Scorecard
            </button>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPasswordModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <LockClosedIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">Unlock Scorecard</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Enter the password to unlock scorecard editing.
                    </p>
                    <input
                      type="password"
                      className="mt-3 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                      placeholder="Password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handlePasswordSubmit();
                        }
                      }}
                      autoFocus
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                  onClick={handlePasswordSubmit}
                >
                  Unlock
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}