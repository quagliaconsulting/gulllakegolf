import React from 'react';
import { StarIcon, FlagIcon } from '@heroicons/react/24/outline';

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
}

interface ScoreTableProps {
  match: any;
  scores: Record<string, any>;
  holes: Hole[];
  onScoreChange: (key: string, value: string) => void;
  lockStatus: boolean;
  isFrontNine?: boolean;
}

export const ScoreTable: React.FC<ScoreTableProps> = ({
  match,
  scores,
  holes,
  onScoreChange,
  lockStatus,
  isFrontNine = true,
}) => {
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
                  <span className="absolute top-0.5 right-0.5">
                    <FlagIcon className="h-3 w-3 text-blue-500" title="Par 3" />
                  </span>
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

          {/* Home team gross scores */}
          <tr className="border-b bg-blue-50">
            <td className="py-2 px-3 border font-medium text-blue-600">
              {match.homeTeam} (Gross)
            </td>
            {filteredHoles.map(hole => (
              <td key={`home-gross-${hole.id}`} className="py-2 px-3 border text-center">
                <input
                  type="text"
                  value={scores[`home-${hole.number}`] || ''}
                  onChange={(e) => onScoreChange(`home-${hole.number}`, e.target.value)}
                  className={`w-12 text-center border ${
                    lockStatus ? 'bg-gray-100 border-gray-200' : 'border-blue-200'
                  } rounded`}
                  disabled={lockStatus}
                  maxLength={3}
                />
              </td>
            ))}
            <td className="py-2 px-3 border text-center font-medium">
              {homeTotalGross || '-'}
            </td>
          </tr>

          {/* Home team net scores */}
          <tr className="border-b bg-blue-50">
            <td className="py-2 px-3 border font-medium text-blue-600">
              {match.homeTeam} (Net)
              <div className="text-xs font-normal text-gray-500">
                Handicap: {match.homeTeamHandicap.toFixed(1)}
              </div>
            </td>
            {filteredHoles.map(hole => (
              <td 
                key={`home-net-${hole.id}`} 
                className={`py-2 px-3 border text-center ${
                  hole.winner === 'home' ? 'bg-blue-100' : 
                  hole.winner === 'tie' ? 'bg-gray-100' : ''
                }`}
              >
                {hole.homeNet === null ? '-' : hole.homeNet}
                {hole.winner === 'home' && (
                  <StarIcon className="h-4 w-4 text-blue-500 inline ml-1" />
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
              {match.awayTeam} (Gross)
            </td>
            {filteredHoles.map(hole => (
              <td key={`away-gross-${hole.id}`} className="py-2 px-3 border text-center">
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
                <span className="text-blue-600 font-medium">{match.homeTeam}: {homeWins} holes</span>
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