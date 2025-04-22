import React, { useState, useEffect, useCallback } from 'react';
import { Tournament } from '@/types/models';
import { calculateCTPPrize, calculateSkinsPrize } from '@/utils/prizeCalculator';
import { isHomeTeam } from '@/utils/teamUtils';
import {
  FinancialOverview,
  CTPSection,
  SkinsSection,
  PlayerFinancialSummary,
  PaymentManagement,
  PaymentDialog
} from '@/components/tournaments/financial';

interface MoneyTabProps {
  tournament: Tournament;
  onRefresh?: () => void;
}

export const MoneyTab: React.FC<MoneyTabProps> = ({ tournament, onRefresh }) => {
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
  const [isDummyCreating, setIsDummyCreating] = useState(false);

  // Define fetchFinancialData with useCallback
  const fetchFinancialData = useCallback(async () => {
    try {
      setLoading(true);
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      // Force fresh data with stronger cache control and unique timestamp
      const timestamp = new Date().getTime();
      console.log(`Fetching financial data at ${timestamp} for tournament ${tournament.id}`);
      
      const response = await fetch(`/api/tournaments/${tournament.id}/money?_=${timestamp}`, {
        method: 'GET', 
        cache: 'no-store',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch financial data: ${response.status} ${response.statusText}`);
      }
      
      let responseData = await response.json();
      
      // Check if the response has data wrapped in a success structure
      if (responseData.success && responseData.data) {
        // Extract the actual data from the API response structure
        responseData = responseData.data;
      }
        
      // Check if we have player data
      if (responseData && responseData.allPlayers) {
        console.log(`Fetched financial data successfully with ${responseData.allPlayers.length} players`);
        
        // Check if player data looks valid
        const validPlayerCount = responseData.allPlayers.filter((p: any) => p && p.id && p.name).length;
        console.log(`${validPlayerCount} of ${responseData.allPlayers.length} players have valid data`);
        
        // Log team associations
        const playersWithTeams = responseData.allPlayers.filter((p: any) => p && p.team && p.team.id).length;
        console.log(`${playersWithTeams} of ${responseData.allPlayers.length} players have team associations`);
        
        // Check for home/away team designation
        const homeTeamPlayers = responseData.allPlayers.filter((p: any) => p && p.team && isHomeTeam(p.team)).length;
        const awayTeamPlayers = responseData.allPlayers.filter((p: any) => p && p.team && !isHomeTeam(p.team)).length;
        console.log(`Home team players: ${homeTeamPlayers}, Away team players: ${awayTeamPlayers}`);
        
        // Force team.isHomeTeam property for all players - in case it's missing
        responseData.allPlayers = responseData.allPlayers.map((player: any) => {
          if (player && player.team) {
            const isHome = isHomeTeam(player.team);
            return {
              ...player,
              team: {
                ...player.team,
                isHomeTeam: isHome
              }
            };
          }
          return player;
        });

        // Also fix playerPayments if it's malformed
        if (responseData.playerPayments) {
          console.log("Checking playerPayments structure:", typeof responseData.playerPayments, 
            "with keys:", Object.keys(responseData.playerPayments).length);
          
          // Make sure all players have a payment entry
          responseData.allPlayers.forEach((player: any) => {
            if (!responseData.playerPayments[player.id]) {
              responseData.playerPayments[player.id] = {
                BUY_IN: false,
                CTP_ENTRY: false,
                SKINS_ENTRY: false
              };
              console.log(`Added missing payment entry for player ${player.name} (${player.id})`);
            }
          });
        }
      } else {
        console.warn("Money API returned data but no players were found");
      }
      
      setFinancialData(responseData);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  }, [tournament.id]);
  
  // Use a refreshKey to force re-renders
  useEffect(() => {
    fetchFinancialData();
  }, [tournament.id, refreshKey, fetchFinancialData]);

  const createDummyTournament = async () => {
    if (!window.confirm('This will create a new dummy tournament with sample data. Continue?')) {
      return;
    }
    
    try {
      setIsDummyCreating(true);
      const response = await fetch('/api/dev/create-dummy-tournament', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        window.alert(`Created dummy tournament: ${result.data.tournamentName}. Refresh the page to see it.`);
        window.location.href = '/tournaments'; // Redirect to tournaments list
      } else {
        const error = await response.json();
        window.alert(`Error creating dummy tournament: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating dummy tournament:', error);
      window.alert('Failed to create dummy tournament. See console for details.');
    } finally {
      setIsDummyCreating(false);
    }
  };

  const handlePaymentUpdate = async (player: any) => {
    setCurrentPlayer(player);
    
    try {
      // Directly fetch the current payment status from the API
      const token = localStorage.getItem('token');
      
      console.log(`Checking payment status for player ${player.name} (${player.id}) in tournament ${tournament.id}`);
      
      const response = await fetch(`/api/players/check-payment?playerId=${player.id}&tournamentId=${tournament.id}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.paymentStatus) {
          // Use the status from the API
          setPaymentStatus({
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
    }
    
    setEditDialogOpen(true);
  };

  const handlePaymentChange = (field: string, value: boolean) => {
    setPaymentStatus(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSavePayments = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      
      // Immediately update local state for responsive UI
      const tempUpdatedData = { ...financialData };
      if (!tempUpdatedData.playerPayments) {
        tempUpdatedData.playerPayments = {};
      }
      if (!tempUpdatedData.playerPayments[currentPlayer.id]) {
        tempUpdatedData.playerPayments[currentPlayer.id] = {};
      }
      
      // Set local values based on current selections
      tempUpdatedData.playerPayments[currentPlayer.id].BUY_IN = paymentStatus.buyIn;
      if (tournament.hasCTP) {
        tempUpdatedData.playerPayments[currentPlayer.id].CTP_ENTRY = paymentStatus.ctp;
      }
      if (tournament.hasSkins) {
        tempUpdatedData.playerPayments[currentPlayer.id].SKINS_ENTRY = paymentStatus.skins;
      }
      
      // Update UI state immediately
      setFinancialData(tempUpdatedData);
      
      // Use payment-status endpoint which handles the database properly
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
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update payment status');
      }
      
      // Then verify the update using the check-payment endpoint
      const verifyResponse = await fetch(`/api/players/check-payment?playerId=${currentPlayer.id}&tournamentId=${tournament.id}?_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (verifyResponse.ok) {
        const verifyResult = await verifyResponse.json();
        
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
          
          // Update with verified values from the server
          updatedData.playerPayments[currentPlayer.id] = verifyResult.paymentStatus;
          
          // Update the state with verified data
          setFinancialData(updatedData);
        }
      }
      
      // Close dialog first
      setEditDialogOpen(false);
      
      // First, call the cache-bust endpoint to ensure we get fresh data
      try {
        await fetch('/api/tournaments/cache-bust', {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      } catch (e) {
        console.log('Cache bust error:', e);
      }
      
      // Wait a moment to ensure database updates have propagated
      setTimeout(async () => {
        // Force refresh by increasing the refresh key
        setRefreshKey(prev => prev + 1);
        
        // Also call parent refresh function if provided
        if (onRefresh) {
          onRefresh();
        }
      }, 1000);
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
        <div className="mt-4 flex space-x-4">
          <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
          >
            Retry
          </button>
          
          {process.env.NODE_ENV !== 'production' && (
            <button
              onClick={createDummyTournament}
              disabled={isDummyCreating}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {isDummyCreating ? 'Creating...' : 'Create Dummy Tournament'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // No players found - show create dummy button
  if (!financialData.allPlayers || financialData.allPlayers.length === 0) {
    return (
      <div className="p-6 bg-white shadow-md rounded-lg">
        <h3 className="text-lg font-semibold text-orange-600">No Player Data Found</h3>
        <p className="mt-2">This tournament does not have any players assigned to teams yet.</p>
        <div className="mt-4 flex space-x-4">
          <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
          >
            Refresh Data
          </button>
          
          {process.env.NODE_ENV !== 'production' && (
            <button
              onClick={createDummyTournament}
              disabled={isDummyCreating}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {isDummyCreating ? 'Creating...' : 'Create Dummy Tournament'}
            </button>
          )}
        </div>
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

  return (
    <div className="space-y-8">
      {/* Tournament Finances */}
      <FinancialOverview 
        tournament={tournament} 
        playerCount={playerCount} 
      />
      
      {/* CTP Competition */}
      <CTPSection 
        tournament={tournament} 
        ctpParticipants={ctpParticipants} 
        par3Count={par3Count} 
        ctpResults={ctpResults || []} 
      />
      
      {/* Skins Game */}
      <SkinsSection 
        tournament={tournament} 
        skinsParticipants={skinsParticipants} 
        skinsResults={skinsResults || []} 
      />
      
      {/* Player Financial Summary */}
      <PlayerFinancialSummary 
        tournament={tournament}
        players={allPlayers}
        playerPayments={playerPayments || {}}
        ctpResults={ctpResults || []}
        skinsResults={skinsResults || []}
        ctpPrizePerHole={ctpPrizePerHole}
        skinsPrizePerHole={skinsPrizePerHole}
      />
      
      {/* Payment Management */}
      <PaymentManagement
        tournament={tournament}
        players={allPlayers}
        playerPayments={playerPayments || {}}
        onPlayerSelect={handlePaymentUpdate}
      />
      
      {/* Payment Edit Dialog */}
      <PaymentDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        player={currentPlayer}
        tournament={tournament}
        paymentStatus={paymentStatus}
        onPaymentChange={handlePaymentChange}
        onSave={handleSavePayments}
        isSaving={isSaving}
      />
    </div>
  );
};

export default MoneyTab;