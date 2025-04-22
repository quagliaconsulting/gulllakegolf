import React from 'react';
import { Tournament } from '@/types/models';
import { calculateTeamPayouts } from '@/utils/prizeCalculator';

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
  // Calculate team payouts for prize distribution
  const teamPayouts = calculateTeamPayouts(
    tournament.buyIn || 0,
    players.length || 0,
    tournament.payoutStructure as Record<string, number> || {},
    tournament.teams?.length || 2
  );
  
  // Calculate team standings to determine winners
  const teamStandings = React.useMemo(() => {
    // Group players by team
    const teamMap: Record<string, { 
      id: string, 
      name: string, 
      totalPoints: number, 
      players: any[] 
    }> = {};
    
    players.forEach(player => {
      if (player.team) {
        if (!teamMap[player.team.id]) {
          // Try to get team points from the tournament data if available
          // Note: Need to cast as 'any' since 'totalPoints' is not in the Team type definition
          const teamPoints = (tournament.teams?.find(t => t.id === player.team?.id) as any)?.totalPoints || 0;
          
          teamMap[player.team.id] = {
            id: player.team.id,
            name: player.team.name,
            totalPoints: teamPoints,
            players: []
          };
        }
        teamMap[player.team.id].players.push(player);
      }
    });
    
    // Sort teams by points (normally would be calculated from matches)
    // For now, we have to rely on points from tournament API
    return Object.values(teamMap).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [players]);
  // Log player information for debugging
  console.log('PlayerFinancialSummary received:', {
    playerCount: players?.length || 0,
    paymentRecords: Object.keys(playerPayments || {}).length,
    ctpCount: ctpResults?.length || 0,
    skinsCount: skinsResults?.length || 0,
    firstPlayer: players && players.length > 0 ? players[0]?.name : 'none',
    firstTeam: players && players.length > 0 ? players[0]?.team?.name : 'none',
    paymentKeys: Object.keys(playerPayments || {}).slice(0, 3)
  });
  
  // Log the structure of all players for debugging
  if (players && players.length > 0) {
    console.log('============= PLAYER DEBUGGING INFO =============');
    players.forEach((player, idx) => {
      console.log(`Player ${idx} (${player.id}): ${player.name}`, {
        hasTeam: !!player.team,
        teamName: player.team?.name,
        teamId: player.team?.id,
        isHomeTeam: player.team?.isHomeTeam,
        teamMetadata: player.team?.metadata ? JSON.stringify(player.team.metadata).substring(0, 50) : null,
        paymentKeys: player.id ? Object.keys(playerPayments[player.id] || {}) : [],
        paymentValues: player.id ? Object.values(playerPayments[player.id] || {}) : []
      });
    });
    console.log('=================================================');
    
    // Also log the playerPayments object structure
    console.log('Player Payments Structure:', Object.keys(playerPayments || {}));
    if (Object.keys(playerPayments || {}).length > 0) {
      const samplePlayerId = Object.keys(playerPayments)[0];
      console.log(`Sample payment for player ${samplePlayerId}:`, playerPayments[samplePlayerId]);
    }
  }
    
  // If we have no players, show a message instead
  if (!players || players.length === 0) {
    return (
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Player Financial Summary</h3>
        <div className="text-center py-8 text-gray-500">
          No players found in this tournament. Please add players to teams first.
        </div>
      </section>
    );
  }

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
              // Access payment status safely with default values
              const playerPayment = playerPayments[player.id] || {};
              const buyInStatus = playerPayment.BUY_IN === true;
              const ctpStatus = playerPayment.CTP_ENTRY === true;
              const skinsStatus = playerPayment.SKINS_ENTRY === true;
              
              // Calculate financial totals
              const tournamentAmount = buyInStatus ? (tournament.buyIn || 0) : 0;
              const ctpAmount = ctpStatus && tournament.hasCTP ? (tournament.ctpPrizeAmount || 0) : 0;
              const skinsAmount = skinsStatus && tournament.hasSkins ? (tournament.skinsPrizeAmount || 0) : 0;
              const totalAmount = tournamentAmount + ctpAmount + skinsAmount;
              
              // Calculate winnings
              const ctpWinnings = ctpResults
                ?.filter((result: any) => result.player?.id === player.id)
                .reduce((sum: number, _: any) => sum + ctpPrizePerHole, 0) || 0;
              
              const skinsWinnings = skinsResults
                ?.filter((result: any) => result.player?.id === player.id)
                .reduce((sum: number, _: any) => sum + skinsPrizePerHole, 0) || 0;
              
              // Calculate team prize winnings
              // Note: We should consider tournament status, but it's not part of the Tournament type yet
              // For now, we'll calculate for all tournaments, but could be restricted in future
              let teamPrizeWinnings = 0;
              if (player.team) {
                // Find player's team position in standings
                const teamPosition = teamStandings.findIndex(team => team.id === player.team.id) + 1;
                if (teamPosition > 0 && teamPosition <= Object.keys(teamPayouts).length) {
                  // Get team payout amount
                  const teamPayout = teamPayouts[teamPosition.toString()] || 0;
                  // Divide by number of players on team
                  const playersOnTeam = teamStandings.find(t => t.id === player.team.id)?.players.length || 1;
                  teamPrizeWinnings = playersOnTeam > 0 ? teamPayout / playersOnTeam : 0;
                }
              }
              
              // Calculate net tournament cost (buy-in minus prize winnings)
              const netTournament = tournamentAmount - teamPrizeWinnings;
              const netCTP = ctpStatus ? ctpAmount - ctpWinnings : 0;
              const netSkins = skinsStatus ? skinsAmount - skinsWinnings : 0;
              const netTotal = netTournament + netCTP + netSkins;
              
              return (
                <tr key={player.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {player.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {player.team?.name || "No Team"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <div className="flex flex-col items-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-1 ${
                        buyInStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {buyInStatus ? 'Paid' : 'Unpaid'}
                      </span>
                      {buyInStatus && (
                        <>
                          <span className="text-gray-700">${tournamentAmount.toFixed(2)}</span>
                          {teamPrizeWinnings > 0 && (
                            <span className="text-green-600 mt-1">Team prize: ${teamPrizeWinnings.toFixed(2)}</span>
                          )}
                        </>
                      )}
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
                            <span className="text-gray-700">${ctpAmount.toFixed(2)}</span>
                            {ctpWinnings > 0 && (
                              <span className="text-green-600 mt-1">Won: ${ctpWinnings.toFixed(2)}</span>
                            )}
                            <span className={`mt-1 ${netCTP < 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Net: ${(netCTP < 0 ? netCTP * -1 : netCTP).toFixed(2)}
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
                            <span className="text-gray-700">${skinsAmount.toFixed(2)}</span>
                            {skinsWinnings > 0 && (
                              <span className="text-green-600 mt-1">Won: ${skinsWinnings.toFixed(2)}</span>
                            )}
                            <span className={`mt-1 ${netSkins < 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Net: ${(netSkins < 0 ? netSkins * -1 : netSkins).toFixed(2)}
                              {netSkins < 0 ? ' (profit)' : ' (cost)'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center font-medium">
                    <div className="flex flex-col items-center">
                      <span className="text-gray-700 mb-1">Paid: ${totalAmount.toFixed(2)}</span>
                      {(ctpWinnings > 0 || skinsWinnings > 0 || teamPrizeWinnings > 0) && (
                        <span className="text-green-600 mb-1">
                          Won: ${(ctpWinnings + skinsWinnings + teamPrizeWinnings).toFixed(2)}
                        </span>
                      )}
                      <span className={`${netTotal < 0 ? 'text-green-600' : 'text-red-600'} font-semibold`}>
                        Net: ${(netTotal < 0 ? netTotal * -1 : netTotal).toFixed(2)}
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