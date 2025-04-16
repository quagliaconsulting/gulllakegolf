import React from 'react';
import { Tournament } from '@/types/models';
import { calculateTeamPayouts } from '@/utils/prizeCalculator';

interface FinancialOverviewProps {
  tournament: Tournament;
  playerCount: number;
}

export default function FinancialOverview({ tournament, playerCount }: FinancialOverviewProps) {
  const teamPayouts = calculateTeamPayouts(
    tournament.buyIn || 0,
    playerCount || 0,
    tournament.payoutStructure as Record<string, number> || {},
    tournament.teams?.length || 0
  );

  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Tournament Finances</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-medium mb-3">Prize Pool</h4>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Buy-in:</span>
              <span className="font-medium">${tournament.buyIn || 0}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Total Prize Pool:</span>
              <span className="font-medium">${(tournament.buyIn || 0) * playerCount}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Players:</span>
              <span className="font-medium">{playerCount}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-medium mb-3">Payout Structure</h4>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            {tournament.payoutStructure ? (
              <div className="space-y-2">
                {Object.entries(teamPayouts).map(([place, amount]) => (
                  <div key={place} className="flex justify-between">
                    <span className="text-gray-600">
                      {place === '1' ? '1st Place' : 
                      place === '2' ? '2nd Place' : 
                      place === '3' ? '3rd Place' : `${place}th Place`}:
                    </span>
                    <span className="font-medium">
                      {tournament.payoutStructure?.[place]}% (${amount})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No payout structure defined</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}