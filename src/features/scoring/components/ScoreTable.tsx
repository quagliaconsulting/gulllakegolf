import React, { useState } from 'react';
import { StarIcon, FlagIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { getStrokesOnHole } from '@/utils/handicap';

interface Player {
  id: string;
  name: string;
  handicapIndex: number;
}

interface Hole {
  id: string;
  number: number;
  par: number;
  handicap: number;
  isPar3?: boolean;
  homeGross: number | null;
  awayGross: number | null;
  homeNet: number | null;
  awayNet: number | null;
  winner: 'home' | 'away' | 'tie' | null;
  ctpWinnerId?: string | null;
  potentialSkin?: boolean;
  // Allow for player-specific scores
  [key: string]: any;
}

interface ScoreTableProps {
  match: any;
  scores: Record<string, any>;
  holes: Hole[];
  onScoreChange: (key: string, value: string) => void;
  lockStatus: boolean;
  isFrontNine?: boolean;
  onCtpWinnerChange?: (holeId: string, playerId: string | null) => void;
  ctpWinners?: Record<string, string | null>;
  potentialSkins?: Record<string, boolean>;
  skinsWinners?: Record<string, string | null>;
  openCtpModal?: (holeId: string, holeNumber: number) => void;
  openSkinsModal?: (hole: Hole) => void;
}

// Helper function to calculate player-level net scores
const calculatePlayerNetScore = (gross: number, handicapIndex: number, holeHandicap: number): number | null => {
  if (gross === null || gross === undefined) return null;
  
  // Calculate strokes for this player on this hole based on their handicap
  const strokesOnHole = getStrokesOnHole(handicapIndex, holeHandicap);
  
  // Return gross score minus strokes for net score
  return gross - strokesOnHole;
};

// Determines the winner of an individual player matchup in Singles format
const determinePlayerMatchupWinner = (
  homePlayerScore: number | null, 
  homePlayerHandicap: number,
  awayPlayerScore: number | null, 
  awayPlayerHandicap: number,
  holeHandicap: number
): 'home' | 'away' | 'tie' | null => {
  // If either score is null, we can't determine a winner
  if (homePlayerScore === null || homePlayerScore === undefined || 
      awayPlayerScore === null || awayPlayerScore === undefined) {
    return null;
  }
  
  // Calculate net scores for both players
  const homeNetScore = homePlayerScore - getStrokesOnHole(homePlayerHandicap, holeHandicap);
  const awayNetScore = awayPlayerScore - getStrokesOnHole(awayPlayerHandicap, holeHandicap);
  
  // Determine winner based on net scores (lower score wins in golf)
  if (homeNetScore < awayNetScore) {
    return 'home';
  } else if (awayNetScore < homeNetScore) {
    return 'away';
  } else {
    return 'tie';
  }
};

export const ScoreTable: React.FC<ScoreTableProps> = ({
  match,
  scores,
  holes,
  onScoreChange,
  lockStatus,
  isFrontNine = true,
  onCtpWinnerChange,
  ctpWinners = {},
  potentialSkins = {},
  skinsWinners = {},
  openCtpModal,
  openSkinsModal
}) => {
  const [showCtpSelector, setShowCtpSelector] = useState<string | null>(null);
  
  // Determine format types for conditional rendering
  const isSinglesFormat = match.format?.toLowerCase().includes('singles');
  const isBestBallFormat = match.format?.toLowerCase().includes('best ball');
  
  // Check if this is a player-to-player match (explicit flag or has player-level scores)
  // Always treat singles format as having individual matchups if players are assigned
  const hasIndividualMatchups = match.playerToPlayerMatch || 
    (isSinglesFormat && match.homePlayers?.length > 0 && match.awayPlayers?.length > 0);
    
  // Add debugging information in development mode
  if (process.env.NODE_ENV === 'development' && isSinglesFormat) {
    console.log('Singles format scorecard detected:', {
      format: match.format,
      isExplicitPlayerToPlayer: !!match.playerToPlayerMatch,
      hasHomePlayers: !!match.homePlayers?.length,
      homePlayerCount: match.homePlayers?.length || 0,
      hasAwayPlayers: !!match.awayPlayers?.length,
      awayPlayerCount: match.awayPlayers?.length || 0,
      hasPlayerPairings: !!match.playerPairings?.length,
      playerPairingsCount: match.playerPairings?.length || 0,
      hasIndividualMatchups
    });
    
    // Log home and away players when present
    if (match.homePlayers?.length > 0) {
      console.log('Home players:', match.homePlayers.map((p: any) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicapIndex
      })));
    }
    
    if (match.awayPlayers?.length > 0) {
      console.log('Away players:', match.awayPlayers.map((p: any) => ({
        id: p.id,
        name: p.name, 
        handicap: p.handicapIndex
      })));
    }
    
    // Log player pairings if available
    if (match.playerPairings?.length > 0) {
      console.log('Player pairings:', match.playerPairings.map((p: any) => ({
        playerId: p.playerId,
        isHomeTeam: p.isHomeTeam,
        pairingGroup: p.pairingGroup
      })));
    }
  }
  const isSinglesOrBestBall = isSinglesFormat || isBestBallFormat;
  if (!match || !holes || holes.length === 0) return null;

  // Filter holes for front/back nine if needed
  const filteredHoles = isFrontNine 
    ? holes.filter(h => h.number <= 9)
    : holes.filter(h => h.number > 9);

  // Calculate totals
  const totalPar = filteredHoles.reduce((sum, hole) => sum + hole.par, 0);
  const homeTotalGross = filteredHoles
    .map(hole => scores[`home-${hole.number}`])
    .filter(score => score !== '' && !isNaN(Number(score)))
    .reduce((sum, score) => sum + Number(score), 0);
  const awayTotalGross = filteredHoles
    .map(hole => scores[`away-${hole.number}`])
    .filter(score => score !== '' && !isNaN(Number(score)))
    .reduce((sum, score) => sum + Number(score), 0);
  const homeTotalNet = filteredHoles
    .filter(hole => hole.homeNet !== null)
    .reduce((sum, hole) => sum + (hole.homeNet || 0), 0);
  const awayTotalNet = filteredHoles
    .filter(hole => hole.awayNet !== null)
    .reduce((sum, hole) => sum + (hole.awayNet || 0), 0);

  // Count home/away/tied holes
  const homeWins = filteredHoles.filter(h => h.winner === 'home').length;
  const awayWins = filteredHoles.filter(h => h.winner === 'away').length;
  const ties = filteredHoles.filter(h => h.winner === 'tie').length;

  // Get eligible players ONCE (assuming skins eligibility doesn't change during table render)
  // NOTE: This assumes `skinsEligiblePlayers` function exists and is stable, 
  // otherwise it should be passed as a prop or calculated differently.
  // We'll derive it from the full player list for now, filtering by presence
  // in potentialSkins or skinsWinners keys.
  const allPlayersInMatch = [
    ...(match.homePlayers?.map((p: any) => ({ ...p, isHomeTeam: true })) || []),
    ...(match.awayPlayers?.map((p: any) => ({ ...p, isHomeTeam: false })) || [])
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-3 border text-left">Hole</th>
            {filteredHoles.map(hole => (
              <th key={hole.id} className="py-2 px-3 border text-center relative">
                {hole.number}
                {hole.isPar3 && (
                  <div className="absolute top-0.5 right-0.5 flex items-center">
                    <FlagIcon className="h-3 w-3 text-green-500" title="Par 3" />
                    {!lockStatus && (
                      <button 
                        type="button"
                        onClick={() => openCtpModal 
                          ? openCtpModal(hole.id, hole.number) 
                          : setShowCtpSelector(showCtpSelector === hole.id ? null : hole.id)
                        }
                        disabled={lockStatus} 
                        className="ml-1 text-xs text-yellow-600 hover:text-yellow-800 disabled:opacity-50"
                        title="Set CTP Winner"
                      >
                        <TrophyIcon className="h-3 w-3" />
                      </button>
                    )}
                    
                    {/* CTP Winner Indicator */}
                    {ctpWinners[hole.id] && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-yellow-100 px-1 py-0.5 text-[8px] font-medium text-yellow-800">
                        CTP
                      </span>
                    )}
                  </div>
                )}
                
                {/* CTP Winner Selection Dropdown (Simple version) */}
                {onCtpWinnerChange && !openCtpModal && showCtpSelector === hole.id && (
                  <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-md z-10 border border-gray-200 w-32">
                    <div className="p-1 text-sm font-medium border-b border-gray-200">CTP Winner</div>
                    <div className="max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          onCtpWinnerChange(hole.id, null);
                          setShowCtpSelector(null);
                        }}
                        className="w-full text-left text-xs p-1 hover:bg-gray-100"
                      >
                        None
                      </button>
                      {match.homePlayers.map((player: any) => (
                        <button
                          key={`ctp-home-${player.id}`}
                          type="button"
                          onClick={() => {
                            onCtpWinnerChange(hole.id, player.id);
                            setShowCtpSelector(null);
                          }}
                          className={`w-full text-left text-xs p-1 hover:bg-green-50 ${
                            ctpWinners[hole.id] === player.id ? 'bg-green-100 font-medium' : ''
                          }`}
                        >
                          {player.name}
                        </button>
                      ))}
                      {match.awayPlayers.map((player: any) => (
                        <button
                          key={`ctp-away-${player.id}`}
                          type="button"
                          onClick={() => {
                            onCtpWinnerChange(hole.id, player.id);
                            setShowCtpSelector(null);
                          }}
                          className={`w-full text-left text-xs p-1 hover:bg-red-50 ${
                            ctpWinners[hole.id] === player.id ? 'bg-red-100 font-medium' : ''
                          }`}
                        >
                          {player.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </th>
            ))}
            <th className="py-2 px-3 border text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          {/* Par row */}
          <tr className="border-b">
            <td className="py-2 px-3 border font-medium">Par</td>
            {filteredHoles.map(hole => (
              <td key={`par-${hole.id}`} className="py-2 px-3 border text-center">
                {hole.par}
              </td>
            ))}
            <td className="py-2 px-3 border text-center font-medium">{totalPar}</td>
          </tr>

          {/* Handicap row */}
          <tr className="border-b bg-gray-50">
            <td className="py-2 px-3 border font-medium">Handicap</td>
            {filteredHoles.map(hole => (
              <td key={`hdcp-${hole.id}`} className="py-2 px-3 border text-center">
                {hole.handicap}
              </td>
            ))}
            <td className="py-2 px-3 border"></td>
          </tr>
          
          {/* Strokes row - showing where players get strokes based on handicap */}
          <tr className="border-b bg-green-50/50">
            <td className="py-2 px-3 border font-medium text-gray-700">
              Strokes
              <span className="text-xs block text-gray-500 font-normal">
                H=Home, A=Away
              </span>
            </td>
            {filteredHoles.map(hole => {
              // Determine which side gets strokes on this hole
              const homeGetsStroke = match.homeTeamHandicap > 0 && 
                hole.handicap <= Math.abs(match.homeTeamHandicap);
              const awayGetsStroke = match.awayTeamHandicap > 0 && 
                hole.handicap <= Math.abs(match.awayTeamHandicap);
              
              // Calculate how many strokes each side gets (for large handicap differences)
              const homeStrokes = homeGetsStroke ? 
                Math.floor((match.homeTeamHandicap - 1) / 18) + 1 : 0;
              const awayStrokes = awayGetsStroke ? 
                Math.floor((match.awayTeamHandicap - 1) / 18) + 1 : 0;
              
              return (
                <td key={`strokes-${hole.id}`} className="py-2 px-3 border text-center">
                  {homeGetsStroke && (
                    <span className="text-green-600 font-medium">
                      H: {homeStrokes > 1 ? homeStrokes : ''}⚪
                    </span>
                  )}
                  {homeGetsStroke && awayGetsStroke && <br />}
                  {awayGetsStroke && (
                    <span className="text-red-600 font-medium">
                      A: {awayStrokes > 1 ? awayStrokes : ''}⚪
                    </span>
                  )}
                </td>
              );
            })}
            <td className="py-2 px-3 border"></td>
          </tr>

          {/* Home team gross scores */}
          <tr className="border-b bg-green-50">
            <td className="py-2 px-3 border font-medium text-green-600">
              {isSinglesOrBestBall && match.homePlayers && match.homePlayers.length > 0 ? (
                <div>
                  <div className="font-medium">{match.homeTeam}</div>
                  {match.homePlayers.map((player: any, idx: number) => (
                    <div key={`home-player-${player.id}`} className="text-xs text-green-700 mt-1">
                      {player.name} ({player.handicapIndex?.toFixed(1)})
                    </div>
                  ))}
                </div>
              ) : (
                <>{match.homeTeam} (Gross)</>
              )}
            </td>
            {filteredHoles.map(hole => (
              <td key={`home-gross-${hole.id}`} className="py-2 px-3 border text-center">
                {isSinglesOrBestBall && match.homePlayers && match.homePlayers.length > 0 ? (
                  <div className="space-y-1">
                    {/* Home team container */}
                    <div className="border-b border-green-200 pb-1 mb-2">
                      {/* Team label and score */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-green-700 text-xs">Team</div>
                        <input
                          type="text"
                          value={scores[`home-${hole.number}`] || ''}
                          onChange={(e) => onScoreChange(`home-${hole.number}`, e.target.value)}
                          className={`w-10 text-center border ${
                            lockStatus || isSinglesFormat || isBestBallFormat ? 'bg-gray-100 border-gray-200' : 'border-green-200'
                          } rounded font-medium`}
                          disabled={isSinglesFormat || isBestBallFormat || lockStatus}
                          maxLength={3}
                          title={
                            isSinglesFormat 
                              ? "Auto-populated from player score" 
                              : isBestBallFormat 
                                ? "Auto-calculated from best player score" 
                                : "Team score"
                          }
                        />
                      </div>
                    </div>
                    
                    {/* Individual player scores - compact layout */}
                    <div className="space-y-1">
                      {match.homePlayers.map((player: any, idx: number) => (
                        <div key={`home-player-${player.id}-hole-${hole.number}`} 
                             className={`flex items-center justify-between ${idx > 0 ? 'mt-2' : ''}`}
                        >
                          <div className="text-xs text-green-700 mr-1 truncate max-w-[50px] flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                            {player.name.split(' ')[0]}
                          </div>
                          <input
                            type="text"
                            value={scores[`home-player-${player.id}-${hole.number}`] || ''}
                            onChange={(e) => onScoreChange(`home-player-${player.id}-${hole.number}`, e.target.value)}
                            className={`w-8 text-center border ${
                              lockStatus ? 'bg-gray-100 border-gray-200' : 'border-green-200'
                            } rounded text-sm`}
                            disabled={lockStatus}
                            maxLength={3}
                          />
                          
                          {/* Display player net score for Singles format */}
                          {isSinglesFormat && hole.homePlayerScores && hole.homePlayerScores[player.id] !== undefined && (
                            <div className="text-xs font-medium mt-1 ml-1">
                              Net: {calculatePlayerNetScore(hole.homePlayerScores[player.id], player.handicapIndex, hole.handicap)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={scores[`home-${hole.number}`] || ''}
                    onChange={(e) => onScoreChange(`home-${hole.number}`, e.target.value)}
                    className={`w-12 text-center border ${
                      lockStatus ? 'bg-gray-100 border-gray-200' : 'border-green-200'
                    } rounded`}
                    disabled={lockStatus}
                    maxLength={3}
                  />
                )}
              </td>
            ))}
            <td className="py-2 px-3 border text-center font-medium">
              {homeTotalGross || '-'}
            </td>
          </tr>

          {/* Home team net scores or Individual matchup results for Singles format */}
          <tr className="border-b bg-green-50">
            <td className="py-2 px-3 border font-medium text-green-600">
              {isSinglesFormat && hasIndividualMatchups ? (
                <div>
                  <div>{match.homeTeam} Players</div>
                  <div className="text-xs font-normal text-gray-500">
                    Individual results
                  </div>
                </div>
              ) : (
                <>
                  {match.homeTeam} (Net)
                  <div className="text-xs font-normal text-gray-500">
                    Handicap: {match.homeTeamHandicap.toFixed(1)}
                  </div>
                </>
              )}
            </td>
            {filteredHoles.map(hole => {
              const holeWinnerId = skinsWinners[`${hole.number}`] || null;
              return (
                <td 
                  key={`home-net-${hole.id}`} 
                  className={`py-2 px-3 border text-center ${
                    hole.winner === 'home' ? 'bg-green-100' : 
                    hole.winner === 'tie' ? 'bg-gray-100' : ''
                  }`}
                >
                  {isSinglesFormat && hasIndividualMatchups ? (
                    // For Singles format: Show individual matchup results
                    <div className="flex flex-col space-y-1">
                      {match.homePlayers.map((homePlayer: any, idx: number) => {
                        // There are several ways to pair players:
                        // 1. Use playerPairings and pairingGroup when available
                        // 2. Fall back to array index when playerPairings not available
                        // 3. Use name matching for manual pairing if needed
                        
                        // First try to find pairingGroup if playerPairings exists
                        let pairingGroup = null;
                        if (match.playerPairings && match.playerPairings.length > 0) {
                          const homePairing = match.playerPairings.find((p: any) => 
                            p.playerId === homePlayer.id && p.isHomeTeam
                          );
                          if (homePairing) {
                            pairingGroup = homePairing.pairingGroup;
                          }
                        }
                        
                        // If pairingGroup not found, use array index as fallback
                        if (pairingGroup === null) {
                          pairingGroup = idx + 1;
                        }
                        
                        // Then find the away player with the same pairingGroup
                        const awayPlayer = match.awayPlayers.find((p: any) => {
                          const pairingInfo = match.playerPairings?.find((pair: any) => 
                            pair.playerId === p.id && !pair.isHomeTeam
                          );
                          return pairingInfo?.pairingGroup === pairingGroup;
                        }) || (idx < match.awayPlayers.length ? match.awayPlayers[idx] : null);
                        
                        if (!homePlayer || !awayPlayer) return null;
                        
                        // Get player scores
                        const homeScore = hole.homePlayerScores && hole.homePlayerScores[homePlayer.id];
                        const awayScore = hole.awayPlayerScores && hole.awayPlayerScores[awayPlayer.id];
                        
                        // If we don't have scores for both players, show empty
                        if (homeScore === undefined || awayScore === undefined) {
                          return (
                            <div key={`matchup-${homePlayer.id}-${hole.id}`} className="text-xs">-</div>
                          );
                        }
                        
                        // Determine matchup winner
                        const matchupResult = determinePlayerMatchupWinner(
                          homeScore,
                          homePlayer.handicapIndex,
                          awayScore,
                          awayPlayer.handicapIndex,
                          hole.handicap
                        );
                        
                        return (
                          <div key={`matchup-${homePlayer.id}-${hole.id}`} className="text-xs font-medium flex items-center">
                            {matchupResult === 'home' && (
                              <span className="text-green-600 font-bold">W</span>
                            )}
                            {matchupResult === 'away' && (
                              <span className="text-red-600 font-bold">L</span>
                            )}
                            {matchupResult === 'tie' && (
                              <span className="text-gray-600 font-bold">T</span>
                            )}
                            {matchupResult === null && '-'}

                            {/* Player-specific Skin Icon - Show if this player has potential skin OR this hole has a winner */}
                            {(potentialSkins[`${homePlayer.id}-${hole.number}`] || holeWinnerId === homePlayer.id) && openSkinsModal && (
                              <button 
                                type="button" 
                                onClick={() => openSkinsModal(hole)} 
                                disabled={lockStatus} 
                                className="inline-block ml-1"
                                title={holeWinnerId === homePlayer.id ? "Skin Winner!" : "Potential Skin"}
                              >
                                <TrophyIcon 
                                  className={`h-3 w-3 ${holeWinnerId === homePlayer.id ? 'text-yellow-600' : 'text-yellow-500'} ${lockStatus ? 'opacity-60' : 'hover:text-yellow-700'}`} 
                                />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // For other formats: Show team net score
                    <>{hole.homeNet === null ? '-' : hole.homeNet}</>
                  )}
                  
                  {/* Team-level icon only if NOT singles and winner is home */}
                  {hole.winner === 'home' && !isSinglesFormat && (
                    <StarIcon className="h-3 w-3 text-green-500 inline ml-1" />
                  )}
                  
                  {ctpWinners[hole.id] && match.homePlayers.some((p: any) => p.id === ctpWinners[hole.id]) && (
                    <FlagIcon className="h-4 w-4 text-green-500 inline ml-1" title="CTP Winner" />
                  )}
                </td>
              );
            })}
            <td className="py-2 px-3 border text-center font-medium">
              {isSinglesFormat && hasIndividualMatchups ? (
                // For Singles format: Show points
                <div className="flex flex-col space-y-1">
                  {match.homePlayers.map((homePlayer: any, idx: number) => {
                    // There are several ways to pair players:
                    // 1. Use playerPairings and pairingGroup when available
                    // 2. Fall back to array index when playerPairings not available
                    // 3. Use name matching for manual pairing if needed
                    
                    // First try to find pairingGroup if playerPairings exists
                    let pairingGroup = null;
                    if (match.playerPairings && match.playerPairings.length > 0) {
                      const homePairing = match.playerPairings.find((p: any) => 
                        p.playerId === homePlayer.id && p.isHomeTeam
                      );
                      if (homePairing) {
                        pairingGroup = homePairing.pairingGroup;
                      }
                    }
                    
                    // If pairingGroup not found, use array index as fallback
                    if (pairingGroup === null) {
                      pairingGroup = idx + 1;
                    }
                    
                    // Then find the away player with the same pairingGroup
                    const awayPlayer = match.awayPlayers.find((p: any) => {
                      const pairingInfo = match.playerPairings?.find((pair: any) => 
                        pair.playerId === p.id && !pair.isHomeTeam
                      );
                      return pairingInfo?.pairingGroup === pairingGroup;
                    }) || (idx < match.awayPlayers.length ? match.awayPlayers[idx] : null);
                    
                    if (!homePlayer || !awayPlayer) return null;
                    
                    // Calculate match points by counting hole wins/losses
                    const homeWins = filteredHoles.filter(hole => {
                      if (!hole.homePlayerScores || !hole.awayPlayerScores) return false;
                      const homeScore = hole.homePlayerScores[homePlayer.id];
                      const awayScore = hole.awayPlayerScores[awayPlayer.id];
                      if (homeScore === undefined || awayScore === undefined) return false;
                      
                      const result = determinePlayerMatchupWinner(
                        homeScore, homePlayer.handicapIndex, 
                        awayScore, awayPlayer.handicapIndex, 
                        hole.handicap
                      );
                      return result === 'home';
                    }).length;
                    
                    // Only show points if we have scores
                    if (homeWins === 0 && filteredHoles.length === 0) return null;
                    
                    return (
                      <div key={`points-${homePlayer.id}`} className="text-xs font-medium">
                        {homeWins} pts
                      </div>
                    );
                  })}
                </div>
              ) : (
                // For other formats: Show total net
                <>{homeTotalNet || '-'}</>
              )}
            </td>
          </tr>

          {/* Away team gross scores */}
          <tr className="border-b bg-red-50">
            <td className="py-2 px-3 border font-medium text-red-600">
              {isSinglesOrBestBall && match.awayPlayers && match.awayPlayers.length > 0 ? (
                <div>
                  <div className="font-medium">{match.awayTeam}</div>
                  {match.awayPlayers.map((player: any, idx: number) => (
                    <div key={`away-player-${player.id}`} className="text-xs text-red-700 mt-1">
                      {player.name} ({player.handicapIndex?.toFixed(1)})
                    </div>
                  ))}
                </div>
              ) : (
                <>{match.awayTeam} (Gross)</>
              )}
            </td>
            {filteredHoles.map(hole => (
              <td key={`away-gross-${hole.id}`} className="py-2 px-3 border text-center">
                {isSinglesOrBestBall && match.awayPlayers && match.awayPlayers.length > 0 ? (
                  <div className="space-y-1">
                    {/* Away team container */}
                    <div className="border-b border-red-200 pb-1 mb-2">
                      {/* Team label and score */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-red-700 text-xs">Team</div>
                        <input
                          type="text"
                          value={scores[`away-${hole.number}`] || ''}
                          onChange={(e) => onScoreChange(`away-${hole.number}`, e.target.value)}
                          className={`w-10 text-center border ${
                            lockStatus || isSinglesFormat || isBestBallFormat ? 'bg-gray-100 border-gray-200' : 'border-red-200'
                          } rounded font-medium`}
                          disabled={isSinglesFormat || isBestBallFormat || lockStatus}
                          maxLength={3}
                          title={
                            isSinglesFormat 
                              ? "Auto-populated from player score" 
                              : isBestBallFormat 
                                ? "Auto-calculated from best player score" 
                                : "Team score"
                          }
                        />
                      </div>
                    </div>
                    
                    {/* Individual player scores - compact layout */}
                    <div className="space-y-1">
                      {match.awayPlayers.map((player: any, idx: number) => (
                        <div key={`away-player-${player.id}-hole-${hole.number}`} 
                             className={`flex items-center justify-between ${idx > 0 ? 'mt-2' : ''}`}
                        >
                          <div className="text-xs text-red-700 mr-1 truncate max-w-[50px] flex items-center">
                            <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                            {player.name.split(' ')[0]}
                          </div>
                          <input
                            type="text"
                            value={scores[`away-player-${player.id}-${hole.number}`] || ''}
                            onChange={(e) => onScoreChange(`away-player-${player.id}-${hole.number}`, e.target.value)}
                            className={`w-8 text-center border ${
                              lockStatus ? 'bg-gray-100 border-gray-200' : 'border-red-200'
                            } rounded text-sm`}
                            disabled={lockStatus}
                            maxLength={3}
                          />
                          
                          {/* Display player net score for Singles format */}
                          {isSinglesFormat && hole.awayPlayerScores && hole.awayPlayerScores[player.id] !== undefined && (
                            <div className="text-xs font-medium mt-1 ml-1">
                              Net: {calculatePlayerNetScore(hole.awayPlayerScores[player.id], player.handicapIndex, hole.handicap)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={scores[`away-${hole.number}`] || ''}
                    onChange={(e) => onScoreChange(`away-${hole.number}`, e.target.value)}
                    className={`w-12 text-center border ${
                      lockStatus ? 'bg-gray-100 border-gray-200' : 'border-red-200'
                    } rounded`}
                    disabled={lockStatus}
                    maxLength={3}
                  />
                )}
              </td>
            ))}
            <td className="py-2 px-3 border text-center font-medium">
              {awayTotalGross || '-'}
            </td>
          </tr>

          {/* Away team net scores or Individual matchup results for Singles format */}
          <tr className="border-b bg-red-50">
            <td className="py-2 px-3 border font-medium text-red-600">
              {isSinglesFormat && hasIndividualMatchups ? (
                <div>
                  <div>{match.awayTeam} Players</div>
                  <div className="text-xs font-normal text-gray-500">
                    Individual results
                  </div>
                </div>
              ) : (
                <>
                  {match.awayTeam} (Net)
                  <div className="text-xs font-normal text-gray-500">
                    Handicap: {match.awayTeamHandicap.toFixed(1)}
                  </div>
                </>
              )}
            </td>
            {filteredHoles.map(hole => {
              const holeWinnerId = skinsWinners[`${hole.number}`] || null;
              return (
                <td 
                  key={`away-net-${hole.id}`} 
                  className={`py-2 px-3 border text-center ${
                    hole.winner === 'away' ? 'bg-red-100' : 
                    hole.winner === 'tie' ? 'bg-gray-100' : ''
                  }`}
                >
                  {isSinglesFormat && hasIndividualMatchups ? (
                    // For Singles format: Show individual matchup results
                    <div className="flex flex-col space-y-1">
                      {match.awayPlayers.map((awayPlayer: any, idx: number) => {
                        // There are several ways to pair players:
                        // 1. Use playerPairings and pairingGroup when available
                        // 2. Fall back to array index when playerPairings not available
                        // 3. Use name matching for manual pairing if needed
                        
                        // First try to find pairingGroup if playerPairings exists
                        let pairingGroup = null;
                        if (match.playerPairings && match.playerPairings.length > 0) {
                          const awayPairing = match.playerPairings.find((p: any) => 
                            p.playerId === awayPlayer.id && !p.isHomeTeam
                          );
                          if (awayPairing) {
                            pairingGroup = awayPairing.pairingGroup;
                          }
                        }
                        
                        // If pairingGroup not found, use array index as fallback
                        if (pairingGroup === null) {
                          pairingGroup = idx + 1;
                        }
                        
                        // Then find the home player with the same pairingGroup
                        const homePlayer = match.homePlayers.find((p: any) => {
                          const pairingInfo = match.playerPairings?.find((pair: any) => 
                            pair.playerId === p.id && pair.isHomeTeam
                          );
                          return pairingInfo?.pairingGroup === pairingGroup;
                        }) || (idx < match.homePlayers.length ? match.homePlayers[idx] : null);
                        
                        if (!awayPlayer || !homePlayer) return null;
                        
                        // Get player scores
                        const awayScore = hole.awayPlayerScores && hole.awayPlayerScores[awayPlayer.id];
                        const homeScore = hole.homePlayerScores && hole.homePlayerScores[homePlayer.id];
                        
                        // If we don't have scores for both players, show empty
                        if (awayScore === undefined || homeScore === undefined) {
                          return (
                            <div key={`matchup-${awayPlayer.id}-${hole.id}`} className="text-xs">-</div>
                          );
                        }
                        
                        // Determine matchup winner
                        const matchupResult = determinePlayerMatchupWinner(
                          homeScore,
                          homePlayer.handicapIndex,
                          awayScore,
                          awayPlayer.handicapIndex,
                          hole.handicap
                        );
                        
                        return (
                          <div key={`matchup-${awayPlayer.id}-${hole.id}`} className="text-xs font-medium flex items-center">
                            {matchupResult === 'away' && (
                              <span className="text-green-600 font-bold">W</span>
                            )}
                            {matchupResult === 'home' && (
                              <span className="text-red-600 font-bold">L</span>
                            )}
                            {matchupResult === 'tie' && (
                              <span className="text-gray-600 font-bold">T</span>
                            )}
                            {matchupResult === null && '-'}

                            {/* Player-specific Skin Icon - Show if this player has potential skin OR this hole has a winner */}
                            {(potentialSkins[`${awayPlayer.id}-${hole.number}`] || holeWinnerId === awayPlayer.id) && openSkinsModal && (
                              <button 
                                type="button" 
                                onClick={() => openSkinsModal(hole)} 
                                disabled={lockStatus} 
                                className="inline-block ml-1"
                                title={holeWinnerId === awayPlayer.id ? "Skin Winner!" : "Potential Skin"}
                              >
                                <TrophyIcon 
                                  className={`h-3 w-3 ${holeWinnerId === awayPlayer.id ? 'text-yellow-600' : 'text-yellow-500'} ${lockStatus ? 'opacity-60' : 'hover:text-yellow-700'}`} 
                                />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // For other formats: Show team net score
                    <>{hole.awayNet === null ? '-' : hole.awayNet}</>
                  )}
                  
                  {/* Team-level icon only if NOT singles and winner is away */}
                  {hole.winner === 'away' && !isSinglesFormat && (
                    <StarIcon className="h-3 w-3 text-red-500 inline ml-1" />
                  )}
                  
                  {ctpWinners[hole.id] && match.awayPlayers.some((p: any) => p.id === ctpWinners[hole.id]) && (
                    <FlagIcon className="h-4 w-4 text-green-500 inline ml-1" title="CTP Winner" />
                  )}
                </td>
              );
            })}
            <td className="py-2 px-3 border text-center font-medium">
              {isSinglesFormat && hasIndividualMatchups ? (
                // For Singles format: Show points
                <div className="flex flex-col space-y-1">
                  {match.awayPlayers.map((awayPlayer: any, idx: number) => {
                    // There are several ways to pair players:
                    // 1. Use playerPairings and pairingGroup when available
                    // 2. Fall back to array index when playerPairings not available
                    // 3. Use name matching for manual pairing if needed
                    
                    // First try to find pairingGroup if playerPairings exists
                    let pairingGroup = null;
                    if (match.playerPairings && match.playerPairings.length > 0) {
                      const awayPairing = match.playerPairings.find((p: any) => 
                        p.playerId === awayPlayer.id && !p.isHomeTeam
                      );
                      if (awayPairing) {
                        pairingGroup = awayPairing.pairingGroup;
                      }
                    }
                    
                    // If pairingGroup not found, use array index as fallback
                    if (pairingGroup === null) {
                      pairingGroup = idx + 1;
                    }
                    
                    // Then find the home player with the same pairingGroup
                    const homePlayer = match.homePlayers.find((p: any) => {
                      const pairingInfo = match.playerPairings?.find((pair: any) => 
                        pair.playerId === p.id && pair.isHomeTeam
                      );
                      return pairingInfo?.pairingGroup === pairingGroup;
                    }) || (idx < match.homePlayers.length ? match.homePlayers[idx] : null);
                    
                    if (!awayPlayer || !homePlayer) return null;
                    
                    // Calculate match points by counting hole wins/losses
                    const awayWins = filteredHoles.filter(hole => {
                      if (!hole.homePlayerScores || !hole.awayPlayerScores) return false;
                      const homeScore = hole.homePlayerScores[homePlayer.id];
                      const awayScore = hole.awayPlayerScores[awayPlayer.id];
                      if (homeScore === undefined || awayScore === undefined) return false;
                      
                      const result = determinePlayerMatchupWinner(
                        homeScore, homePlayer.handicapIndex, 
                        awayScore, awayPlayer.handicapIndex, 
                        hole.handicap
                      );
                      return result === 'away';
                    }).length;
                    
                    // Only show points if we have scores
                    if (awayWins === 0 && filteredHoles.length === 0) return null;
                    
                    return (
                      <div key={`points-${awayPlayer.id}`} className="text-xs font-medium">
                        {awayWins} pts
                      </div>
                    );
                  })}
                </div>
              ) : (
                // For other formats: Show total net
                <>{awayTotalNet || '-'}</>
              )}
            </td>
          </tr>

          {/* Summary row */}
          <tr className="border-b bg-gray-100">
            <td className="py-2 px-3 border font-medium">Results</td>
            <td colSpan={filteredHoles.length} className="py-2 px-3 border">
              {/* Different summary displays based on format type */}
              {isSinglesFormat && hasIndividualMatchups ? (
                /* Singles format match summary */
                <div>
                  <div className="text-sm font-medium mb-2">Individual Match Results</div>
                  <div className="grid grid-cols-1 gap-2">
                    {match.homePlayers.map((homePlayer: any, idx: number) => {
                      // There are several ways to pair players:
                      // 1. Use playerPairings and pairingGroup when available
                      // 2. Fall back to array index when playerPairings not available
                      // 3. Use name matching for manual pairing if needed
                      
                      // First try to find pairingGroup if playerPairings exists
                      let pairingGroup = null;
                      if (match.playerPairings && match.playerPairings.length > 0) {
                        const homePairing = match.playerPairings.find((p: any) => 
                          p.playerId === homePlayer.id && p.isHomeTeam
                        );
                        if (homePairing) {
                          pairingGroup = homePairing.pairingGroup;
                        }
                      }
                      
                      // If pairingGroup not found, use array index as fallback
                      if (pairingGroup === null) {
                        pairingGroup = idx + 1;
                      }
                      
                      // Then find the away player with the same pairingGroup
                      const awayPlayer = match.awayPlayers.find((p: any) => {
                        const pairingInfo = match.playerPairings?.find((pair: any) => 
                          pair.playerId === p.id && !pair.isHomeTeam
                        );
                        return pairingInfo?.pairingGroup === pairingGroup;
                      }) || (idx < match.awayPlayers.length ? match.awayPlayers[idx] : null);
                      
                      if (!homePlayer || !awayPlayer) return null;
                      
                      // Calculate hole wins for this matchup
                      const matchupResults = filteredHoles.map(hole => {
                        if (!hole.homePlayerScores || !hole.awayPlayerScores) return null;
                        
                        const homeScore = hole.homePlayerScores[homePlayer.id];
                        const awayScore = hole.awayPlayerScores[awayPlayer.id];
                        
                        if (homeScore === undefined || awayScore === undefined) return null;
                        
                        return determinePlayerMatchupWinner(
                          homeScore,
                          homePlayer.handicapIndex,
                          awayScore,
                          awayPlayer.handicapIndex,
                          hole.handicap
                        );
                      }).filter(Boolean); // Remove null values
                      
                      // Count wins for each player
                      const homePlayerWins = matchupResults.filter(result => result === 'home').length;
                      const awayPlayerWins = matchupResults.filter(result => result === 'away').length;
                      const matchupTies = matchupResults.filter(result => result === 'tie').length;
                      
                      // Only show results if we have at least one hole with scores
                      if (matchupResults.length === 0) return null;
                      
                      // Determine the match status
                      let matchStatus = '';
                      let statusStyle = '';
                      
                      if (homePlayerWins > awayPlayerWins) {
                        matchStatus = 'Won';
                        statusStyle = 'text-green-600';
                      } else if (awayPlayerWins > homePlayerWins) {
                        matchStatus = 'Lost';
                        statusStyle = 'text-red-600';
                      } else {
                        matchStatus = 'Tied';
                        statusStyle = 'text-gray-600';
                      }
                      
                      return (
                        <div key={`matchup-${homePlayer.id}-${awayPlayer.id}`} className="flex items-center justify-between border-b border-gray-200 pb-1 last:border-0">
                          <div className="flex items-center">
                            <span className="text-green-600 font-medium mr-1">{homePlayer.name}</span>
                            <span className="text-gray-500 mx-1">vs</span>
                            <span className="text-red-600 font-medium">{awayPlayer.name}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">
                              {homePlayerWins}-{awayPlayerWins}-{matchupTies}
                            </span>
                            <span className={`font-bold ${statusStyle}`}>{matchStatus}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Team totals for Singles format */}
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <div className="flex justify-around text-sm mb-1">
                      <span className="text-green-600 font-medium">{match.homeTeam}: {homeWins} holes</span>
                      <span className="text-gray-600 font-medium">Tied: {ties} holes</span>
                      <span className="text-red-600 font-medium">{match.awayTeam}: {awayWins} holes</span>
                    </div>

                    {/* Show the match points from the database if available */}
                    {match.points && (
                      <div className="flex flex-col items-center text-sm font-medium mt-2">
                        {match.format?.toLowerCase().includes('singles') ? (
                          <>
                            <div className="bg-gray-100 rounded-md px-3 py-1 inline-flex items-center">
                              <span className="text-green-600 font-medium">{match.points.homeTeamPoints}</span>
                              <span className="text-gray-500 mx-2">-</span>
                              <span className="text-red-600 font-medium">{match.points.awayTeamPoints}</span>
                              <span className="ml-2 text-gray-600">1v1 Match Point</span>
                            </div>
                            
                            <div className="mt-1 text-xs text-gray-600 font-medium text-center">
                              <p>Singles Format: 1 point per 1v1 match</p>
                              <p>Total of 2 points in the foursome</p>
                              <p className="text-green-600 font-bold">Check leaderboard for team totals</p>
                            </div>
                            
                            {/* Check for a foursome group and add explanation */}
                            {match.foursomeGroupId && !match.foursomeMatches && (
                              <div className="mt-1 text-xs text-amber-700 italic">
                                Note: This is part of a foursome with two 1v1 matches
                              </div>
                            )}
                            
                            {/* Show related matches if available */}
                            {match.foursomeGroupId && match.foursomeMatches && match.foursomeMatches.length > 0 && (
                              <div className="mt-2 bg-gray-50 rounded p-2 text-xs w-full">
                                <div className="font-medium mb-1">Related 1v1 Match:</div>
                                {match.foursomeMatches.map((m: any) => (
                                  <div key={m.id}>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        {m.homePlayers[0]?.name} vs {m.awayPlayers[0]?.name}
                                      </div>
                                      <div className="font-medium">
                                        {m.points ? 
                                          `${m.points.homeTeamPoints}-${m.points.awayTeamPoints}` : 
                                          'Not scored'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="bg-gray-100 rounded-md px-3 py-1 inline-flex items-center">
                            <span className="text-green-600 font-medium">{match.points.homeTeamPoints}</span>
                            <span className="text-gray-500 mx-2">-</span>
                            <span className="text-red-600 font-medium">{match.points.awayTeamPoints}</span>
                            <span className="ml-2 text-gray-600">Match Points</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Standard format match summary */
                <div className="flex justify-around text-sm">
                  <span className="text-green-600 font-medium">{match.homeTeam}: {homeWins} holes</span>
                  <span className="text-gray-600 font-medium">Tied: {ties} holes</span>
                  <span className="text-red-600 font-medium">{match.awayTeam}: {awayWins} holes</span>
                </div>
              )}
            </td>
            <td className="py-2 px-3 border"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ScoreTable;