import React from 'react';
import { Tournament, CTPResult } from '@/types/models';
import { calculateCTPPrize } from '@/utils/prizeCalculator';

interface CTPSectionProps {
  tournament: Tournament;
  ctpParticipants: number;
  par3Count: number;
  ctpResults: CTPResult[];
}

export default function CTPSection({ 
  tournament, 
  ctpParticipants, 
  par3Count, 
  ctpResults 
}: CTPSectionProps) {
  // Calculate prize per hole
  const ctpPrizePerHole = calculateCTPPrize(
    tournament.ctpPrizeAmount || 0,
    ctpParticipants || 0,
    par3Count || 1
  );

  if (!tournament.hasCTP) return null;

  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Closest to Pin (CTP) Competition</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-medium mb-3">CTP Prizes</h4>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">CTP Entry Fee:</span>
              <span className="font-medium">${tournament.ctpPrizeAmount || 0}/player</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Par 3 Holes:</span>
              <span className="font-medium">{par3Count || 0}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">CTP Participants:</span>
              <span className="font-medium">{ctpParticipants || 0} players</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Total CTP Pot:</span>
              <span className="font-medium">${(tournament.ctpPrizeAmount || 0) * (ctpParticipants || 0)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Prize Per Hole:</span>
              <span className="font-medium">${ctpPrizePerHole}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-medium mb-3">CTP Results</h4>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            {ctpResults?.length > 0 ? (
              <div className="space-y-2">
                {ctpResults.map((result: CTPResult) => (
                  <div key={result.id} className="flex justify-between">
                    <span className="text-gray-600">
                      Hole {result.hole?.number} (Round {result.round}):
                    </span>
                    <span className="font-medium">
                      {result.player?.name} 
                      {result.distance ? ` (${result.distance}ft)` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No CTP results recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}