import React from 'react';
import { Tournament, Player } from '@/types/models';

interface PlayerFinancialSummaryProps {
  tournament: Tournament;
  players: any[];
  playerPayments: Record<string, any>;
  ctpResults: any[];
  skinsResults: any[];
  ctpPrizePerHole: number;
  skinsPrizePerHole: number;
}

export default function PlayerFinancialSummary({ 
  tournament, 
  players, 
  playerPayments, 
  ctpResults, 
  skinsResults,
  ctpPrizePerHole,
  skinsPrizePerHole
}: PlayerFinancialSummaryProps) {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Player Financial Summary</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Player</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Team</th>
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Tournament</th>
              {tournament.hasCTP && (
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">CTP</th>
              )}
              {tournament.hasSkins && (
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Skins</th>
              )}
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {players.map((player: any) => {
              const buyInStatus = playerPayments[player.id]?.BUY_IN || false;
              const ctpStatus = playerPayments[player.id]?.CTP_ENTRY || false;
              const skinsStatus = playerPayments[player.id]?.SKINS_ENTRY || false;
              
              // Calculate financial totals
              const tournamentAmount = buyInStatus ? (tournament.buyIn || 0) : 0;
              const ctpAmount = ctpStatus && tournament.hasCTP ? (tournament.ctpPrizeAmount || 0) : 0;
              const skinsAmount = skinsStatus && tournament.hasSkins ? (tournament.skinsPrizeAmount || 0) : 0;
              const totalAmount = tournamentAmount + ctpAmount + skinsAmount;
              
              // Calculate winnings
              const ctpWinnings = ctpResults
                ?.filter((result: any) => result.player.id === player.id)
                .reduce((sum: number, _: any) => sum + ctpPrizePerHole, 0) || 0;
              
              const skinsWinnings = skinsResults
                ?.filter((result: any) => result.player.id === player.id)
                .reduce((sum: number, _: any) => sum + skinsPrizePerHole, 0) || 0;
              
              const netTournament = tournamentAmount;
              const netCTP = ctpStatus ? ctpAmount - ctpWinnings : 0;
              const netSkins = skinsStatus ? skinsAmount - skinsWinnings : 0;
              const netTotal = netTournament + netCTP + netSkins;
              
              return (
                <tr key={player.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {player.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {player.team?.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <div className="flex flex-col items-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-1 ${
                        buyInStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {buyInStatus ? 'Paid' : 'Unpaid'}
                      </span>
                      {buyInStatus && <span className="text-gray-700">${tournamentAmount}</span>}
                    </div>
                  </td>
                  {tournament.hasCTP && (
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                      <div className="flex flex-col items-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-1 ${
                          ctpStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {ctpStatus ? 'Entered' : 'Not Entered'}
                        </span>
                        {ctpStatus && (
                          <>
                            <span className="text-gray-700">${ctpAmount}</span>
                            {ctpWinnings > 0 && (
                              <span className="text-green-600 mt-1">Won: ${ctpWinnings}</span>
                            )}
                            <span className={`mt-1 ${netCTP < 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Net: ${netCTP < 0 ? netCTP * -1 : netCTP}
                              {netCTP < 0 ? ' (profit)' : ' (cost)'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                  {tournament.hasSkins && (
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                      <div className="flex flex-col items-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-1 ${
                          skinsStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {skinsStatus ? 'Entered' : 'Not Entered'}
                        </span>
                        {skinsStatus && (
                          <>
                            <span className="text-gray-700">${skinsAmount}</span>
                            {skinsWinnings > 0 && (
                              <span className="text-green-600 mt-1">Won: ${skinsWinnings}</span>
                            )}
                            <span className={`mt-1 ${netSkins < 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Net: ${netSkins < 0 ? netSkins * -1 : netSkins}
                              {netSkins < 0 ? ' (profit)' : ' (cost)'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center font-medium">
                    <div className="flex flex-col items-center">
                      <span className="text-gray-700 mb-1">Paid: ${totalAmount}</span>
                      {(ctpWinnings > 0 || skinsWinnings > 0) && (
                        <span className="text-green-600 mb-1">Won: ${ctpWinnings + skinsWinnings}</span>
                      )}
                      <span className={`${netTotal < 0 ? 'text-green-600' : 'text-red-600'} font-semibold`}>
                        Net: ${netTotal < 0 ? netTotal * -1 : netTotal}
                        {netTotal < 0 ? ' (profit)' : ' (cost)'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}