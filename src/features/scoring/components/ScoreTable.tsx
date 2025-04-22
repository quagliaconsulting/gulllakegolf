import React, { useState } from 'react';
import { StarIcon, FlagIcon, TrophyIcon } from '@heroicons/react/24/outline';

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

          {/* Home team net scores */}
          <tr className="border-b bg-green-50">
            <td className="py-2 px-3 border font-medium text-green-600">
              {match.homeTeam} (Net)
              <div className="text-xs font-normal text-gray-500">
                Handicap: {match.homeTeamHandicap.toFixed(1)}
              </div>
            </td>
            {filteredHoles.map(hole => (
              <td 
                key={`home-net-${hole.id}`} 
                className={`py-2 px-3 border text-center ${
                  hole.winner === 'home' ? 'bg-green-100' : 
                  hole.winner === 'tie' ? 'bg-gray-100' : ''
                }`}
              >
                {hole.homeNet === null ? '-' : hole.homeNet}
                {hole.winner === 'home' && (
                  <StarIcon className="h-4 w-4 text-green-500 inline ml-1" />
                )}
                {(potentialSkins[`home-${hole.number}`] || skinsWinners[`${hole.number}`]) && (
                  <button 
                    type="button" 
                    onClick={() => openSkinsModal && openSkinsModal(hole)}
                    disabled={lockStatus || !openSkinsModal}
                    className="inline-block ml-1"
                  >
                    <TrophyIcon 
                      className={`h-4 w-4 ${skinsWinners[`${hole.number}`] ? 'text-yellow-600' : 'text-yellow-500'} ${lockStatus ? 'opacity-60' : 'hover:text-yellow-700'}`} 
                      title={skinsWinners[`${hole.number}`] ? "Skin Winner!" : (potentialSkins[`home-${hole.number}`] ? "Confirmed Skin" : "Skin")} 
                    />
                  </button>
                )}
                {ctpWinners[hole.id] && match.homePlayers.some((p: any) => p.id === ctpWinners[hole.id]) && (
                  <FlagIcon className="h-4 w-4 text-green-500 inline ml-1" title="CTP Winner" />
                )}
              </td>
            ))}
            <td className="py-2 px-3 border text-center font-medium">
              {homeTotalNet || '-'}
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

          {/* Away team net scores */}
          <tr className="border-b bg-red-50">
            <td className="py-2 px-3 border font-medium text-red-600">
              {match.awayTeam} (Net)
              <div className="text-xs font-normal text-gray-500">
                Handicap: {match.awayTeamHandicap.toFixed(1)}
              </div>
            </td>
            {filteredHoles.map(hole => (
              <td 
                key={`away-net-${hole.id}`} 
                className={`py-2 px-3 border text-center ${
                  hole.winner === 'away' ? 'bg-red-100' : 
                  hole.winner === 'tie' ? 'bg-gray-100' : ''
                }`}
              >
                {hole.awayNet === null ? '-' : hole.awayNet}
                {hole.winner === 'away' && (
                  <StarIcon className="h-4 w-4 text-red-500 inline ml-1" />
                )}
                {(potentialSkins[`away-${hole.number}`] || skinsWinners[`${hole.number}`]) && (
                  <button 
                    type="button" 
                    onClick={() => openSkinsModal && openSkinsModal(hole)}
                    disabled={lockStatus || !openSkinsModal}
                    className="inline-block ml-1"
                  >
                    <TrophyIcon 
                      className={`h-4 w-4 ${skinsWinners[`${hole.number}`] ? 'text-yellow-600' : 'text-yellow-500'} ${lockStatus ? 'opacity-60' : 'hover:text-yellow-700'}`} 
                      title={skinsWinners[`${hole.number}`] ? "Skin Winner!" : (potentialSkins[`away-${hole.number}`] ? "Confirmed Skin" : "Skin")} 
                    />
                  </button>
                )}
                {ctpWinners[hole.id] && match.awayPlayers.some((p: any) => p.id === ctpWinners[hole.id]) && (
                  <FlagIcon className="h-4 w-4 text-green-500 inline ml-1" title="CTP Winner" />
                )}
              </td>
            ))}
            <td className="py-2 px-3 border text-center font-medium">
              {awayTotalNet || '-'}
            </td>
          </tr>

          {/* Summary row */}
          <tr className="border-b bg-gray-100">
            <td className="py-2 px-3 border font-medium">Results</td>
            <td colSpan={filteredHoles.length} className="py-2 px-3 border">
              <div className="flex justify-around text-sm">
                <span className="text-green-600 font-medium">{match.homeTeam}: {homeWins} holes</span>
                <span className="text-gray-600 font-medium">Tied: {ties} holes</span>
                <span className="text-red-600 font-medium">{match.awayTeam}: {awayWins} holes</span>
              </div>
            </td>
            <td className="py-2 px-3 border"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ScoreTable;