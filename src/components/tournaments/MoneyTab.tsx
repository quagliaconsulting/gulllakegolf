import React, { useState, useEffect, useCallback } from 'react';
import { Tournament, Player, Team, CTPResult, SkinsResult } from '@/types/models';
import { calculateCTPPrize, calculateSkinsPrize, calculateTeamPayouts } from '@/utils/prizeCalculator';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface MoneyTabProps {
  tournament: Tournament;
  onRefresh?: () => void;
}

export default function MoneyTab({ tournament, onRefresh }: MoneyTabProps) {
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState({
    buyIn: false,
    ctp: false,
    skins: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Use a refreshKey to force re-renders
  useEffect(() => {
    fetchFinancialData();
  }, [tournament.id, refreshKey]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Add cache busting to ensure fresh data
      const response = await fetch(`/api/tournaments/${tournament.id}/money?_=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial data');
      }
      
      const data = await response.json();
      console.log('Fetched financial data:', data);
      
      if (data.playerPayments) {
        console.log('Player payment statuses:');
        Object.entries(data.playerPayments).forEach(([playerId, statuses]: [string, any]) => {
          console.log(`- Player ${playerId}:`, statuses);
        });
      }
      
      setFinancialData(data);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentUpdate = async (player: any) => {
    setCurrentPlayer(player);
    
    try {
      // Directly fetch the current payment status from the API
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/players/check-payment?playerId=${player.id}&tournamentId=${tournament.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Current payment status from API:', data);
        
        if (data.paymentStatus) {
          // Use the status from the API
          setPaymentStatus({
            buyIn: data.paymentStatus.BUY_IN === true,
            ctp: data.paymentStatus.CTP_ENTRY === true,
            skins: data.paymentStatus.SKINS_ENTRY === true
          });
          
          console.log('Set payment status from API:', {
            buyIn: data.paymentStatus.BUY_IN === true,
            ctp: data.paymentStatus.CTP_ENTRY === true,
            skins: data.paymentStatus.SKINS_ENTRY === true
          });
        } else {
          // Fallback to existing data
          const payments = financialData.playerPayments[player.id] || {};
          
          // Explicitly check for true/false values to ensure correct initial state
          const buyInStatus = payments.BUY_IN === true;
          const ctpStatus = payments.CTP_ENTRY === true;
          const skinsStatus = payments.SKINS_ENTRY === true;
          
          // Set initial state
          setPaymentStatus({
            buyIn: buyInStatus,
            ctp: ctpStatus,
            skins: skinsStatus
          });
          
          console.log('Set payment status from local data:', { 
            buyIn: buyInStatus, 
            ctp: ctpStatus, 
            skins: skinsStatus 
          });
        }
      } else {
        // Fallback to existing data
        const payments = financialData.playerPayments[player.id] || {};
        
        // Explicitly check for true/false values to ensure correct initial state
        const buyInStatus = payments.BUY_IN === true;
        const ctpStatus = payments.CTP_ENTRY === true;
        const skinsStatus = payments.SKINS_ENTRY === true;
        
        // Set initial state
        setPaymentStatus({
          buyIn: buyInStatus,
          ctp: ctpStatus,
          skins: skinsStatus
        });
        
        console.log('Set payment status from local data (API error):', { 
          buyIn: buyInStatus, 
          ctp: ctpStatus, 
          skins: skinsStatus 
        });
      }
    } catch (error) {
      console.error('Error fetching payment status:', error);
      
      // Fallback to existing data
      const payments = financialData.playerPayments[player.id] || {};
      
      // Explicitly check for true/false values to ensure correct initial state
      const buyInStatus = payments.BUY_IN === true;
      const ctpStatus = payments.CTP_ENTRY === true;
      const skinsStatus = payments.SKINS_ENTRY === true;
      
      // Set initial state
      setPaymentStatus({
        buyIn: buyInStatus,
        ctp: ctpStatus,
        skins: skinsStatus
      });
      
      console.log('Set payment status from local data (exception):', { 
        buyIn: buyInStatus, 
        ctp: ctpStatus, 
        skins: skinsStatus 
      });
    }
    
    console.log('Opening payment dialog for:', player.name);
    setEditDialogOpen(true);
  };

  const handleSavePayments = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      
      console.log('Saving payment status:', paymentStatus);
      
      // First, update using the existing API
      const response = await fetch('/api/players/payment-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          playerId: currentPlayer.id,
          tournamentId: tournament.id,
          buyIn: paymentStatus.buyIn,
          ctp: tournament.hasCTP ? paymentStatus.ctp : false,
          skins: tournament.hasSkins ? paymentStatus.skins : false
        })
      });
      
      const result = await response.json();
      console.log('Payment update result:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update payment status');
      }
      
      // Then verify the update using the new direct endpoint
      const verifyResponse = await fetch(`/api/players/check-payment?playerId=${currentPlayer.id}&tournamentId=${tournament.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (verifyResponse.ok) {
        const verifyResult = await verifyResponse.json();
        console.log('Verified payment status:', verifyResult);
        
        // If verification succeeded, update the local state with verified data
        if (verifyResult.paymentStatus) {
          // Make a deep copy of the financial data
          const updatedData = { ...financialData };
          
          // Initialize player payments if needed
          if (!updatedData.playerPayments) {
            updatedData.playerPayments = {};
          }
          
          // Make sure this player has an entry
          if (!updatedData.playerPayments[currentPlayer.id]) {
            updatedData.playerPayments[currentPlayer.id] = {};
          }
          
          // Update with verified values
          updatedData.playerPayments[currentPlayer.id] = verifyResult.paymentStatus;
          
          // Update the state with verified data
          setFinancialData(updatedData);
        }
      }
      
      // Close dialog
      setEditDialogOpen(false);
      
      // Wait a brief moment before triggering a full refresh
      setTimeout(() => {
        fetchFinancialData();
        
        // Call parent refresh function if provided
        if (onRefresh) {
          onRefresh();
        }
      }, 300);
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Failed to update payment status. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="p-6 bg-white shadow-md rounded-lg animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!financialData) {
    return (
      <div className="p-6 bg-white shadow-md rounded-lg">
        <h3 className="text-lg font-semibold text-red-600">Error loading financial data</h3>
        <p className="mt-2">Failed to load tournament financial information.</p>
        <button 
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="mt-4 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          Retry
        </button>
      </div>
    );
  }

  const { 
    playerCount, 
    par3Count, 
    ctpParticipants, 
    skinsParticipants, 
    ctpResults, 
    skinsResults,
    playerPayments,
    allPlayers
  } = financialData;

  // Calculate prizes using utility functions
  const ctpPrizePerHole = calculateCTPPrize(
    tournament.ctpPrizeAmount || 0,
    ctpParticipants || 0,
    par3Count || 1
  );
  
  const skinsPrizePerHole = calculateSkinsPrize(
    tournament.skinsPrizeAmount || 0,
    skinsParticipants || 0,
    skinsResults?.length || 0
  );
  
  const teamPayouts = calculateTeamPayouts(
    tournament.buyIn || 0,
    playerCount || 0,
    tournament.payoutStructure as Record<string, number> || {},
    tournament.teams?.length || 0
  );

  return (
    <div className="space-y-8">
      {/* Tournament Finances */}
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
      
      {/* CTP Competition */}
      {tournament.hasCTP && (
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
      )}
      
      {/* Skins Game */}
      {tournament.hasSkins && (
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Skins Game</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium mb-3">Skins Prizes</h4>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Skins Entry Fee:</span>
                  <span className="font-medium">${tournament.skinsPrizeAmount || 0}/player</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Skins Participants:</span>
                  <span className="font-medium">{skinsParticipants || 0} players</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Total Pot:</span>
                  <span className="font-medium">${(tournament.skinsPrizeAmount || 0) * (skinsParticipants || 0)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Skins Recorded:</span>
                  <span className="font-medium">{skinsResults?.length || 0}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Prize Per Skin:</span>
                  <span className="font-medium">
                    {skinsResults?.length ? `$${skinsPrizePerHole}` : 'No skins recorded yet'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-md font-medium mb-3">Skins Results</h4>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                {skinsResults?.length > 0 ? (
                  <div className="space-y-2">
                    {skinsResults.map((result: SkinsResult) => (
                      <div key={result.id} className="flex justify-between">
                        <span className="text-gray-600">
                          Hole {result.holeNumber}:
                        </span>
                        <span className="font-medium">
                          {result.player?.name} ({result.score})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No skins recorded yet</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Player Financial Summary */}
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
              {allPlayers.map((player: any) => {
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
      
      {/* Payment Management */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Payment Management</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Player</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Team</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Buy-in Paid</th>
                {tournament.hasCTP && (
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">CTP Entry</th>
                )}
                {tournament.hasSkins && (
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Skins Entry</th>
                )}
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {allPlayers.map((player: any) => {
                const buyInStatus = playerPayments[player.id]?.BUY_IN || false;
                const ctpStatus = playerPayments[player.id]?.CTP_ENTRY || false;
                const skinsStatus = playerPayments[player.id]?.SKINS_ENTRY || false;
                
                return (
                  <tr key={player.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {player.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {player.team?.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        buyInStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {buyInStatus ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    {tournament.hasCTP && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ctpStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {ctpStatus ? 'Entered' : 'Not Entered'}
                        </span>
                      </td>
                    )}
                    {tournament.hasSkins && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          skinsStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {skinsStatus ? 'Entered' : 'Not Entered'}
                        </span>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <button
                        onClick={() => handlePaymentUpdate(player)}
                        className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      
      {/* Payment Edit Dialog */}
      <Transition appear show={editDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setEditDialogOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Update Payment Status
                  </Dialog.Title>
                  
                  {currentPlayer && (
                    <div className="mt-4 space-y-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Player: <span className="font-medium text-gray-900">{currentPlayer.name}</span></p>
                        <p className="text-sm text-gray-500">Team: <span className="font-medium text-gray-900">{currentPlayer.team?.name}</span></p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <input
                            id="buyIn"
                            type="checkbox"
                            checked={paymentStatus.buyIn}
                            onChange={(e) => {
                              console.log('Buy-in changed to:', e.target.checked);
                              setPaymentStatus({...paymentStatus, buyIn: e.target.checked})
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor="buyIn" className="ml-3 block text-sm font-medium text-gray-700">
                            Buy-in Paid (${tournament.buyIn})
                          </label>
                        </div>
                        
                        {tournament.hasCTP && (
                          <div className="flex items-center">
                            <input
                              id="ctp"
                              type="checkbox"
                              checked={paymentStatus.ctp}
                              onChange={(e) => {
                                console.log('CTP changed to:', e.target.checked);
                                setPaymentStatus({...paymentStatus, ctp: e.target.checked})
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="ctp" className="ml-3 block text-sm font-medium text-gray-700">
                              CTP Entry (${tournament.ctpPrizeAmount || 0})
                            </label>
                          </div>
                        )}
                        
                        {tournament.hasSkins && (
                          <div className="flex items-center">
                            <input
                              id="skins"
                              type="checkbox"
                              checked={paymentStatus.skins}
                              onChange={(e) => {
                                console.log('Skins changed to:', e.target.checked);
                                setPaymentStatus({...paymentStatus, skins: e.target.checked})
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="skins" className="ml-3 block text-sm font-medium text-gray-700">
                              Skins Entry (${tournament.skinsPrizeAmount || 0})
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => setEditDialogOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                      onClick={handleSavePayments}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : 'Save'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}